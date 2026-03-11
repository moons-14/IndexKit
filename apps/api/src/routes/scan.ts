import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { scanJobs } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";

export const scanRoute = new Hono().get("/:id", requireAuth, async (c) => {
  const id = c.req.param("id") as string;
  const job = await db
    .select()
    .from(scanJobs)
    .where(eq(scanJobs.id, id))
    .then((r) => r[0]);

  if (!job) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json(job);
});
