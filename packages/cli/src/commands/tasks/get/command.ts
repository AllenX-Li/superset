import { CLIError, positional } from "@superset/cli-framework";
import { command } from "../../../lib/command";

export default command({
	description: "Get a task by ID or slug",
	args: [positional("idOrSlug").required().desc("Task ID or slug")],
	run: async ({ ctx, args }) => {
		const idOrSlug = args.idOrSlug as string;
		const taskRow = await ctx.api.task.bySlug.query(idOrSlug);
		if (!taskRow) throw new CLIError(`Task not found: ${idOrSlug}`);

		const task = taskRow.task;
		return {
			data: task,
			message: [
				`${task.slug}: ${task.title}`,
				`Priority: ${task.priority ?? "—"}`,
				`Branch:   ${task.branch ?? "—"}`,
				task.description ? `\n${task.description}` : "",
			]
				.filter(Boolean)
				.join("\n"),
		};
	},
});
