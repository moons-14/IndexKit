import { hc } from "hono/client";
import type { AppType } from "@indexkit/api";

const API_URL =
  typeof window === "undefined"
    ? (process.env.API_URL ?? "http://localhost:3001")
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001");

export const apiClient = hc<AppType>(API_URL, {
  init: {
    credentials: "include",
  },
});
