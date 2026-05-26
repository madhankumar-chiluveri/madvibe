"use client";

import { useEffect, useState } from "react";

export default function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error("[PageError] Page failed to load:", {
      message: error.message,
      digest: error.digest,
      name: error.name,
      stack: error.stack,
    });
  }, [error]);

  const isRenderSpec = error.message?.includes("renderSpec") || error.message?.includes("Invalid array");
  const isReactLoop = error.message?.includes("185") || error.message?.includes("Maximum update depth");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <p className="text-4xl font-semibold text-muted-foreground/60">Error</p>
      <p className="text-lg font-semibold">Failed to load page</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {isRenderSpec || isReactLoop
          ? "The editor crashed while rendering this page's content. The document data may need repair."
          : "This page could not be loaded. It may have been deleted or you may not have access."}
      </p>
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
        <a
          href="/workspace/overview"
          className="rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          Go to Overview
        </a>
        <button
          onClick={() => setShowDetails((v) => !v)}
          className="rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          {showDetails ? "Hide details" : "Show details"}
        </button>
      </div>
      {showDetails && (
        <pre className="mt-2 max-w-xl max-h-[200px] overflow-auto rounded-lg border bg-muted/30 p-3 text-left text-xs text-muted-foreground whitespace-pre-wrap break-all">
          {error.name}: {error.message}
          {error.digest ? `\nDigest: ${error.digest}` : ""}
          {error.stack ? `\n\n${error.stack.slice(0, 1500)}` : ""}
        </pre>
      )}
    </div>
  );
}
