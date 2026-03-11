"use client";

import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ScanProgress } from "@/components/scan-progress";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ScanPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const jobId = searchParams.get("jobId");
  const [done, setDone] = useState(false);

  if (!jobId) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No job ID provided
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/settings/libraries">
          <ArrowLeft className="h-4 w-4" />
          Back to libraries
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Scanning library</CardTitle>
          <CardDescription>
            This may take a while for large collections
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScanProgress
            jobId={jobId}
            onComplete={() => {
              setDone(true);
              setTimeout(() => router.push("/settings/libraries"), 3000);
            }}
          />

          {done && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Scan complete! Redirecting...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
