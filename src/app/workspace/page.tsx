import { redirect } from "next/navigation";
import { DEFAULT_WORKSPACE_ROUTE } from "@/lib/routes";

export default function WorkspacePage() {
  redirect(DEFAULT_WORKSPACE_ROUTE);
}
