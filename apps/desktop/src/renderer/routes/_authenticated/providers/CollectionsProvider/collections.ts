import type {
	SelectAgentCommand,
	SelectApikey,
	SelectAutomation,
	SelectAutomationRun,
	SelectChatSession,
	SelectGithubPullRequest,
	SelectGithubRepository,
	SelectIntegrationConnection,
	SelectInvitation,
	SelectMember,
	SelectOrganization,
	SelectProject,
	SelectSubscription,
	SelectTask,
	SelectTaskStatus,
	SelectUser,
	SelectV2Client,
	SelectV2Host,
	SelectV2Project,
	SelectV2UsersHosts,
	SelectV2Workspace,
	SelectWorkspace,
} from "@superset/db/schema";
import type {
	Collection,
	LocalStorageCollectionUtils,
} from "@tanstack/react-db";
import {
	createCollection,
	localStorageCollectionOptions,
} from "@tanstack/react-db";
import { z } from "zod";
import {
	type DashboardSidebarProjectRow,
	type DashboardSidebarSectionRow,
	dashboardSidebarProjectSchema,
	dashboardSidebarSectionSchema,
	type PendingWorkspaceRow,
	pendingWorkspaceSchema,
	type V2TerminalPresetRow,
	type V2UserPreferencesRow,
	v2TerminalPresetSchema,
	v2UserPreferencesSchema,
	type WorkspaceLocalStateRow,
	workspaceLocalStateSchema,
} from "./dashboardSidebarLocal";

const LOCAL_ORG_ID = "local";

const genericSchema = z.object({ id: z.string() });

export interface OrgCollections {
	v2SidebarProjects: Collection<
		DashboardSidebarProjectRow,
		string,
		LocalStorageCollectionUtils,
		typeof dashboardSidebarProjectSchema,
		z.input<typeof dashboardSidebarProjectSchema>
	>;
	v2WorkspaceLocalState: Collection<
		WorkspaceLocalStateRow,
		string,
		LocalStorageCollectionUtils,
		typeof workspaceLocalStateSchema,
		z.input<typeof workspaceLocalStateSchema>
	>;
	v2SidebarSections: Collection<
		DashboardSidebarSectionRow,
		string,
		LocalStorageCollectionUtils,
		typeof dashboardSidebarSectionSchema,
		z.input<typeof dashboardSidebarSectionSchema>
	>;
	v2TerminalPresets: Collection<
		V2TerminalPresetRow,
		string,
		LocalStorageCollectionUtils,
		typeof v2TerminalPresetSchema,
		z.input<typeof v2TerminalPresetSchema>
	>;
	pendingWorkspaces: Collection<
		PendingWorkspaceRow,
		string,
		LocalStorageCollectionUtils,
		typeof pendingWorkspaceSchema,
		z.input<typeof pendingWorkspaceSchema>
	>;
	tasks: Collection<SelectTask>;
	taskStatuses: Collection<SelectTaskStatus>;
	projects: Collection<SelectProject>;
	v2Hosts: Collection<SelectV2Host>;
	v2Clients: Collection<SelectV2Client>;
	v2UsersHosts: Collection<SelectV2UsersHosts>;
	v2Projects: Collection<SelectV2Project>;
	v2Workspaces: Collection<SelectV2Workspace>;
	workspaces: Collection<SelectWorkspace>;
	members: Collection<SelectMember>;
	users: Collection<SelectUser>;
	invitations: Collection<SelectInvitation>;
	agentCommands: Collection<SelectAgentCommand>;
	integrationConnections: Collection<SelectIntegrationConnection>;
	subscriptions: Collection<SelectSubscription>;
	apiKeys: Collection<SelectApikey>;
	chatSessions: Collection<SelectChatSession>;
	githubRepositories: Collection<SelectGithubRepository>;
	githubPullRequests: Collection<SelectGithubPullRequest>;
	organizations: Collection<SelectOrganization>;
	automations: Collection<SelectAutomation>;
	automationRuns: Collection<SelectAutomationRun>;
	v2UserPreferences: Collection<
		V2UserPreferencesRow,
		"preferences",
		LocalStorageCollectionUtils,
		typeof v2UserPreferencesSchema,
		z.input<typeof v2UserPreferencesSchema>
	>;
}

