# Learnings: Local-First Tasks Rewire

## Schema Mismatches (Cloud vs Local DB)

- **Column naming**: Local DB (`@superset/local-db`) uses snake_case (`status`, `status_color`, `assignee_id`, `created_at`). Cloud DB (`@superset/db/schema`) uses camelCase (`statusId`, `assigneeId`, `createdAt`). Must map between them.
- **Missing columns in local**: `taskStatuses` table lacks `type`, `position`, `progressPercent`, `organizationId` that exist in cloud `SelectTaskStatus`. Tasks table stores denormalized status info directly (`status`, `status_color`, `status_type`, `status_position`).
- **Solution**: Create structural types (`StatusInfo`, `StatusMenuItem`) that bridge the gap. Map local rows to these types in the data hook layer.

## Type Safety Patterns

- **`StatusIcon.color` requires `string`** (not `string | null`). Always coalesce with `?? ""` when passing nullable color values.
- **Cloud types leak through component props**. When switching data sources, shared components (StatusMenuItems, AssigneeMenuItems, KanbanColumn, etc.) that accept cloud-typed props need structural replacements. Define interfaces at the component level.
- **`assignee` is `null` not `undefined`** in local-first (no users exist). Components checking `task.assignee?.name` should use `task.assigneeDisplayName` or similar denormalized field instead.
- **Import depth varies**: Files in `$taskId/` subdirectory need `../../../` to reach sibling component directories, not `../../`.

## Mutation/Query Patterns

- **Mutation pattern**: `useMutation({ mutationFn: (vars) => getHostServiceClientByUrl(activeHostUrl).task.update.mutate(vars), onSuccess: () => queryClient.invalidateQueries(...) })`
- **Query pattern**: `useQuery({ queryKey: ["tasks"], queryFn: () => activeHostUrl ? getHostServiceClientByUrl(activeHostUrl).task.all.query() : [], enabled: !!activeHostUrl })`
- **Always guard on `activeHostUrl`**: Local-first may not have a host URL yet. Use `enabled: !!activeHostUrl` and return `[]` as fallback.

## Removed Features (Local-First)

- **Users/Organizations**: Don't exist locally. Use empty arrays or null.
- **Integration connections** (e.g., Linear): Hardcode to `false` (not connected).
- **External URLs** (`task.externalUrl`): Don't exist on local task type. Remove the feature.

## Testing

- Test files referencing `collections.tasks.delete` etc. need updating to check for `deleteMutation` instead.
- Test data objects must match the new `TaskWithStatus` type (flat status object, not joined relations).
