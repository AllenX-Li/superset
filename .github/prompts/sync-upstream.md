# Upstream Sync Analysis

Analyze new commits from the upstream repository (`superset-sh/superset`) since the last recorded sync, write a structured analysis report, and open a PR containing only the report and the updated sync tracker. Do **not** modify any source files. Do **not** cherry-pick or apply any upstream changes.

---

## Fork Context

This fork (`AllenX-Li/superset`) has diverged significantly from the upstream. The following areas have been **completely rebuilt** and are **protected zones** — any upstream change touching these paths requires manual review and must never be marked safe:

### Protected Areas (Category B — always)

| Area | Path Patterns |
|------|---------------|
| Auth system | `apps/web/src/**/auth/**`, `apps/web/src/**/AuthProvider*`, `apps/web/src/**/sign-in/**`, `apps/web/src/**/login/**`, `apps/api/src/**/auth/**` |
| Billing & paywall | `apps/web/src/**/billing/**`, `apps/web/src/**/paywall/**`, `apps/web/src/**/subscription/**`, `apps/web/src/**/upgrade/**` |
| Organization management | `apps/web/src/**/organization/**`, `apps/web/src/**/members/**`, `apps/web/src/**/team/**` |
| Cloud auth & API keys | `packages/auth/**`, `apps/web/src/**/api-keys/**`, `apps/api/src/**/cloud/**` |
| Collections (replaced with local stub) | `apps/web/src/**/CollectionsProvider*`, `apps/web/src/**/collections/**` |
| Local-first infrastructure | `packages/local-db/**`, `packages/durable-session/**`, `apps/desktop/src/**/host-service/**`, `apps/desktop/src/**/LocalHostService*` |
| Onboarding & org creation | `apps/web/src/**/onboarding/**`, `apps/web/src/**/create-organization/**` |

### Safe Areas (low divergence risk)

Changes in these paths are unlikely to conflict:

- `apps/docs/**` — documentation
- `apps/marketing/**` — marketing site
- `packages/ui/**` — shared UI components (no auth dependency)
- `packages/email/**` — email templates
- `packages/shared/**` — shared utilities (verify no auth imports before marking safe)
- `tooling/**` — TypeScript configs, build tooling
- `packages/db/src/schema/**` — DB schema (safe unless adds auth/billing tables)
- `.github/**` — CI workflows (review individually)

---

## Step 1: Determine the commit range

1. Check the force flag:
   ```bash
   echo $FORCE_FULL_ANALYSIS
   ```

2. Read the last-sync tracker:
   ```bash
   cat .github/upstream-last-sync 2>/dev/null || echo "ABSENT"
   ```

3. Get the current upstream HEAD:
   ```bash
   git rev-parse upstream/main
   ```

4. Determine `BASE_SHA`:
   - If `FORCE_FULL_ANALYSIS` is `true` OR the tracker file is absent/empty:
     - Use `upstream/main~30` as the base:
       ```bash
       git rev-parse upstream/main~30
       ```
     - Note this in the report as "30-commit lookback (first run or forced)"
   - Otherwise:
     - Use the SHA from the tracker file (trimmed of whitespace) as `BASE_SHA`
     - Verify it is reachable: `git cat-file -t <BASE_SHA>`
     - If not reachable, fall back to `upstream/main~30`

5. Count new commits:
   ```bash
   git log <BASE_SHA>..upstream/main --oneline --no-merges | wc -l
   ```
   If the count is 0 and `FORCE_FULL_ANALYSIS` is `false`, print:
   `"No new upstream commits since last sync (<BASE_SHA>). Skipping PR creation."` and stop.

---

## Step 2: Collect upstream data

Run all of these commands — you will need the output for categorization and the report:

```bash
# List of new commits (no merges)
git log <BASE_SHA>..upstream/main --oneline --no-merges

# Detailed log with file stats
git log <BASE_SHA>..upstream/main --stat --no-merges

# All changed file paths
git diff --name-only <BASE_SHA> upstream/main

# Summary of additions/deletions per file
git diff --stat <BASE_SHA> upstream/main
```

For files you want to inspect in detail (especially ambiguous ones), run:
```bash
git diff <BASE_SHA> upstream/main -- <file-path>
```

Limit individual file diff reads to files you are uncertain about categorizing. Do not read every file's full diff — use the stat output to guide which files need deeper inspection.

---

## Step 3: Categorize every changed file

For each path returned by `git diff --name-only <BASE_SHA> upstream/main`, assign exactly one category:

**Category A — Safe to apply**: Path does not match any protected area AND does not import from protected areas. These are patches a human reviewer can cherry-pick with low risk.

**Category B — Needs manual review**: Path matches a protected area pattern, OR the file imports/references protected symbols (check with targeted `git diff` if unsure). When in doubt between A and B, always choose B.

