"use client";

import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/api/trpc/root";

export const trpc = createTRPCReact<AppRouter>();
