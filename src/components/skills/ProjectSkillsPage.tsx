import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FolderKanban } from "lucide-react";
import { toast } from "sonner";
import { ProjectBar } from "./ProjectBar";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { ProjectSkillList } from "./ProjectSkillList";
import { useInstalledSkills } from "@/hooks/useSkills";
import {
  useProjects,
  useAddProject,
  useDeleteProject,
  useProjectSkillApps,
  useApplySkillToProject,
  useRemoveSkillFromProject,
  type Project,
} from "@/hooks/useProjects";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export const ProjectSkillsPage: React.FC = () => {
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [pendingSkillId, setPendingSkillId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const { data: projects = [] } = useProjects();
  const { data: installedSkills = [] } = useInstalledSkills();
  const { data: appliedIds = [] } = useProjectSkillApps(selectedProjectId);
  const appliedSet = new Set(appliedIds);

  const addProjectMutation = useAddProject();
  const deleteProjectMutation = useDeleteProject();
  const applySkillMutation = useApplySkillToProject();
  const removeSkillMutation = useRemoveSkillFromProject();

  // 选中第一个项目（当项目列表加载完成且没有选中）
  if (projects.length > 0 && !selectedProjectId) {
    setSelectedProjectId(projects[0].id);
  }

  const handleCreateProject = async (
    name: string,
    path: string,
    tools: string[],
  ) => {
    try {
      const project = await addProjectMutation.mutateAsync({ name, path, tools });
      setSelectedProjectId(project.id);
      setCreateOpen(false);
      toast.success(t("skills.project.createSuccess", { name: project.name }));
    } catch (error) {
      toast.error(t("common.error"), { description: String(error) });
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProjectMutation.mutateAsync(deleteTarget.id);
      if (selectedProjectId === deleteTarget.id) {
        const remaining = projects.filter((p) => p.id !== deleteTarget.id);
        setSelectedProjectId(remaining[0]?.id ?? null);
      }
      toast.success(
        t("skills.project.deleteSuccess", { name: deleteTarget.name }),
      );
    } catch (error) {
      toast.error(t("common.error"), { description: String(error) });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleApplySkill = async (skillId: string) => {
    if (!selectedProjectId) return;
    setPendingSkillId(skillId);
    try {
      await applySkillMutation.mutateAsync({
        projectId: selectedProjectId,
        skillId,
      });
      const skill = installedSkills.find((s) => s.id === skillId);
      toast.success(
        t("skills.project.applySuccess", {
          name: skill?.name ?? skillId,
        }),
        { closeButton: true },
      );
    } catch (error) {
      toast.error(t("common.error"), { description: String(error) });
    } finally {
      setPendingSkillId(null);
    }
  };

  const handleRemoveSkill = async (skillId: string) => {
    if (!selectedProjectId) return;
    setPendingSkillId(skillId);
    try {
      await removeSkillMutation.mutateAsync({
        projectId: selectedProjectId,
        skillId,
      });
      const skill = installedSkills.find((s) => s.id === skillId);
      toast.success(
        t("skills.project.removeSuccess", {
          name: skill?.name ?? skillId,
        }),
        { closeButton: true },
      );
    } catch (error) {
      toast.error(t("common.error"), { description: String(error) });
    } finally {
      setPendingSkillId(null);
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* 项目 Bar */}
      <ProjectBar
        projects={projects}
        selectedId={selectedProjectId}
        onSelect={setSelectedProjectId}
        onAdd={() => setCreateOpen(true)}
        onDelete={setDeleteTarget}
      />

      {/* 内容区 */}
      <div className="px-6 flex flex-col flex-1 min-h-0 overflow-hidden py-4">
        {projects.length === 0 ? (
          /* 空状态 */
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <FolderKanban size={24} className="text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t("skills.project.emptyTitle")}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {t("skills.project.emptyDescription")}
            </p>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="text-sm text-primary hover:underline"
            >
              {t("skills.project.createFirst")}
            </button>
          </div>
        ) : !selectedProject ? null : (
          <>
            {/* 项目工具标签 */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-muted-foreground">
                {t("skills.project.tools")}：
              </span>
              <div className="flex gap-1">
                {selectedProject.tools.map((tool) => (
                  <span
                    key={tool}
                    className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border-default"
                  >
                    {tool}
                  </span>
                ))}
              </div>
              <span className="text-xs text-muted-foreground ml-auto font-mono truncate max-w-[260px]" title={selectedProject.path}>
                {selectedProject.path}
              </span>
            </div>

            {/* Skills 列表 */}
            {installedSkills.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <p className="text-muted-foreground text-sm">
                  {t("skills.noInstalled")}
                </p>
              </div>
            ) : (
              <ProjectSkillList
                skills={installedSkills}
                appliedSkillIds={appliedSet}
                onApply={handleApplySkill}
                onRemove={handleRemoveSkill}
                pendingSkillId={pendingSkillId}
              />
            )}
          </>
        )}
      </div>

      {/* 创建项目对话框 */}
      <CreateProjectDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onConfirm={handleCreateProject}
        isLoading={addProjectMutation.isPending}
      />

      {/* 删除确认 */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={true}
          title={t("skills.project.deleteTitle")}
          message={t("skills.project.deleteConfirm", {
            name: deleteTarget.name,
          })}
          confirmText={t("common.delete")}
          variant="destructive"
          onConfirm={handleDeleteProject}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
