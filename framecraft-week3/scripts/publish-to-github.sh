#!/usr/bin/env bash
# Publish this working tree to a review branch without changing main.
set -euo pipefail

REPO_URL='https://github.com/Phrank6/Framecraft.git'
BRANCH="${1:-feat/week1-scene-schema-renderer}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

for binary in git rsync mktemp; do
  if ! command -v "$binary" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$binary" >&2
    exit 1
  fi
done

STAGING="$(mktemp -d)"
trap 'rm -rf "$STAGING"' EXIT

echo 'Cloning Framecraft...'
git clone "$REPO_URL" "$STAGING/Framecraft"
git -C "$STAGING/Framecraft" switch -c "$BRANCH"

# Exclude local development state and files created by the build.
rsync -a \
  --exclude='.git/' \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='*.log' \
  --exclude='.DS_Store' \
  "$ROOT/" "$STAGING/Framecraft/"

git -C "$STAGING/Framecraft" add -A
if git -C "$STAGING/Framecraft" diff --cached --quiet; then
  echo 'No changes to publish.'
  exit 0
fi

git -C "$STAGING/Framecraft" commit -m 'feat: add scene contracts and renderer workspace'
git -C "$STAGING/Framecraft" push -u origin "$BRANCH"

printf '\nBranch published. Open a pull request from:\n'
printf 'https://github.com/Phrank6/Framecraft/compare/main...%s?expand=1\n' "$BRANCH"
