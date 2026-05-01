import { and, eq } from "@tanstack/db";
import { useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";
import { useCollections } from "renderer/routes/_authenticated/providers/CollectionsProvider";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";

export interface WorkspaceHostOption {
	id: string;
	name: string;
	isCloud: boolean;
}

interface UseWorkspaceHostOptionsResult {
	currentDeviceName: string | null;
	activeHostUrl: string | null;
	otherHosts: WorkspaceHostOption[];
}

export function useWorkspaceHostOptions(): UseWorkspaceHostOptionsResult {
	const collections = useCollections();
	const { machineId, activeHostUrl } = useLocalHostService();

	const activeOrganizationId = "local";
	const currentUserId = null;

	const { data: accessibleHosts = [] } = useLiveQuery(
		(q) =>
			q
				.from({ userHosts: collections.v2UsersHosts })
				.innerJoin({ hosts: collections.v2Hosts }, ({ userHosts, hosts }) =>
					eq(userHosts.hostId, hosts.id),
				)
				.where(({ userHosts, hosts }) =>
					and(
						eq(userHosts.userId, currentUserId ?? ""),
						eq(hosts.organizationId, activeOrganizationId ?? ""),
					),
				)
				.select(({ hosts }) => ({
					id: hosts.id,
					machineId: hosts.machineId,
					name: hosts.name,
				})),
		[activeOrganizationId, collections, currentUserId],
	);

	const localHost = useMemo(
		() => accessibleHosts.find((host) => host.machineId === machineId) ?? null,
		[accessibleHosts, machineId],
	);

	const otherHosts = useMemo(
		() =>
			accessibleHosts
				.filter((host) => host.machineId !== machineId)
				.map((host) => ({
					id: host.id,
					name: host.name,
					isCloud: host.machineId == null,
				}))
				.sort((a, b) => a.name.localeCompare(b.name)),
		[accessibleHosts, machineId],
	);

	return {
		currentDeviceName: localHost?.name ?? null,
		activeHostUrl,
		otherHosts,
	};
}
