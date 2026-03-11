import Link from "next/link";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface Work {
  id: string;
  title: string | null;
  series: string | null;
  format: string;
  thumbnailPath: string | null;
}

interface WorkCardProps {
  work: Work;
  className?: string;
}

const FORMAT_COLORS: Record<string, string> = {
  cbz: "bg-blue-100 text-blue-700",
  cbr: "bg-purple-100 text-purple-700",
  pdf: "bg-red-100 text-red-700",
  epub: "bg-green-100 text-green-700",
  "image-dir": "bg-yellow-100 text-yellow-700",
};

export function WorkCard({ work, className }: WorkCardProps) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  return (
    <Link href={`/works/${work.id}`} className={cn("group block", className)}>
      <div className="overflow-hidden rounded-lg border bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <div className="relative aspect-[2/3] bg-muted">
          {work.thumbnailPath ? (
            <img
              src={`${apiUrl}/api/thumbnails/${work.id}`}
              alt={work.title ?? "Work thumbnail"}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <BookOpen className="h-10 w-10 opacity-30" />
              <span className="text-xs uppercase tracking-wide opacity-50">
                {work.format}
              </span>
            </div>
          )}
          <div className="absolute top-1.5 right-1.5">
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                FORMAT_COLORS[work.format] ?? "bg-gray-100 text-gray-700",
              )}
            >
              {work.format}
            </span>
          </div>
        </div>
        <div className="p-2.5">
          <p className="truncate text-sm font-medium leading-snug">
            {work.title ?? "Untitled"}
          </p>
          {work.series && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {work.series}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
