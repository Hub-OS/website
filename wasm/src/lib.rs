use std::io::{Cursor, Read, Write};
use wasm_bindgen::prelude::*;
use zip::read::ZipFile;
use zip::result::ZipResult;
use zip::write::FileOptions as ZipFileOptions;
use zip::{CompressionMethod, ZipWriter};

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

    return Ok(buffer);
}

#[wasm_bindgen]
pub fn rezip(input: &[u8]) -> Result<Vec<u8>, String> {
    let file_options = ZipFileOptions::default().compression_method(CompressionMethod::Zstd);

    let mut data = Vec::new();

    {
        let cursor = Cursor::new(&mut data);
        let mut zip_writer = ZipWriter::new(cursor);

        let mut entries = Vec::new();

        extract(input, |path, mut file| {
            let mut bytes = Vec::new();
            let _ = file.read_to_end(&mut bytes);
            entries.push((path, bytes));
        })
        .map_err(|err| err.to_string())?;

        entries.sort_by_cached_key(|(path, _)| path.clone());

        for (path, bytes) in entries {
            let _ = zip_writer.start_file(path, file_options);
            let _ = zip_writer.write_all(&bytes);
        }

        zip_writer.finish().map_err(|err| err.to_string())?;
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

    return Ok(());
}

fn clean_path(path_str: &str) -> String {
    path_clean::clean(&path_str.replace('\\', "/"))
}
