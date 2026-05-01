import { Button } from "@superset/ui/button";
import { useLiveQuery } from "@tanstack/react-db";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HiOutlineCloud } from "react-icons/hi2";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { useCollections } from "renderer/routes/_authenticated/providers/CollectionsProvider";
import { SettingsSection } from "../../../../components/ProjectSettings";
import { ProjectSettingsHeader } from "../../../../components/ProjectSettingsHeader";
import { AddSecretSheet } from "./components/AddSecretSheet";
import { EditSecretDialog } from "./components/EditSecretDialog";
import { EnvironmentVariablesList } from "./components/EnvironmentVariablesList";

interface SecretsSettingsProps {
	projectId: string;
}

interface EditingSecret {
	id: string;
	key: string;
	value: string;
	sensitive: boolean;
}

export function SecretsSettings({ projectId }: SecretsSettingsProps) {
	const utils = electronTrpc.useUtils();
	const collections = useCollections();
	const { data: project } = electronTrpc.projects.get.useQuery({
		id: projectId,
	});

	const linkToNeon = electronTrpc.projects.linkToNeon.useMutation({
		onSettled: () => {
			utils.projects.get.invalidate({ id: projectId });
			utils.projects.getRecents.invalidate();
		},
	});

	const { data: cloudProjects } = useLiveQuery(
		(q) =>
			q.from({ projects: collections.projects }).select(({ projects }) => ({
				id: projects.id,
				repoOwner: projects.repoOwner,
				repoName: projects.repoName,
			})),
		[collections.projects],
	);

	const suggestedMatch = useMemo(() => {
		if (!project || project.neonProjectId || !cloudProjects) return null;
		const repoName = project.mainRepoPath.split("/").pop();
		if (!repoName || !project.githubOwner) return null;
		return cloudProjects.find(
			(cloud) =>
				cloud.repoOwner === project.githubOwner && cloud.repoName === repoName,
		);
	}, [project, cloudProjects]);

	useEffect(() => {
		if (suggestedMatch) {
			linkToNeon.mutate({
				id: projectId,
				neonProjectId: suggestedMatch.id,
			});
		}
	}, [suggestedMatch, linkToNeon.mutate, projectId, linkToNeon]);

	const linkedCloudProject = useMemo(() => {
		if (!project?.neonProjectId || !cloudProjects) return null;
		return cloudProjects.find((c) => c.id === project.neonProjectId);
	}, [project?.neonProjectId, cloudProjects]);

	const organizationId: string | null = null;
	const [isCreatingCloud, _setIsCreatingCloud] = useState(false);
	const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
	const [editingSecret, setEditingSecret] = useState<EditingSecret | null>(
		null,
	);
	const [refreshKey, _setRefreshKey] = useState(0);

	const handleCreateCloudProject = useCallback(async () => {
		return;
	}, []);

	if (!project) {
		return null;
	}

	const isConnected = !!project.neonProjectId && !!linkedCloudProject;

	return (
		<div className="p-6 max-w-4xl w-full select-text">
			<ProjectSettingsHeader title="Environment Variables" />

			<div className="space-y-6">
				{isConnected && organizationId && project.neonProjectId ? (
					<EnvironmentVariablesList
						key={refreshKey}
						onAdd={() => setIsAddSheetOpen(true)}
						onEdit={setEditingSecret}
					/>
				) : (
					<SettingsSection
						icon={<HiOutlineCloud className="h-4 w-4" />}
						title="Cloud Project"
						description="Link this project to a cloud project for sandboxes and environment variables."
					>
						<div className="flex items-center justify-between">
							<p className="text-sm text-muted-foreground">
								{linkToNeon.isPending
									? "Connecting..."
									: "Not connected to a cloud project."}
							</p>
							{!linkToNeon.isPending && (
								<Button
									size="sm"
									variant="outline"
									disabled={isCreatingCloud || !project.githubOwner}
									onClick={handleCreateCloudProject}
								>
									{isCreatingCloud ? "Connecting..." : "Connect to Cloud"}
								</Button>
							)}
						</div>
					</SettingsSection>
				)}
			</div>

			{organizationId && (
				<AddSecretSheet
					open={isAddSheetOpen}
					onOpenChange={setIsAddSheetOpen}
				/>
			)}

			{organizationId && editingSecret && (
				<EditSecretDialog
					open={!!editingSecret}
					onOpenChange={(open) => {
						if (!open) setEditingSecret(null);
					}}
					secret={editingSecret}
				/>
			)}
		</div>
	);
}
