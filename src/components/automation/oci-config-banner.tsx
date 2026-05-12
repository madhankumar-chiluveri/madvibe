"use client";

import Link from "next/link";
import { ArrowRight, Cloud } from "lucide-react";

export function OciConfigBanner() {
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/8 via-orange-500/4 to-transparent p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600">
          <Cloud className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Connect Oracle OCI to start uploading images</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Image upload &amp; auto-fill of Media URLs need your OCI namespace, bucket and signing key. Add them once in
            settings — the rest of this page (paste CSV, edit, export) still works without OCI.
          </p>
        </div>
        <Link
          href="/workspace/settings"
          className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-500/15 dark:text-amber-400"
        >
          Open Settings <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
