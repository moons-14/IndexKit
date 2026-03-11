import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./auth.js";
import { authorsRoute } from "./routes/authors.js";
import { librariesRoute } from "./routes/libraries.js";
import { pagesRoute } from "./routes/pages.js";
import { scanRoute } from "./routes/scan.js";
import { thumbnailsRoute } from "./routes/thumbnails.js";
import { worksRoute } from "./routes/works.js";

const app = new Hono()
  .use(logger())
  .use(
    cors({
      origin: process.env.WEB_URL ?? "http://localhost:3000",
      credentials: true,
    }),
  )
  // Better Auth handler (all methods, default basePath: /api/auth)
  .all("/api/auth/*", (c) => auth.handler(c.req.raw))
  // API routes
  .route("/api/works", worksRoute)
  .route("/api/works", pagesRoute)
  .route("/api/authors", authorsRoute)
  .route("/api/libraries", librariesRoute)
  .route("/api/scan-jobs", scanRoute)
  .route("/api/thumbnails", thumbnailsRoute);

export type AppType = typeof app;

const port = Number(process.env.PORT ?? "3001");
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API server running on http://localhost:${info.port}`);
});

export default app;
