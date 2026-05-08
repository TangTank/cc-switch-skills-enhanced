import { invoke } from "@tauri-apps/api/core";

/** 项目记录 */
export interface Project {
  id: string;
  name: string;
  path: string;
  /** 已选工具列表，格式为相对路径如 [".claude/skills", ".qoder/skills"]，兼容旧格式 ["claude"] */
  tools: string[];
  createdAt: number;
}

export const projectsApi = {
  /** 获取所有项目 */
  async getProjects(): Promise<Project[]> {
    return invoke("get_projects");
  },

  /** 创建项目 */
  async addProject(name: string, path: string, tools: string[]): Promise<Project> {
    return invoke("add_project", { name, path, tools });
  },

  /** 更新项目名称/工具 */
  async updateProject(id: string, name: string, tools: string[]): Promise<Project> {
    return invoke("update_project", { id, name, tools });
  },

  /** 删除项目 */
  async deleteProject(id: string): Promise<void> {
    return invoke("delete_project", { id });
  },

  /** 获取项目已应用的 skill ids */
  async getProjectSkillApps(projectId: string): Promise<string[]> {
    return invoke("get_project_skill_apps", { projectId });
  },

  /** 将 skill 应用到项目工具目录 */
  async applySkillToProject(projectId: string, skillId: string): Promise<void> {
    return invoke("apply_skill_to_project", { projectId, skillId });
  },

  /** 从项目工具目录移除 skill */
  async removeSkillFromProject(projectId: string, skillId: string): Promise<void> {
    return invoke("remove_skill_from_project", { projectId, skillId });
  },

  /** 扫描指定目录下所有以 `.` 开头的子目录，返回目录名列表 */
  async listDotDirectories(path: string): Promise<string[]> {
    return invoke("list_dot_directories", { path });
  },
};
