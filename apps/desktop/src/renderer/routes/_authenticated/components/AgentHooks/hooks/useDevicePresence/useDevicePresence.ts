import { useRef } from "react";
import { electronTrpc } from "renderer/lib/electron-trpc";

export function useDevicePresence() {
	const { data: deviceInfo } = electronTrpc.auth.getDeviceInfo.useQuery();
	const _registeredRef = useRef(false);

	return {
		deviceInfo,
		isActive: !!deviceInfo,
	};
}
