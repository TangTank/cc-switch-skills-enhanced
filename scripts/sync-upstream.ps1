#!/usr/bin/env pwsh
# 同步上游并合并 project-skills 功能分支

$ErrorActionPreference = "Stop"

Write-Host "🔄 开始同步上游..." -ForegroundColor Cyan

# 1. 切换到 main 并拉取最新代码
Write-Host "`n1️⃣  更新 main 分支..." -ForegroundColor Yellow
git checkout main
git pull origin main

# 2. 切换到功能分支并 rebase 到最新 main
Write-Host "`n2️⃣  Rebase feature/project-skills 到最新 main..." -ForegroundColor Yellow
git checkout feature/project-skills
git rebase main

# 检查是否有冲突
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Rebase 过程中有冲突，请先解决冲突后再继续：" -ForegroundColor Red
    Write-Host "   1. 编辑冲突文件" -ForegroundColor Gray
    Write-Host "   2. git add <冲突文件>" -ForegroundColor Gray
    Write-Host "   3. git rebase --continue" -ForegroundColor Gray
    Write-Host "   4. 冲突解决后，继续执行本脚本的剩余步骤" -ForegroundColor Gray
    exit 1
}

# 3. 合并回 main
Write-Host "`n3️⃣  合并回 main..." -ForegroundColor Yellow
git checkout main
git merge feature/project-skills -m "Merge feature/project-skills after upstream sync"

# 4. 推送到远程
Write-Host "`n4️⃣  推送到远程..." -ForegroundColor Yellow
git push origin main
git push origin feature/project-skills --force-with-lease

Write-Host "`n✅ 同步完成！" -ForegroundColor Green
Write-Host "`n📝 分支状态：" -ForegroundColor Cyan
git log --oneline --graph -3
