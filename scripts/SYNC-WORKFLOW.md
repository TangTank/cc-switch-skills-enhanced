# 上游同步工作流

## 使用方法

### 前置步骤

在 GitHub 上先同步你的 fork：
1. 打开你的 fork 仓库页面
2. 点击 `Sync fork` → `Update branch`
3. 等待同步完成

### 执行同步脚本

**Windows (PowerShell):**
```powershell
.\scripts\sync-upstream.ps1
```

**Linux/Mac:**
```bash
./scripts/sync-upstream.sh
```

## 脚本会自动执行

1. ✅ 切换到 main 分支并拉取最新代码
2. ✅ 将 `feature/project-skills` rebase 到最新的 main
3. ✅ 合并回 main 分支
4. ✅ 推送到远程

## 如果出现冲突

当 rebase 过程中出现冲突时，脚本会停止并提示你：

1. 编辑冲突文件
2. `git add <冲突文件>`
3. `git rebase --continue`
4. 冲突解决后，手动执行剩余步骤：
   ```bash
   git checkout main
   git merge feature/project-skills -m "Merge feature/project-skills after upstream sync"
   git push origin main
   git push origin feature/project-skills --force-with-lease
   ```

## 分支关系图

```
上游(cherry-studio)  →  你的fork(origin)  →  本地(main)
                         (点Sync fork)           |
                                                 |
                              feature/project-skills
                                   │
                                   │ (rebase)
                                   ↓
                              main(merge) → push
```

## 常见问题

**Q: 为什么需要先在 GitHub 上 Sync fork？**

A: 因为 origin 是你自己的 fork，不是上游。必须先让 origin 同步到上游最新版本，本地才能拉到新代码。

**Q: 为什么用 `--force-with-lease`？**

A: 因为 rebase 会重写历史，需要强制推送。`--force-with-lease` 比 `--force` 更安全，会在远程有他人推送时阻止操作。

**Q: 如果上游更新后我的功能冲突很大怎么办？**

A: 冲突是正常的。解决冲突时，重点看上游的改动，保留你的核心逻辑即可。解决完冲突后功能依然可用。
