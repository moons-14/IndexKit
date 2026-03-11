"use client";

import { useQuery } from "@tanstack/react-query";
import { Library, Search } from "lucide-react";
import { useRef, useState } from "react";
import { WorkGrid } from "@/components/work-grid";
import { Input } from "@/components/ui/input";

interface Work {
  id: string;
  title: string | null;
  series: string | null;
  format: string;
  thumbnailPath: string | null;
}

async function fetchWorks(params: { search?: string; page: number }) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const searchParams = new URLSearchParams({
    page: String(params.page),
    limit: "100",
    ...(params.search ? { search: params.search } : {}),
  });
  const res = await fetch(`${apiUrl}/api/works?${searchParams}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch works");
  return res.json() as Promise<{
    data: Work[];
    total: number;
    page: number;
    limit: number;
  }>;
}

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ["works", { search: debouncedSearch, page: 1 }],
    queryFn: () => fetchWorks({ search: debouncedSearch, page: 1 }),
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Library className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Library</h1>
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
            placeholder="Search works..."
            value={search}
            onChange={handleSearchChange}
            className="pl-8"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span className="text-sm">Loading library...</span>
          </div>
        </div>
      ) : !data?.data.length ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
          <Library className="h-16 w-16 opacity-20" />
          <div className="text-center">
            <p className="font-medium">No works found</p>
            <p className="mt-1 text-sm">
              {debouncedSearch
                ? "Try a different search term"
                : "Add a library in Settings and start a scan"}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden" style={{ height: "calc(100vh - 120px)" }}>
          <WorkGrid works={data.data} />
        </div>
      )}
    </div>
  );
}
