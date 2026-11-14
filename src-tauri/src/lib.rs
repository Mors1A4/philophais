use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Paragraph {
    pub r#type: String,
    pub text: String,
    #[serde(rename = "className", default)]
    pub class_name: Option<String>,
    pub key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    #[serde(rename = "paragraphKey")]
    pub paragraph_key: String,
    #[serde(rename = "startIndex")]
    pub start_index: usize,
    #[serde(rename = "endIndex")]
    pub end_index: usize,
    pub text: String,
    #[serde(rename = "selectedText")]
    pub selected_text: String,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookSummary {
    pub id: String,
    pub title: String,
    pub author: String,
    pub cover: String,
    #[serde(rename = "lastReadParagraphKey")]
    pub last_read_paragraph_key: Option<String>,
    #[serde(rename = "notesCount", default)]
    pub notes_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Book {
    pub id: String,
    pub title: String,
    pub author: String,
    pub cover: String,
    pub content: Vec<Paragraph>,
    pub notes: Option<Vec<Note>>,
    #[serde(rename = "lastReadParagraphKey")]
    pub last_read_paragraph_key: Option<String>,
}

fn get_storage_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to resolve local app data dir: {}", e))?;
    let books_dir = data_dir.join("books");
    if !books_dir.exists() {
        fs::create_dir_all(&books_dir)
            .map_err(|e| format!("Failed to create books directory: {}", e))?;
    }
    Ok(books_dir)
}

fn get_manifest_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = get_storage_dir(app)?;
    Ok(dir.join("manifest.json"))
}

fn read_manifest(app: &AppHandle) -> Vec<BookSummary> {
    if let Ok(path) = get_manifest_path(app) {
        if path.exists() {
            if let Ok(content) = fs::read_to_string(&path) {
                if let Ok(manifest) = serde_json::from_str::<Vec<BookSummary>>(&content) {
                    return manifest;
                }
            }
        }
    }
    Vec::new()
}

