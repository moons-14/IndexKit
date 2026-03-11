"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { WorkCard } from "./work-card";

interface Work {
  id: string;
  title: string | null;
  series: string | null;
  format: string;
  thumbnailPath: string | null;
}

interface WorkGridProps {
  works: Work[];
  columns?: number;
}

export function WorkGrid({ works, columns = 6 }: WorkGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowCount = Math.ceil(works.length / columns);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 290,
    overscan: 3,
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        className="relative w-full"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIdx = virtualRow.index * columns;
          const rowWorks = works.slice(startIdx, startIdx + columns);

          return (
            <div
              key={virtualRow.index}
              className="absolute top-0 left-0 w-full"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className="grid gap-3 pb-3"
                style={{
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                }}
              >
                {rowWorks.map((work) => (
                  <WorkCard key={work.id} work={work} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
