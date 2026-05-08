import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FolderOpen, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { projectsApi } from "@/lib/api/projects";
import { pickProjectDirectory } from "@/hooks/useProjects";

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (name: string, path: string, tools: string[]) => void;
  isLoading?: boolean;
}

/** 已知工具默认预选规则：configDir → 默认 skills 文件夹 */
const KNOWN_TOOLS_MAP: Record<string, string> = {
  ".claude": "skills",
  ".codex": "skills",
  ".gemini": "skills",
  ".opencode": "skills",
  ".openclaw": "skills",
  ".hermes": "skills",
};

function buildToolPath(configDir: string, skillsDir: string): string {
  return `${configDir}/${skillsDir}`;
}

export const CreateProjectDialog: React.FC<CreateProjectDialogProps> = ({
  open,
  onClose,
  onConfirm,
  isLoading,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [picking, setPicking] = useState(false);

  // 扫描到的点目录列表（每项格式：{ configDir, skillsDir, toolPath }）
  const [dotDirs, setDotDirs] = useState<string[]>([]);
  const [scanLoading, setScanLoading] = useState(false);

  // 已选的工具路径列表（格式如 ".claude/skills"）
  const [selectedTools, setSelectedTools] = useState<string[]>([]);

  // 自定义工具输入
  const [customConfigDir, setCustomConfigDir] = useState("");
  const [customSkillsDir, setCustomSkillsDir] = useState("skills");
  const [customError, setCustomError] = useState("");

  // 用户额外手动添加的工具列表（configDir -> skillsDir），用于超出扫描范围的自定义条目
  const [extraChips, setExtraChips] = useState<Array<{ configDir: string; skillsDir: string }>>([]);

  const handlePickDir = async () => {
    setPicking(true);
    try {
      const selected = await pickProjectDirectory();
      if (selected) {
        setPath(selected);
        if (!name) {
          const parts = selected.replace(/\\/g, "/").split("/");
          setName(parts[parts.length - 1] || selected);
        }
        // 扫描点目录
        setScanLoading(true);
        setDotDirs([]);
        setSelectedTools([]);
        setExtraChips([]);
        try {
          const dirs = await projectsApi.listDotDirectories(selected);
          setDotDirs(dirs);
          // 预选已知工具
          const preSelected = dirs
            .filter((d) => KNOWN_TOOLS_MAP[d] !== undefined)
            .map((d) => buildToolPath(d, KNOWN_TOOLS_MAP[d]));
          setSelectedTools(preSelected);
        } catch {
          // 扫描失败静默降级，让用户手动添加
          setDotDirs([]);
        } finally {
          setScanLoading(false);
        }
      }
    } finally {
      setPicking(false);
    }
  };

  const toggleTool = (toolPath: string) => {
    setSelectedTools((prev) =>
      prev.includes(toolPath) ? prev.filter((t) => t !== toolPath) : [...prev, toolPath],
    );
  };

  /** 所有可展示的 chip（扫描结果 + 用户自定义额外条目） */
  const allChips = [
    ...dotDirs.map((configDir) => ({
      configDir,
      skillsDir: KNOWN_TOOLS_MAP[configDir] ?? "skills",
      fromScan: true,
    })),
    ...extraChips.map((c) => ({ ...c, fromScan: false })),
  ];

  const handleAddCustomTool = () => {
    const dir = customConfigDir.trim();
    const skillsFolder = customSkillsDir.trim() || "skills";

    if (!dir.startsWith(".")) {
      setCustomError(t("skills.project.customToolInvalid"));
      return;
    }

    const toolPath = buildToolPath(dir, skillsFolder);
    const alreadyExists = allChips.some(
      (c) => buildToolPath(c.configDir, c.skillsDir) === toolPath,
    );
    if (alreadyExists) {
      setCustomError(t("skills.project.customToolInvalid"));
      return;
    }

    setCustomError("");
    setExtraChips((prev) => [...prev, { configDir: dir, skillsDir: skillsFolder }]);
    setSelectedTools((prev) => [...prev, toolPath]);
    setCustomConfigDir("");
    setCustomSkillsDir("skills");
  };

  const handleRemoveExtraChip = (toolPath: string) => {
    setExtraChips((prev) =>
      prev.filter((c) => buildToolPath(c.configDir, c.skillsDir) !== toolPath),
    );
    setSelectedTools((prev) => prev.filter((t) => t !== toolPath));
  };

  const handleConfirm = () => {
    if (!name.trim() || !path.trim() || selectedTools.length === 0) return;
    onConfirm(name.trim(), path.trim(), selectedTools);
  };

  const handleClose = () => {
    setName("");
    setPath("");
    setDotDirs([]);
    setSelectedTools([]);
    setExtraChips([]);
    setCustomConfigDir("");
    setCustomSkillsDir("skills");
    setCustomError("");
    onClose();
  };

  // 当对话框打开时重置状态
  useEffect(() => {
    if (open) {
      setName("");
      setPath("");
      setDotDirs([]);
      setSelectedTools([]);
      setExtraChips([]);
      setCustomConfigDir("");
      setCustomSkillsDir("skills");
      setCustomError("");
    }
  }, [open]);

  const canConfirm = name.trim() && path.trim() && selectedTools.length > 0 && !isLoading;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("skills.project.createTitle")}</DialogTitle>
          <DialogDescription>
            {t("skills.project.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 px-5">
          {/* 目录选择 */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {t("skills.project.directory")}
            </label>
            <div className="flex gap-2">
              <Input
                value={path}
                readOnly
                placeholder={t("skills.project.directoryPlaceholder")}
                className="flex-1 text-xs font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePickDir}
                disabled={picking}
                className="shrink-0"
              >
                {picking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FolderOpen className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* 项目名称 */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {t("skills.project.name")}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("skills.project.namePlaceholder")}
            />
          </div>

          {/* 工具选择 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                {t("skills.project.tools")}
              </label>
            </div>

            {/* 状态提示 */}
            {!path && (
              <p className="text-xs text-muted-foreground">
                {t("skills.project.toolsHint")}
              </p>
            )}
            {scanLoading && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("skills.project.dotDirsLoading")}
              </p>
            )}
            {path && !scanLoading && allChips.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {t("skills.project.dotDirsEmpty")}
              </p>
            )}

            {/* Chip 列表 */}
            {allChips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {allChips.map(({ configDir, skillsDir, fromScan }) => {
                  const toolPath = buildToolPath(configDir, skillsDir);
                  const selected = selectedTools.includes(toolPath);
                  return (
                    <div key={toolPath} className="relative group">
                      <button
                        type="button"
                        onClick={() => toggleTool(toolPath)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                          selected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-border-default hover:border-primary/50"
                        }`}
                      >
                        {toolPath}
                      </button>
                      {/* 用户手动添加的 chip 可以删除 */}
                      {!fromScan && (
                        <button
                          type="button"
                          onClick={() => handleRemoveExtraChip(toolPath)}
                          className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {selectedTools.length === 0 && path && !scanLoading && (
              <p className="text-xs text-destructive">
                {t("skills.project.toolsRequired")}
              </p>
            )}

            {/* 自定义工具添加区域 */}
            <div className="pt-1 space-y-2 border-t border-border/50">
              <p className="text-xs font-medium text-muted-foreground">
                {t("skills.project.customTool")}
              </p>
              <div className="flex gap-2 items-start">
                <div className="flex-1 space-y-1.5">
                  <Input
                    value={customConfigDir}
                    onChange={(e) => {
                      setCustomConfigDir(e.target.value);
                      setCustomError("");
                    }}
                    placeholder={t("skills.project.customConfigDir")}
                    className="text-xs font-mono h-8"
                  />
                  <Input
                    value={customSkillsDir}
                    onChange={(e) => setCustomSkillsDir(e.target.value)}
                    placeholder={t("skills.project.customSkillsDir")}
                    className="text-xs font-mono h-8"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomTool}
                  disabled={!customConfigDir.trim()}
                  className="h-8 shrink-0 mt-0"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {t("skills.project.addCustomTool")}
                </Button>
              </div>
              {customError && (
                <p className="text-xs text-destructive">{customError}</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : null}
            {t("common.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
