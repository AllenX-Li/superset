#!/usr/bin/env bash
# Analyzes new commits from upstream superset-sh/superset and generates a
# categorized report as a PR. No Claude, no API keys — pure git + bash.
set -euo pipefail

FORCE_FULL_ANALYSIS="${FORCE_FULL_ANALYSIS:-false}"
LAST_SYNC_FILE=".github/upstream-last-sync"
REPORTS_DIR=".github/upstream-reports"
DATE=$(date +%Y%m%d)
DATE_FORMATTED=$(date +%Y-%m-%d)

# ---------------------------------------------------------------------------
# Protected areas — any upstream change touching these requires manual review
# ---------------------------------------------------------------------------
PROTECTED_PATTERNS=(
  "apps/web/src/.*/auth/"
  "apps/web/src/.*AuthProvider"
  "apps/web/src/.*/sign-in/"
  "apps/web/src/.*/login/"
  "apps/api/src/.*/auth/"
  "apps/web/src/.*/billing/"
  "apps/web/src/.*/paywall/"
  "apps/web/src/.*/subscription/"
  "apps/web/src/.*/upgrade/"
  "apps/web/src/.*/organization/"
  "apps/web/src/.*/members/"
  "apps/web/src/.*/team/"
  "packages/auth/"
  "apps/web/src/.*/api-keys/"
  "apps/api/src/.*/cloud/"
  "apps/web/src/.*CollectionsProvider"
  "apps/web/src/.*/collections/"
  "packages/local-db/"
  "packages/durable-session/"
  "apps/desktop/src/.*/host-service/"
  "apps/desktop/src/.*LocalHostService"
  "apps/web/src/.*/onboarding/"
  "apps/web/src/.*/create-organization/"
)

# Auto-generated or irrelevant files to skip
SKIP_PATTERNS=(
  "bun\.lock$"
  "package-lock\.json$"
  "yarn\.lock$"
  "\.snap$"
  "__generated__"
  "\.d\.ts$"
  "pnpm-lock\.yaml$"
)

classify_file() {
  local file="$1"
  for p in "${SKIP_PATTERNS[@]}"; do
    if echo "$file" | grep -qE "$p"; then echo "C"; return; fi
  done
  for p in "${PROTECTED_PATTERNS[@]}"; do
    if echo "$file" | grep -qE "$p"; then echo "B"; return; fi
  done
  echo "A"
}

# ---------------------------------------------------------------------------
# Step 1: Determine commit range
# ---------------------------------------------------------------------------
UPSTREAM_HEAD=$(git rev-parse upstream/main)

BASE_SHA=""
if [[ "$FORCE_FULL_ANALYSIS" == "true" ]] || [[ ! -f "$LAST_SYNC_FILE" ]] || [[ -z "$(cat "$LAST_SYNC_FILE" 2>/dev/null | tr -d '[:space:]')" ]]; then
  BASE_SHA=$(git rev-parse upstream/main~30 2>/dev/null || git rev-parse "$(git log --format='%H' upstream/main | tail -1)")
  BASE_LABEL="30-commit lookback (first run or forced)"
else
  BASE_SHA=$(cat "$LAST_SYNC_FILE" | tr -d '[:space:]')
  if ! git cat-file -t "$BASE_SHA" &>/dev/null; then
    echo "⚠️  Stored SHA $BASE_SHA not reachable, falling back to upstream/main~30"
    BASE_SHA=$(git rev-parse upstream/main~30)
    BASE_LABEL="30-commit lookback (stored SHA unreachable)"
  else
    BASE_LABEL="last recorded sync"
  fi
fi

# ---------------------------------------------------------------------------
# Step 2: Check for new commits
# ---------------------------------------------------------------------------
COMMITS=$(git log "${BASE_SHA}..upstream/main" --oneline --no-merges)
COMMIT_COUNT=$(echo "$COMMITS" | grep -c "." || true)

if [[ "$COMMIT_COUNT" -eq 0 ]] && [[ "$FORCE_FULL_ANALYSIS" != "true" ]]; then
  echo "✅ No new upstream commits since last sync (${BASE_SHA}). Skipping PR creation."
  exit 0
fi

# ---------------------------------------------------------------------------
# Step 3: Categorize changed files
# ---------------------------------------------------------------------------
CHANGED_FILES=$(git diff --name-only "${BASE_SHA}" upstream/main)

CAT_A=()
CAT_B=()
CAT_C=()

while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  cat=$(classify_file "$file")
  case "$cat" in
    A) CAT_A+=("$file") ;;
    B) CAT_B+=("$file") ;;
    C) CAT_C+=("$file") ;;
  esac
done <<< "$CHANGED_FILES"

TOTAL_FILES=$(echo "$CHANGED_FILES" | grep -c "." || true)

