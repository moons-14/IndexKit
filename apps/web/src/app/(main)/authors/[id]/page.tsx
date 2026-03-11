"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, User } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { WorkCard } from "@/components/work-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AuthorDetail {
  id: string;
  name: string;
  works: Array<{
    work: {
      id: string;
      title: string | null;
      series: string | null;
      format: string;
      thumbnailPath: string | null;
    };
    role: string;
  }>;
}

async function fetchAuthor(id: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const res = await fetch(`${apiUrl}/api/authors/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error("Author not found");
  return res.json() as Promise<AuthorDetail>;
}

export default function AuthorPage() {
  const { id } = useParams<{ id: string }>();
  const { data: author, isLoading } = useQuery({
    queryKey: ["author", id],
    queryFn: () => fetchAuthor(id),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!author) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
        <User className="h-10 w-10 opacity-20" />
        <p>Author not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/authors">
          <ArrowLeft className="h-4 w-4" />
          All authors
        </Link>
      </Button>

      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
          <User className="h-6 w-6 text-secondary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{author.name}</h1>
          <Badge variant="secondary" className="mt-0.5">
            {author.works.length} work{author.works.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {author.works.map(({ work }) => (
          <WorkCard key={work.id} work={work} />
        ))}
      </div>
    </div>
  );
}
