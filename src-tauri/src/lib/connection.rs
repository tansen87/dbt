use async_trait::async_trait;

use anyhow::Result;

use crate::api::RawArrowData;
use crate::ast;
use crate::utils::TreeNode;

#[async_trait]
pub trait Connection: Sync + Send {
  async fn get_db(&self) -> Result<TreeNode>;
  async fn query(&self, _sql: &str, _limit: usize, _offset: usize) -> Result<RawArrowData> {
    unimplemented!()
  }

  async fn query_count(&self, _sql: &str) -> Result<usize> {
    unimplemented!()
  }
  async fn query_all(&self, _sql: &str) -> Result<RawArrowData> {
    unimplemented!()
  }

  fn dialect(&self) -> &'static str {
    "generic"
  }

  async fn paging_query(
    &self,
    sql: &str,
    limit: Option<usize>,
    offset: Option<usize>,
  ) -> Result<RawArrowData> {
    let mut sql = sql.to_string();

    let dialect = self.dialect();
    let stmt = ast::first_stmt(dialect, &sql);

    if let Some(ref _stmt) = stmt {
      sql = ast::limit_stmt(dialect, _stmt, limit, offset).unwrap_or(sql);
    }
    let mut res = self.query(&sql, 0, 0).await?;

    // get total row count
    if let Some(ref _stmt) = stmt {
      if let Some(count_sql) = ast::count_stmt(dialect, _stmt) {
        log::info!("count_sql: {count_sql}");
        if let Ok(count) = self.query_count(&count_sql).await {
          res.total = count;
        };
      }
    }
    Ok(res)
  }

  async fn _sql_row_count(&self, _sql: &str) -> Result<usize> {
    unimplemented!()
  }

  async fn query_table(
    &self,
    table: &str,
    limit: usize,
    offset: usize,
    where_: &str,
    order_by: &str,
  ) -> Result<RawArrowData> {
    let mut sql = self._table_query_sql(table, where_, order_by);

    if limit != 0 {
      sql = format!("{sql} limit {limit}");
    }
    if offset != 0 {
      sql = format!("{sql} offset {offset}");
    }
    println!("query table {}: {}", table, sql);
    let res = self.query(&sql, 0, 0).await;

    let total = self
      .table_row_count(table, where_)
      .await
      .unwrap_or_default();

    res.map(|r| RawArrowData { total, ..r })
  }

  async fn show_schema(&self, _schema: &str) -> Result<RawArrowData> {
    unimplemented!()
  }

  async fn show_column(&self, _schema: Option<&str>, _table: &str) -> Result<RawArrowData> {
    unimplemented!()
  }

  async fn drop_table(&self, _schema: Option<&str>, _table: &str) -> Result<String> {
    unimplemented!()
  }

  async fn table_row_count(&self, _table: &str, _where: &str) -> Result<usize> {
    unimplemented!()
  }

  fn _table_count_sql(&self, table: &str, where_: &str) -> String {
    let mut sql = format!("select count(*) from {table}");
    if !where_.trim().is_empty() {
      sql = format!("{sql} where {where_}");
    }
    sql
  }

  fn normalize(&self, name: &str) -> String {
    if name.contains(' ') {
      format!("`{name}`")
    } else {
      name.to_string()
    }
  }

  fn _table_query_sql(&self, table: &str, where_: &str, order_by: &str) -> String {
    let table = self.normalize(table);
    let mut sql = format!("select * from {table}");
    if !where_.trim().is_empty() {
      sql = format!("{sql} where {where_}");
    }
    if !order_by.trim().is_empty() {
      sql = format!("{sql} order by {order_by}");
    }
    sql
  }

  async fn export(&self, _sql: &str, _file: &str) {
    unimplemented!()
  }

  async fn find(&self, value: &str, path: &str) -> Result<RawArrowData> {
    unimplemented!()
  }
  async fn execute(&self, sql: &str) -> Result<usize> {
    unimplemented!()
  }
}
