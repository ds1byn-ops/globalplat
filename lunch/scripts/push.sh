#!/usr/bin/env bash
# GitHub 'ds1byn-ops' 에 푸시하는 스크립트
# 사용법:
#   1) GitHub 에서 빈 repo 생성 (README 체크 해제):  https://github.com/new  → 이름: gangnam-lunch
#   2) 아래 실행:
#        bash scripts/push.sh
#   (토큰 인증을 쓰려면 origin URL 을 https://<TOKEN>@github.com/ds1byn-ops/gangnam-lunch.git 로 바꾸세요)
set -e
REPO="${1:-https://github.com/ds1byn-ops/gangnam-lunch.git}"
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO"
git push -u origin main
echo "✅ 푸시 완료 → Settings > Pages > Source: GitHub Actions 로 설정하면 자동 배포됩니다."
