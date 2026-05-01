import type {
	SelectTask,
	SelectTaskStatus,
	SelectUser,
} from "@superset/db/schema";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";
import type { TabValue } from "../../components/TasksTopBar";
import { compareTasks } from "../../utils/sorting";
import { useHybridSearch } from "../useHybridSearch";

export type TaskWithStatus = SelectTask & {
	status: SelectTaskStatus;
	assignee: SelectUser | null;
};

interface UseTasksDataParams {
	filterTab: TabValue;
	searchQuery: string;
	assigneeFilter: string | null;
}

export function useTasksData({
	filterTab,
	searchQuery,
	assigneeFilter,
}: UseTasksDataParams): {
	data: TaskWithStatus[];
	allStatuses: SelectTaskStatus[];
	isLoading: boolean;
} {
	const { activeHostUrl } = useLocalHostService();

	const { data: taskRows, isLoading: isTasksLoading } = useQuery({
		queryKey: ["tasks"],
		queryFn: () => {
			if (!activeHostUrl) return [];
			return getHostServiceClientByUrl(activeHostUrl).task.all.query();
		},
		enabled: !!activeHostUrl,
	});

	const { data: statuses, isLoading: isStatusesLoading } = useQuery({
		queryKey: ["taskStatuses"],
		queryFn: () => {
			if (!activeHostUrl) return [];
			return getHostServiceClientByUrl(activeHostUrl).taskStatus.all.query();
		},
		enabled: !!activeHostUrl,
	});

	const allStatuses = useMemo(() => statuses ?? [], [statuses]);

	const statusMap = useMemo(() => {
		const map = new Map<string, SelectTaskStatus>();
		for (const status of allStatuses) {
			map.set(status.id, status);
		}
		return map;
	}, [allStatuses]);

	const sortedData = useMemo(() => {
		if (!taskRows) return [];
		return taskRows
			.map((row) => {
				const task = row.task as SelectTask;
				const status = statusMap.get(task.statusId);
				if (!status) return null;
				const assignee = row.assignee?.id
					? (row.assignee as unknown as SelectUser)
					: null;
				return { ...task, status, assignee } satisfies TaskWithStatus;
			})
			.filter((t): t is TaskWithStatus => t !== null)
			.sort(compareTasks);
	}, [taskRows, statusMap]);

	const { search } = useHybridSearch(sortedData);

	const searchedData = useMemo(() => {
		if (!searchQuery.trim()) {
			return sortedData;
		}
		const results = search(searchQuery);
		return results.map((r) => r.item);
	}, [sortedData, searchQuery, search]);

	const filteredData = useMemo(() => {
		let result = searchedData;

		if (filterTab !== "all") {
			result = result.filter((task) => {
				const statusType = task.status.type;
				if (filterTab === "active") {
					return statusType === "started" || statusType === "unstarted";
				}
				if (filterTab === "backlog") {
					return statusType === "backlog";
				}
				return true;
			});
		}

		if (assigneeFilter) {
			result = result.filter((task) => {
				if (assigneeFilter === "unassigned") {
					return task.assigneeId === null && task.assigneeExternalId === null;
				}
				if (assigneeFilter.startsWith("ext:")) {
					return task.assigneeExternalId === assigneeFilter.slice(4);
				}
				return task.assigneeId === assigneeFilter;
			});
		}

		return result;
	}, [searchedData, filterTab, assigneeFilter]);

	return {
		data: filteredData,
		allStatuses,
		isLoading: isTasksLoading || isStatusesLoading,
	};
}
