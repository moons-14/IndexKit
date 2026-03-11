import { Hono } from "hono";
import { eq, ilike, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { authors, workAuthors, works } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";

export const authorsRoute = new Hono()
  .use(requireAuth)
  .get("/", async (c) => {
    const search = c.req.query("search");
    const page = Number(c.req.query("page") ?? "1");
    const limit = Math.min(Number(c.req.query("limit") ?? "50"), 200);
    const offset = (page - 1) * limit;

    const query = db.select().from(authors);
    if (search) {
      query.where(ilike(authors.name, `%${search}%`));
    }

    const results = await query.limit(limit).offset(offset);
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(authors)
      .where(search ? ilike(authors.name, `%${search}%`) : undefined);

    return c.json({
      data: results,
      total: Number(totalResult[0]?.count ?? 0),
      page,
      limit,
    });
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const author = await db
      .select()
      .from(authors)
      .where(eq(authors.id, id))
      .then((r) => r[0]);

    if (!author) {
      return c.json({ error: "Not found" }, 404);
    }

    const authorWorks = await db
      .select({ work: works, role: workAuthors.role })
      .from(workAuthors)
      .innerJoin(works, eq(works.id, workAuthors.workId))
      .where(eq(workAuthors.authorId, id));

    return c.json({ ...author, works: authorWorks });
  });
