---
title: Rolling Back Lua
author: Konst
---

The client uses a customized fork of [mlua](https://github.com/mlua-rs/mlua) called [rollback_mlua](https://github.com/Hub-OS/rollback-mlua). It's stripped of features we aren't using such as support for [LuaJIT](https://luajit.org/) and [Luau](https://luau-lang.org/), as it's hard to verify rollback support, and these implementations are only compatible with Lua 5.1, while we use Lua 5.4.

## Example Usage:

```rust
fn main() -> LuaResult<()> {
    // Create a 1 MiB VM, with storage for one snapshot
    let mut lua = Lua::new_rollback(1024 * 1024, 1);

    // Store 1 in a global variable
    lua.globals().set("value", 1)?;

    let value: i32 = lua.globals().get("value")?;
    println!("{value}"); // 1

    // Save our state
    lua.snap();

    // Store 2 in the global variable
    lua.globals().set("value", 2)?;

    let value: i32 = lua.globals().get("value")?;
    println!("{value}"); // 2

    // Roll back by one state
    lua.rollback(1);

    let value: i32 = lua.globals().get("value")?;
    println!("{value}"); // 1

    Ok(())
}

```

## Internals:

The official Lua interpreter exists nearly entirely on the heap, the core structure of Lua, the `lua_State` is given to us as a heap pointer from its constructor [lua_newstate()](https://www.lua.org/manual/5.4/manual.html#lua_newstate), and Lua allows for all heap allocations to be made with a [custom allocator](https://www.lua.org/manual/5.4/manual.html#lua_Alloc).

The important details are in the `Lua::new_rollback(1024 * 1024, 1)` call. This function calls `lua_newstate()` with a custom allocator.

```rust
pub fn new_rollback(memory_size: usize, max_snapshots: usize) -> Self {
    unsafe extern "C-unwind" fn allocator(
        ud: *mut c_void,
        ptr: *mut c_void,
        osize: usize,
        nsize: usize,
    ) -> *mut c_void {
        let memory = &mut *(ud as *mut PhotographicMemory);
        memory.realloc(ptr, osize, nsize)
    }

    let memory = PhotographicMemory::new(memory_size, max_snapshots);
    let boxed_memory = Box::new(memory);

    let ud = Box::into_raw(boxed_memory);
    let state = unsafe { ffi::lua_newstate(allocator, ud as *mut c_void) };
    let memory = unsafe { Box::from_raw(ud) };

    assert!(!state.is_null(), "failed to instantiate Lua VM");
    Self::inner_new(state, Some(memory))
}
```

There's a good bit of `unsafe` involved here, as Rust considers [any call to foreign functions (such as C functions) as unsafe](https://doc.rust-lang.org/nomicon/ffi.html), and in this case, we're directly dealing with memory, so it's very accurate.

To break it down:

```rust
    unsafe extern "C-unwind" fn allocator(
        ud: *mut c_void,
        ptr: *mut c_void,
        osize: usize,
        nsize: usize,
    ) -> *mut c_void {
        let memory = &mut *(ud as *mut PhotographicMemory);
        memory.realloc(ptr, osize, nsize)
    }
```

This is the custom allocator function we're providing to lua. `ud` here is "User Data", the actual type doesn't matter to Lua and is decided by us, the "user" of Lua. We'll pass a structure with the allocator to lua later which we'll receive here to make allocations. You can see we cast it to a `*mut PhotographicMemory`

```rust
    let memory = PhotographicMemory::new(memory_size, max_snapshots);
    let boxed_memory = Box::new(memory);
```

Here we're just creating our `PhotographicMemory` struct and putting it on the heap (`Box<PhotographicMemory>`) to give it a stable position in memory.

```rust
    let ud = Box::into_raw(boxed_memory);
    let state = unsafe { ffi::lua_newstate(allocator, ud as *mut c_void) };
```

We convert our `Box<PhotographicMemory>` into a `*mut PhotographicMemory`, a pointer type usable by C. We erase the type via `as *mut c_void` to pass it into `lua_newstate()`, we're also passing the allocator function here.

```rust
    let memory = unsafe { Box::from_raw(ud) };

    assert!(!state.is_null(), "failed to instantiate Lua VM");
    Self::inner_new(state, Some(memory))
```

We then box `ud` / `PhotographicMemory` back up to claim ownership for automatic deletion, and pass it and our new `*mut lua_State` to a shared constructor function for our `rollback_mlua::Lua` instance.

## What is PhotographicMemory?

It's a custom structure for allocations and making snapshots of memory. You can guess where "Photographic" came from.

```rust
pub struct PhotographicMemory {
    active_memory: Memory,
    max_snapshots: usize,
    snapshots: VecDeque<Memory>,
}

impl PhotographicMemory {
    pub fn new(space: usize, max_snapshots: usize) -> Self {
        Self {
            active_memory: Memory::new(space),
            max_snapshots,
            snapshots: VecDeque::with_capacity(max_snapshots),
        }
    }

    // ...


    pub fn realloc(&mut self, ptr: *mut c_void, osize: usize, nsize: usize) -> *mut c_void {
        self.active_memory.realloc(ptr, osize, nsize)
    }

    // ...
```

`Memory` here is a simple structure:

```rust
// naive allocator
pub struct Memory {
    heap: Vec<u8>,
    gaps: Vec<MemoryGap>,
}

impl Memory {
    pub fn new(initial_size: usize) -> Self {
        Self {
            heap: vec![0; initial_size],
            gaps: vec![MemoryGap {
                offset: 0,
                size: initial_size,
            }],
        }
    }


    pub fn realloc(&mut self, ptr: *mut c_void, osize: usize, nsize: usize) -> *mut c_void {
        // ...
```

When Lua requests an allocation, it ends up calling `Memory::realloc()`, which returns a pointer to memory in our heap Vec. Our `Memory` struct will use `gaps` to find free space for allocations and create / merge gaps when memory is freed.

To make a snapshot, we make a backup of `active_memory`. To roll back, we copy data from our target snapshot into `active_memory`.

We need to copy data into `active_memory` and not just swap structures as anything with a pointer is pointing to a space within `active_memory`'s heap Vec.

We also need to be very careful about our Vecs reallocating, at least for the `active_memory` in `PhotographicMemory`. This is why we have an upper limit of memory and must allocate it all at once (`initial_size`).

As of writing, we copy all bytes up to the last gap, as long as the last gap is at the very end of our memory:

```rust
impl Memory {
    // ...

    pub fn compressed_clone(&self) -> Self {
        let mut end = self.heap.len();

        if let Some(gap) = self.gaps.last() {
            if gap.offset + gap.size == self.heap.len() {
                end = gap.offset
            }
        }

        Self {
            heap: self.heap[..end].to_vec(),
            gaps: self.gaps.clone(),
        }
    }

    pub fn copy_from(&mut self, other: &Self) {
        self.gaps = other.gaps.clone();
        let slice = &mut self.heap[..other.heap.len()];

        slice.copy_from_slice(&other.heap);
    }

    // ...
```

## That's all?

Rolling back Lua only required storing memory in an arena?

Yes, kinda.

A lot of work went into making sure mlua / rollback_mlua as a Lua abstraction library could roll back. This includes invalidating `RegistryKey`s, making snapshots of internal values, watching out for any values that might've been fine for `mlua` to keep around but aren't safe for us to use past `rollback()` calls, and more.

## Any bugs or issues?

Support for Rust mutable closures was dropped as our initial implementation did not support rolling back. Functions are currently shared between snapshots, if a function could modify a captured variable, it will be modified for old states too, causing players to desync. This causes certain code that requires private updating variables to only be writable in Lua.

We should be able to support mutable functions that support Clone in the future ([playground](https://play.rust-lang.org/?version=stable&mode=debug&edition=2021&code=fn+fn_mut_test%3CF%3E%28mut+f%3A+F%29%0Awhere%0A++++F%3A+FnMut%28%29+%2B+Clone%2C%0A%7B%0A++++f%28%29%3B+%2F%2F+1%0A%0A++++%2F%2F+function+snapshot%3A%0A++++let+snapshot+%3D+f.clone%28%29%3B%0A%0A++++f%28%29%3B+%2F%2F+2%0A++++f%28%29%3B+%2F%2F+3%0A%0A++++%2F%2F+rollback%0A++++f+%3D+snapshot%3B%0A%0A++++f%28%29%3B+%2F%2F+2%0A++++f%28%29%3B+%2F%2F+3%0A%7D%0A%0A%0Afn+main%28%29+%7B%0A++++let+mut+i+%3D+1%3B%0A%0A++++fn_mut_test%28move+%7C%7C+%7B%0A++++++++println%21%28%22%7Bi%7D%22%29%3B%0A++++++++i+%2B%3D+1%3B%0A++++%7D%29%3B%0A%7D%0A)):

```rust
fn fn_mut_test<F>(mut f: F)
where
    F: FnMut() + Clone,
{
    f(); // 1

    // function snapshot:
    let mut snapshot = f.clone();

    f(); // 2
    f(); // 3

    // rollback:
    f = snapshot;

    f(); // 2
    f(); // 3
}


fn main() {
    let mut i = 1;

    fn_mut_test(move || {
        println!("{i}");
        i += 1;
    });
}
```

However we still need to worry about Rc/Arc<RefCell> values being used in both mutable closures and our currently supported immutable closures ([Playground](https://play.rust-lang.org/?version=stable&mode=debug&edition=2021&code=fn+fn_test%3CF%3E%28mut+f%3A+F%29%0Awhere%0A++++F%3A+Fn%28%29+%2B+Clone%2C%0A%7B%0A++++f%28%29%3B+%2F%2F+1%0A%0A++++%2F%2F+function+snapshot%3A%0A++++let+snapshot+%3D+f.clone%28%29%3B%0A%0A++++f%28%29%3B+%2F%2F+2%0A++++f%28%29%3B+%2F%2F+3%0A%0A++++%2F%2F+rollback%3A%0A++++f+%3D+snapshot%3B%0A%0A++++f%28%29%3B+%2F%2F+4+%3C-+Did+not+roll+back%21%0A%7D%0A%0A%0Afn+main%28%29+%7B%0A++++use+std%3A%3Arc%3A%3ARc%3B%0A++++use+std%3A%3Acell%3A%3ARefCell%3B%0A%0A++++let+i+%3D+Rc%3A%3Anew%28RefCell%3A%3Anew%281%29%29%3B%0A%0A++++fn_test%28move+%7C%7C+%7B%0A++++++++let+mut+i+%3D+i.borrow_mut%28%29%3B%0A++++++++println%21%28%22%7Bi%7D%22%29%3B%0A++++++++*i+%2B%3D+1%3B%0A++++%7D%29%3B%0A%7D%0A)):

```rust
fn fn_test<F>(mut f: F)
where
    F: Fn() + Clone,
{
    f(); // 1

    // function snapshot:
    let snapshot = f.clone();

    f(); // 2
    f(); // 3

    // rollback:
    f = snapshot;

    f(); // 4 <- Did not roll back!
}


fn main() {
    use std::rc::Rc;
    use std::cell::RefCell;

    let i = Rc::new(RefCell::new(1));

    fn_test(move || {
        let mut i = i.borrow_mut();
        println!("{i}");
        *i += 1;
    });
}
```

Another issue mentioned above is the limit on how much memory a VM can have, and our minimum size is locked to that upper bound - only snapshots are compressed. It may be possible to remove that restriction by dynamically creating new Vecs / memory arenas for allocations that don't fit in our initial arena.

VMs also have duplicate copies of the Lua API, but separating our VMs might be helping us reduce time spent collecting garbage as well as avoiding cloning VMs that haven't been touched every frame.

Summarizing the rest: there are failing tests involving coroutines, we're out of date with mlua, the library is relatively untested as we're the only users of it, and likely more.

## Long term

Currently rollback_mlua isn't too usable for other projects, since it will always be behind mlua in updates and may eventually be dropped or stagnate, but anyone is still free to try.

In the long term, it may be preferable to have a 100% Rust / safe Lua interpreter that can roll back, or an interpreter that supports JIT across platforms and rollback.

Benefits of a fully custom interpreter:

- The ability to serialize the entire state to share over the network to another client.

  - This could allow us to have clients joining in the middle of a battle for spectating, or other interesting features.

    Otherwise this is only possible by sending all inputs and having the joining client simulate the battle as fast as possible to catch up, straining any client or server that must send the data, and taking a significant amount of time to join.

- Reduced memory usage.

  - Currently we need to allocate extra space ahead of time, which must be large enough for big mods that need the memory, while likely dealing with many small mods that don't.

  - If we don't need to worry about space it could be possible to use a single VM for every mod and reduce space used by recycling function definitions, but the cost of this space saving needs to be weighed against the cost of extra cloning.

Some existing serializable Lua implementations that may be worth investigating:

- [TeleLuau](https://github.com/HaroldCindy/TeleLuau)
  - [Luau](https://luau-lang.org/compatibility) / Lua 5.1 compatible.
- [Eris](https://github.com/fnuecke/eris)
  - Lua 5.2
  - Hasn't been updated in 5 years.
- [Pluto](https://github.com/hoelzro/pluto)
  - Lua 5.1
  - Hasn't been updated in 12 years.
