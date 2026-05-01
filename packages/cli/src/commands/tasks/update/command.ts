import { CLIError, positional, string } from "@superset/cli-framework";
import { command } from "../../../lib/command";

export default command({
	description: "Update a task",
	args: [positional("idOrSlug").required().desc("Task ID or slug")],
	options: {
		title: string().desc("Task title"),
		description: string().desc("Task description"),
		priority: string()
			.enum("urgent", "high", "medium", "low", "none")
			.desc("Priority"),
		assignee: string().desc("Assignee user ID"),
		branch: string().desc("Git branch"),
	},
	run: async ({ ctx, args, options }) => {
		const idOrSlug = args.idOrSlug as string;
		const taskRow = await ctx.api.task.bySlug.query(idOrSlug);
		if (!taskRow) throw new CLIError(`Task not found: ${idOrSlug}`);

		const result = await ctx.api.task.update.mutate({
			id: taskRow.task.id,
			title: options.title ?? undefined,
			description: options.description ?? undefined,
			priority: options.priority ?? undefined,
			assigneeId: options.assignee ?? undefined,
			branch: options.branch ?? undefined,
		});

		return {
			data: result.task,
			message: `Updated task ${taskRow.task.slug}`,
		};
	},
});
