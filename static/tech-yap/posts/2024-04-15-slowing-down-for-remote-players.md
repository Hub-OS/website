---
title: Slowing Down for Remote Players
author: Konst
---

If our simulation gets too far ahead of remote players, we would see excessive rubber banding from incorrect predictions. In our worst case, we can end up in lockstep as we run out of space to buffer inputs and store snapshots.

A summary of our input processing:

- When we process a new frame, we broadcast our inputs and guess that any missing remote inputs haven't changed.
- When we receive remote inputs we store it in a buffer, and if it's for a frame in the past, we roll back and resimulate the battle with their inputs properly accounted for.
- If we've received inputs from every player we can drop the oldest data in every buffer as we won't need to roll back to that point anymore.

To keep us from getting too far ahead of remote players, we need to know how far ahead we are. Since we should be sending and consuming inputs at a constant rate (excluding client lag and network fluctuations), any inputs buffered for us on a remote client will let us know how far ahead we are in our simulation.

### Slowdown implementation:

Each client gathers a count of how much input has been buffered for each remote, and sends it along with their inputs:

```rust
fn handle_local_input(&mut self, game_io: &GameIO) {
    // ...

    // gather buffer sizes for remotes to know if they should slow down
    let buffer_sizes = self
        .player_controllers
        .iter()
        .map(|controller| controller.buffer.len())
        .collect();

    self.broadcast(NetplayPacket::Buffer {
        index: local_index,
        data,
        buffer_sizes,
    });

    // ...
}
```

If we see any remote player with substantialy more buffered data for us than we have buffered for them (defined by `BUFFER_TOLERANCE`), we slow down as it means the remote player is running behind:

```rust
const SLOW_COOLDOWN: FrameTime = INPUT_BUFFER_LIMIT as FrameTime;
const BUFFER_TOLERANCE: usize = 3;

// ...

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

                // figure out if we should slow down
                let remote_received_size = self
                    .local_index
                    .and_then(|index| buffer_sizes.get(index))
                    .cloned();

                if let Some(remote_received_size) = remote_received_size {
                    let local_remote_size = controller.buffer.len();

                    let has_substantial_diff = controller.connected
                        && remote_received_size > local_remote_size + BUFFER_TOLERANCE;

                    if self.slow_cooldown == 0 && has_substantial_diff {
                        self.slow_cooldown = SLOW_COOLDOWN;
                    }
                }

                // ...
            }
        }
        // ...
    }
}
```

`BUFFER_TOLERANCE` exists to account for any network fluctuations that cause either player to miss packets or receive them late. Being a little ahead or behind is fine, we want to avoid constantly slowing down the simulation by having a little tolerance to network issues. We also avoid completely halting the simulation by waiting only one frame, and putting the slowdown on cooldown (`SLOW_COOLDOWN`), this will allow remote players' simulations to slowly catch up.

Here is how slowing down is implemented:

```rust
fn core_update(&mut self, game_io: &GameIO) {
    // ...

    let should_slow_down = self.slow_cooldown == SLOW_COOLDOWN;

    if !should_slow_down && can_simulate {
        self.handle_local_input(game_io);
        self.simulate(game_io);
    }

    if self.slow_cooldown > 0 {
        self.slow_cooldown -= 1;
    }

    // ...
}
```

This slowdown concept also allows us to avoid needing to start the battle at the exact same time. We want the battles to start very close (each client sends a packet to tell the other clients they're ready), but we can skip precise clock syncronization by just easing our timing closer to remotes. It should also allow us to be resilient to client lag spikes / drift.

### Something odd

We don't seem to be following the logic established at earlier in the article:

> Since we should be sending and consuming inputs at a constant rate (excluding client lag and network fluctuations), any inputs buffered for us on a remote client will let us know how far ahead we are in our simulation.

Our implementation for reference:

```rust
let has_substantial_diff = controller.connected
    && remote_received_size > local_remote_size + BUFFER_TOLERANCE;
```

It's not too obvious whether it's important to compare the remote pending input to the local pending input, or if we could just compare the remote pending input to `BUFFER_TOLERANCE` directly. It would be interesting see if it's even possible for both players to be ahead in a two player connection.

### What about 3+ players?

Remember, buffered inputs aren't deleted until the client has received input for every player. It's possible that seeing a large `remote_received_size` means a different client is behind, forcing our inputs to wait. This could be the situation that causes two players to see each other as behind at the same time, requiring us to compare remote's buffer to our buffer, instead of the remotes directly to tolerance.