const stubCollection = <T extends object>(id: string) =>
	createCollection(
		localStorageCollectionOptions({
			id,
			storageKey: `stub-${id}`,
			schema: genericSchema,
			getKey: (item: { id: string }) => item.id,
		}),
	) as unknown as Collection<T>;

export function getCollections(_organizationId: string): OrgCollections {
	const v2SidebarProjects = createCollection(
		localStorageCollectionOptions({
			id: `v2_sidebar_projects-${LOCAL_ORG_ID}`,
			storageKey: `v2-sidebar-projects-${LOCAL_ORG_ID}`,
			schema: dashboardSidebarProjectSchema,
			getKey: (item) => item.projectId,
		}),
	);

	const v2WorkspaceLocalState = createCollection(
		localStorageCollectionOptions({
			id: `v2_workspace_local_state-${LOCAL_ORG_ID}`,
			storageKey: `v2-workspace-local-state-${LOCAL_ORG_ID}`,
			schema: workspaceLocalStateSchema,
			getKey: (item) => item.workspaceId,
		}),
	);

	const v2SidebarSections = createCollection(
		localStorageCollectionOptions({
			id: `v2_sidebar_sections-${LOCAL_ORG_ID}`,
			storageKey: `v2-sidebar-sections-${LOCAL_ORG_ID}`,
			schema: dashboardSidebarSectionSchema,
			getKey: (item) => item.sectionId,
		}),
	);

	const v2TerminalPresets = createCollection(
		localStorageCollectionOptions({
			id: `v2_terminal_presets-${LOCAL_ORG_ID}`,
			storageKey: `v2-terminal-presets-${LOCAL_ORG_ID}`,
			schema: v2TerminalPresetSchema,
			getKey: (item) => item.id,
		}),
	);

	const pendingWorkspaces = createCollection(
		localStorageCollectionOptions({
			id: `pending_workspaces-${LOCAL_ORG_ID}`,
			storageKey: `pending-workspaces-${LOCAL_ORG_ID}`,
			schema: pendingWorkspaceSchema,
			getKey: (item) => item.id,
		}),
	);

	const v2UserPreferences = createCollection(
		localStorageCollectionOptions({
			id: `v2_user_preferences-${LOCAL_ORG_ID}`,
			storageKey: `v2-user-preferences-${LOCAL_ORG_ID}`,
			schema: v2UserPreferencesSchema,
			getKey: (item) => item.id,
		}),
	);

	return {
		tasks: stubCollection<SelectTask>("tasks"),
		taskStatuses: stubCollection<SelectTaskStatus>("task_statuses"),
		projects: stubCollection<SelectProject>("projects"),
		v2Hosts: stubCollection<SelectV2Host>("v2_hosts"),
		v2Clients: stubCollection<SelectV2Client>("v2_clients"),
		v2UsersHosts: stubCollection<SelectV2UsersHosts>("v2_users_hosts"),
		v2Projects: stubCollection<SelectV2Project>("v2_projects"),
		v2Workspaces: stubCollection<SelectV2Workspace>("v2_workspaces"),
		workspaces: stubCollection<SelectWorkspace>("workspaces"),
		members: stubCollection<SelectMember>("members"),
		users: stubCollection<SelectUser>("users"),
		invitations: stubCollection<SelectInvitation>("invitations"),
		agentCommands: stubCollection<SelectAgentCommand>("agent_commands"),
		integrationConnections: stubCollection<SelectIntegrationConnection>(
			"integration_connections",
		),
		subscriptions: stubCollection<SelectSubscription>("subscriptions"),
		apiKeys: stubCollection<SelectApikey>("api_keys"),
		chatSessions: stubCollection<SelectChatSession>("chat_sessions"),
		githubRepositories: stubCollection<SelectGithubRepository>(
			"github_repositories",
		),
		githubPullRequests: stubCollection<SelectGithubPullRequest>(
			"github_pull_requests",
		),
		organizations: stubCollection<SelectOrganization>("organizations"),
		automations: stubCollection<SelectAutomation>("automations"),
		automationRuns: stubCollection<SelectAutomationRun>("automation_runs"),
		v2SidebarProjects,
		v2WorkspaceLocalState,
		v2SidebarSections,
		v2TerminalPresets,
		pendingWorkspaces,
		v2UserPreferences,
	};
}

export async function preloadCollections(
	_organizationId: string,
): Promise<void> {}

export type AppCollections = ReturnType<typeof getCollections>;
