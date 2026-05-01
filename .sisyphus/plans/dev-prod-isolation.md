# DEV vs Production Desktop App Complete Isolation

## TL;DR

> **Quick Summary**: 将 DEV 模式的桌面 app 数据目录从 `~/.superset` 改为固定的 `~/.superset-local`，并修复所有未隔离的资源（Electron session partition、Sentry、PostHog），实现 DEV 和生产版本的完全隔离。
> 
> **Deliverables**:
> - 所有本地数据（DB、state、terminal、host service）使用 `~/.superset-local/`
> - Electron session partition 改为 `persist:superset-local`（cookies、localStorage 独立）
> - Deep link protocol scheme 改为 `superset-local://`
> - Dev 模式禁用 Sentry 上报和 PostHog analytics
> - 统一 case-insensitive 路径比较逻辑
> 
> **Estimated Effort**: Short (2-3 hours)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 (constants) → Tasks 2-6 (parallel fixes) → Task 7 (cleanup) → F1-F4

---

## Context

### Original Request
用户在 worktree 中开发了删减版登录模块，发现 DEV 版本和生产版本共用同一个数据库。另一个 Agent 已修改 `electron.vite.config.ts` 自动推导 `SUPERSET_WORKSPACE_NAME`，但用户决定不使用 per-workspace 的动态命名（`~/.superset-{workspace}/`），而是采用固定的 `~/.superset-local/`。

### Interview Summary
**Key Discussions**:
- **命名策略**: 用户明确选择 `superset-local` 作为固定名，不用 per-workspace 动态名
- **隔离范围**: 路径隔离 + Electron session 隔离 + 遥测隔离
- **已有的 Agent 变更**: electron.vite.config.ts 的 case-insensitive 路径比较合理保留，但 workspace 推导逻辑需简化

**Research Findings**:
- `SUPERSET_DIR_NAME` 已是隔离核心机制，基于 workspace name 做区分
- Session partition `persist:superset` 在 **~10 处硬编码**，未跟随 workspace name
- Host service manifest 基于 `SUPERSET_HOME_DIR`（已隔离）
- Auto-updater 已在 dev 模式跳过
- `dev-workspace-name.ts` 有独立的路径比较逻辑（未同步 case-insensitive 修复）

### Metis Review
**Identified Gaps** (addressed):
- Session partition 未隔离 → 用统一常量替代所有硬编码
- Sentry/PostHog 在 dev 模式上报 → 添加 dev 模式禁用逻辑
- `dev-workspace-name.ts` 的 case-insensitive 问题 → 统一使用 `shared/constants.ts` 的值
- Turbo `globalPassThroughEnv` 缺少 `SUPERSET_WORKSPACE_NAME` → 本计划采用固定名方案后不需要

---

## Work Objectives

### Core Objective
将 DEV 模式的桌面 app 从生产环境中完全隔离：独立的数据目录、独立的 session、禁用遥测。

### Concrete Deliverables
- `~/.superset-local/` 作为 dev 模式的数据根目录
- `persist:superset-local` 作为 dev 模式的 Electron session partition
- `superset-local://` 作为 dev 模式的 deep link scheme
- Dev 模式下 Sentry 和 PostHog 不上报

### Definition of Done
- [ ] DEV 实例启动后数据写入 `~/.superset-local/`
- [ ] DEV 实例的 session/cookies 与生产实例完全独立
- [ ] DEV 实例不向 Sentry/PostHog 发送数据
- [ ] 生产实例行为完全不受影响

### Must Have
- `~/.superset-local/` 固定目录（不是 per-workspace 动态命名）
- 所有 session partition 引用统一使用 workspace-aware 常量
- Dev 模式禁用 Sentry 和 PostHog
- macOS case-insensitive 路径比较保持一致