**Category C — Skip / irrelevant**: Auto-generated files (`bun.lock`, `*.snap`, generated types), files that don't exist in this fork, or trivially irrelevant boilerplate.

---

## Step 4: Write the analysis report

Get today's date:
```bash
date +%Y%m%d
DATE_FORMATTED=$(date +%Y-%m-%d)
```

Create the directory:
```bash
mkdir -p .github/upstream-reports
```

Write the report to `.github/upstream-reports/<YYYYMMDD>.md` using this exact structure:

```markdown
# Upstream Sync Report — <YYYY-MM-DD>

## Executive Summary

- **Upstream commits analyzed**: <N>
- **Sync base**: `<BASE_SHA>` (<"last recorded sync" or "30-commit lookback (first run or forced)">)
- **Upstream HEAD**: `<upstream_head_sha>`
- **Total files changed upstream**: <N>
- **Category A — Safe to apply**: <N> files
- **Category B — Needs manual review**: <N> files
- **Category C — Skip**: <N> files

**Recommendation**: <1-2 sentences. E.g. "X commits touch only documentation and UI components and are safe to cherry-pick. Y commits overlap the auth system and require careful manual review.">

---

## Upstream Commits

| SHA | Message |
|-----|---------|
| `<sha7>` | <commit message> |
...

---

## File Impact by Area

### Protected Areas Touched (Category B)

For each protected area that has upstream changes, list the specific files and which commits introduced them.

### Safe Areas With Changes (Category A)

List files in Category A grouped by area.

### Skipped (Category C)

| File | Reason |
|------|--------|
| ... | ... |

---

## Categorized Change List

### Category A — Safe to Apply

| File | Commit(s) | What Changed |
|------|-----------|--------------|
| ... | `<sha7>` | ... |

### Category B — Needs Manual Review

| File | Protected Area | Commit(s) | Why Manual Review Needed |
|------|---------------|-----------|--------------------------|
| ... | ... | `<sha7>` | ... |

---

## Suggested Next Steps

1. **Cherry-pick Category A commits** (after verifying they compile cleanly in isolation):
   ```bash
   git fetch upstream main
   git cherry-pick <sha>
   ```
2. **Assign Category B files** to a developer familiar with the fork's auth/local-first architecture.
3. **After review and any applied patches**, update the sync tracker:
   ```bash
   echo "<upstream_head_sha>" > .github/upstream-last-sync
   ```
   (This is already done in this PR — merge this PR to record the sync point.)
```

---

## Step 5: Update the sync tracker

Write the current upstream HEAD SHA to `.github/upstream-last-sync`:
```bash
echo "<upstream_head_sha>" > .github/upstream-last-sync
```

The file must contain only the SHA followed by a newline, with no other content.

---

## Step 6: Create branch, commit, and open PR

1. Get today's date for the branch name:
   ```bash
   date +%Y%m%d
   ```

2. Create and switch to a new branch off `main`:
   ```bash
   git checkout main
   git checkout -b sync/upstream-<YYYYMMDD>
   ```

3. Stage only the two files this workflow produces:
   ```bash
   git add .github/upstream-reports/<YYYYMMDD>.md
   git add .github/upstream-last-sync
   ```

4. Commit:
   ```bash
   git commit -m "chore: upstream sync analysis <YYYYMMDD>"
   ```

5. Push:
   ```bash
   git push origin sync/upstream-<YYYYMMDD>
   ```

6. Open the PR. Copy the Executive Summary section from the report into the PR body:
   ```bash
   gh pr create \
     --title "chore: upstream sync analysis — <YYYY-MM-DD>" \
     --body "## Upstream Sync Analysis — <YYYY-MM-DD>

   Automated report from the weekly upstream sync workflow.
   This PR contains **only** the analysis report and updated sync tracker — no source code changes.

   Review the report and use it to decide which upstream commits to cherry-pick manually.

   ---

   <paste Executive Summary section from the report here>

   ---

   ## Files in this PR
   - \`.github/upstream-reports/<YYYYMMDD>.md\` — Full categorized analysis
   - \`.github/upstream-last-sync\` — Updated to \`<upstream_head_sha>\`

   ## How to apply safe patches
   \`\`\`bash
   git fetch upstream main
   git cherry-pick <sha>
   \`\`\`

   Merging this PR records the new upstream sync point for next week's run." \
     --base main \
     --head sync/upstream-<YYYYMMDD>
   ```

---

## Important constraints

- **Never modify source files.** Only write `.github/upstream-reports/<YYYYMMDD>.md` and `.github/upstream-last-sync`.
- **Never cherry-pick or apply upstream patches.** Analysis and reporting only.
- **Never open a PR if there are zero new commits** (and `FORCE_FULL_ANALYSIS` is false). Print the skip message and exit.
- If the report file for today already exists (re-run on same day), overwrite it and force-push the branch: `git push --force origin sync/upstream-<YYYYMMDD>`.
