# Upstream Sync Analysis

Fetch the latest commits from upstream (`superset-sh/superset`) and report what's new since the last sync.

## Fork Context

This fork removed cloud auth and rebuilt as local-first. Treat any upstream changes in these paths as **needs manual review**:

- Auth / sign-in / login: `**/auth/**`, `**/AuthProvider*`, `**/sign-in/**`, `**/login/**`
- Billing / paywall: `**/billing/**`, `**/paywall/**`, `**/subscription/**`, `**/upgrade/**`
- Org management: `**/organization/**`, `**/members/**`, `**/team/**`
- Cloud: `packages/auth/**`, `**/api-keys/**`, `apps/api/src/**/cloud/**`
- CollectionsProvider: `**/CollectionsProvider*`, `**/collections/**`
- Local-first infra: `packages/local-db/**`, `packages/durable-session/**`, `**/host-service/**`, `**/LocalHostService*`
- Onboarding: `**/onboarding/**`, `**/create-organization/**`

Everything else (docs, marketing, packages/ui, packages/email, tooling, db schema) is generally safe.

## Steps

1. Add upstream remote if missing, then fetch:
   ```bash
   git remote | grep -q upstream || git remote add upstream https://github.com/superset-sh/superset.git
   git fetch upstream main --no-tags
   ```

2. Read `.github/upstream-last-sync` for the base SHA. If absent, use `upstream/main~30`. Get the current upstream HEAD with `git rev-parse upstream/main`.

3. Run `git log <BASE>..upstream/main --oneline --no-merges` and `git diff --name-only <BASE> upstream/main`. If there are no new commits, tell the user and stop.

4. For each changed file, categorize as:
   - **A — Safe**: doesn't touch protected areas
   - **B — Review**: touches a protected area (read the actual diff to confirm)
   - **C — Skip**: lockfiles, generated files

5. Print the full report directly in the conversation:
   - Executive summary (commit count, A/B/C counts, one-line recommendation)
   - Commit list
   - Category A files
   - Category B files with a note on why each needs review
   - Top 3–5 suggested cherry-picks from Category A

6. Update `.github/upstream-last-sync` with the upstream HEAD SHA and commit it:
   ```bash
   echo "<UPSTREAM_HEAD>" > .github/upstream-last-sync
   git add .github/upstream-last-sync
   git commit -m "chore: record upstream sync $(date +%Y%m%d)"
   ```
