#!/bin/bash
# 同步上游并合并 project-skills 功能分支

set -e

echo "🔄 开始同步上游..."
echo ""

# 1. 切换到 main 并拉取最新代码
echo "1️⃣  更新 main 分支..."
git checkout main
git pull origin main

# 2. 切换到功能分支并 rebase 到最新 main
echo ""
echo "2️⃣  Rebase feature/project-skills 到最新 main..."
git checkout feature/project-skills
if ! git rebase main; then
    echo ""
    echo "❌ Rebase 过程中有冲突，请先解决冲突后再继续："
    echo "   1. 编辑冲突文件"
    echo "   2. git add <冲突文件>"
    echo "   3. git rebase --continue"
    echo "   4. 冲突解决后，继续执行本脚本的剩余步骤"
    exit 1
fi

# 3. 合并回 main
echo ""
echo "3️⃣  合并回 main..."
git checkout main
git merge feature/project-skills -m "Merge feature/project-skills after upstream sync"

# 4. 推送到远程
echo ""
echo "4️⃣  推送到远程..."
git push origin main
git push origin feature/project-skills --force-with-lease

echo ""
echo "✅ 同步完成！"
echo ""
echo "📝 分支状态："
git log --oneline --graph -3
