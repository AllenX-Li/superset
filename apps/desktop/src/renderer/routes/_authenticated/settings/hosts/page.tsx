import { eq } from "@tanstack/db";
import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useCollections } from "renderer/routes/_authenticated/providers/CollectionsProvider";
import { MOCK_ORG_ID } from "shared/constants";

export const Route = createFileRoute("/_authenticated/settings/hosts/")({
	component: HostsIndexPage,
});

function HostsIndexPage() {
	const collections = useCollections();
	const navigate = useNavigate();

	const activeOrganizationId = MOCK_ORG_ID;

	const { data: hosts = [] } = useLiveQuery(
		(q) =>
			q
				.from({ hosts: collections.v2Hosts })
				.where(({ hosts }) =>
					eq(hosts.organizationId, activeOrganizationId ?? ""),
				)
				.select(({ hosts }) => ({
					id: hosts.machineId,
					name: hosts.name,
					isOnline: hosts.isOnline,
				})),
		[collections, activeOrganizationId],
	);

	const firstHostId = useMemo(() => {
		const sorted = [...hosts].sort((a, b) => a.name.localeCompare(b.name));
		const online = sorted.find((h) => h.isOnline);
		return (online ?? sorted[0])?.id ?? null;
	}, [hosts]);

	useEffect(() => {
		if (firstHostId) {
			navigate({
				to: "/settings/hosts/$hostId",
				params: { hostId: firstHostId },
				replace: true,
			});
		}
	}, [firstHostId, navigate]);

	if (hosts.length === 0) {
		return (
			<div className="flex items-center justify-center h-full p-6 text-sm text-muted-foreground">
				No hosts yet.
			</div>
		);
	}

	return null;
}
