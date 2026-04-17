import type {
	SelectTask,
	SelectTaskStatus,
	SelectUser,
} from "@superset/db/schema";
import { ScrollArea } from "@superset/ui/scroll-area";
import { Separator } from "@superset/ui/separator";
import { toast } from "@superset/ui/sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";
import { Route as TasksLayoutRoute } from "../layout";
import { ActivitySection } from "./components/ActivitySection";
import { EditableTitle } from "./components/EditableTitle";
import { PropertiesSidebar } from "./components/PropertiesSidebar";
import { TaskDetailHeader } from "./components/TaskDetailHeader";
import { TaskMarkdownRenderer } from "./components/TaskMarkdownRenderer";
import { useEscapeToNavigate } from "./hooks/useEscapeToNavigate";

export const Route = createFileRoute(
	"/_authenticated/_dashboard/tasks/$taskId/",
)({
	component: TaskDetailPage,
});

type TaskDetailRecord = SelectTask & {
	status: SelectTaskStatus;
	assignee: SelectUser | null;
	creator: SelectUser | null;
};

function TaskDetailPage() {
	const { taskId } = Route.useParams();
	const { tab, assignee, search } = TasksLayoutRoute.useSearch();
	const navigate = useNavigate();
	const { activeHostUrl } = useLocalHostService();
	const queryClient = useQueryClient();

	const isUuidTaskId =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
			taskId,
		);

	const backSearch = useMemo(() => {
		const s: Record<string, string> = {};
		if (tab) s.tab = tab;
		if (assignee) s.assignee = assignee;
		if (search) s.search = search;
		return s;
	}, [tab, assignee, search]);
	useEscapeToNavigate("/tasks", { search: backSearch });

	const { data: taskRow, isLoading: isTaskLoading } = useQuery({
		queryKey: ["task-detail", taskId, isUuidTaskId ? "id" : "slug"],
		queryFn: () => {
			if (!activeHostUrl) return null;
			const client = getHostServiceClientByUrl(activeHostUrl);
			return isUuidTaskId
				? client.task.byId.query(taskId)
				: client.task.bySlug.query(taskId);
		},
		enabled: !!activeHostUrl,
	});

	const { data: statuses } = useQuery({
		queryKey: ["taskStatuses"],
		queryFn: () => {
			if (!activeHostUrl) return [];
			return getHostServiceClientByUrl(activeHostUrl).taskStatus.all.query();
		},
		enabled: !!activeHostUrl,
	});

	const statusMap = useMemo(() => {
		const map = new Map<string, SelectTaskStatus>();
		for (const status of statuses ?? []) {
			map.set(status.id, status);
		}
		return map;
	}, [statuses]);

	const task: TaskDetailRecord | null = useMemo(() => {
		if (!taskRow) return null;
		const t = taskRow.task as SelectTask;
		const status = statusMap.get(t.statusId);
		if (!status) return null;
		return {
			...t,
			status,
			assignee: taskRow.assignee?.id
				? (taskRow.assignee as unknown as SelectUser)
				: null,
			creator: taskRow.creator?.id
				? (taskRow.creator as unknown as SelectUser)
				: null,
		};
	}, [taskRow, statusMap]);

	const handleBack = () => {
		navigate({ to: "/tasks", search: backSearch });
	};

	const handleSaveTitle = async (title: string) => {
		if (!task || !activeHostUrl) return;
		try {
			await getHostServiceClientByUrl(activeHostUrl).task.update.mutate({
				id: task.id,
				title,
			});
			await queryClient.invalidateQueries({ queryKey: ["tasks"] });
			await queryClient.invalidateQueries({
				queryKey: ["task-detail", task.id],
			});
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to update title",
			);
		}
	};

	const handleSaveDescription = async (markdown: string) => {
		if (!task || !activeHostUrl) return;
		try {
			await getHostServiceClientByUrl(activeHostUrl).task.update.mutate({
				id: task.id,
				description: markdown,
			});
			await queryClient.invalidateQueries({ queryKey: ["tasks"] });
			await queryClient.invalidateQueries({
				queryKey: ["task-detail", task.id],
			});
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to update description",
			);
		}
	};

	const handleDelete = () => {
		navigate({ to: "/tasks", search: backSearch });
	};
	const creatorName = task?.creator?.name?.trim() ? task.creator.name : null;

	if (!task) {
		if (isTaskLoading) {
			return (
				<div className="flex-1 flex items-center justify-center">
					<span className="text-muted-foreground">Loading task...</span>
				</div>
			);
		}

		return (
			<div className="flex-1 flex items-center justify-center">
				<span className="text-muted-foreground">Task not found</span>
			</div>
		);
	}

	return (
		<div className="flex-1 flex min-h-0">
			<div className="flex-1 flex flex-col min-h-0 min-w-0">
				<TaskDetailHeader
					task={task}
					onBack={handleBack}
					onDelete={handleDelete}
				/>

				<ScrollArea className="flex-1 min-h-0">
					<div className="px-6 py-6 max-w-4xl">
						<EditableTitle value={task.title} onSave={handleSaveTitle} />

						<TaskMarkdownRenderer
							content={task.description ?? ""}
							onSave={handleSaveDescription}
						/>

						{creatorName ? (
							<>
								<Separator className="my-8" />

								<h2 className="text-lg font-semibold mb-4">Activity</h2>

								<ActivitySection
									createdAt={new Date(task.createdAt)}
									creatorName={creatorName}
									creatorAvatarUrl={task.creator?.image}
								/>
							</>
						) : null}
					</div>
				</ScrollArea>
			</div>

			<PropertiesSidebar task={task} />
		</div>
	);
}
