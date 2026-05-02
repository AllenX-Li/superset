import { useMemo } from "react";
import type { WorkspaceHostTarget } from "renderer/routes/_authenticated/components/DashboardNewWorkspaceModal/components/DashboardNewWorkspaceForm/components/DevicePicker/types";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";

export function useHostTargetUrl(
	hostTarget: WorkspaceHostTarget | null | undefined,
): string | null {
	const { activeHostUrl } = useLocalHostService();
	const activeOrganizationId = null;

	return useMemo(() => {
		if (!hostTarget) return null;
		if (hostTarget.kind === "local") return activeHostUrl;
		if (!activeOrganizationId) return null;
		return null;
	}, [hostTarget, activeHostUrl]);
}
