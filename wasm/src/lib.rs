use std::collections::HashMap;
use std::io::{Cursor, Read, Write};
use wasm_bindgen::prelude::*;
use zip::read::ZipFile;
use zip::result::ZipResult;
use zip::write::FileOptions as ZipFileOptions;
use zip::ZipWriter;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn error(s: &str);
}

#[wasm_bindgen]
pub fn hook_panics() {
    use console_error_panic_hook;
    use std::panic;

    panic::set_hook(Box::new(console_error_panic_hook::hook));
}

#[wasm_bindgen]
pub fn read_file(bytes: &[u8], name: &str) -> Result<Vec<u8>, String> {
    let cursor = Cursor::new(bytes);
    let mut archive = zip::ZipArchive::new(cursor).map_err(|err| err.to_string())?;

    let mut file = archive.by_name(name).map_err(|err| err.to_string())?;
    let mut buffer = Vec::new();

    let _ = file.read_to_end(&mut buffer);

    Ok(buffer)
}

#[wasm_bindgen]
pub fn rezip_packages(bytes: &[u8]) -> Result<js_sys::Array, String> {
    if zip_has_file(bytes, "package.toml").map_err(|err| err.to_string())? {
        let rezipped_bytes = rezip_single(bytes).map_err(|err| err.to_string())?;

        let arr = js_sys::Array::new();
        arr.push(&js_sys::Uint8Array::from(rezipped_bytes.as_slice()));

        Ok(arr)
    } else {
        let arr = rezip_root_folders(bytes)
            .map_err(|err| err.to_string())?
            .map(|result| {
                result.map(|rezipped_bytes| {
                    JsValue::from(&js_sys::Uint8Array::from(rezipped_bytes.as_slice()))
                })
            })
            .collect::<ZipResult<js_sys::Array>>();

        Ok(arr.map_err(|err| err.to_string())?)
    }
}

pub fn zip_has_file(bytes: &[u8], name: &str) -> ZipResult<bool> {
    let cursor = Cursor::new(bytes);
    let mut archive = zip::ZipArchive::new(cursor)?;

    let exists = archive.by_name(name).is_ok();

    Ok(exists)
}

pub fn rezip_single(bytes: &[u8]) -> ZipResult<Vec<u8>> {
    let mut entries = Vec::new();

    extract(bytes, |path, mut file| {
        if file.is_dir() {
            // skip folders, wastes space
            return;
        }

        let mut bytes = Vec::new();
        let _ = file.read_to_end(&mut bytes);
        entries.push((path, bytes));
    })?;

    zip_entries(entries)
}

pub fn rezip_root_folders(bytes: &[u8]) -> ZipResult<impl Iterator<Item = ZipResult<Vec<u8>>>> {
    let mut folder_map = HashMap::new();

    extract(bytes, |path, mut file| {
        if file.is_dir() {
            // skip folders, wastes space
            return;
        }

        let Some((key, path)) = path.split_once('/') else {
            return;
        };

        let entries = folder_map.entry(key.to_string()).or_insert_with(Vec::new);

        let mut bytes = Vec::new();
        let _ = file.read_to_end(&mut bytes);
        entries.push((path.to_string(), bytes));
    })?;

    let mut folder_map_vec: Vec<_> = folder_map.into_iter().collect();
    folder_map_vec.sort_by_cached_key(|(key, _)| key.clone());

    Ok(folder_map_vec
        .into_iter()
        .rev()
        .map(|(_, entries)| zip_entries(entries)))
}

fn zip_entries(mut entries: Vec<(String, Vec<u8>)>) -> ZipResult<Vec<u8>> {
    entries.sort_by_cached_key(|(path, _)| path.clone());

    let mut data = Vec::new();

    {
        let cursor = Cursor::new(&mut data);
        let mut zip_writer = ZipWriter::new(cursor);
        let file_options = ZipFileOptions::default();

        for (path, bytes) in entries {
            let _ = zip_writer.start_file(path, file_options);
            let _ = zip_writer.write_all(&bytes);
        }

        zip_writer.finish()?;
    }

    Ok(data)
}

fn extract(bytes: &[u8], mut file_callback: impl FnMut(String, ZipFile)) -> ZipResult<()> {
    let cursor = Cursor::new(bytes);
    let mut archive = zip::ZipArchive::new(cursor)?;

    for i in 0..archive.len() {
        let file = match archive.by_index(i) {
            Ok(file) => file,
            Err(_) => {
                // log::error!("failed to grab a file within zip: {}", err);
                continue;
            }
        };

        let path = match file.enclosed_name().and_then(|path| path.to_str()) {
            Some(path) => clean_path(path),
            None => {
                // log::error!("invalid file name within zip {:?}", file.name());
                continue;
            }
        };

        file_callback(path, file);
    }

    Ok(())
}

fn clean_path(path_str: &str) -> String {
    path_clean::clean(path_str.replace('\\', "/"))
        .to_str()
        .unwrap_or_default()
        .to_string()
}
