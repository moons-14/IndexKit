"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Globe,
  Hash,
  Library,
  Tag,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface WorkDetail {
  id: string;
  title: string | null;
  series: string | null;
  issueNumber: number | null;
  volume: number | null;
  format: string;
  thumbnailPath: string | null;
  publisher: string | null;
  year: number | null;
  month: number | null;
  pageCount: number | null;
  summary: string | null;
  manga: boolean | null;
  lang: string | null;
  ageRating: string | null;
  genre: string | null;
  authors: Array<{ author: { id: string; name: string }; role: string }>;
}

async function fetchWork(id: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const res = await fetch(`${apiUrl}/api/works/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error("Work not found");
  return res.json() as Promise<WorkDetail>;
}

const FORMAT_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  cbz: "default",
  cbr: "default",
  pdf: "destructive" as "default",
  epub: "secondary",
  "image-dir": "outline",
};

export default function WorkPage() {
  const { id } = useParams<{ id: string }>();
  const { data: work, isLoading } = useQuery({
    queryKey: ["work", id],
    queryFn: () => fetchWork(id),
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!work) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
        <BookOpen className="h-12 w-12 opacity-20" />
        <p>Work not found</p>
      </div>
    );
  }

  const meta: { icon: React.ReactNode; label: string; value: string }[] = [
    ...(work.publisher ? [{ icon: <Library className="h-3.5 w-3.5" />, label: "Publisher", value: work.publisher }] : []),
    ...(work.year ? [{ icon: <Calendar className="h-3.5 w-3.5" />, label: "Year", value: work.month ? `${work.year}/${work.month}` : String(work.year) }] : []),
    ...(work.pageCount ? [{ icon: <Hash className="h-3.5 w-3.5" />, label: "Pages", value: String(work.pageCount) }] : []),
    ...(work.lang ? [{ icon: <Globe className="h-3.5 w-3.5" />, label: "Language", value: work.lang }] : []),
    ...(work.genre ? [{ icon: <Tag className="h-3.5 w-3.5" />, label: "Genre", value: work.genre }] : []),
    ...(work.ageRating ? [{ icon: <Tag className="h-3.5 w-3.5" />, label: "Age Rating", value: work.ageRating }] : []),
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/">
          <ArrowLeft className="h-4 w-4" />
          Back to library
        </Link>
      </Button>

      <div className="flex gap-8">
        {/* Cover */}
        <div className="flex-shrink-0 space-y-3">
          <div className="h-80 w-56 overflow-hidden rounded-xl border bg-muted shadow-md">
            {work.thumbnailPath ? (
              <img
                src={`${apiUrl}/api/thumbnails/${work.id}`}
                alt={work.title ?? "Thumbnail"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                <BookOpen className="h-16 w-16 opacity-20" />
                <span className="text-xs uppercase tracking-wide">{work.format}</span>
              </div>
            )}
          </div>
          <Button className="w-full" asChild>
            <Link href={`/works/${work.id}/read`}>
              <BookOpen className="h-4 w-4" />
              Read
            </Link>
          </Button>
        </div>

        {/* Info */}
        <div className="flex-1 space-y-4 min-w-0">
          <div>
            <div className="flex items-start gap-2 flex-wrap">
              <h1 className="text-2xl font-bold leading-tight">
                {work.title ?? "Untitled"}
              </h1>
              <Badge variant={FORMAT_VARIANT[work.format] ?? "outline"} className="mt-1 shrink-0">
                {work.format.toUpperCase()}
              </Badge>
              {work.manga && (
                <Badge variant="secondary" className="mt-1 shrink-0">Manga</Badge>
              )}
            </div>
            {work.series && (
              <p className="mt-1 text-base text-muted-foreground">
                {work.series}
                {work.issueNumber != null && ` #${work.issueNumber}`}
                {work.volume != null && ` Vol.${work.volume}`}
              </p>
            )}
          </div>

          {work.summary && (
            <p className="text-sm text-muted-foreground leading-relaxed">{work.summary}</p>
          )}

          {meta.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                  {meta.map(({ icon, label, value }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="text-muted-foreground">{icon}</span>
                      <dt className="text-xs text-muted-foreground">{label}:</dt>
                      <dd className="text-sm font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}

          {work.authors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Users className="h-4 w-4" />
                Authors
              </div>
              <div className="flex flex-wrap gap-2">
                {work.authors.map((wa) => (
                  <Button
                    key={`${wa.author.id}-${wa.role}`}
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-auto py-1.5"
                  >
                    <Link href={`/authors/${wa.author.id}`}>
                      {wa.author.name}
                      <span className="ml-1 text-xs text-muted-foreground capitalize">
                        ({wa.role})
                      </span>
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