### Must NOT Have (Guardrails)
- ❌ 不要修改生产实例的任何行为或路径
- ❌ 不要引入 per-workspace 动态命名（用户已明确拒绝）
- ❌ 不要修改 `electron-builder.ts`（只影响打包的生产版本）
- ❌ 不要修改 `packages/local-db/` 的 schema 或 migration
- ❌ 不要移除已有的 `SUPERSET_WORKSPACE_NAME` 机制（只是不再用它做路径隔离）
- ❌ 不要添加新的 npm 依赖

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (bun test)
- **Automated tests**: Tests-after (在实现后补充关键测试)
- **Framework**: bun test

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Electron config**: Use Bash (node/grep) - 验证常量值和文件引用
- **Sentry/PostHog**: Use Bash (grep) - 确认 dev 模式下的禁用逻辑

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - constants + shared module):
├── Task 1: Add ISOLATED_DEV constants to shared/constants.ts [quick]
└── (blocks all subsequent tasks)

Wave 2 (After Task 1 - parallel fixes across all modules):
├── Task 2: Fix session partition in main process [quick]
├── Task 3: Fix session partition in renderer process [quick]
├── Task 4: Fix session partition in tRPC browser router [quick]
├── Task 5: Simplify electron.vite.config.ts workspace logic [quick]
└── Task 6: Disable Sentry/PostHog in dev mode [quick]

Wave 3 (After Wave 2 - cleanup):
└── Task 7: Unify dev-workspace-name.ts path comparison [quick]

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high)
└── F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1 → Task 2 → F1-F4
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 5 (Wave 2)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | - | 2, 3, 4, 5, 6, 7 |
| 2 | 1 | F1-F4 |
| 3 | 1 | F1-F4 |
| 4 | 1 | F1-F4 |
| 5 | 1 | F1-F4 |
| 6 | 1 | F1-F4 |
| 7 | 1 | F1-F4 |
| F1-F4 | 2-7 | User okay |

### Agent Dispatch Summary

- **Wave 1**: 1 task — T1 → `quick`
- **Wave 2**: 5 tasks — T2-T4 → `quick`, T5 → `quick`, T6 → `quick`
- **Wave 3**: 1 task — T7 → `quick`
- **FINAL**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [ ] 1. Add ISOLATED_DEV constants to `shared/constants.ts`

  **What to do**:
  - 修改 `SUPERSET_DIR_NAME` 的计算逻辑：当 `IS_DEV` (NODE_ENV === "development") 时，返回固定的 `.superset-local`，否则返回 `.superset`
  - 修改 `PROTOCOL_SCHEME` 的计算逻辑：当 `IS_DEV` 时返回 `superset-local`，否则使用 `PROTOCOL_SCHEMES.PROD`
  - 新增导出 `APP_PARTITION` 常量：当 `IS_DEV` 时为 `persist:superset-local`，否则为 `persist:superset`
  - 判断 IS_DEV 的方式：从 `env.shared.ts` 的 `env.NODE_ENV` 获取（已经是 shared 的）
  - 注意：`getWorkspaceName()` 不再用于路径隔离，但保留函数定义（可能有其他用途）

  **Must NOT do**:
  - 不要删除 `getWorkspaceName()` 函数（其他代码可能引用）
  - 不要修改 `PROJECT_SUPERSET_DIR_NAME`（始终是 `.superset`，项目级配置）
  - 不要引入新的环境变量

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 修改一个文件中的常量定义，逻辑简单明确
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (foundation task)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 2, 3, 4, 5, 6, 7
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `apps/desktop/src/shared/constants.ts:1-19` — 当前 `SUPERSET_DIR_NAME` 和 `PROTOCOL_SCHEME` 的定义方式，基于 `workspace` 变量。改为基于 `IS_DEV`。
  - `apps/desktop/src/shared/env.shared.ts:15-25` — `env` 对象的结构和 `NODE_ENV` 的 schema 定义

  **API/Type References**:
  - `packages/shared/src/constants.ts` — `PROTOCOL_SCHEMES.PROD` 的定义位置（如存在）

  **WHY Each Reference Matters**:
  - constants.ts 是修改目标，需理解当前 workspace-based 逻辑才能替换为 IS_DEV-based 逻辑
  - env.shared.ts 提供了 `env.NODE_ENV` 的类型安全访问方式

  **Acceptance Criteria**:
  - [ ] `constants.ts` 导出 `APP_PARTITION` 常量
  - [ ] `SUPERSET_DIR_NAME` 在 dev 模式为 `.superset-local`
  - [ ] `PROTOCOL_SCHEME` 在 dev 模式为 `superset-local`
  - [ ] 生产模式行为完全不变
  - [ ] `bun run typecheck` 通过

  **QA Scenarios:**

  ```
  Scenario: Constants return correct values in dev mode
    Tool: Bash (node)
    Preconditions: NODE_ENV=development
    Steps:
      1. Run: node -e "process.env.NODE_ENV='development'; const c = require('./apps/desktop/src/shared/constants.ts'); console.log(c.SUPERSET_DIR_NAME, c.PROTOCOL_SCHEME, c.APP_PARTITION)"
      2. Assert output contains ".superset-local" and "superset-local" and "persist:superset-local"
    Expected Result: All three constants return -local suffixed values
    Failure Indicators: Output contains ".superset" without "-local"
    Evidence: .sisyphus/evidence/task-1-dev-constants.txt

  Scenario: Constants return correct values in production mode
    Tool: Bash (node)
    Preconditions: NODE_ENV=production
    Steps:
      1. Run: node -e "process.env.NODE_ENV='production'; ..." (same pattern)
      2. Assert output contains ".superset" (not ".superset-local")
    Expected Result: All three constants return production values
    Failure Indicators: Output contains "-local"
    Evidence: .sisyphus/evidence/task-1-prod-constants.txt
  ```

  **Commit**: YES (groups with 2, 3)
  - Message: `fix(desktop): isolate dev instance data to ~/.superset-local`
  - Files: `apps/desktop/src/shared/constants.ts`
  - Pre-commit: `bun run typecheck`

