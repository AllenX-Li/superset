# Upstream Sync Analysis

Analyze new commits from the upstream repository (`superset-sh/superset`) since the last recorded sync, then generate a categorized report and optionally open a PR.

## Arguments

`$ARGUMENTS` may contain:
- `--force` — ignore `.github/upstream-last-sync` and analyze the last 30 upstream commits
- `--pr` — open a PR with the report after generating it (default: report only, no PR)

## Fork Context

This fork has **completely removed or rebuilt** the following areas. Any upstream change touching these paths requires **manual review** — never mark them safe:

| Protected Area | Path Patterns |
|---------------|---------------|
| Auth system | `apps/web/src/**/auth/**`, `**/AuthProvider*`, `**/sign-in/**`, `**/login/**`, `apps/api/src/**/auth/**` |
| Billing & paywall | `**/billing/**`, `**/paywall/**`, `**/subscription/**`, `**/upgrade/**` |
| Org management | `**/organization/**`, `**/members/**`, `**/team/**` |
| Cloud auth & API keys | `packages/auth/**`, `**/api-keys/**`, `apps/api/src/**/cloud/**` |
| CollectionsProvider | `**/CollectionsProvider*`, `**/collections/**` |
| Local-first infra | `packages/local-db/**`, `packages/durable-session/**`, `**/host-service/**`, `**/LocalHostService*` |
| Onboarding | `**/onboarding/**`, `**/create-organization/**` |

Safe areas (low divergence risk): `apps/docs/**`, `apps/marketing/**`, `packages/ui/**`, `packages/email/**`, `packages/shared/**`, `tooling/**`, `packages/db/src/schema/**`.

## Step 1 — Set up upstream remote

Check if upstream remote exists:
```bash
git remote | grep upstream
```

If not present, add it:
```bash
git remote add upstream https://github.com/superset-sh/superset.git
```

Then fetch:
```bash
git fetch upstream main --no-tags
```

## Step 2 — Determine the commit range

Get current upstream HEAD:
```bash
git rev-parse upstream/main
```

Check for last sync point:
```bash
cat .github/upstream-last-sync 2>/dev/null || echo "ABSENT"
```

Determine `BASE_SHA`:
- If `--force` was passed in `$ARGUMENTS`, or the file is absent/empty: use `upstream/main~30`
  ```bash
  git rev-parse upstream/main~30
  ```
- Otherwise: use the SHA from `.github/upstream-last-sync`
  - Verify it's reachable: `git cat-file -t <sha>`
  - If not reachable, fall back to `upstream/main~30`

Count new commits:
```bash
git log <BASE_SHA>..upstream/main --oneline --no-merges
```

If zero new commits (and `--force` not passed): tell the user "No new upstream commits since last sync" and stop.

## Step 3 — Collect upstream data

Run all of these to gather data for analysis:

```bash
# New commits (no merges)
git log <BASE_SHA>..upstream/main --oneline --no-merges

# Changed files
git diff --name-only <BASE_SHA> upstream/main

# File change stats
git diff --stat <BASE_SHA> upstream/main
```

For files you're uncertain how to categorize, inspect their diff:
```bash
git diff <BASE_SHA> upstream/main -- <file-path>
```

## Step 4 — Categorize each changed file

Use your judgment — pattern matching plus reading the actual diffs for ambiguous cases.

**Category A — Safe to apply**: File doesn't match any protected area AND doesn't import from protected modules. A developer can cherry-pick this with low risk.

**Category B — Needs manual review**: File matches a protected area pattern, or its diff touches protected symbols. When in doubt between A and B, choose B.

**Category C — Skip**: Lockfiles (`bun.lock`, `package-lock.json`), auto-generated files (`.snap`, `__generated__`, `.d.ts`), or files that don't exist in this fork.

## Step 5 — Write the report

Create the reports directory if needed:
```bash
mkdir -p .github/upstream-reports
```

Write the report to `.github/upstream-reports/<YYYYMMDD>.md`:

```markdown
# Upstream Sync Report — <YYYY-MM-DD>

## Executive Summary

- **Upstream commits analyzed**: <N>
- **Sync base**: `<BASE_SHA>` (<"last recorded sync" or "30-commit lookback">)
- **Upstream HEAD**: `<UPSTREAM_HEAD>`
- **Total files changed**: <N>
- **Category A — Safe to apply**: <N> files
- **Category B — Needs manual review**: <N> files
- **Category C — Skip**: <N> files

**Recommendation**: <1-2 sentences. Call out the most important things to look at and what's safe to cherry-pick.>

---

## Upstream Commits

| SHA | Message |
|-----|---------|
| `<sha7>` | <message> |

---

## Category A — Safe to Apply

<list of files with a brief note on what changed in each>

---

## Category B — Needs Manual Review

<list of files, which protected area they fall under, and why they need review>

---

## Category C — Skipped

<brief list with reason>

---

## Suggested Cherry-Picks

Specific commits worth applying (from Category A), in priority order:

1. `git cherry-pick <sha>` — <why this one is worth taking>
...

## How to Record This Sync

After reviewing and applying what you want:
```bash
echo "<UPSTREAM_HEAD>" > .github/upstream-last-sync
git add .github/upstream-last-sync && git commit -m "chore: record upstream sync <YYYYMMDD>"
```
```

## Step 6 — Update sync tracker

Write the upstream HEAD to `.github/upstream-last-sync`:
```bash
echo "<UPSTREAM_HEAD>" > .github/upstream-last-sync
```

## Step 7 — Open PR (only if `--pr` was passed)

If `--pr` is in `$ARGUMENTS`:

1. Check if we're on `main` — if so, create a branch:
   ```bash
   git checkout -b sync/upstream-<YYYYMMDD>
   ```

2. Stage and commit:
   ```bash
   git add .github/upstream-reports/<YYYYMMDD>.md .github/upstream-last-sync
   git commit -m "chore: upstream sync analysis <YYYYMMDD>"
   git push origin sync/upstream-<YYYYMMDD>
   ```

3. Open PR using `gh pr create` with the Executive Summary in the body.

If `--pr` was NOT passed: print the full report to the conversation and tell the user they can run `/sync-upstream --pr` to open a PR, or manually update `.github/upstream-last-sync` once they're done reviewing.
