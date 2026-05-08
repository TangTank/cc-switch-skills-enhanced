# PRD：Skills 项目维度管理

**版本**：1.0  
**日期**：2026-05-08  
**状态**：已确认

---

## 一、执行摘要

当前 Skills 管理页面仅支持**全局维度**——即某个 Skill 在某个 AI 开发工具（claude/codex/gemini 等）下全局生效。用户需要更细粒度的控制：在不同项目目录中，为该项目使用的开发工具单独配置 Skill 列表。

本 PRD 描述在现有界面基础上新增「项目 Skills 管理」功能模块的完整需求，包括：

1. 首页新增「项目 Skills 管理」入口图标（与现有全局入口并排）
2. 独立的项目 Skills 管理页面，上方为项目 Bar，下方为 Skills 列表（标记使用中）
3. 项目创建流程：选择目录 → 勾选工具 → 完成
4. Skill 应用流程：在项目 Skills 列表中点击应用/取消，将 Skill 文件写入/移除项目工具目录

---

## 二、背景与问题陈述

### 现状

- `UnifiedSkillsPanel`：已安装 Skills 的全局管理，通过 `AppToggleGroup` 控制 skill 在各 AI 工具下的全局启用状态
- Skill 文件路径：全局安装时同步到各工具的全局 skills 目录（如 `~/.claude/skills/`）

### 问题

用户在不同项目中使用不同的 Skill 集合。若全局启用所有 Skill，会增加 AI 上下文噪音；若频繁手动切换全局状态，操作繁琐。

### 目标

允许用户为项目目录单独维护一套 Skill 配置，Skill 应用时写入项目下工具专属目录（如 `<project>/.qoder/skills/`）。

---

## 三、用户故事

| ID | 角色 | 故事 | 验收标准 |
|----|------|------|----------|
| US-1 | 开发者 | 我想为我的项目创建一个 Skill 配置，这样只有在该项目下使用时才会加载对应 Skill | 创建项目后，下方显示已安装 Skills 列表，标记哪些已应用到此项目 |
| US-2 | 开发者 | 我想选择项目目录并指定使用哪些开发工具 | 创建对话框中有目录选择器和工具多选框，完成后项目出现在 Bar 中 |
| US-3 | 开发者 | 我想在项目 Skills 列表中将某个 Skill 应用到项目工具目录中 | 点击「应用」后，Skill 文件被链接/复制到对应的项目工具 skills 目录 |
| US-4 | 开发者 | 我想取消某个已应用的 Skill | 点击「取消」后，Skill 从对应项目工具目录中移除 |
| US-5 | 开发者 | 我想在全局 Skills 管理旁边快速进入项目 Skills 管理 | 首页 Skills 管理图标旁有一个「项目 Skills」图标入口 |

---

## 四、功能规格

### 4.1 入口（App.tsx / 导航栏改造）

- 在现有 Skills 管理图标（`Sparkles`）旁，新增「项目 Skills」图标按钮（使用 `FolderCode` 或 `FolderKanban` 图标）
- 点击进入新视图 `"projectSkills"`

### 4.2 项目 Skills 管理页面（`ProjectSkillsPage`）

**布局**：
```
┌─────────────────────────────────────────────────┐
│  项目 Bar（横向滚动，卡片切换）         [+ 添加]  │
│  [项目A ×]  [项目B ×]  [项目C ×]               │
├─────────────────────────────────────────────────┤
│  搜索框                      筛选（已应用/全部）  │
├─────────────────────────────────────────────────┤
│  Skill 列表                                      │
│  ○ skill-name   描述    [应用] or [使用中 取消] │
│  ...                                             │
└─────────────────────────────────────────────────┘
```

### 4.3 创建项目流程

1. 点击 `[+ 添加]` 按钮，弹出 `CreateProjectDialog`
2. 对话框包含：
   - 选择目录按钮（调用 `open_folder_dialog` → `tauri_plugin_dialog::pick_folder`）
   - 项目名称输入框（默认为目录名，可修改）
   - 开发工具多选（复用 `AppToggleGroup` 或 Checkbox 组）：claude / codex / gemini / opencode / hermes
3. 点击「确定」：
   - 写入 `projects` 表（id, name, path, tools JSON, created_at）
   - 关闭对话框，项目出现在 Bar

### 4.4 项目 Skill 应用

**应用**：用户点击 Skill 行的「应用」按钮
- 调用后端 `apply_skill_to_project(project_id, skill_id)` command
- 后端逻辑：读取 `InstalledSkill.directory`（全局 skill 文件路径），对项目中每个已选工具，将 skill 目录 symlink 或复制到 `<project_path>/.<tool>/skills/<skill_dir_name>`
- 写入 `project_skill_apps`（project_id, skill_id）

