import type { GatedFeature } from "./constants";

export function usePaywall() {
	function hasAccess(_feature: GatedFeature): boolean {
		return true;
	}

	function gateFeature(
		_feature: GatedFeature,
		callback: () => void | Promise<void>,
	): void {
		const result = callback();
		if (result instanceof Promise) {
			result.catch((error) => {
				console.error("[paywall] Callback error:", error);
			});
		}
	}

	return {
		hasAccess,
		gateFeature,
		userPlan: "pro" as const,
	};
}
