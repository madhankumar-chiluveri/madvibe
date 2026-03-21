"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function WorkspaceSetup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const createWorkspace = useMutation(api.workspaces.createWorkspace);
  const { setCurrentWorkspaceId } = useAppStore();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const id = await createWorkspace({ name: name.trim() });
      setCurrentWorkspaceId(id);
      toast.success("Workspace created!");
      router.push("/workspace");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create workspace");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-60 shrink-0 h-full border-r bg-sidebar flex flex-col items-center justify-center p-6">
      <img src="/app-icon.png" alt="MADVERSE" className="w-12 h-12 rounded-2xl mb-4" />
      <h2 className="text-base font-semibold mb-1">Create your workspace</h2>
      <p className="text-xs text-muted-foreground text-center mb-6">
        Give your knowledge OS a name
      </p>
      <form onSubmit={handleCreate} className="w-full space-y-3">
        <div className="space-y-1">
          <Label htmlFor="ws-name" className="text-xs">
            Workspace name
          </Label>
          <Input
            id="ws-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Second Brain"
            className="h-8 text-sm"
            autoFocus
          />
        </div>
        <Button
          type="submit"
          className="w-full h-8 text-sm bg-foreground text-background hover:opacity-90"
          disabled={loading || !name.trim()}
        >
          {loading ? "Creating…" : "Create workspace"}
        </Button>
      </form>
    </div>
  );
}
