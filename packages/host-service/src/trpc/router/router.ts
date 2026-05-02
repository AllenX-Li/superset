import { router } from "../index";
import { authRouter } from "./auth";
import { chatRouter } from "./chat";
import { cloudRouter } from "./cloud";
import { filesystemRouter } from "./filesystem";
import { gitRouter } from "./git";
import { githubRouter } from "./github";
import { healthRouter } from "./health";
import { hostRouter } from "./host";
import { integrationTokenRouter } from "./integration-token";
import { portsRouter } from "./ports";
import { projectRouter } from "./project";
import { pullRequestsRouter } from "./pull-requests";
import { settingsRouter } from "./settings";
import { taskRouter } from "./task";
import { taskStatusRouter } from "./task-status";
import { terminalRouter } from "./terminal";
import { workspaceRouter } from "./workspace";
import { workspaceCleanupRouter } from "./workspace-cleanup";
import { workspaceCreationRouter } from "./workspace-creation";

export const appRouter = router({
	auth: authRouter,
	health: healthRouter,
	host: hostRouter,
	chat: chatRouter,
	filesystem: filesystemRouter,
	git: gitRouter,
	github: githubRouter,
	cloud: cloudRouter,
	pullRequests: pullRequestsRouter,
	project: projectRouter,
	terminal: terminalRouter,
	workspace: workspaceRouter,
	workspaceCleanup: workspaceCleanupRouter,
	workspaceCreation: workspaceCreationRouter,
	ports: portsRouter,
	task: taskRouter,
	taskStatus: taskStatusRouter,
	integrationToken: integrationTokenRouter,
	settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
