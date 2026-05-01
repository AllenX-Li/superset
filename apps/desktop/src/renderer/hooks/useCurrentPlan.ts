export type UserPlan = "free" | "pro" | "enterprise";

interface ResolveCurrentPlanArgs {
	subscriptionPlan?: string | null;
	sessionPlan?: string | null;
	subscriptionsLoaded: boolean;
}

function isPaidPlan(
	plan: string | null | undefined,
): plan is "pro" | "enterprise" {
	return plan === "pro" || plan === "enterprise";
}

export function resolveCurrentPlan({
	subscriptionPlan,
	sessionPlan,
	subscriptionsLoaded,
}: ResolveCurrentPlanArgs): UserPlan {
	if (isPaidPlan(subscriptionPlan)) {
		return subscriptionPlan;
	}

	if (subscriptionsLoaded) {
		return "free";
	}

	if (isPaidPlan(sessionPlan)) {
		return sessionPlan;
	}

	return "free";
}

export function useCurrentPlan(): UserPlan {
	return "pro";
}
