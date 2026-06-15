// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

/// List files in a directory (used for SD card ingestion)
#[tauri::command]
fn list_directory_files(path: String) -> Result<Vec<String>, String> {
    let entries = std::fs::read_dir(&path).map_err(|e| e.to_string())?;
    let mut files = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_file() {
            if let Some(ext) = path.extension() {
                let ext_lower = ext.to_string_lossy().to_lowercase();
                match ext_lower.as_str() {
                    "jpg" | "jpeg" | "png" | "raw" | "cr2" | "nef" | "arw" | "dng" => {
                        if let Some(path_str) = path.to_str() {
                            files.push(path_str.to_string());
                        }
                    }
                    _ => {}
                }
            }
        }
    }

    Ok(files)
}

/// Get file metadata (size, name)
#[tauri::command]
fn get_file_metadata(path: String) -> Result<(String, u64), String> {
    let metadata = std::fs::metadata(&path).map_err(|e| e.to_string())?;
    let name = std::path::Path::new(&path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    Ok((name, metadata.len()))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            list_directory_files,
            get_file_metadata
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
