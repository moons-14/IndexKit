"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ScanJob {
  id: string;
  status: string;
  totalFiles: number;
  processedFiles: number;
  errors: number;
  errorMessage: string | null;
}

interface ScanProgressProps {
  jobId: string;
  onComplete?: () => void;
}

export function ScanProgress({ jobId, onComplete }: ScanProgressProps) {
  const [job, setJob] = useState<ScanJob | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

    const poll = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/scan-jobs/${jobId}`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = (await res.json()) as ScanJob;
        setJob(data);
        if (data.status === "completed" || data.status === "failed") {
          onComplete?.();
        }
      } catch {}
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [jobId, onComplete]);

  if (!job) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Initializing scan...</span>
        </div>
        <Progress value={0} />
      </div>
    );
  }

  const progress =
    job.totalFiles > 0
      ? Math.round((job.processedFiles / job.totalFiles) * 100)
      : 0;

  const isDone = job.status === "completed" || job.status === "failed";
  const isFailed = job.status === "failed";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {isDone &&
            (isFailed ? (
              <XCircle className="h-4 w-4 text-destructive" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ))}
          <span
            className={cn(
              "font-medium capitalize",
              isFailed && "text-destructive",
              job.status === "completed" && "text-green-600",
            )}
          >
            {job.status}
          </span>
        </div>
        <span className="tabular-nums text-muted-foreground">
          {job.processedFiles.toLocaleString()} /{" "}
          {job.totalFiles.toLocaleString()} files
        </span>
      </div>

      <Progress
        value={progress}
        className={cn(isFailed && "[&>div]:bg-destructive")}
      />

      {job.errors > 0 && (
        <p className="text-xs text-destructive">
          {job.errors} file{job.errors !== 1 ? "s" : ""} failed to process
        </p>
      )}
      {job.errorMessage && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {job.errorMessage}
        </p>
      )}
    </div>
  );
}
