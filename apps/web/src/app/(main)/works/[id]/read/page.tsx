"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageInfo {
  index: number;
  name: string;
}

async function fetchPages(workId: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const res = await fetch(`${apiUrl}/api/works/${workId}/pages`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch pages");
  return res.json() as Promise<PageInfo[]>;
}

export default function ReadPage() {
  const { id } = useParams<{ id: string }>();
  const [currentPage, setCurrentPage] = useState(0);
  const [rtl, setRtl] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const { data: pages, isLoading } = useQuery({
    queryKey: ["pages", id],
    queryFn: () => fetchPages(id),
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  const goNext = useCallback(() => {
    if (pages && currentPage < pages.length - 1) setCurrentPage((p) => p + 1);
  }, [pages, currentPage]);

  const goPrev = useCallback(() => {
    if (currentPage > 0) setCurrentPage((p) => p - 1);
  }, [currentPage]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") rtl ? goPrev() : goNext();
      if (e.key === "ArrowLeft") rtl ? goNext() : goPrev();
      if (e.key === "f") setFullscreen((f) => !f);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, rtl]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!pages?.length) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        No pages found
      </div>
    );
  }

  return (
    <div className={cn("flex h-screen flex-col bg-zinc-950", fullscreen && "fixed inset-0 z-50")}>
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between bg-zinc-900/90 backdrop-blur px-4 py-2 transition-opacity",
          !showControls && "opacity-0 pointer-events-none",
        )}
        onMouseEnter={() => setShowControls(true)}
      >
        <Button variant="ghost" size="sm" asChild className="text-zinc-300 hover:text-white hover:bg-zinc-800">
          <Link href={`/works/${id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={goPrev}
            disabled={currentPage === 0}
            className="text-zinc-300 hover:text-white hover:bg-zinc-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-zinc-300 tabular-nums min-w-[80px] text-center">
            {currentPage + 1} / {pages.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={goNext}
            disabled={currentPage === pages.length - 1}
            className="text-zinc-300 hover:text-white hover:bg-zinc-800"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant={rtl ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setRtl((r) => !r)}
            className={cn(
              "text-xs",
              rtl ? "bg-zinc-700 text-white" : "text-zinc-300 hover:text-white hover:bg-zinc-800",
            )}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {rtl ? "RTL" : "LTR"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setFullscreen((f) => !f)}
            className="text-zinc-300 hover:text-white hover:bg-zinc-800"
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Page image */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden cursor-none"
        onMouseMove={() => setShowControls(true)}
        onClick={() => setShowControls((s) => !s)}
      >
        <img
          key={currentPage}
          src={`${apiUrl}/api/works/${id}/pages/${currentPage}`}
          alt={`Page ${currentPage + 1}`}
          className="max-h-full max-w-full object-contain select-none"
          draggable={false}
        />

        {/* Click zones */}
        <button
          type="button"
          className="absolute left-0 top-0 h-full w-1/3 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); rtl ? goNext() : goPrev(); }}
          aria-label="Previous page"
        />
        <button
          type="button"
          className="absolute right-0 top-0 h-full w-1/3 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); rtl ? goPrev() : goNext(); }}
          aria-label="Next page"
        />
      </div>

      {/* Bottom progress strip */}
      <div className="h-0.5 bg-zinc-800">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${((currentPage + 1) / pages.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
