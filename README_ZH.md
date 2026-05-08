

> **增强版说明**：本项目基于 [farion1231/cc-switch](https://github.com/farion1231/cc-switch) 进行了增强，新增项目级 Skills 管理能力。感谢原作者的开源分享。

## 🚀 新增功能：项目维度 Skills 管理

本增强版在原版 CC Switch 的基础上新增了 **项目维度 Skills 管理** 功能，允许开发者针对不同项目目录配置独立的 Skill 集合。

### 新增特性

1. **📁 项目级 Skills 配置**：为每个项目目录创建独立的 Skill 配置文件
2. **🔧 项目工具选择**：为每个项目选择使用的开发工具（Claude、Codex、Gemini 等）
3. **🎯 细粒度控制**：在项目级别启用/禁用 Skills，不影响全局配置
4. **📊 智能同步**：自动将 Skills 同步到项目工具目录（优先使用符号链接，失败时回退到复制）
5. **💾 持久化存储**：基于数据库的项目和 Skill 应用状态追踪（SQLite v11 schema）

### 使用方式

1. 点击全局 Skills 按钮旁的「项目 Skills」图标
2. 创建项目：选择目录 → 命名 → 选择开发工具
3. 在 Skills 列表中，为每个项目勾选/取消勾选 Skills
4. Skills 自动同步到 `<项目路径>/.<工具>/skills/` 目录下

### VibeCoding PRD

完整的产品需求文档请参考 [`docs/skills-project-dimension-prd.md`](docs/skills-project-dimension-prd.md)。

---
