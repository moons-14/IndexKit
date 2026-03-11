"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, User } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Author {
  id: string;
  name: string;
}

async function fetchAuthors(search?: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const params = new URLSearchParams({
    limit: "200",
    ...(search ? { search } : {}),
  });
  const res = await fetch(`${apiUrl}/api/authors?${params}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch authors");
  return res.json() as Promise<{ data: Author[]; total: number }>;
}

export default function AuthorsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ["authors", debouncedSearch],
    queryFn: () => fetchAuthors(debouncedSearch),
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Authors</h1>
          {data && (
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
              {data.total.toLocaleString()}
            </span>
          )}
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search authors..."
            value={search}
            onChange={handleSearchChange}
            className="pl-8"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {data?.data.map((author) => (
            <Button
              key={author.id}
              variant="outline"
              className="h-auto py-3 flex-col gap-1"
              asChild
            >
              <Link href={`/authors/${author.id}`}>
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium truncate w-full text-center">
                  {author.name}
                </span>
              </Link>
            </Button>
          ))}
          {data?.data.length === 0 && (
            <div className="col-span-full flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
              <User className="h-10 w-10 opacity-20" />
              <p className="text-sm">No authors found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