- [ ] 2. Fix session partition in main process

  **What to do**:
  - `apps/desktop/src/main/index.ts` — 将3处硬编码 `"persist:superset"` 替换为导入的 `APP_PARTITION` 常量
    - Line 307: `session.fromPartition("persist:superset")` → `session.fromPartition(APP_PARTITION)`
    - Line 336: `session.fromPartition("persist:superset")` → `session.fromPartition(APP_PARTITION)`
  - `apps/desktop/src/main/lib/extensions/index.ts` — 将 `APP_PARTITION` 本地常量替换为从 `shared/constants` 导入
    - Line 8: `const APP_PARTITION = "persist:superset"` → 删除，改为 import
    - Line 183, 218: 已使用 `APP_PARTITION` 变量，自动适配
  - `apps/desktop/src/main/lib/sentry.ts` — 将硬编码 `"persist:superset"` 替换为 `APP_PARTITION`
    - Line 24: `session.fromPartition("persist:superset")` → `session.fromPartition(APP_PARTITION)`
  - `apps/desktop/src/main/windows/main.ts` — 将硬编码 `"persist:superset"` 替换为 `APP_PARTITION`
    - Line 125: `partition: "persist:superset"` → `partition: APP_PARTITION`

  **Must NOT do**:
  - 不要修改 `extensions/index.ts` 中的 React DevTools 逻辑
  - 不要修改 `getChromiumUserDataDirs()` 函数

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 简单的字符串常量替换，4个文件，模式一致
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 3, 4, 5, 6)
  - **Parallel Group**: Wave 2
  - **Blocks**: F1-F4
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `apps/desktop/src/main/index.ts:295-340` — session partition 在 protocol handler 注册中的使用
  - `apps/desktop/src/main/lib/extensions/index.ts:1-10,180-220` — APP_PARTITION 定义和使用的完整上下文
  - `apps/desktop/src/main/lib/sentry.ts:20-30` — Sentry 初始化中的 session 引用
  - `apps/desktop/src/main/windows/main.ts:120-130` — BrowserWindow webPreferences partition

  **API/Type References**:
  - `apps/desktop/src/shared/constants.ts` — `APP_PARTITION` 导出（Task 1 添加）

  **WHY Each Reference Matters**:
  - 每个引用点都需要将硬编码字符串替换为 workspace-aware 常量，确保 dev/prod 使用不同 partition

  **Acceptance Criteria**:
  - [ ] `grep -rn '"persist:superset"' apps/desktop/src/main/` 返回 0 结果
  - [ ] 所有4个文件都正确 import `APP_PARTITION` from `shared/constants`
  - [ ] `bun run typecheck` 通过

  **QA Scenarios:**

  ```
  Scenario: No hardcoded session partition strings in main process
    Tool: Bash (grep)
    Preconditions: Task 1 completed
    Steps:
      1. Run: grep -rn '"persist:superset"' apps/desktop/src/main/ --include="*.ts"
      2. Assert: zero output lines
    Expected Result: No hardcoded "persist:superset" string found
    Failure Indicators: Any output line found
    Evidence: .sisyphus/evidence/task-2-no-hardcoded-partition.txt

  Scenario: APP_PARTITION imported correctly in all 4 files
    Tool: Bash (grep)
    Steps:
      1. Run: grep -rn "APP_PARTITION" apps/desktop/src/main/ --include="*.ts" | grep "import"
      2. Assert: 4 import lines found (index.ts, extensions/index.ts, sentry.ts, windows/main.ts)
    Expected Result: All 4 files import APP_PARTITION
    Failure Indicators: Fewer than 4 import lines
    Evidence: .sisyphus/evidence/task-2-imports.txt
  ```

  **Commit**: YES (groups with 1, 3)
  - Message: `fix(desktop): isolate dev session partition from production`
  - Files: `apps/desktop/src/main/index.ts`, `apps/desktop/src/main/lib/extensions/index.ts`, `apps/desktop/src/main/lib/sentry.ts`, `apps/desktop/src/main/windows/main.ts`
  - Pre-commit: `bun run typecheck`

