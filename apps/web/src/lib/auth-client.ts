import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL:
    typeof window === "undefined"
      ? (process.env.API_URL ?? "http://localhost:3001")
      : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"),
  plugins: [adminClient()],
});

export const { signIn, signOut, signUp, useSession } = authClient;
