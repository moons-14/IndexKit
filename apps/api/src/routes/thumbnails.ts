import { Hono } from "hono";
import { createReadStream, existsSync } from "node:fs";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { works } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";

export const thumbnailsRoute = new Hono().get("/:workId", requireAuth, async (c) => {
  const workId = c.req.param("workId") as string;
  const work = await db
    .select({ thumbnailPath: works.thumbnailPath })
    .from(works)
    .where(eq(works.id, workId))
    .then((r) => r[0]);

  if (!work?.thumbnailPath || !existsSync(work.thumbnailPath)) {
    return c.json({ error: "Not found" }, 404);
  }

  const stream = createReadStream(work.thumbnailPath);
  return new Response(stream as unknown as ReadableStream, {
    headers: { "Content-Type": "image/jpeg" },
  });
});
