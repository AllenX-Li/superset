import { db } from "@superset/db/client";
import { taskStatuses } from "@superset/db/schema";
import type { TRPCRouterRecord } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";
import { verifyOrgMembership } from "../integration/utils";

export const taskStatusRouter = {
	all: protectedProcedure.query(async ({ ctx }) => {
		const organizationId = ctx.session.session.activeOrganizationId;
		if (!organizationId) return [];

		await verifyOrgMembership(ctx.session.user.id, organizationId);

		return db
			.select()
			.from(taskStatuses)
			.where(eq(taskStatuses.organizationId, organizationId))
			.orderBy(taskStatuses.position);
	}),

	byOrganization: protectedProcedure
		.input(z.string().uuid())
		.query(async ({ ctx, input }) => {
			await verifyOrgMembership(ctx.session.user.id, input);

			return db
				.select()
				.from(taskStatuses)
				.where(eq(taskStatuses.organizationId, input))
				.orderBy(taskStatuses.position);
		}),
} satisfies TRPCRouterRecord;
