//! 项目 Skills 管理命令层
//!
//! 提供项目 CRUD 及项目维度 Skill 应用/取消的 Tauri commands。

use crate::app_config::AppType;
use crate::database::dao::projects::Project;
use crate::services::skill::SkillService;
use crate::store::AppState;
use chrono::Utc;
use std::path::Path;
use tauri::State;
use uuid::Uuid;

fn parse_app_type(app: &str) -> Result<AppType, String> {
    match app.to_lowercase().as_str() {
        "claude" => Ok(AppType::Claude),
        "codex" => Ok(AppType::Codex),
        "gemini" => Ok(AppType::Gemini),
        "opencode" => Ok(AppType::OpenCode),
        "openclaw" => Ok(AppType::OpenClaw),
        "hermes" => Ok(AppType::Hermes),
        _ => Err(format!("不支持的 app 类型: {app}")),
    }
}

/// 获取工具在项目内的 skills 目录（旧格式 fallback）
/// 规则：<project_path>/.<tool_dir_name>/skills/
fn get_project_app_skills_dir(project_path: &str, app: &AppType) -> std::path::PathBuf {
    let base = Path::new(project_path);
    match app {
        AppType::Claude => base.join(".claude").join("skills"),
        AppType::Codex => base.join(".codex").join("skills"),
        AppType::Gemini => base.join(".gemini").join("skills"),
        AppType::OpenCode => base.join(".opencode").join("skills"),
        AppType::OpenClaw => base.join(".openclaw").join("skills"),
        AppType::Hermes => base.join(".hermes").join("skills"),
    }
}

/// 解析工具的 skills 目录（支持新格式和旧格式）
///
/// - 新格式：`".claude/skills"` → `<project_path>/.claude/skills`
/// - 旧格式：`"claude"` → `<project_path>/.claude/skills`（通过 parse_app_type fallback）
fn resolve_project_skills_dir(project_path: &str, tool: &str) -> Option<std::path::PathBuf> {
    if tool.contains('/') {
        // 新格式：直接作为相对路径拼接
        Some(Path::new(project_path).join(tool))
    } else {
        // 旧格式：走 parse_app_type fallback
        match parse_app_type(tool) {
            Ok(app) => Some(get_project_app_skills_dir(project_path, &app)),
            Err(e) => {
                log::warn!("跳过未知工具 {tool}: {e}");
                None
            }
        }
    }
}

/// 扫描指定目录下所有以 `.` 开头的子目录，返回目录名列表
#[tauri::command]
pub fn list_dot_directories(path: String) -> Result<Vec<String>, String> {
    let dir = Path::new(&path);
    if !dir.is_dir() {
        return Err(format!("路径不存在或不是目录: {path}"));
    }

    let entries = std::fs::read_dir(dir).map_err(|e| format!("读取目录失败: {e}"))?;

    let mut dot_dirs: Vec<String> = entries
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let file_name = entry.file_name();
            let name = file_name.to_string_lossy();
            if name.starts_with('.') && entry.path().is_dir() {
                Some(name.to_string())
            } else {
                None
            }
        })
        .collect();

    dot_dirs.sort();
    Ok(dot_dirs)
}

// ========== 项目 CRUD ==========

#[tauri::command]
pub fn get_projects(state: State<AppState>) -> Result<Vec<Project>, String> {
    state
        .db
        .get_all_projects()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_project(
    state: State<AppState>,
    name: String,
    path: String,
    tools: Vec<String>,
) -> Result<Project, String> {
    // 验证路径存在
    if !Path::new(&path).is_dir() {
        return Err(format!("项目目录不存在或不可访问: {path}"));
    }

    let project = Project {
        id: Uuid::new_v4().to_string(),
        name,
        path,
        tools,
        created_at: Utc::now().timestamp(),
    };

    state
        .db
        .save_project(&project)
        .map_err(|e| e.to_string())?;

    Ok(project)
}

#[tauri::command]
pub fn update_project(
    state: State<AppState>,
    id: String,
    name: String,
    tools: Vec<String>,
) -> Result<Project, String> {
    let existing = state
        .db
        .get_project(&id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("项目不存在: {id}"))?;

    let updated = Project {
        id: existing.id,
        name,
        path: existing.path,
        tools,
        created_at: existing.created_at,
    };

    state
        .db
        .save_project(&updated)
        .map_err(|e| e.to_string())?;

    Ok(updated)
}

#[tauri::command]
pub fn delete_project(state: State<AppState>, id: String) -> Result<(), String> {
    state
        .db
        .delete_project(&id)
        .map_err(|e| e.to_string())
}

// ========== 项目 Skill 应用 ==========

#[tauri::command]
pub fn get_project_skill_apps(
    state: State<AppState>,
    project_id: String,
) -> Result<Vec<String>, String> {
    state
        .db
        .get_project_skill_ids(&project_id)
        .map_err(|e| e.to_string())
}

/// 应用 Skill 到项目工具目录
///
/// 对项目选定的每个工具，将 SSOT 中的 skill 目录 symlink 或复制到
/// `<project_path>/.<tool>/skills/<skill_dir_name>`
#[tauri::command]
pub fn apply_skill_to_project(
    state: State<AppState>,
    project_id: String,
    skill_id: String,
) -> Result<(), String> {
    // 获取项目信息
    let project = state
        .db
        .get_project(&project_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("项目不存在: {project_id}"))?;

    // 获取 skill 信息
    let skills = state
        .db
        .get_all_installed_skills()
        .map_err(|e| e.to_string())?;
    let skill = skills
        .get(&skill_id)
        .ok_or_else(|| format!("Skill 不存在: {skill_id}"))?
        .clone();

    // 对每个已选工具同步
    for tool_str in &project.tools {
        let target_dir = match resolve_project_skills_dir(&project.path, tool_str) {
            Some(d) => d,
            None => continue,
        };
        std::fs::create_dir_all(&target_dir)
            .map_err(|e| format!("创建目录失败 {}: {e}", target_dir.display()))?;

        let dest = target_dir.join(&skill.directory);
        // 如已存在则跳过
        if dest.exists() || SkillService::is_symlink_pub(&dest) {
            continue;
        }

        SkillService::sync_to_custom_dir(&skill.directory, &target_dir)
            .map_err(|e| format!("同步 skill 到项目失败: {e}"))?;
    }

    // 写入数据库
    state
        .db
        .add_project_skill_app(&project_id, &skill_id, Utc::now().timestamp())
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// 从项目工具目录移除 Skill
#[tauri::command]
pub fn remove_skill_from_project(
    state: State<AppState>,
    project_id: String,
    skill_id: String,
) -> Result<(), String> {
    let project = state
        .db
        .get_project(&project_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("项目不存在: {project_id}"))?;

    let skills = state
        .db
        .get_all_installed_skills()
        .map_err(|e| e.to_string())?;
    let skill = skills
        .get(&skill_id)
        .ok_or_else(|| format!("Skill 不存在: {skill_id}"))?
        .clone();

    for tool_str in &project.tools {
        let target_dir = match resolve_project_skills_dir(&project.path, tool_str) {
            Some(d) => d,
            None => continue,
        };
        let dest = target_dir.join(&skill.directory);

        if dest.exists() || SkillService::is_symlink_pub(&dest) {
            SkillService::remove_from_dir_pub(&dest)
                .map_err(|e| format!("移除 skill 失败: {e}"))?;
        }
    }

    state
        .db
        .remove_project_skill_app(&project_id, &skill_id)
        .map_err(|e| e.to_string())?;

    Ok(())
}
