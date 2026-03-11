import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { works } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { openReader } from "@indexkit/library-scanner";

export const pagesRoute = new Hono()
  .use(requireAuth)
  .get("/:id/pages", async (c) => {
    const id = c.req.param("id");
    const work = await db
      .select()
      .from(works)
      .where(eq(works.id, id))
      .then((r) => r[0]);

    if (!work) {
      return c.json({ error: "Not found" }, 404);
    }

    const reader = await openReader({
      path: work.path,
      format: work.format,
      size: work.size,
      mtime: work.mtime,
    });

    try {
      const pages = await reader.getPages();
      return c.json(
        pages.map((name, index) => ({ index, name })),
      );
    } finally {
      await reader.close();
    }
  })
  .get("/:id/pages/:index", async (c) => {
    const id = c.req.param("id");
    const pageIndex = Number(c.req.param("index"));

    const work = await db
      .select()
      .from(works)
      .where(eq(works.id, id))
      .then((r) => r[0]);

    if (!work) {
      return c.json({ error: "Not found" }, 404);
    }

    const reader = await openReader({
      path: work.path,
      format: work.format,
      size: work.size,
      mtime: work.mtime,
    });

    try {
      const pages = await reader.getPages();
      const pageName = pages[pageIndex];

      if (!pageName) {
        return c.json({ error: "Page not found" }, 404);
      }

      const buffer = await reader.getPage(pageName);
      // Detect content type from extension
      const ext = pageName.split(".").pop()?.toLowerCase();
      const contentType =
        ext === "jpg" || ext === "jpeg"
          ? "image/jpeg"
          : ext === "png"
            ? "image/png"
            : ext === "webp"
              ? "image/webp"
              : ext === "gif"
                ? "image/gif"
                : "application/octet-stream";

      return new Response(new Uint8Array(buffer), {
        headers: { "Content-Type": contentType },
      });
    } finally {
      await reader.close();
    }
  });
