use std::env::{current_dir, set_current_dir};
use std::path::Path;

use anyhow::Result;
use async_trait::async_trait;

use crate::api::{self, RawArrowData};
use crate::connection::Connection;
use crate::utils::{build_tree, get_file_name, Table, TreeNode};

#[derive(Debug, Default)]
pub struct DuckDbDialect {
  pub path: String,
  pub cwd: Option<String>,
}

#[async_trait]
impl Connection for DuckDbDialect {
  fn dialect(&self) -> &'static str {
    "duckdb"
  }

  async fn get_db(&self) -> Result<TreeNode> {
    let conn = self.connect()?;
    let tables = get_tables(&conn, None)?;
    Ok(TreeNode {
      name: get_file_name(&self.path),
      path: self.path.clone(),
      node_type: "root".to_string(),
      children: Some(build_tree(tables)),
      size: None,
      comment: None,
    })
  }

  fn normalize(&self, name: &str) -> String {
    if name.contains(' ') {
      format!("\"{name}\"")
    } else {
      name.to_string()
    }
  }

  async fn show_schema(&self, schema: &str) -> Result<RawArrowData> {
    let sql = format!(
      "
    select * from information_schema.tables
    where table_schema='{schema}'
    order by table_type, table_name
    "
    );

    self.query(&sql, 0, 0).await
  }

  async fn query(&self, sql: &str, _limit: usize, _offset: usize) -> Result<RawArrowData> {
    api::query(&self.path, sql, 0, 0, self.cwd.clone())
  }

  async fn export(&self, sql: &str, file: &str) {
    match api::duck_fetch_all(&self.path, sql, file, self.cwd.clone()) {
      Ok(_) => println!("Export successful"),
      Err(e) => println!("Export failed: {:?}", e),
    }
  }

  async fn table_row_count(&self, table: &str, r#where: &str) -> Result<usize> {
    let conn = self.connect()?;
    let sql = self._table_count_sql(table, r#where);
    let total = conn.query_row(&sql, [], |row| row.get::<_, usize>(0))?;
    Ok(total)
  }

  async fn show_column(&self, schema: Option<&str>, table: &str) -> Result<RawArrowData> {
    let (db, tbl) = if schema.is_none() && table.contains(".") {
      let parts: Vec<&str> = table.splitn(2, '.').collect();
      (parts[0], parts[1])
    } else {
      ("", table)
    };
    let sql = format!(
      "select * from information_schema.columns where table_schema='{db}' and table_name='{tbl}'"
    );
    log::info!("show columns: {}", &sql);
    self.query(&sql, 0, 0).await
  }

  async fn drop_table(&self, schema: Option<&str>, table: &str) -> Result<String> {
    let (db, tbl) = if schema.is_none() && table.contains(".") {
      let parts: Vec<&str> = table.splitn(2, '.').collect();
      (parts[0], parts[1])
    } else {
      ("", table)
    };

    let table_name = if db.is_empty() {
      format!("{tbl}")
    } else {
      format!("{db}.{tbl}")
    };

    let sql = format!("DROP VIEW IF EXISTS {}", table_name);
    log::warn!("drop: {}", &sql);
    // TODO: raw query
    let _ = self.execute(&sql);
    let sql = format!("DROP TABLE IF EXISTS {}", table_name);
    let _ = self.execute(&sql);
    Ok(String::new())
  }

  #[allow(clippy::unused_async)]
  async fn query_count(&self, sql: &str) -> Result<usize> {
    let conn = self.connect()?;
    let total = conn.query_row(sql, [], |row| row.get::<_, usize>(0))?;
    Ok(total)
  }

  async fn execute(&self, sql: &str) -> Result<usize> {
    if let Some(cwd) = &self.cwd {
      let _ = set_current_dir(cwd);
    }
    log::info!("current_dir: {}", current_dir()?.display());
    let con = if self.path == ":memory:" {
      duckdb::Connection::open_in_memory()?
    } else {
      duckdb::Connection::open(&self.path)?
    };
    let res = con.execute(sql, [])?;
    Ok(res)
  }
}

impl DuckDbDialect {
  fn connect(&self) -> Result<duckdb::Connection> {
    Ok(duckdb::Connection::open(&self.path)?)
  }
}

pub fn get_tables(conn: &duckdb::Connection, schema: Option<&str>) -> Result<Vec<Table>> {
  let mut sql = r#"
  select table_name, table_type, table_schema, if(table_type='VIEW', 'view', 'table') as type
  from information_schema.tables
  "#
  .to_string();
  if let Some(schema) = schema {
    sql += &format!(" where table_schema='{}'", schema)
  }
  sql += " order by table_type, table_name";

  let mut stmt = conn.prepare(&sql)?;

  let rows = stmt.query_map([], |row| {
    Ok(Table {
      table_name: row.get(0)?,
      table_type: row.get(1)?,
      db_name: row.get(2)?,
      r#type: row.get(3)?,
      size: None,
      schema: None,
    })
  })?;

  let mut tables = Vec::new();
  for row in rows {
    tables.push(row?);
  }
  Ok(tables)
}

pub async fn csv2duckdb(
  path: String,
  delimiter: String,
  quote: String,
  table_name: String,
  varchar: String,
) -> Result<String, String> {
  let parent_path = Path::new(&path).parent().unwrap().to_str().unwrap();
  let file_stem = Path::new(&path).file_stem().unwrap().to_str().unwrap();
  let output_path = format!("{parent_path}/{file_stem}.duckdb");

  let conn = duckdb::Connection::open(&output_path)
    .map_err(|e| format!("Failed to open duckdb connection: {}", e))?;

  let idata = format!(
    "
    CREATE TABLE {table_name}
    AS SELECT *
    FROM read_csv('{path}', all_varchar={varchar}, sep='{delimiter}', quote='{quote}');
    "
  );

  conn
    .execute_batch(&idata)
    .map_err(|e| format!("Failed to insert csv to duckdb: {}", e))?;

  Ok("CSV imported successfully into DuckDB".to_string())
}