- [ ] 3. Fix session partition in renderer process

  **What to do**:
  - `apps/desktop/src/renderer/screens/main/components/WorkspaceView/ContentView/TabsContent/TabView/BrowserPane/hooks/usePersistentWebview/usePersistentWebview.ts` — Line 188:
    - `"persist:superset"` → 使用 workspace-aware 常量
    - 注意：renderer 代码无法直接 import `shared/constants`（构建限制），需要通过 Vite define 注入或使用已注入的 `process.env` 值
    - 检查 `electron.vite.config.ts` renderer define 块中是否已注入了相关常量；如果没有，添加一个新的 define 变量
  - `apps/desktop/src/renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/BrowserPane/browserRuntimeRegistry.ts` — Line 150:
    - 同上处理

  **Must NOT do**:
  - 不要在 renderer 中直接 import main process 模块

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 2个文件的相同模式替换，可能需要在 vite config 加一个 define
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2, 4, 5, 6)
  - **Parallel Group**: Wave 2
  - **Blocks**: F1-F4
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `apps/desktop/electron.vite.config.ts:162-213` — renderer define 块，展示如何向 renderer 注入 build-time 常量
  - `apps/desktop/src/renderer/screens/main/components/WorkspaceView/ContentView/TabsContent/TabView/BrowserPane/hooks/usePersistentWebview/usePersistentWebview.ts:180-195` — 当前硬编码 partition
  - `apps/desktop/src/renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/BrowserPane/browserRuntimeRegistry.ts:145-155` — 当前硬编码 partition

  **WHY Each Reference Matters**:
  - renderer 代码的构建方式不同于 main process，需要理解 Vite define 注入机制才能正确传递常量

  **Acceptance Criteria**:
  - [ ] `grep -rn '"persist:superset"' apps/desktop/src/renderer/` 返回 0 结果
  - [ ] Renderer 使用 build-time 注入的常量而非硬编码字符串
  - [ ] `bun run typecheck` 通过

  **QA Scenarios:**

  ```
  Scenario: No hardcoded session partition strings in renderer
    Tool: Bash (grep)
    Steps:
      1. Run: grep -rn '"persist:superset"' apps/desktop/src/renderer/ --include="*.ts" --include="*.tsx"
      2. Assert: zero output lines
    Expected Result: No hardcoded partition string found
    Evidence: .sisyphus/evidence/task-3-no-hardcoded-partition.txt

  Scenario: Vite define includes APP_PARTITION for renderer
    Tool: Bash (grep)
    Steps:
      1. Run: grep "APP_PARTITION\|persist:superset" apps/desktop/electron.vite.config.ts
      2. Assert: renderer define block includes partition constant injection
    Expected Result: Renderer gets partition value via define
    Evidence: .sisyphus/evidence/task-3-vite-define.txt
  ```

  **Commit**: YES (groups with 1, 2)
  - Message: `fix(desktop): isolate dev session partition from production`
  - Files: renderer files + possibly `electron.vite.config.ts`
  - Pre-commit: `bun run typecheck`

