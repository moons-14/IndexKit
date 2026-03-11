"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FolderOpen,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Library {
  id: string;
  name: string;
  path: string;
  status: "idle" | "scanning" | "error";
  lastScannedAt: string | null;
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function fetchLibraries() {
  const res = await fetch(`${apiUrl}/api/libraries`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch libraries");
  return res.json() as Promise<Library[]>;
}

async function addLibrary(data: { name: string; path: string }) {
  const res = await fetch(`${apiUrl}/api/libraries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to add library");
  return res.json() as Promise<Library>;
}

async function deleteLibrary(id: string) {
  await fetch(`${apiUrl}/api/libraries/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
}

async function triggerScan(id: string) {
  const res = await fetch(`${apiUrl}/api/libraries/${id}/scan`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to trigger scan");
  return res.json() as Promise<{ id: string }>;
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  idle: { label: "Idle", variant: "secondary" },
  scanning: { label: "Scanning...", variant: "default" },
  error: { label: "Error", variant: "destructive" },
};

export default function LibrariesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [path, setPath] = useState("");

  const { data: libraries, isLoading } = useQuery({
    queryKey: ["libraries"],
    queryFn: fetchLibraries,
  });

  const addMutation = useMutation({
    mutationFn: addLibrary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["libraries"] });
      setShowAdd(false);
      setName("");
      setPath("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLibrary,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["libraries"] }),
  });

  const scanMutation = useMutation({
    mutationFn: triggerScan,
    onSuccess: (job, libraryId) => {
      queryClient.invalidateQueries({ queryKey: ["libraries"] });
      router.push(`/settings/libraries/${libraryId}/scan?jobId=${job.id}`);
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Libraries</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your media directories
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} size="sm">
          <Plus className="h-4 w-4" />
          Add library
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add new library</CardTitle>
            <CardDescription>
              Enter a name and the path to a directory containing your media files
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lib-name">Name</Label>
                <Input
                  id="lib-name"
                  placeholder="My Comics"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lib-path">Path</Label>
                <Input
                  id="lib-path"
                  placeholder="/library"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => addMutation.mutate({ name, path })}
                disabled={!name || !path || addMutation.isPending}
                size="sm"
              >
                {addMutation.isPending && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                Add library
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowAdd(false); setName(""); setPath(""); }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {libraries?.map((lib) => {
            const statusBadge = STATUS_BADGE[lib.status] ?? STATUS_BADGE.idle;
            return (
              <Card key={lib.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      <FolderOpen className="h-4 w-4 text-secondary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{lib.name}</p>
                        <Badge variant={statusBadge.variant} className="shrink-0 text-xs">
                          {statusBadge.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate font-mono">
                        {lib.path}
                      </p>
                      {lib.lastScannedAt && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Last scanned{" "}
                          {new Date(lib.lastScannedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => scanMutation.mutate(lib.id)}
                      disabled={lib.status === "scanning" || scanMutation.isPending}
                      className="gap-1.5"
                    >
                      <RefreshCw className={cn("h-3.5 w-3.5", lib.status === "scanning" && "animate-spin")} />
                      Scan
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(lib.id)}
                      disabled={deleteMutation.isPending}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {libraries?.length === 0 && (
            <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-muted-foreground">
              <FolderOpen className="h-10 w-10 opacity-20" />
              <div className="text-center">
                <p className="text-sm font-medium">No libraries yet</p>
                <p className="text-xs mt-0.5">Add a library to get started</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
