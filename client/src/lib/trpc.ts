import { createTRPCReact } from "@trpc/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

export const trpc = createTRPCReact<AppRouter>();

/** Inferred tRPC output types — derive client types instead of hand-writing them. */
export type RouterOutputs = inferRouterOutputs<AppRouter>;

