import { TRPCError, type TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "../../index";

const taskPriorityValues = ["urgent", "high", "medium", "low", "none"] as const;

export const taskRouter = {
	all: protectedProcedure.query(async ({ ctx }) => {
		if (!ctx.api) {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message: "Cloud API not configured",
			});
		}
		return ctx.api.task.all.query();
	}),

	byId: protectedProcedure
		.input(z.string().uuid())
		.query(async ({ ctx, input }) => {
			if (!ctx.api) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Cloud API not configured",
				});
			}
			return ctx.api.task.byId.query(input);
		}),

	bySlug: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
		if (!ctx.api) {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message: "Cloud API not configured",
			});
		}
		return ctx.api.task.bySlug.query(input);
	}),

	create: protectedProcedure
		.input(
			z.object({
				slug: z.string().min(1),
				title: z.string().min(1),
				description: z.string().optional(),
				statusId: z.string().min(1),
				priority: z.enum(taskPriorityValues).optional(),
				assigneeId: z.string().optional(),
				organizationId: z.string().min(1),
				labels: z.array(z.string()).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.api) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Cloud API not configured",
				});
			}
			return ctx.api.task.create.mutate(input);
		}),

	createFromUi: protectedProcedure
		.input(
			z.object({
				title: z.string().min(1),
				description: z.string().optional(),
				statusId: z.string().optional(),
				priority: z.enum(taskPriorityValues).optional(),
				assigneeId: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.api) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Cloud API not configured",
				});
			}
			return ctx.api.task.createFromUi.mutate(input);
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				title: z.string().optional(),
				description: z.string().optional(),
				statusId: z.string().optional(),
				priority: z.enum(taskPriorityValues).optional(),
				assigneeId: z.string().nullable().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.api) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Cloud API not configured",
				});
			}
			return ctx.api.task.update.mutate(input);
		}),

	delete: protectedProcedure
		.input(z.string().uuid())
		.mutation(async ({ ctx, input }) => {
			if (!ctx.api) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Cloud API not configured",
				});
			}
			return ctx.api.task.delete.mutate(input);
		}),
} satisfies TRPCRouterRecord;
