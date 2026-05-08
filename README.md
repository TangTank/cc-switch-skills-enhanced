> **Enhanced Edition**: This project is an enhanced version of [farion1231/cc-switch](https://github.com/farion1231/cc-switch) with project-level Skills management capabilities. Thank you to the original author for open-sourcing this excellent tool.

## 🚀 New Feature: Project-Level Skills Management

This enhanced version adds **Project-Dimension Skills Management** to the original CC Switch, allowing developers to configure different Skill sets for different project directories.

English | [中文](README_ZH.md) 
### What's New

- **📁 Project-Based Skills Configuration**: Create separate Skill profiles for each project directory
- **🔧 Per-Project Tools**: Select which development tools (Claude, Codex, Gemini, etc.) each project uses
- **🎯 Granular Control**: Apply/remove Skills at project level without affecting global configurations
- **📊 Smart Synchronization**: Automatically sync Skills to project tool directories (prefer symlinks, fallback to copy)
- **💾 Persistent State**: Database-backed project and skill application tracking (SQLite v11 schema)

### How It Works

1. Click the "Project Skills" icon next to the global Skills button
2. Create a project: Select directory → Name it → Choose development tools
3. In the Skills list, toggle Skills on/off for each project
4. Skills are automatically synced to `<project_path>/.<tool>/skills/` directories

### Vibe Coding PRD

See [`docs/skills-project-dimension-prd.md`](docs/skills-project-dimension-prd.md) for the complete product requirements document.

---
