import { useTranslation } from "react-i18next";
import { Plus, Trash2, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Project } from "@/hooks/useProjects";

interface ProjectBarProps {
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (project: Project) => void;
}

export const ProjectBar: React.FC<ProjectBarProps> = ({
  projects,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 px-6 py-3 border-b border-border-default bg-background/50">
      <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {projects.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            {t("skills.project.noProjects")}
          </span>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className={cn(
                "group flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-md border text-xs font-medium cursor-pointer shrink-0 transition-colors",
                selectedId === project.id
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-background border-border-default text-foreground hover:border-primary/30 hover:bg-muted",
              )}
              onClick={() => onSelect(project.id)}
            >
              <span className="max-w-[140px] truncate" title={project.path}>
                {project.name}
              </span>
              <button
                type="button"
                className="opacity-0 group-hover:opacity-100 text-muted-foreground/60 hover:text-destructive transition-opacity p-0.5 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(project);
                }}
                title={t("common.delete")}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 h-7 text-xs gap-1"
        onClick={onAdd}
      >
        <Plus className="h-3.5 w-3.5" />
        {t("skills.project.add")}
      </Button>
    </div>
  );
};