# ---------------------------------------------------------------------------
# Step 4: Write the report
# ---------------------------------------------------------------------------
mkdir -p "$REPORTS_DIR"
REPORT_FILE="$REPORTS_DIR/${DATE}.md"

{
cat <<HEADER
# Upstream Sync Report — ${DATE_FORMATTED}

## Executive Summary

- **Upstream commits analyzed**: ${COMMIT_COUNT}
- **Sync base**: \`${BASE_SHA}\` (${BASE_LABEL})
- **Upstream HEAD**: \`${UPSTREAM_HEAD}\`
- **Total files changed upstream**: ${TOTAL_FILES}
- **Category A — Safe to apply**: ${#CAT_A[@]} files
- **Category B — Needs manual review**: ${#CAT_B[@]} files
- **Category C — Skip**: ${#CAT_C[@]} files

HEADER

# Recommendation
if [[ ${#CAT_B[@]} -eq 0 ]]; then
  echo "**Recommendation**: All changed files fall in safe areas. Consider cherry-picking the commits below after a quick review."
elif [[ ${#CAT_A[@]} -eq 0 ]]; then
  echo "**Recommendation**: All changes overlap protected areas (auth, billing, local-first infra). Manual review required before applying anything."
else
  echo "**Recommendation**: ${#CAT_A[@]} files are in safe areas and may be cherry-picked. ${#CAT_B[@]} files overlap protected areas and need manual review."
fi

cat <<'SECTION'

---

## Upstream Commits

SECTION

echo "| SHA | Message |"
echo "|-----|---------|"
while IFS= read -r line; do
  sha=$(echo "$line" | cut -d' ' -f1)
  msg=$(echo "$line" | cut -d' ' -f2-)
  echo "| \`${sha}\` | ${msg} |"
done <<< "$COMMITS"

cat <<'SECTION'

---

## Category A — Safe to Apply

Files in low-divergence areas. Candidates for cherry-picking.

SECTION

if [[ ${#CAT_A[@]} -eq 0 ]]; then
  echo "_None_"
else
  for f in "${CAT_A[@]}"; do echo "- \`$f\`"; done
fi

cat <<'SECTION'

---

## Category B — Needs Manual Review

Files overlapping protected areas (auth, billing, org management, CollectionsProvider, local-first infra).

SECTION

if [[ ${#CAT_B[@]} -eq 0 ]]; then
  echo "_None_"
else
  for f in "${CAT_B[@]}"; do echo "- \`$f\`"; done
fi

cat <<'SECTION'

---

## Category C — Skipped

Auto-generated files, lockfiles, or type snapshots.

SECTION

if [[ ${#CAT_C[@]} -eq 0 ]]; then
  echo "_None_"
else
  for f in "${CAT_C[@]}"; do echo "- \`$f\`"; done
fi

cat <<'SECTION'

---

## How to Apply Safe Patches

```bash
git fetch upstream main
# cherry-pick individual commits from the list above
git cherry-pick <sha>
```

Merge this PR to record the new sync point for next week's run.
SECTION

} > "$REPORT_FILE"

# ---------------------------------------------------------------------------
# Step 5: Update sync tracker
# ---------------------------------------------------------------------------
echo "$UPSTREAM_HEAD" > "$LAST_SYNC_FILE"

# ---------------------------------------------------------------------------
# Step 6: Create branch, commit, open PR
# ---------------------------------------------------------------------------
BRANCH="sync/upstream-${DATE}"

git checkout main
git checkout -B "$BRANCH"
git add "$REPORT_FILE" "$LAST_SYNC_FILE"
git commit -m "chore: upstream sync analysis ${DATE}"
git push --force origin "$BRANCH"

# Build PR body from the executive summary section of the report
EXEC_SUMMARY=$(sed -n '/## Executive Summary/,/---/p' "$REPORT_FILE" | head -20)

# Skip PR creation if one already exists for this branch
EXISTING_PR=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number' 2>/dev/null || true)
if [[ -n "$EXISTING_PR" ]]; then
  echo "✅ PR #${EXISTING_PR} already exists for branch ${BRANCH}, skipping creation."
  exit 0
fi

gh pr create \
  --title "chore: upstream sync analysis — ${DATE_FORMATTED}" \
  --body "## Upstream Sync Analysis — ${DATE_FORMATTED}

Automated report from the weekly upstream sync workflow.
This PR contains **only** the analysis report and updated sync tracker — no source code changes.

---

${EXEC_SUMMARY}

---

## Files in this PR
- \`.github/upstream-reports/${DATE}.md\` — Full categorized analysis
- \`.github/upstream-last-sync\` — Updated to \`${UPSTREAM_HEAD}\`

Merge this PR to record the sync point so next week's run only shows new commits." \
  --base main \
  --head "$BRANCH"