- [ ] 4. Fix session partition in tRPC browser router

  **What to do**:
  - `apps/desktop/src/lib/trpc/routers/browser/browser.ts` — Line 160:
    - `session.fromPartition("persist:superset")` → import `APP_PARTITION` from `shared/constants` 并使用
    - 注意：此文件在 `src/lib/trpc/` 下，需确认 import 路径是否可达 `shared/constants`

  **Must NOT do**:
  - 不要修改 browser router 的其他逻辑

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单文件单行修改
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2, 3, 5, 6)
  - **Parallel Group**: Wave 2
  - **Blocks**: F1-F4
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `apps/desktop/src/lib/trpc/routers/browser/browser.ts:155-165` — 当前硬编码 partition 上下文

  **WHY Each Reference Matters**:
  - 需要确认此文件的 import 解析方式（tsconfig paths 或相对路径）

  **Acceptance Criteria**:
  - [ ] `grep -rn '"persist:superset"' apps/desktop/src/lib/` 返回 0 结果
  - [ ] `bun run typecheck` 通过

  **QA Scenarios:**

  ```
  Scenario: No hardcoded partition in tRPC code
    Tool: Bash (grep)
    Steps:
      1. grep -rn '"persist:superset"' apps/desktop/src/lib/ --include="*.ts"
      2. Assert: zero output lines
    Expected Result: Clean - no hardcoded strings
    Evidence: .sisyphus/evidence/task-4-clean.txt
  ```

  **Commit**: YES (groups with 2, 3)
  - Message: `fix(desktop): isolate dev session partition from production`
  - Files: `apps/desktop/src/lib/trpc/routers/browser/browser.ts`

- [ ] 5. Simplify electron.vite.config.ts workspace derivation

  **What to do**:
  - 另一个 Agent 已在 `electron.vite.config.ts` 添加了自动推导 `SUPERSET_WORKSPACE_NAME` 的逻辑（从 worktree 路径提取）
  - 由于用户选择了固定 `superset-local` 方案，这个推导逻辑不再需要用于路径隔离
  - **但保留 `deriveWorkspaceNameFromWorktreeSegments` 的导入和调用**，因为 `dev-workspace-name.ts` 仍使用它做 app 显示名和窗口标题
  - 具体修改：
    - 保留 case-insensitive 路径比较逻辑（这是正确的修复）
    - 保留 `deriveWorkspaceNameFromWorktreeSegments` 的调用
    - 保留 `SUPERSET_WORKSPACE_NAME` 的设置和 define 注入（仍用于 app name、window title 等）
    - 不需要额外修改 — 当前逻辑已正确

  **Must NOT do**:
  - 不要删除 workspace name 推导逻辑（仍用于显示目的）
  - 不要修改 `deriveWorkspaceNameFromWorktreeSegments` 函数本身

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 主要是验证和可能的微调，不是大改
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2, 3, 4, 6)
  - **Parallel Group**: Wave 2
  - **Blocks**: F1-F4
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `apps/desktop/electron.vite.config.ts:1-50` — 当前的 workspace 推导逻辑（另一个 Agent 添加的）
  - `apps/desktop/src/shared/constants.ts` — Task 1 修改后的 IS_DEV-based 常量

  **WHY Each Reference Matters**:
  - 需确认 vite config 的推导逻辑与 constants.ts 的新逻辑不冲突

  **Acceptance Criteria**:
  - [ ] electron.vite.config.ts 正确设置 `SUPERSET_WORKSPACE_NAME`
  - [ ] `SUPERSET_WORKSPACE_NAME` 仍被注入到 main 和 renderer define 中
  - [ ] `bun run typecheck` 通过

  **QA Scenarios:**

  ```
  Scenario: Vite config correctly wires workspace name
    Tool: Bash (grep)
    Steps:
      1. grep "SUPERSET_WORKSPACE_NAME" apps/desktop/electron.vite.config.ts
      2. Assert: at least 2 occurrences (main define + renderer define)
    Expected Result: Workspace name still injected
    Evidence: .sisyphus/evidence/task-5-vite-config.txt
  ```

  **Commit**: YES
  - Message: `fix(desktop): simplify dev workspace derivation`
  - Files: `apps/desktop/electron.vite.config.ts`