fn write_manifest(app: &AppHandle, manifest: &[BookSummary]) -> Result<(), String> {
    let path = get_manifest_path(app)?;
    let json = serde_json::to_string_pretty(manifest)
        .map_err(|e| format!("Failed to serialize manifest: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("Failed to write manifest: {}", e))?;
    Ok(())
}

#[tauri::command]
fn get_library_books(app: AppHandle) -> Vec<BookSummary> {
    read_manifest(&app)
}

#[tauri::command]
fn get_book_content(app: AppHandle, book_id: String) -> Result<Option<Book>, String> {
    let dir = get_storage_dir(&app)?;
    let book_file = dir.join(format!("{}.json", book_id));
    if !book_file.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(&book_file)
        .map_err(|e| format!("Failed to read book file: {}", e))?;
    let book: Book = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse book JSON: {}", e))?;
    Ok(Some(book))
}

#[tauri::command]
fn save_book(app: AppHandle, book: Book) -> Result<BookSummary, String> {
    let dir = get_storage_dir(&app)?;
    let book_file = dir.join(format!("{}.json", book.id));

    let notes_count = book.notes.as_ref().map(|n| n.len()).unwrap_or(0);
    let summary = BookSummary {
        id: book.id.clone(),
        title: book.title.clone(),
        author: book.author.clone(),
        cover: book.cover.clone(),
        last_read_paragraph_key: book.last_read_paragraph_key.clone(),
        notes_count,
    };

    // 1. Write full book content to disk
    let book_json = serde_json::to_string(&book)
        .map_err(|e| format!("Failed to serialize book: {}", e))?;
    fs::write(&book_file, book_json)
        .map_err(|e| format!("Failed to write book content to file: {}", e))?;

    // 2. Update manifest
    let mut manifest = read_manifest(&app);
    if let Some(pos) = manifest.iter().position(|b| b.id == summary.id) {
        manifest[pos] = summary.clone();
    } else {
        manifest.push(summary.clone());
    }
    write_manifest(&app, &manifest)?;

    Ok(summary)
}

#[tauri::command]
fn delete_book(app: AppHandle, book_id: String) -> Result<bool, String> {
    let dir = get_storage_dir(&app)?;
    let book_file = dir.join(format!("{}.json", book_id));
    if book_file.exists() {
        let _ = fs::remove_file(book_file);
    }

    let mut manifest = read_manifest(&app);
    manifest.retain(|b| b.id != book_id);
    write_manifest(&app, &manifest)?;

    Ok(true)
}

#[tauri::command]
fn update_book_progress(
    app: AppHandle,
    book_id: String,
    paragraph_key: String,
) -> Result<bool, String> {
    let dir = get_storage_dir(&app)?;
    let book_file = dir.join(format!("{}.json", book_id));

    if book_file.exists() {
        if let Ok(content) = fs::read_to_string(&book_file) {
            if let Ok(mut book) = serde_json::from_str::<Book>(&content) {
                book.last_read_paragraph_key = Some(paragraph_key.clone());
                if let Ok(json) = serde_json::to_string(&book) {
                    let _ = fs::write(&book_file, json);
                }
            }
        }
    }

    let mut manifest = read_manifest(&app);
    if let Some(b) = manifest.iter_mut().find(|b| b.id == book_id) {
        b.last_read_paragraph_key = Some(paragraph_key);
        let _ = write_manifest(&app, &manifest);
    }

    Ok(true)
}

#[tauri::command]
fn save_book_note(app: AppHandle, book_id: String, note: Note) -> Result<bool, String> {
    let dir = get_storage_dir(&app)?;
    let book_file = dir.join(format!("{}.json", book_id));

    if !book_file.exists() {
        return Err("Book not found".to_string());
    }

    let content = fs::read_to_string(&book_file)
        .map_err(|e| format!("Failed to read book file: {}", e))?;
    let mut book: Book = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse book JSON: {}", e))?;

    let mut notes = book.notes.unwrap_or_default();
    if let Some(pos) = notes.iter().position(|n| n.id == note.id) {
        notes[pos] = note;
    } else {
        notes.push(note);
    }
    let notes_count = notes.len();
    book.notes = Some(notes);

    let json = serde_json::to_string(&book)
        .map_err(|e| format!("Failed to serialize book: {}", e))?;
    fs::write(&book_file, json).map_err(|e| format!("Failed to write book: {}", e))?;

    let mut manifest = read_manifest(&app);
    if let Some(b) = manifest.iter_mut().find(|b| b.id == book_id) {
        b.notes_count = notes_count;
        let _ = write_manifest(&app, &manifest);
    }

    Ok(true)
}

#[tauri::command]
fn delete_book_note(app: AppHandle, book_id: String, note_id: String) -> Result<bool, String> {
    let dir = get_storage_dir(&app)?;
    let book_file = dir.join(format!("{}.json", book_id));

    if !book_file.exists() {
        return Err("Book not found".to_string());
    }

    let content = fs::read_to_string(&book_file)
        .map_err(|e| format!("Failed to read book file: {}", e))?;
    let mut book: Book = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse book JSON: {}", e))?;

    if let Some(mut notes) = book.notes {
        notes.retain(|n| n.id != note_id);
        let notes_count = notes.len();
        book.notes = Some(notes);

        let json = serde_json::to_string(&book)
            .map_err(|e| format!("Failed to serialize book: {}", e))?;
        fs::write(&book_file, json).map_err(|e| format!("Failed to write book: {}", e))?;

        let mut manifest = read_manifest(&app);
        if let Some(b) = manifest.iter_mut().find(|b| b.id == book_id) {
            b.notes_count = notes_count;
            let _ = write_manifest(&app, &manifest);
        }
    }

    Ok(true)
}

#[tauri::command]
fn get_app_version() -> String {
    "1.0.0".to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_library_books,
            get_book_content,
            save_book,
            delete_book,
            update_book_progress,
            save_book_note,
            delete_book_note,
            get_app_version,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