**取消**：用户点击「取消」按钮
- 调用 `remove_skill_from_project(project_id, skill_id)` command
- 后端删除对应的 skill 文件/symlink，更新数据库

### 4.5 工具目录映射

| 工具 AppId | 项目内目录 |
|-----------|-----------|
| claude | `<project>/.claude/skills/` |
| codex | `<project>/.codex/skills/` |（待确认，Codex 实际目录名称） |
| gemini | `<project>/.gemini/skills/` |
| opencode | `<project>/.opencode/skills/` |
| hermes | `<project>/.hermes/skills/` |
| qoder（待支持）| `<project>/.qoder/skills/` |

> 参考：全局 Skills 的同步逻辑已在 `services/skill.rs` 中的 `sync_skill_to_apps` 实现，项目维度复用相同策略但目标目录为项目路径下。

---

## 五、数据模型

### 新增 SQLite 表

```sql
-- 项目表
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    tools TEXT NOT NULL DEFAULT '[]',  -- JSON array: ["claude","codex",...]
    created_at INTEGER NOT NULL DEFAULT 0
);

-- 项目 Skill 应用记录
CREATE TABLE IF NOT EXISTS project_skill_apps (
    project_id TEXT NOT NULL,
    skill_id   TEXT NOT NULL,
    applied_at INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (project_id, skill_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id)   REFERENCES skills(id) ON DELETE CASCADE
);
```

### Schema 版本

从 `SCHEMA_VERSION = 10` 升级到 `11`，新增 `migrate_v10_to_v11`（仅 CREATE TABLE IF NOT EXISTS）。

---

## 六、API 设计

### Tauri Commands（`commands/project.rs`）

| Command | 参数 | 返回 | 说明 |
|---------|------|------|------|
| `get_projects` | — | `Vec<Project>` | 获取所有项目 |
| `add_project` | `name, path, tools` | `Project` | 创建项目 |
| `update_project` | `id, name, tools` | `Project` | 修改项目名/工具 |
| `delete_project` | `id` | `()` | 删除项目 |
| `get_project_skill_apps` | `project_id` | `Vec<String>` (skill_ids) | 获取项目已应用 Skills |
| `apply_skill_to_project` | `project_id, skill_id` | `()` | 应用 Skill 到项目工具目录 |
| `remove_skill_from_project` | `project_id, skill_id` | `()` | 从项目工具目录移除 Skill |
| `open_folder_dialog` | — | `Option<String>` | 弹出文件夹选择器 |

---

## 七、UI 组件设计

### 新增文件

| 文件 | 说明 |
|------|------|
| `src/components/skills/ProjectSkillsPage.tsx` | 项目 Skills 管理主页面 |
| `src/components/skills/ProjectBar.tsx` | 项目 Bar（横向卡片列表） |
| `src/components/skills/CreateProjectDialog.tsx` | 创建项目对话框 |
| `src/components/skills/ProjectSkillList.tsx` | 项目下的 Skills 列表 |
| `src/hooks/useProjects.ts` | 项目相关 TanStack Query hooks |
| `src/lib/api/projects.ts` | 项目 API invoke 封装 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `src/App.tsx` | 新增 `"projectSkills"` 视图路由，侧边栏/导航新增入口图标 |
| `src/i18n/locales/zh.json` + `en.json` + `ja.json` | 新增 `skills.project.*` 系列 key |

---

## 八、验收标准

- [ ] 首页导航中存在「项目 Skills」入口图标
- [ ] 进入页面后可创建项目（选目录 + 命名 + 选工具）
- [ ] 项目 Bar 显示已创建项目，支持切换/删除
- [ ] 下方 Skills 列表显示所有已安装 Skills，已应用项标记「使用中」
- [ ] 点击「应用」后，Skill 文件出现在项目工具目录下
- [ ] 点击「取消」后，Skill 文件从项目工具目录中移除
- [ ] 数据库版本升级到 v11 且无破坏性迁移
- [ ] 三语言（zh/en/ja）i18n 文案覆盖

---

## 九、风险与约束

| 风险 | 缓解措施 |
|------|----------|
| Symlink 在 Windows 上需要管理员权限 | 降级为文件复制；或在创建时提示用户 |
| 项目路径被删除后 skill 文件失效 | 应用时验证项目路径可访问，否则提示 |
| 不同工具的 skills 目录路径不确定 | 参考 `services/skill.rs` 中 `get_skill_dir_for_app` 逻辑，复用或抽取公共函数 |
| 大量 Skills 时列表性能 | 已有 Skills 列表通常 < 100 条，无需虚拟化 |