- [ ] 6. Disable Sentry and PostHog in dev mode

  **What to do**:
  - `apps/desktop/src/main/lib/sentry.ts` — 在 Sentry 初始化函数开头添加 IS_DEV 检查：
    - 如果 `NODE_ENV === "development"`，直接 return，不初始化 Sentry
    - 添加注释说明原因：dev 实例不应向生产 Sentry project 上报
  - `apps/desktop/src/renderer/env.renderer.ts` 或 PostHog 初始化位置 — 添加类似的 dev 模式禁用：
    - 查找 PostHog 初始化代码，在 dev 模式下跳过初始化或使用空 key
  - 注意：Sentry 的 `initSentry` 可能在多个地方被调用（main process index.ts），确认所有路径

  **Must NOT do**:
  - 不要修改 Sentry DSN 或 PostHog key 本身
  - 不要删除 Sentry/PostHog 的配置代码，只是跳过执行

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 在2-3个位置添加 dev 模式守卫
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2, 3, 4, 5)
  - **Parallel Group**: Wave 2
  - **Blocks**: F1-F4
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `apps/desktop/src/main/lib/sentry.ts` — Sentry 初始化逻辑
  - `apps/desktop/src/main/index.ts:35` — `initSentry` 调用点

  **API/Type References**:
  - `apps/desktop/src/renderer/env.renderer.ts` — 检查 PostHog key 定义
  - `apps/desktop/electron.vite.config.ts:191-196` — PostHog key 在 renderer define 中的注入

  **WHY Each Reference Matters**:
  - sentry.ts 需要添加 dev 守卫
  - renderer env 文件和 vite define 需要检查 PostHog 初始化流程

  **Acceptance Criteria**:
  - [ ] `grep -n "initSentry\|Sentry.init" apps/desktop/src/main/lib/sentry.ts` 显示 IS_DEV 守卫
  - [ ] Dev 模式下 PostHog 不初始化或使用空 key
  - [ ] 生产模式行为不变
  - [ ] `bun run typecheck` 通过

  **QA Scenarios:**

  ```
  Scenario: Sentry skips init in dev mode
    Tool: Bash (grep)
    Steps:
      1. grep -n "NODE_ENV\|IS_DEV\|development" apps/desktop/src/main/lib/sentry.ts
      2. Assert: dev mode guard present in init function
    Expected Result: Early return when NODE_ENV === 'development'
    Evidence: .sisyphus/evidence/task-6-sentry-guard.txt

  Scenario: PostHog disabled in dev mode
    Tool: Bash (grep)
    Steps:
      1. grep -rn "posthog\|PostHog\|POSTHOG" apps/desktop/src/renderer/ --include="*.ts" --include="*.tsx" | grep -i "init\|key\|disabled"
      2. Assert: dev mode check exists in PostHog initialization path
    Expected Result: PostHog not initialized in dev
    Evidence: .sisyphus/evidence/task-6-posthog-guard.txt
  ```

  **Commit**: YES
  - Message: `fix(desktop): disable Sentry and PostHog in dev mode`
  - Files: `apps/desktop/src/main/lib/sentry.ts`, renderer PostHog files

