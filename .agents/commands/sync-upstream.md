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

---

## Full-Merge Mode (use when 20+ commits behind)

Cherry-picks fail when upstream created files that never existed in the fork — git reports "modify/delete" conflicts even for purely additive commits. Use a full merge instead.

### Conflict Resolution Matrix

| Conflict type | Cause | Resolution |
|---|---|---|
| `DU` (deleted in fork, modified upstream) | Fork intentionally removed the file | `git rm <file>` |
| `UU` protected area | Both sides changed auth/billing/org/local-first code | `git checkout --ours -- <file>` |
| `UU` feature / UI code | Both sides changed unprotected feature | `git checkout --theirs -- <file>` |
| `UU` mixed (both sides add value) | e.g. sidebar/tasks with new hooks on each side | Manual merge or spawn subagent |
| `UU` CI / config | Fork has fork-specific env vars or settings | Manual merge, preserve fork settings |

### Procedure

```bash
# 1. Inspect all conflicts before touching anything
git merge --no-commit --no-ff upstream/main
git diff --name-only --diff-filter=U   # list UU conflicts
git diff --name-only --diff-filter=DU  # list DU conflicts

# 2. Resolve DU (files fork removed intentionally)
git rm <file>

# 3. Resolve UU protected areas (keep fork's local-first versions)
git checkout --ours -- <protected-file>
git add <protected-file>

# 4. Resolve UU safe feature files (take upstream's version)
git checkout --theirs -- <feature-file>
git add <feature-file>

# 5. Commit the merge
git commit -m "merge: sync upstream superset-sh/superset <date>"

# 6. Update sync tracker
git rev-parse upstream/main > .github/upstream-last-sync
git add .github/upstream-last-sync
git commit -m "chore: record upstream sync $(date +%Y%m%d)"
```

### Key Rules
- Never `--ours` or `--theirs` blindly — read the conflict before deciding
- For complex UU conflicts touching both fork logic and upstream features, spawn a subagent to manually merge both sides
- After resolving all conflicts, run `bun run typecheck` and `bun run lint` before committing

---

## After a Stable Sync — Release

Once the sync is verified (typecheck + lint clean, app starts), cut a release so both machines get the update:

```bash
# 1. Bump version in apps/desktop/package.json if needed
# 2. Tag and push
git tag desktop-v<version>
git push origin desktop-v<version>
```

GitHub Actions builds the DMG automatically (~20 min). When done, go to
`github.com/AllenX-Li/superset/releases` and publish the Draft release.
Both machines will pick up the update within 4 hours.
