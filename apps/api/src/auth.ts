import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { count, eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { account, session, user, verification } from "./db/schema.js";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET ?? "changeme-in-production",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
  trustedOrigins: (process.env.TRUSTED_ORIGINS ?? "http://localhost:3000").split(","),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (newUser) => {
          // First registered user becomes admin
          const [{ total }] = await db.select({ total: count() }).from(user);
          if (total === 1) {
            await db
              .update(user)
              .set({ role: "admin" })
              .where(eq(user.id, newUser.id));
          }
        },
      },
    },
  },
  plugins: [admin()],
});

export type Auth = typeof auth;