- [ ] 7. Unify dev-workspace-name.ts path comparison

  **What to do**:
  - `apps/desktop/src/main/lib/dev-workspace-name.ts` 中 `getWorktreeSegmentsFromCwd()` 函数使用 `path.relative()` 做路径比较，但没有 case-insensitive 处理
  - 统一与 `electron.vite.config.ts` 中相同的大小写不敏感逻辑：
    - 使用 `platform() === "darwin" || platform() === "win32"` 判断
    - 使用 lowercased 路径比较
  - 或者更好的方案：复用 `worktree-id.ts` 中的 `deriveWorkspaceNameFromWorktreeSegments()`（已经在用），但修复路径段提取的 case 问题
  - 同时将 `WORKTREE_BASE` 的计算也做 case-insensitive 处理

  **Must NOT do**:
  - 不要改变 `resolveDevWorkspaceName` 的返回值语义
  - 不要移除从 DB 查询 workspace name 的 fallback 逻辑

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单文件路径比较修复
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2-6, but logically last)
  - **Parallel Group**: Wave 3
  - **Blocks**: F1-F4
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `apps/desktop/src/main/lib/dev-workspace-name.ts:12-27` — 当前 `WORKTREE_BASE` 和 `getWorktreeSegmentsFromCwd()`
  - `apps/desktop/electron.vite.config.ts:29-51` — 另一个 Agent 添加的 case-insensitive 比较模式（参考此实现）

  **WHY Each Reference Matters**:
  - dev-workspace-name.ts 有与 electron.vite.config.ts 相同的 macOS case 问题
  - 需要使用相同的修复模式保持一致

  **Acceptance Criteria**:
  - [ ] `getWorktreeSegmentsFromCwd` 在 macOS 上正确处理大小写不一致的路径
  - [ ] `bun run typecheck` 通过
  - [ ] 现有测试 `bun test apps/desktop/src/main/lib/dev-workspace-name*` 通过（如有）

  **QA Scenarios:**

  ```
  Scenario: Case-insensitive path matching works
    Tool: Bash (grep)
    Steps:
      1. grep -n "caseInsensitive\|toLowerCase\|norm(" apps/desktop/src/main/lib/dev-workspace-name.ts
      2. Assert: case-insensitive normalization present
    Expected Result: At least one line with case handling
    Evidence: .sisyphus/evidence/task-7-case-fix.txt

  Scenario: Type check passes
    Tool: Bash
    Steps:
      1. bun run typecheck
      2. Assert: exit code 0
    Expected Result: No type errors
    Evidence: .sisyphus/evidence/task-7-typecheck.txt
  ```

  **Commit**: YES
  - Message: `fix(desktop): unify case-insensitive path comparison in dev-workspace-name`
  - Files: `apps/desktop/src/main/lib/dev-workspace-name.ts`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, grep constant). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `bun run typecheck` + `bun run lint:fix` + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Verify: (1) grep all `persist:superset` not followed by `-local` in dev-mode code paths, (2) grep all `~/.superset/` references that should be `~/.superset-local/` in dev mode, (3) confirm no Sentry/PostHog init in dev mode. Save evidence to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Commit | Message | Files | Pre-commit |
|--------|---------|-------|------------|
| 1 | `fix(desktop): isolate dev instance data to ~/.superset-local` | constants.ts, main process files | `bun run typecheck` |
| 2 | `fix(desktop): isolate dev session partition from production` | renderer files, tRPC router | `bun run typecheck` |
| 3 | `fix(desktop): simplify dev workspace derivation and disable telemetry` | electron.vite.config.ts, sentry.ts, posthog | `bun run typecheck` |

---

## Success Criteria

### Verification Commands
```bash
# 1. 确认没有遗漏的硬编码 session partition
grep -rn '"persist:superset"' apps/desktop/src/ --include="*.ts" --include="*.tsx"
# Expected: 所有出现的地方都使用常量或已经是 superset-local

# 2. 确认 dev 模式数据目录
node -e "process.env.NODE_ENV='development'; process.env.SUPERSET_WORKSPACE_NAME='superset'; require('./apps/desktop/src/shared/constants.ts')" 2>/dev/null || echo "check manually"
# Expected: SUPERSET_DIR_NAME = ".superset-local" in dev mode

# 3. Type check passes
bun run typecheck
# Expected: no errors

# 4. Lint passes
bun run lint
# Expected: no errors
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] DEV 实例数据写入 `~/.superset-local/`
- [ ] 生产实例行为完全不变
