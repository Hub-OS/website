---
title: Slowing Down for Remote Players (Rev 2)
author: Konst
---

If our simulation gets too far ahead of remote players, we would see excessive rubber banding from incorrect predictions. In our worst case, we can end up in lockstep as we run out of space to buffer inputs and store snapshots.

A summary of our input processing:

- When we process a new frame, we broadcast our inputs and guess that any missing remote inputs haven't changed.
- When we receive remote inputs we store it in a buffer, and if it's for a frame in the past, we roll back and resimulate the battle with their inputs properly accounted for.
- If we've received inputs from every player we can drop the oldest data in every buffer as we won't need to roll back to that point anymore.

To keep us from getting too far ahead of remote players, we need to know how far ahead we are. We start by calculating how many steps we've simulated without using inputs from the remote, this value is called our `lead`.

This value alone doesn't let us know if we're ahead of the remote or not, we only know how far ahead we're running locally against the inputs we received. Resolving whether we're really ahead is handled by sharing our local `lead` and comparing the average value (to account for network fluctuations and latency).

### Slowdown implementation:

Each client resolves their lead for each remote, and sends it along with their inputs:

```rust
fn handle_local_input(&mut self, game_io: &GameIO) {
    // ...

    // calculate our lead against each remote for them to know if they should slow down
    let sync_dist = (self.simulation.time - self.synced_time) as i16;

    let lead = self
        .player_controllers
        .iter()
        .map(|controller| sync_dist - controller.buffer.len() as i16)
        .collect();

    self.broadcast(NetplayPacket::Buffer {
        index: local_index,
        data,
        lead,
    });

    // ...
}
```

When we receive this packet, we update the remote's average lead.

```rust
fn handle_packet(&mut self, game_io: &GameIO, packet: NetplayPacket) {
    match packet {
        NetplayPacket::Buffer {
            index,
            data,
            buffer_sizes,
        } => {
            // ...

            if let Some(controller) = self.player_controllers.get_mut(index) {
                // ...

                // track data for resolving if we should slow down
                let remote_lead = self.local_index.and_then(|index| lead.get(index)).cloned();

                if let Some(remote_lead) = remote_lead {
                    simple_rolling_average(&mut controller.remote_average, remote_lead as _);
                }


                // ...
            }
        }
        // ...
    }
}
```

If we have a substantially higher lead (defined by `LEAD_TOLERANCE`) against any active remote player, we slow down:

```rust
const SLOW_COOLDOWN: FrameTime = INPUT_BUFFER_LIMIT as FrameTime;
const LEAD_TOLERANCE: f32 = 2.0;

// ...

fn resolve_slowdown(&mut self) {
    if self.slow_cooldown > 0 {
        self.slow_cooldown -= 1;
    }

    let sync_dist = (self.simulation.time - self.synced_time) as f32;

    for (i, controller) in self.player_controllers.iter_mut().enumerate() {
        if !controller.connected || self.local_index == Some(i) {
            continue;
        }

        let lead = sync_dist - controller.buffer.len() as f32;

        // resolve local average separately from processing packets
        // to use a final single value for the frame
        simple_rolling_average(&mut controller.local_average, lead);

        let has_substantial_diff = controller.connected
            && controller.local_average > controller.remote_average + LEAD_TOLERANCE;

        if self.slow_cooldown == 0 && has_substantial_diff {
            self.slow_cooldown = SLOW_COOLDOWN;
        }
    }
}
```

`LEAD_TOLERANCE` exists to account for any network fluctuations that cause either player to miss packets or receive them late. Being a little ahead or behind is fine, we want to avoid constantly slowing down the simulation by having a little tolerance to network issues. We also avoid completely halting the simulation by waiting only one frame, and putting the slowdown on cooldown (`SLOW_COOLDOWN`), this will allow remote players' simulations to slowly catch up.

Here is how slowing down is implemented:

```rust
fn core_update(&mut self, game_io: &GameIO) {
    // ...

    let should_slow_down = self.slow_cooldown == SLOW_COOLDOWN;

    if !should_slow_down && can_simulate {
        self.handle_local_input(game_io);
        self.simulate(game_io);
    }

    // ...
}
```

This slowdown concept also allows us to avoid needing to start the battle at the exact same time. We want the battles to start very close (each client sends a packet to tell the other clients they're ready), but we can skip precise clock syncronization by just easing our timing closer to remotes. It should also allow us to be resilient to client lag spikes / drift.
