use std::sync::Mutex;
use std::time::Instant;

use anyhow::Result;
use serde::Deserialize;
use serde::Serialize;
use sqlformat::{FormatOptions, QueryParams};
use tauri::State;

use crate::api::{self, ArrowResponse};
use crate::connection::Connection;
use crate::duck;
use crate::duck::DuckDbDialect;
use crate::file::FileDialect;
use crate::folder::FolderDialect;
use crate::utils::TreeNode;

pub struct OpenedUrls(pub Mutex<Option<Vec<url::Url>>>);

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct DialectPayload {
  pub dialect: String,
  pub path: Option<String>,
  pub cwd: Option<String>,
}

#[allow(clippy::unused_async)]
pub fn get_ast_dialect(dialect: &str) -> Box<dyn sqlparser::dialect::Dialect> {
  match dialect {
    "folder" | "file" | "duckdb" => Box::new(sqlparser::dialect::DuckDbDialect {}),
    _ => Box::new(sqlparser::dialect::GenericDialect {}),
  }
}

#[allow(clippy::unused_async)]
pub async fn get_dialect(
  DialectPayload { dialect, path, cwd }: DialectPayload,
) -> Option<Box<dyn Connection>> {
  match dialect.as_str() {
    "folder" => Some(Box::new(FolderDialect {
      path: path.unwrap(),
      cwd,
    })),
    "file" => Some(Box::new(FileDialect {
      path: path.unwrap(),
    })),
    "duckdb" => Some(Box::new(DuckDbDialect {
      path: path.unwrap(),
      cwd,
    })),
    _ => None,
  }
}

#[tauri::command]
pub async fn query(
  sql: String,
  limit: usize,
  offset: usize,
  dialect: DialectPayload,
) -> Result<ArrowResponse, String> {
  if let Some(d) = get_dialect(dialect).await {
    let start = Instant::now();
    let res = d.query(&sql, limit, offset).await;
    let duration = start.elapsed().as_millis();
    Ok(api::convert(res, Some(duration)))
  } else {
    Err("not support dialect".to_string())
  }
}

#[tauri::command]
pub async fn paging_query(
  sql: String,
  limit: usize,
  offset: usize,
  dialect: DialectPayload,
) -> Result<ArrowResponse, String> {
  if let Some(d) = get_dialect(dialect).await {
    let start = Instant::now();
    let res = d.paging_query(&sql, Some(limit), Some(offset)).await;
    let duration = start.elapsed().as_millis();
    Ok(api::convert(res, Some(duration)))
  } else {
    Err("not support dialect".to_string())
  }
}

#[tauri::command]
pub async fn query_table(
  table: &str,
  limit: usize,
  offset: usize,
  #[allow(non_snake_case)] orderBy: Option<String>,
  r#where: Option<String>,
  dialect: DialectPayload,
) -> Result<ArrowResponse, String> {
  let d = get_dialect(dialect.clone())
    .await
    .ok_or_else(|| format!("not support dialect {}", dialect.dialect))?;

  let start = Instant::now();
  let res = d
    .query_table(
      table,
      limit,
      offset,
      &r#where.clone().unwrap_or_default(),
      &orderBy.clone().unwrap_or_default(),
    )
    .await;
  let duration = start.elapsed().as_millis();
  Ok(api::convert(res, Some(duration)))
}

#[tauri::command]
pub async fn table_row_count(
  table: &str,
  condition: &str,
  dialect: DialectPayload,
) -> Result<usize, String> {
  if let Some(d) = get_dialect(dialect).await {
    d.table_row_count(table, condition)
      .await
      .map_err(|e| e.to_string())
  } else {
    Err("not support dialect".to_string())
  }
}

#[tauri::command]
pub async fn export(sql: String, file: String, dialect: DialectPayload) -> Result<(), String> {
  if let Some(d) = get_dialect(dialect).await {
    d.export(&sql, &file).await;
    Ok(())
  } else {
    Err("not support dialect".to_string())
  }
}

#[tauri::command]
pub async fn opened_urls(state: State<'_, OpenedUrls>) -> Result<String, String> {
  let opened_urls = if let Some(urls) = &*state.0.lock().unwrap() {
    urls
      .iter()
      .map(|u| u.as_str().replace('\\', "\\\\"))
      .collect::<Vec<_>>()
      .join(", ")
  } else {
    String::new()
  };
  Ok(opened_urls)
}

#[tauri::command]
pub async fn get_db(dialect: DialectPayload) -> Result<TreeNode, String> {
  if let Some(d) = get_dialect(dialect).await {
    d.get_db().await.map_err(|e| e.to_string())
  } else {
    Err("not support dialect".to_string())
  }
}

#[tauri::command]
pub async fn show_schema(schema: &str, dialect: DialectPayload) -> Result<ArrowResponse, String> {
  let d = get_dialect(dialect.clone())
    .await
    .ok_or_else(|| format!("not support dialect {}", dialect.dialect))?;
  let res = d.show_schema(schema).await;

  Ok(api::convert(res, None))
}

#[tauri::command]
pub async fn show_column(
  schema: Option<&str>,
  table: &str,
  dialect: DialectPayload,
) -> Result<ArrowResponse, String> {
  let d = get_dialect(dialect.clone())
    .await
    .ok_or_else(|| format!("not support dialect {}", dialect.dialect))?;
  let res = d.show_column(schema, table).await;

  Ok(api::convert(res, None))
}

#[tauri::command]
pub async fn drop_table(
  schema: Option<&str>,
  table: &str,
  dialect: DialectPayload,
) -> Result<String, String> {
  let d = get_dialect(dialect.clone())
    .await
    .ok_or_else(|| format!("not support dialect {}", dialect.dialect))?;
  // TODO: ERROR INFO
  let res = d.drop_table(schema, table).await.expect("ERROR");
  Ok(res)
}

#[tauri::command]
pub async fn format_sql(sql: &str) -> Result<String, String> {
  let params = QueryParams::default();
  let options = FormatOptions::default();
  Ok(sqlformat::format(sql, &params, &options))
}

#[tauri::command]
pub async fn find(
  value: &str,
  path: &str,
  dialect: DialectPayload,
) -> Result<ArrowResponse, String> {
  let d = get_dialect(dialect.clone())
    .await
    .ok_or_else(|| format!("not support dialect {}", dialect.dialect))?;
  let res = d.find(value, path).await;

  Ok(api::convert(res, None))
}

#[tauri::command]
pub async fn load_csv(
  path: String,
  quote: String,
  table_name: String,
  all_varchar: String,
) -> Result<String, String> {
  let start_time = Instant::now();

  match duck::csv2duckdb(path, quote, table_name, all_varchar).await {
    Ok(_) => {
      let end_time = Instant::now();
      let elapsed_time = end_time.duration_since(start_time).as_secs_f64();
      Ok(format!("{elapsed_time:.2}"))
    }
    Err(err) => Err(format!("load failed: {err}")),
  }
}
