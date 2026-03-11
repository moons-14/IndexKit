import { and, eq, ilike, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/index.js";
import { authors, workAuthors, works } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";

export const worksRoute = new Hono()
  .use(requireAuth)
  .get("/", async (c) => {
    const page = Number(c.req.query("page") ?? "1");
    const limit = Math.min(Number(c.req.query("limit") ?? "50"), 200);
    const search = c.req.query("search");
    const series = c.req.query("series");
    const authorId = c.req.query("authorId");
    const format = c.req.query("format") as
      | (typeof works.$inferSelect)["format"]
      | undefined;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(works.title, `%${search}%`),
          ilike(works.series, `%${search}%`),
        ),
      );
    }
    if (series) {
      conditions.push(eq(works.series, series));
    }
    if (format) {
      conditions.push(eq(works.format, format));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    let results: (typeof works.$inferSelect)[];

    if (authorId) {
      const joined = await db
        .select({ works })
        .from(works)
        .innerJoin(workAuthors, eq(workAuthors.workId, works.id))
        .where(and(eq(workAuthors.authorId, authorId), ...(where ? [where] : [])))
        .limit(limit)
        .offset(offset);
      results = joined.map((r) => r.works);
    } else {
      results = await db
        .select()
        .from(works)
        .where(where)
        .limit(limit)
        .offset(offset);
    }

    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(works)
      .where(where);

    return c.json({
      data: results,
      total: Number(totalResult[0]?.count ?? 0),
      page,
      limit,
    });
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const work = await db
      .select()
      .from(works)
      .where(eq(works.id, id))
      .then((r) => r[0]);

    if (!work) {
      return c.json({ error: "Not found" }, 404);
    }

    const workAuthorsList = await db
      .select({ author: authors, role: workAuthors.role })
      .from(workAuthors)
      .innerJoin(authors, eq(authors.id, workAuthors.authorId))
      .where(eq(workAuthors.workId, id));

    return c.json({ ...work, authors: workAuthorsList });
  });
