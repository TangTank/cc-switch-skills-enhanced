//! Projects 数据访问对象
//!
//! 提供项目 CRUD 及项目 Skill 应用记录的操作。

use crate::database::{lock_conn, Database};
use crate::error::AppError;
use rusqlite::params;
use serde::{Deserialize, Serialize};

/// 项目记录
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub path: String,
    /// JSON array of app ids, e.g. ["claude","codex"]
    pub tools: Vec<String>,
    pub created_at: i64,
}

/// 项目 Skill 应用记录
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSkillApp {
    pub project_id: String,
    pub skill_id: String,
    pub applied_at: i64,
}

impl Database {
    // ========== Projects CRUD ==========

    /// 获取所有项目
    pub fn get_all_projects(&self) -> Result<Vec<Project>, AppError> {
        let conn = lock_conn!(self.conn);
        let mut stmt = conn
            .prepare(
                "SELECT id, name, path, tools, created_at FROM projects ORDER BY created_at ASC",
            )
            .map_err(|e| AppError::Database(e.to_string()))?;

        let rows = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, i64>(4)?,
                ))
            })
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut projects = Vec::new();
        for row_res in rows {
            let (id, name, path, tools_json, created_at) =
                row_res.map_err(|e| AppError::Database(e.to_string()))?;
            let tools: Vec<String> =
                serde_json::from_str(&tools_json).unwrap_or_default();
            projects.push(Project {
                id,
                name,
                path,
                tools,
                created_at,
            });
        }
        Ok(projects)
    }

    /// 获取单个项目
    pub fn get_project(&self, id: &str) -> Result<Option<Project>, AppError> {
        let conn = lock_conn!(self.conn);
        let mut stmt = conn
            .prepare(
                "SELECT id, name, path, tools, created_at FROM projects WHERE id = ?1",
            )
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut rows = stmt
            .query(params![id])
            .map_err(|e| AppError::Database(e.to_string()))?;

        if let Some(row) = rows.next().map_err(|e| AppError::Database(e.to_string()))? {
            let tools_json: String = row.get(3).map_err(|e| AppError::Database(e.to_string()))?;
            let tools: Vec<String> = serde_json::from_str(&tools_json).unwrap_or_default();
            Ok(Some(Project {
                id: row.get(0).map_err(|e| AppError::Database(e.to_string()))?,
                name: row.get(1).map_err(|e| AppError::Database(e.to_string()))?,
                path: row.get(2).map_err(|e| AppError::Database(e.to_string()))?,
                tools,
                created_at: row.get(4).map_err(|e| AppError::Database(e.to_string()))?,
            }))
        } else {
            Ok(None)
        }
    }

    /// 保存项目（INSERT OR REPLACE）
    pub fn save_project(&self, project: &Project) -> Result<(), AppError> {
        let conn = lock_conn!(self.conn);
        let tools_json =
            serde_json::to_string(&project.tools).map_err(|e| AppError::Database(e.to_string()))?;
        conn.execute(
            "INSERT OR REPLACE INTO projects (id, name, path, tools, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![project.id, project.name, project.path, tools_json, project.created_at],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
        Ok(())
    }

    /// 删除项目（级联删除 project_skill_apps）
    pub fn delete_project(&self, id: &str) -> Result<(), AppError> {
        let conn = lock_conn!(self.conn);
        conn.execute("DELETE FROM projects WHERE id = ?1", params![id])
            .map_err(|e| AppError::Database(e.to_string()))?;
        Ok(())
    }

    // ========== Project Skill Apps ==========

    /// 获取项目已应用的 skill ids
    pub fn get_project_skill_ids(&self, project_id: &str) -> Result<Vec<String>, AppError> {
        let conn = lock_conn!(self.conn);
        let mut stmt = conn
            .prepare(
                "SELECT skill_id FROM project_skill_apps WHERE project_id = ?1 ORDER BY applied_at ASC",
            )
            .map_err(|e| AppError::Database(e.to_string()))?;

        let rows = stmt
            .query_map(params![project_id], |row| row.get::<_, String>(0))
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut ids = Vec::new();
        for row_res in rows {
            ids.push(row_res.map_err(|e| AppError::Database(e.to_string()))?);
        }
        Ok(ids)
    }

    /// 添加项目 Skill 应用记录
    pub fn add_project_skill_app(
        &self,
        project_id: &str,
        skill_id: &str,
        applied_at: i64,
    ) -> Result<(), AppError> {
        let conn = lock_conn!(self.conn);
        conn.execute(
            "INSERT OR REPLACE INTO project_skill_apps (project_id, skill_id, applied_at) VALUES (?1, ?2, ?3)",
            params![project_id, skill_id, applied_at],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
        Ok(())
    }

    /// 删除项目 Skill 应用记录
    pub fn remove_project_skill_app(
        &self,
        project_id: &str,
        skill_id: &str,
    ) -> Result<(), AppError> {
        let conn = lock_conn!(self.conn);
        conn.execute(
            "DELETE FROM project_skill_apps WHERE project_id = ?1 AND skill_id = ?2",
            params![project_id, skill_id],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
        Ok(())
    }

    /// 删除 skill 相关的所有项目应用记录（skill 被卸载时调用）
    pub fn remove_project_skill_apps_by_skill(&self, skill_id: &str) -> Result<(), AppError> {
        let conn = lock_conn!(self.conn);
        conn.execute(
            "DELETE FROM project_skill_apps WHERE skill_id = ?1",
            params![skill_id],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
        Ok(())
    }
}
