import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Better Auth required tables
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  role: text("role"),
  banned: boolean("banned"),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  expiresAt: timestamp("expires_at"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Application tables
export const libraryStatusEnum = pgEnum("library_status", [
  "idle",
  "scanning",
  "error",
]);

export const libraries = pgTable("libraries", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  path: text("path").notNull().unique(),
  status: libraryStatusEnum("status").notNull().default("idle"),
  lastScannedAt: timestamp("last_scanned_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const formatEnum = pgEnum("format", [
  "cbz",
  "cbr",
  "pdf",
  "epub",
  "image-dir",
]);

export const works = pgTable(
  "works",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    libraryId: uuid("library_id")
      .notNull()
      .references(() => libraries.id, { onDelete: "cascade" }),
    path: text("path").notNull().unique(),
    format: formatEnum("format").notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    mtime: timestamp("mtime").notNull(),
    title: text("title"),
    series: text("series"),
    issueNumber: integer("issue_number"),
    volume: integer("volume"),
    summary: text("summary"),
    year: integer("year"),
    month: integer("month"),
    publisher: text("publisher"),
    genre: text("genre"),
    pageCount: integer("page_count"),
    lang: text("lang"),
    ageRating: text("age_rating"),
    manga: boolean("manga"),
    thumbnailPath: text("thumbnail_path"),
    importedAt: timestamp("imported_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("works_library_id_idx").on(t.libraryId),
    index("works_series_idx").on(t.series),
    index("works_title_idx").on(t.title),
    index("works_format_idx").on(t.format),
  ],
);

export const authorRoleEnum = pgEnum("author_role", [
  "writer",
  "penciller",
  "inker",
  "colorist",
  "cover_artist",
  "editor",
]);

export const authors = pgTable("authors", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const workAuthors = pgTable(
  "work_authors",
  {
    workId: uuid("work_id")
      .notNull()
      .references(() => works.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => authors.id, { onDelete: "cascade" }),
    role: authorRoleEnum("role").notNull().default("writer"),
  },
  (t) => [
    primaryKey({ columns: [t.workId, t.authorId, t.role] }),
    index("work_authors_author_id_idx").on(t.authorId),
  ],
);

export const scanJobStatusEnum = pgEnum("scan_job_status", [
  "running",
  "completed",
  "failed",
]);

export const scanJobs = pgTable("scan_jobs", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  libraryId: uuid("library_id")
    .notNull()
    .references(() => libraries.id, { onDelete: "cascade" }),
  status: scanJobStatusEnum("status").notNull().default("running"),
  totalFiles: integer("total_files").notNull().default(0),
  processedFiles: integer("processed_files").notNull().default(0),
  errors: integer("errors").notNull().default(0),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
});
