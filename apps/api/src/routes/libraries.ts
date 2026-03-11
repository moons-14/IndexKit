import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { libraries, scanJobs } from "../db/schema.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { runScan } from "../services/scanner.js";

export const librariesRoute = new Hono()
  .get("/", requireAuth, async (c) => {
    const all = await db.select().from(libraries);
    return c.json(all);
  })
  .post("/", requireAdmin, async (c) => {
    const body = await c.req.json<{ name: string; path: string }>();
    const [library] = await db
      .insert(libraries)
      .values({ name: body.name, path: body.path })
      .returning();
    return c.json(library, 201);
  })
  .delete("/:id", requireAdmin, async (c) => {
    const id = c.req.param("id") as string;
    await db.delete(libraries).where(eq(libraries.id, id));
    return c.json({ success: true });
  })
  .post("/:id/scan", requireAdmin, async (c) => {
    const id = c.req.param("id") as string;
    const library = await db
      .select()
      .from(libraries)
      .where(eq(libraries.id, id))
      .then((r) => r[0]);

    if (!library) {
      return c.json({ error: "Library not found" }, 404);
    }

    const [job] = await db
      .insert(scanJobs)
      .values({ libraryId: id })
      .returning();

    await db
      .update(libraries)
      .set({ status: "scanning" })
      .where(eq(libraries.id, id));

    // Run scan in background (don't await)
    runScan(library.path, id, job.id).catch(console.error);

    return c.json(job, 202);
  });
