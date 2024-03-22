---
title: Player Data and Identity in Hub OS Servers
author: Konst
---

If you haven't already worked with save data on a Hub OS server, you may have wondered where and how player data is stored. Each server can handle data in its own way, with only one thing in common: player identity.

Player identity is used by server scripters to tie data to players. You may have noticed the client generating an "identity" folder after joining your first server. The client provides a unique identity on each server, which is unique enough to distinguish yourself from other players (it uses more bits than a UUID to avoid collisions and avoid brute force attacks).

You can think of your server "identity" as a password, as it's a unique code to identify and verify yourself to a server and should not be shared with anyone other than the server. This is why the server API considers your identity a [secret](https://docs.hubos.dev/server/lua-api/player-data/#netget_player_secretplayer_id).

As for where data is stored, it's anywhere but the client to avoid tampering. Server scripters can save to disk, store your data on a database, message another server to keep data on a single server, or even use HTTPS to hand off your data to another program to make use of a different programming language's ecosystem. As long as you have a stable identity to tie your data to, how servers store data is open-ended. This also means the type of information stored by servers is only limited by what the client shares (player package, augments, IP, nickname, etc).

## Trade-Offs

As with any feature, our current design has some benefits and downsides, known as trade-offs. Finding solutions to our issues requires us to understand the design goals for our identity system: decentralized, and simple for users. Any proposed solution must reach our goals or provide a convincing reason to trade goals for a different benefit.

### How do we currently achieve our goals?

The current identity system doesn't rely on a central authority to verify users, as the identity is automatically created by the client and is only shared with the server. This protects us from phishing attacks, as users can't accidentally share the password with the wrong server. The automation also makes this process very simple for users, there's no login required, players can just add a server and join.

### So, what problems exist?

While the identity system currently passes our design goals on the surface, new features and new use cases are on the horizon.

- As Android builds arrive, players will likely want to be able to easily continue playing from where they left off on their computers.
- Some players may want to share the client with friends and simplify the process by preloading mods, accidentally sharing their identity files.
- Servers may accidentally leak identities
  - ex: opening a save file in a public stream or improperly logging identities.
- We also have an issue with servers changing addresses, as that would generate a new identity unless the user manually renames their identity files to match the new server.

Players accidentally sharing identity files has a simple solution: moving identity data to a standard location outside of the game folder. On Linux, this folder may be stored in `~/.local/share/hub-os/identity`, on Windows, this may be somewhere in the app data folder. This prevents issues with players wanting to share their game folders, but users trying to uninstall the game by deleting the game folder likely won't realize disjointed data is taking up space.

For playing on multiple devices, we could sync identities between devices, but this would require users to remember to sync after playing on a new server. Even automating this by having background processes sync identities requires both devices to be on and using the same network at the same time. If clients aren't synced and the player tries to continue from a new server, a new identity will be created. This may be a minor issue, but if

Protecting against servers leaking identities and address changes may require a different identity system in place.

### Public Key, Private Key

An early solution for leaked identities and synchronization I had in mind was to model identities after asymmetric encryption used in SSH.

Asymmetric encryption involves a pair of keys, known as a public key and a private key. A public key can be shared with a remote computer, which can be used by the remote computer to encrypt a message that can be sent back and decrypted using the private key. If you can decrypt the message, the remote computer can be sure you have the private key.

This public key could be used as the identity given by the client to servers, with the private key kept on the client side for proof of identity through the method mentioned above. Servers leaking identities wouldn't be an issue as anyone attempting to use someone else's identity would still require the private key.

If sharing identities is safe we wouldn't need to generate a new identity for each server, and would only need to share a single public + private key, avoiding our device synchronization issue and address change issue.

#### Key Problem

Best practices with keys requires "rotating" or replacing keys over time and keeping up with modern algorithms.

If keys need to be updated, it will create an identical synchronization issue. Instead of requiring synchronization when a new server is joined, it will require synchronization when keys expire and may need resolution to decide which device gets to make the new key.

If we use the same identity for every server, it would be pretty simple for a server to forward our identity packets to another server and take over post verification to impersonate us (a Man In The Middle attack or MITM). We may need to encrypt the entire stream to prevent impersonation. A session specific encrypted public key could be sent to the client for this, or more research into a proper method could be used.

### Semi-Centralize

Another solution that may work is verifying identity through [hubos.dev](https://hubos.dev). To avoid centralization we could allow any website to authenticate players by including the website in the identity. ex: `konstinople@hubos.dev`. This is considered Semi-Centralize as it's unlikely that someone will offer an alternative authentication server.

Process:

1. The client shares your username with the server.
2. The server requests a verification code from the website using the username and notifies the client that a code is available.
3. The client requests the code associated with both your account and the server address from the website using your credentials and forwards it to the server.
4. If the code matches, you're verified.

With this solution, only account information would need to be synced between devices. You could even sign in separately, allowing you to keep progress on servers even if you lose the last device with your game data. Server address changes would be safe as well, since each server would see the same account name as the identity.

This solution might be safe from a simple MITM attack, as the client would fail to fetch the verification code when connected to the wrong server.

#### Centralizing Issues

- The website would need to be available 24/7
  - If we shut down the website or you lose access to the website, you lose data.
- Any server connection requires internet access and local connections would fail from public + local IP differing.
  - We could offer an offline mode for this, similar to Minecraft.
- Slightly increased connection time to servers, which may worsen with more players and website usage.
  - We possibly won't see this issue, as it only causes a problem when many players try to join a server at the same time, not while many players are online.
- You need to sign up to try out servers.
  - I think it's nice to not need to sign up on websites for everything, especially if you just want to try out the project or don't plan on playing on multiple devices.

### Mixed Solution?

We could offer multiple identity solutions, using either an automated password or a key-based solution and offering an upgrade to a web-based one for a more secure long term identity.

This would require a way to update identity:

```lua
Net:on("identity_update", function(event)
  -- this will be called before the player joins

  if not data[event.new_identity] then
    -- move data over if we haven't already
    -- this may have occurred before from multi-device
    data[event.new_identity] = data[event.old_identity]
  end

  -- untrack old identity
  data[event.old_identity] = nil

  save_data().and_then(function()
    -- the player will be blocked from joining until event.complete()
    -- is called by all listeners of this event
    event.complete()

    -- if there are no listeners, the player will keep using
    -- the old identity for this server to prevent data loss

    -- not using a return value as updating data may be asynchronous
  end)
end)
```

Having support for updating identity would also allow us to support rotating keys, support account migration, or even just switch to a better solution in the future.

Since we need to update identities per server, we would still need to have an identity file for each server in our identity folder, but we'd only need to sync a single identity between devices if we're using a sharable identity. We'd also need to track the type of identity used to allow servers to understand how to verify a player, we could add a prefix to identities for this: `hubos-web:konstinople@hubos.dev`. Any identities missing a known prefix would be treated as using the old random system.
