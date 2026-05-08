import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { projectsApi, type Project } from "@/lib/api/projects";
import { invoke } from "@tauri-apps/api/core";

// ========== 项目查询 ==========

/** 获取所有项目 */
export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.getProjects(),
    staleTime: Infinity,
  });
}

/** 获取项目已应用的 skill ids */
export function useProjectSkillApps(projectId: string | null) {
  return useQuery({
    queryKey: ["projects", projectId, "skillApps"],
    queryFn: () => projectsApi.getProjectSkillApps(projectId!),
    enabled: !!projectId,
  });
}

// ========== 项目 mutations ==========

/** 创建项目 */
export function useAddProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      name,
      path,
      tools,
    }: {
      name: string;
      path: string;
      tools: string[];
    }) => projectsApi.addProject(name, path, tools),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

/** 更新项目 */
export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      name,
      tools,
    }: {
      id: string;
      name: string;
      tools: string[];
    }) => projectsApi.updateProject(id, name, tools),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

/** 删除项目 */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectsApi.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

/** 应用 Skill 到项目 */
export function useApplySkillToProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      skillId,
    }: {
      projectId: string;
      skillId: string;
    }) => projectsApi.applySkillToProject(projectId, skillId),
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({
        queryKey: ["projects", projectId, "skillApps"],
      });
    },
  });
}

/** 从项目移除 Skill */
export function useRemoveSkillFromProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      skillId,
    }: {
      projectId: string;
      skillId: string;
    }) => projectsApi.removeSkillFromProject(projectId, skillId),
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({
        queryKey: ["projects", projectId, "skillApps"],
      });
    },
  });
}

/** 选择文件夹对话框（复用 pick_directory command） */
export async function pickProjectDirectory(): Promise<string | null> {
  return invoke("pick_directory", {});
}

export type { Project };
