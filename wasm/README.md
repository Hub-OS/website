WASM module for parsing zips + rezipping to get a the zip with the signature as game clients.

## Building

Install [cargo-license](https://crates.io/crates/cargo-license) with `cargo install cargo-license`

Install [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/)

Run `wasm-pack build -t web` in the wasm folder and `npx linklocal` in the parent folder
