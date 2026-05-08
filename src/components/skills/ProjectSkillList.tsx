import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, CheckCircle2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { InstalledSkill } from "@/hooks/useSkills";
import { cn } from "@/lib/utils";

interface ProjectSkillListProps {
  skills: InstalledSkill[];
  appliedSkillIds: Set<string>;
  onApply: (skillId: string) => void;
  onRemove: (skillId: string) => void;
  pendingSkillId: string | null;
}

export const ProjectSkillList: React.FC<ProjectSkillListProps> = ({
  skills,
  appliedSkillIds,
  onApply,
  onRemove,
  pendingSkillId,
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "applied" | "notApplied">("all");

  const filtered = skills.filter((skill) => {
    const matchesSearch =
      !search.trim() ||
      skill.name.toLowerCase().includes(search.toLowerCase()) ||
      skill.description?.toLowerCase().includes(search.toLowerCase());

    const isApplied = appliedSkillIds.has(skill.id);
    const matchesFilter =
      filter === "all" ||
      (filter === "applied" && isApplied) ||
      (filter === "notApplied" && !isApplied);

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* 搜索 + 筛选 */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("skills.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="inline-flex gap-1 rounded-md border border-border-default bg-background p-1 shrink-0">
          {(["all", "applied", "notApplied"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {t(`skills.project.filter.${f}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Skills 列表 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-muted-foreground text-sm">
              {t("skills.noResults")}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border-default overflow-hidden">
            {filtered.map((skill, index) => {
              const isApplied = appliedSkillIds.has(skill.id);
              const isPending = pendingSkillId === skill.id;

              return (
                <div
                  key={skill.id}
                  onClick={() => (isApplied ? onRemove(skill.id) : onApply(skill.id))}
                  className={cn(
                    "group flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer",
                    index !== filtered.length - 1 &&
                      "border-b border-border-default",
                  )}
                >
                  {/* 已应用图标 */}
                  <div className="w-5 shrink-0">
                    {isApplied && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </div>

                  {/* Skill 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm text-foreground truncate">
                        {skill.name}
                      </span>
                      {isApplied && (
                        <Badge
                          variant="outline"
                          className="shrink-0 text-[10px] px-1.5 py-0 h-4 border-green-500/50 text-green-600 dark:text-green-400"
                        >
                          {t("skills.project.inUse")}
                        </Badge>
                      )}
                      {(skill.repoOwner || skill.repoName) && (
                        <span className="text-xs text-muted-foreground/50 shrink-0">
                          {skill.repoOwner}/{skill.repoName}
                        </span>
                      )}
                    </div>
                    {skill.description && (
                      <p
                        className="text-xs text-muted-foreground truncate mt-0.5"
                        title={skill.description}
                      >
                        {skill.description}
                      </p>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : isApplied ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(skill.id);
                        }}
                      >
                        {t("skills.project.remove")}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          onApply(skill.id);
                        }}
                      >
                        {t("skills.project.apply")}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
