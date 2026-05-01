import { TRPCError, type TRPCRouterRecord } from "@trpc/server";
import { protectedProcedure } from "../../index";

export const taskStatusRouter = {
	all: protectedProcedure.query(async ({ ctx }) => {
		if (!ctx.api) {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message: "Cloud API not configured",
			});
		}
		return ctx.api.taskStatus.all.query();
	}),
} satisfies TRPCRouterRecord;
