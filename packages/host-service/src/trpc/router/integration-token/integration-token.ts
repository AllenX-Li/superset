import type { TRPCRouterRecord } from "@trpc/server";
import { protectedProcedure } from "../../index";

export const integrationTokenRouter = {
	list: protectedProcedure.query(async ({ ctx }) => {
		if (!ctx.api) return [];
		return ctx.api.integration.list.query({
			organizationId: ctx.organizationId,
		});
	}),
} satisfies TRPCRouterRecord;
