---
title: Pointer Alternatives for Rollback (Certified Yap)
author: Konst
---

In C++, it wasn't uncommon for us to directly point to an object to use it:

```cpp
// Simplified code:
class Sprite {
private:
    Sprite* parent;
};
```

This can be problematic, as rollback requires us to save a backup of our data to roll back to. In this case, we'd need to make sure the Sprite we're pointing to isn't old (causing our old state to be corrupted), or have custom handling for rolling back Sprites (make each Sprite in charge of its previous state so old Sprites are safe to share between states).

Custom handling structurally may look like this:

```cpp
class Sprite {
private:
    struct SpriteData {
        Sprite* parent;
    };

    std::vector<SpriteData> history;
};
```

It would be preferable to not use custom handling for every structure, as it complicates how we write code, we must remember to roll back every structure we use without accidentally rolling back twice, and infects code that is used outside of rollback. Sprites are used in menus and the overworld scene, where keeping track of history for rollback is unnecessary. Maybe we want to make use of something that wasn't originally designed for rollback as well.

If we want to simply clone our structures, we'd need to crawl every pointer and repoint our old pointers to new cloned structures, or find a solution that doesn't involve pointers. Did I mention we also need to think about how we'd roll this back in Lua? 👻

## How would we write this in Rust?

In Rust, raw pointers are considered unsafe, requiring an unsafe block + auditing for safety on any usage, which is undesirable. If we were to rewrite this in Rust it may start out like this:

```rust
struct Sprite {
    // Option<T>, can be a Some(T) or None, allows us to specify "no" parent
    // Rc is a Reference Counted pointer
    parent: Option<Rc<Sprite>>
}
```

However, [Rc](https://doc.rust-lang.org/std/rc/struct.Rc.html)'s don't allow us to modify structures as Rust has strict rules on how many places can modify a structure at the same time, and through a shared pointer Rust can't guarantee these rules at compile time.

In most other languages we would be able to share a pointer to data and modify that same data. Rust does allow for this under a concept called [Interior Mutability](https://doc.rust-lang.org/book/ch15-05-interior-mutability.html). Let's see how that looks using [RefCell](https://doc.rust-lang.org/std/cell/struct.RefCell.html) (mentioned in the Interior Mutability article):

```rust
struct Sprite {
    parent: Option<Rc<RefCell<Sprite>>>
}
```

That's a messy type, and to do anything with our parent Sprite we'd need to write `.borrow()` or `.borrow_mut()`. We'd also need to worry about runtime panics (crashes) if we don't manually verify that we're following Rust's borrowing rules. That's something that would normally appear as an error found at compile time through the borrow checker. Maybe that's why Interior Mutability is considered a [last resort](https://doc.rust-lang.org/std/cell/index.html#when-to-choose-interior-mutability)?

There's a bit of a leap here that may be hard to see. To properly leverage the borrow checker, we'll need to have our Sprites managed in one location. The borrow checker exists to enforce ownership after all, and our problems stem from shared ownership (shared pointers).

One jump we could make is to use a list / [Vec](https://doc.rust-lang.org/std/vec/struct.Vec.html) of Sprites, and swap our pointers to indices:

```rust
struct Sprite {
    // usize, an (u)nsigned integer used to store a size / list length
    parent: Option<usize>,
}

// somewhere else, a structure that owns the sprites
struct SpriteTree {
    sprites: Vec<Sprite>;
}
```

There are a few issues still. Since we don't "own" the data / keep it alive through a shared pointer, we can't be certain that the parent hasn't been deleted. That could be resolved by using `sprites.get_mut(index)` instead of `&mut sprites[index]`, the first returns an `Option<&mut Sprite>`, while the second returns a `&mut Sprite` and panics if there's no Sprite.

While you're thinking about deleting sprites, you may have also noticed deleting a sprite in the start / middle would cause anything referring to sprites after to be referencing the wrong element:

```rust
fn main() {
    let mut list = vec![1, 2, 3];
    let a_index = 0; // value at 0 is 1
    let b_index = 1; // value at 1 is 2

    println!("{}", list[b_index]);
    // prints "2"

    list.remove(a_index);

    println!("{}", list[b_index]);
    // prints "3", but we still wanted to print "2"
}
```

We need our indices to be stable. Instead of directly storing our sprites in a vec, we could use Option to treat positions in our vec as slots:

```rust
struct SpriteTree {
    sprite_slots: Vec<Option<Sprite>>;
}
```

If we need to delete a Sprite, instead of directly deleting the element from the list and shifting everything to the right of our element, we'll just set the value in the list to `None`. If we want to insert a new item we'll need to first search for an empty slot instead of simply appending, unless we want to waste memory.

There are some libraries based around this concept such as [slotmap](https://crates.io/crates/slotmap) and [generational arena](https://crates.io/crates/generational-arena). These track extra information such as a counter called the generation, and a few extra values to make insertion more efficient. This generation is useful as it lets us know if the value we're pointing at was deleted and replaced by something else, to help us avoid checking / overwriting something we weren't intended to point to. While we shouldn't be pointing to deleted data anyway, it's unavoidable in Lua (reference to a sprite on a deleted entity), and we use this property to generate error messages.

## This seems hard.

Initially yes, but once you've learned this pattern you'll find slotmaps can be used nearly anywhere for shared references and mutability. (Avoid Rc if you need to modify data)

Internally we also have a Tree struct for anything with parents and children. We use either slotmap directly or [hecs](https://crates.io/crates/hecs) (ECS crate) for anything simpler (ex: animators for referencing in Lua and Rust).

## What does this have to do with rollback?

While we seemed to just be talking about shared mutability, borrow checking, and ownership. We incidentally solved the rollback issue. We can back up our sprite slots list into a state history, and our sprites are referring to their parents using an index / offset that works with any of those lists to get the data of those sprites at the correct point in time.

The pattern we ended up with to replace shared pointers, works perfectly to solve a rollback problem. It's one way Rust makes easy problems hard, and hard problems easy.

A big part of verifying our code works with rollback is being careful with Cell / RefCell like structures, something that we will already be using sparingly.

We only pass these generational indices to Lua as well and not real pointers, which allows us to avoid needing to update anything within Lua to point to the right data. Of course, we do still need to roll Lua back, as there are many flying counters and variables that must be synced between players in mods, but that's something for a separate article.
