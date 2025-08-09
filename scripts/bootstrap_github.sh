#!/usr/bin/env bash
set -euo pipefail
REPO="${1:-}"
if [ -z "$REPO" ]; then
  echo "用法: ./scripts/bootstrap_github.sh <owner/repo>"
  exit 1
fi
gh api repos/$REPO/labels --method POST -f name='bug' -f color='d73a4a' -f description='Bug 报告' || true
gh api repos/$REPO/labels --method POST -f name='enhancement' -f color='a2eeef' -f description='新功能/改进' || true
gh api repos/$REPO/labels --method POST -f name='task' -f color='0366d6' -f description='交付型任务' || true
gh api repos/$REPO/milestones -f title='M1 MVP 上线' -f state=open || true
gh api repos/$REPO/milestones -f title='M2 数据闭环' -f state=open || true
gh api repos/$REPO/milestones -f title='M3 公测与发布' -f state=open || true
echo "✅ 完成基础标签与里程碑。Projects v2 建议用工作流 project-bootstrap 或在 UI 创建。"
