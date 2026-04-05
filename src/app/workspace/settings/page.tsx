"use client";

import { type ReactNode, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useAppStore } from "@/store/app.store";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { AppIcon } from "@/components/ui/app-icon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, ACCENT_COLORS } from "@/lib/utils";
import {
  Palette,
  Type,
  Bell,
  Shield,
  Download,
  Keyboard,
  Sun,
  Moon,
  Monitor,
  Save,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Loader2,
  Mail,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import type { AccentColor, FontFamily, Theme } from "@/types/ui";
import { WorkspaceTopBar } from "@/components/workspace/workspace-top-bar";

type Section = "appearance" | "workspace" | "maddy" | "keyboard" | "account";

export default function SettingsPage() {
  const { signOut } = useAuthActions();
  const [section, setSection] = useState<Section>("appearance");
  const {
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    fontFamily,
    setFontFamily,
    maddyEnabled,
    setMaddyEnabled,
    geminiApiKey,
    setGeminiApiKey,
  } = useAppStore();
  const { setTheme: setNextTheme } = useTheme();
  const { currentWorkspace, resolvedWorkspaceId } = useResolvedWorkspace();

  const updateSettings = useMutation(api.workspaces.updateSettings);
  const user = useQuery(api.workspaces.getCurrentUser);
  const workspaceAccess = useQuery(
    api.workspaces.getWorkspaceAccess,
    resolvedWorkspaceId ? { workspaceId: resolvedWorkspaceId } : "skip"
  );
  const workspaceMembers = useQuery(
    api.workspaces.listWorkspaceMembers,
    resolvedWorkspaceId ? { workspaceId: resolvedWorkspaceId } : "skip"
  );
  const workspaceInvites = useQuery(
    api.workspaces.listWorkspaceInvites,
    resolvedWorkspaceId && workspaceAccess?.canManageMembers
      ? { workspaceId: resolvedWorkspaceId }
      : "skip"
  );
  const ledgerPinStatus = useQuery(api.ledgerSecurity.getPinStatus);
  const inviteToWorkspace = useMutation(api.workspaces.inviteToWorkspace);
  const updateWorkspaceMemberRole = useMutation(api.workspaces.updateWorkspaceMemberRole);
  const removeWorkspaceMember = useMutation(api.workspaces.removeWorkspaceMember);
  const cancelWorkspaceInvite = useMutation(api.workspaces.cancelWorkspaceInvite);
  const createLedgerPin = useMutation(api.ledgerSecurity.createPin);
  const sendLedgerPinResetEmail = useAction(api.ledgerSecurityNode.sendPinResetEmail);
  const authStatus = useQuery((api as any).accountConversion.getCurrentAuthStatus);
  const convertPasswordAccountToGoogle = useAction(
    (api as any).accountConversion.convertPasswordAccountToGoogle
  );

  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [geminiInput, setGeminiInput] = useState(geminiApiKey);
  const [saving, setSaving] = useState(false);
  const [conversionPassword, setConversionPassword] = useState("");
  const [authAction, setAuthAction] = useState<"start-google" | "finish-google" | null>(null);
  const [ledgerPin, setLedgerPin] = useState("");
  const [ledgerPinConfirm, setLedgerPinConfirm] = useState("");
  const [ledgerPinAction, setLedgerPinAction] = useState<"setup" | "reset" | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<"editor" | "viewer">("editor");
  const [workspaceAction, setWorkspaceAction] = useState<string | null>(null);

  const handleThemeChange = (t: Theme) => {
    setTheme(t);
    setNextTheme(t);
    updateSettings({ theme: t }).catch(() => {});
  };

  const handleSaveApiKey = async () => {
    setSaving(true);
    try {
      setGeminiApiKey(geminiInput.trim());
      toast.success("API key saved");
    } finally {
      setSaving(false);
    }
  };

  const handleStartGoogleConversion = async () => {
    if (authAction) return;

    setAuthAction("start-google");
    try {
      await signOut();
    } finally {
      window.location.assign("/login?provider=google");
    }
  };

  const handleConvertPasswordToGoogle = async () => {
    if (authAction) return;
    if (!conversionPassword.trim()) {
      toast.error("Enter your current password to finish the conversion.");
      return;
    }

    setAuthAction("finish-google");
    try {
      await convertPasswordAccountToGoogle({ password: conversionPassword });
      toast.success("Your account now uses Google only. Sign in again to open your original data.");
      await signOut();
      window.location.assign("/login?provider=google");
    } catch (error: any) {
      toast.error(error?.message ?? "This account could not be converted.");
      setAuthAction(null);
    }
  };

  const handleCreateLedgerPin = async () => {
    if (ledgerPinAction) return;

    const normalizedPin = ledgerPin.trim();
    if (!/^\d{4}$/.test(normalizedPin)) {
      toast.error("Use a 4-digit PIN for Ledger security.");
      return;
    }

    if (normalizedPin !== ledgerPinConfirm.trim()) {
      toast.error("PIN confirmation does not match.");
      return;
    }

    setLedgerPinAction("setup");
    try {
      await createLedgerPin({ pin: normalizedPin });
      setLedgerPin("");
      setLedgerPinConfirm("");
      toast.success("Ledger PIN created");
    } catch (error: any) {
      toast.error(error?.message ?? "Could not create the Ledger PIN");
    } finally {
      setLedgerPinAction(null);
    }
  };

  const handleSendLedgerResetLink = async () => {
    if (ledgerPinAction) return;

    setLedgerPinAction("reset");
    try {
      const result = await sendLedgerPinResetEmail({});
      toast.success(`Reset link sent to ${result.maskedEmail ?? "your email"}`);
    } catch (error: any) {
      toast.error(error?.message ?? "Could not send the reset email");
    } finally {
      setLedgerPinAction(null);
    }
  };

  const ledgerResetCoolingDown =
    typeof ledgerPinStatus?.resetCooldownEndsAt === "number" &&
    ledgerPinStatus.resetCooldownEndsAt > Date.now();

  const handleInviteMember = async () => {
    if (!resolvedWorkspaceId || !workspaceAccess?.canManageMembers || workspaceAction) return;

    const email = shareEmail.trim();
    if (!email) {
      toast.error("Enter an email address");
      return;
    }

    setWorkspaceAction("invite");
    try {
      const result = await inviteToWorkspace({
        workspaceId: resolvedWorkspaceId,
        email,
        role: shareRole,
      });
      setShareEmail("");
      toast.success(
        result.status === "created_invite"
          ? "Invite created"
          : result.status === "updated_member"
            ? "Member access updated"
            : "Member added"
      );
    } catch (error: any) {
      toast.error(error?.message ?? "Could not share this workspace");
    } finally {
      setWorkspaceAction(null);
    }
  };

  const handleUpdateMemberRole = async (
    memberUserId: string,
    role: "editor" | "viewer"
  ) => {
    if (!resolvedWorkspaceId || workspaceAction) return;

    setWorkspaceAction(`member:${memberUserId}`);
    try {
      await updateWorkspaceMemberRole({
        workspaceId: resolvedWorkspaceId,
        memberUserId,
        role,
      });
      toast.success("Member role updated");
    } catch (error: any) {
      toast.error(error?.message ?? "Could not update member role");
    } finally {
      setWorkspaceAction(null);
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!resolvedWorkspaceId || workspaceAction) return;

    setWorkspaceAction(`remove:${memberUserId}`);
    try {
      await removeWorkspaceMember({
        workspaceId: resolvedWorkspaceId,
        memberUserId,
      });
      toast.success("Member removed");
    } catch (error: any) {
      toast.error(error?.message ?? "Could not remove member");
    } finally {
      setWorkspaceAction(null);
    }
  };

  const handleCancelInvite = async (inviteId: Id<"workspaceInvites">) => {
    if (!resolvedWorkspaceId || workspaceAction) return;

    setWorkspaceAction(`invite:${inviteId}`);
    try {
      await cancelWorkspaceInvite({
        workspaceId: resolvedWorkspaceId,
        inviteId,
      });
      toast.success("Invite cancelled");
    } catch (error: any) {
      toast.error(error?.message ?? "Could not cancel invite");
    } finally {
      setWorkspaceAction(null);
    }
  };

  const navItems: { id: Section; label: string; icon: ReactNode }[] = [
    { id: "appearance", label: "Appearance", icon: <Palette className="w-4 h-4" /> },
    { id: "workspace", label: "Workspace", icon: <Users className="w-4 h-4" /> },
    { id: "maddy", label: "Maddy AI", icon: <AppIcon className="w-4 h-4 rounded-md" /> },
    { id: "keyboard", label: "Shortcuts", icon: <Keyboard className="w-4 h-4" /> },
    { id: "account", label: "Account", icon: <Shield className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen">
      <WorkspaceTopBar moduleTitle="Settings" />
      <div className="max-w-3xl mx-auto p-4 md:p-8">

        {/* Mobile tab bar — horizontal scroll pills */}
        <div className="flex md:hidden overflow-x-auto gap-2 mb-6 pb-1 scrollbar-hide">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={cn(
                "flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-full text-sm font-medium border transition-colors min-h-[40px]",
                section === item.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/40 text-muted-foreground border-border"
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex gap-8">
          {/* Sidebar nav — desktop only */}
          <nav className="hidden md:block w-44 shrink-0">
            <ul className="space-y-0.5">
              {navItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setSection(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                      section === item.id
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-8">
            {/* ── Appearance ── */}
            {section === "appearance" && (
              <>
                <SettingSection title="Theme">
                  <div className="grid grid-cols-3 gap-2 md:flex md:gap-3">
                    {(
                      [
                        { value: "light", icon: <Sun className="w-4 h-4" />, label: "Light" },
                        { value: "dark", icon: <Moon className="w-4 h-4" />, label: "Dark" },
                        { value: "system", icon: <Monitor className="w-4 h-4" />, label: "System" },
                      ] as { value: Theme; icon: ReactNode; label: string }[]
                    ).map((t) => (
                      <button
                        key={t.value}
                        onClick={() => handleThemeChange(t.value)}
                        className={cn(
                          "flex flex-col items-center gap-2 px-3 py-3 rounded-xl border-2 text-xs font-medium transition-all min-h-[72px]",
                          theme === t.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        {t.icon}
                        {t.label}
                        {theme === t.value && (
                          <Check className="w-3 h-3 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </SettingSection>

                <Separator />

                <SettingSection
                  title="Accent colour"
                  description="Used for highlights and interactive elements"
                >
                  <div className="flex flex-wrap gap-2.5">
                    {ACCENT_COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => {
                          setAccentColor(c.value as AccentColor);
                          updateSettings({ accentColor: c.value }).catch(() => {});
                        }}
                        className={cn(
                          "w-9 h-9 rounded-full transition-all ring-2 ring-offset-2",
                          accentColor === c.value
                            ? "ring-current scale-110"
                            : "ring-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: `hsl(${c.hsl})` }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </SettingSection>

                <Separator />

                <SettingSection
                  title="Font family"
                  description="Applies to page content"
                >
                  <div className="grid grid-cols-3 gap-2 md:flex md:gap-3">
                    {(
                      [
                        { value: "default", label: "Default", preview: "Ag" },
                        { value: "serif", label: "Serif", preview: "Ag", className: "font-serif" },
                        { value: "mono", label: "Mono", preview: "Ag", className: "font-mono" },
                      ] as { value: FontFamily; label: string; preview: string; className?: string }[]
                    ).map((f) => (
                      <button
                        key={f.value}
                        onClick={() => {
                          setFontFamily(f.value);
                          updateSettings({ fontFamily: f.value }).catch(() => {});
                        }}
                        className={cn(
                          "flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 text-xs transition-all min-h-[72px]",
                          f.className,
                          fontFamily === f.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <span className="text-xl">{f.preview}</span>
                        <span className="text-muted-foreground">{f.label}</span>
                      </button>
                    ))}
                  </div>
                </SettingSection>
              </>
            )}

            {/* ── Maddy AI ── */}
            {section === "workspace" && (
              <SettingSection
                title="Workspace collaboration"
                description="Share the current workspace so other accounts can open the same spaces, pages, comments, and databases with real-time sync."
              >
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/70">
                    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Workspace
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {currentWorkspace?.name ?? "Workspace"}
                      </p>
                    </div>
                    <div className="border-t border-border/60 px-4 py-3">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          Access
                        </p>
                        <p className="text-sm text-foreground">
                          {workspaceAccess?.role === "owner"
                            ? `Owner${workspaceAccess?.workspace.memberCount ? `, ${workspaceAccess.workspace.memberCount} members` : ""}`
                            : `${workspaceAccess?.role ?? "viewer"} access`}
                        </p>
                      </div>
                    </div>
                    <div className="border-t border-border/60 px-4 py-3">
                      <p className="text-xs leading-5 text-muted-foreground">
                        Shared pages, comments, and databases stay collaborative here. Personal modules like Ledger, habits, feed preferences, and account settings still stay private to each signed-in user.
                      </p>
                    </div>
                  </div>

                  {workspaceAccess?.canManageMembers ? (
                    <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/70">
                      <div className="flex items-center gap-2 px-4 py-3">
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">Invite someone</p>
                      </div>
                      <div className="border-t border-border/60 px-4 py-3">
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px_auto]">
                          <Input
                            value={shareEmail}
                            onChange={(event) => setShareEmail(event.target.value)}
                            placeholder="name@example.com"
                            type="email"
                            className="h-9"
                          />
                          <Select
                            value={shareRole}
                            onValueChange={(value: "editor" | "viewer") => setShareRole(value)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="editor">Editor</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            onClick={() => void handleInviteMember()}
                            disabled={workspaceAction !== null}
                            className="h-9"
                          >
                            {workspaceAction === "invite" ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Share
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                      Only the workspace owner can invite people or change roles. Your current access is {workspaceAccess?.role ?? "viewer"}.
                    </div>
                  )}

                  <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/70">
                    <div className="flex items-center justify-between px-4 py-3">
                      <p className="text-sm font-medium">Members</p>
                      <p className="text-xs text-muted-foreground">
                        {workspaceMembers?.length ?? 0}
                      </p>
                    </div>
                    <div className="divide-y divide-border/60 border-t border-border/60">
                      {workspaceMembers === undefined ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground">Loading members...</div>
                      ) : workspaceMembers.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground">No members yet.</div>
                      ) : (
                        workspaceMembers.map((member: any) => {
                          const isRoleUpdating = workspaceAction === `member:${member.userId}`;
                          const isRemoving = workspaceAction === `remove:${member.userId}`;

                          return (
                            <div
                              key={`${member.userId}:${member.role}`}
                              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-medium">
                                    {member.name}
                                  </p>
                                  {member.isCurrentUser ? (
                                    <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                      You
                                    </span>
                                  ) : null}
                                </div>
                                <p className="truncate text-xs text-muted-foreground">
                                  {member.email ?? "No email"}
                                </p>
                              </div>

                              {member.role === "owner" ? (
                                <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                  Owner
                                </span>
                              ) : workspaceAccess?.canManageMembers ? (
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                  <Select
                                    value={member.role}
                                    onValueChange={(value: "editor" | "viewer") =>
                                      void handleUpdateMemberRole(member.userId, value)
                                    }
                                    disabled={workspaceAction !== null}
                                  >
                                    <SelectTrigger className="h-8 w-[126px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="editor">Editor</SelectItem>
                                      <SelectItem value="viewer">Viewer</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 px-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    disabled={workspaceAction !== null}
                                    onClick={() => void handleRemoveMember(member.userId)}
                                  >
                                    {isRoleUpdating || isRemoving ? (
                                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="mr-1.5 h-4 w-4" />
                                    )}
                                    Remove
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                  {member.role}
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {workspaceAccess?.canManageMembers ? (
                    <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/70">
                      <div className="flex items-center justify-between px-4 py-3">
                        <p className="text-sm font-medium">Pending invites</p>
                        <p className="text-xs text-muted-foreground">
                          {workspaceInvites?.length ?? 0}
                        </p>
                      </div>
                      <div className="divide-y divide-border/60 border-t border-border/60">
                        {workspaceInvites === undefined ? (
                          <div className="px-4 py-3 text-sm text-muted-foreground">Loading invites...</div>
                        ) : workspaceInvites.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-muted-foreground">No pending invites.</div>
                        ) : (
                          workspaceInvites.map((invite: any) => (
                            <div
                              key={invite._id}
                              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{invite.email}</p>
                                <p className="text-xs text-muted-foreground">
                                  Pending {invite.role} invite
                                </p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                disabled={workspaceAction !== null}
                                onClick={() => void handleCancelInvite(invite._id)}
                              >
                                {workspaceAction === `invite:${invite._id}` ? (
                                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="mr-1.5 h-4 w-4" />
                                )}
                                Cancel invite
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </SettingSection>
            )}

            {section === "maddy" && (
              <>
                <SettingSection title="Enable Maddy AI">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={maddyEnabled}
                      onCheckedChange={(v) => {
                        setMaddyEnabled(v);
                        updateSettings({ maddyEnabled: v }).catch(() => {});
                      }}
                    />
                    <span className="text-sm">
                      {maddyEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </SettingSection>

                <Separator />

                <SettingSection
                  title="Gemini API Key"
                  description="Required for AI features. Get your free key at aistudio.google.com"
                >
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={apiKeyVisible ? "text" : "password"}
                          value={geminiInput}
                          onChange={(e) => setGeminiInput(e.target.value)}
                          placeholder="AIza..."
                          className="pr-10 h-10"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                          onClick={() => setApiKeyVisible(!apiKeyVisible)}
                        >
                          {apiKeyVisible ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <Button
                        onClick={handleSaveApiKey}
                        disabled={saving}
                        className="bg-foreground text-background hover:opacity-90 h-10 px-4"
                      >
                        <Save className="w-4 h-4 mr-1.5" />
                        Save
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Stored locally in your browser. Never sent to our servers.
                    </p>
                     {geminiApiKey && (
                       <div className="flex items-center gap-1.5 text-xs text-foreground">
                         <Check className="w-3.5 h-3.5" />
                         API key configured
                       </div>
                     )}
                  </div>
                </SettingSection>

                <Separator />

                <SettingSection title="Maddy capabilities">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-foreground shrink-0" />
                      Auto-tag pages based on content
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-foreground shrink-0" />
                      Summarise long notes
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-foreground shrink-0" />
                      Extract tasks from documents
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-foreground shrink-0" />
                      Semantic search across your BRAIN
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-foreground shrink-0" />
                      Inline AI: explain, rewrite, continue, brainstorm
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-foreground shrink-0" />
                      Workspace reorganisation suggestions
                    </li>
                  </ul>
                </SettingSection>
              </>
            )}

            {/* ── Keyboard shortcuts ── */}
            {section === "keyboard" && (
              <SettingSection title="Keyboard shortcuts">
                <div className="space-y-2">
                  {[
                    { keys: "⌘K", desc: "Open command palette / search" },
                    { keys: "⌘\\", desc: "Toggle sidebar" },
                    { keys: "⌘N", desc: "New page" },
                    { keys: "⌘,", desc: "Open settings" },
                    { keys: "/", desc: "Slash command in editor" },
                    { keys: "⌘Z", desc: "Undo" },
                    { keys: "⌘⇧Z", desc: "Redo" },
                    { keys: "⌘B", desc: "Bold" },
                    { keys: "⌘I", desc: "Italic" },
                    { keys: "⌘⇧S", desc: "Strikethrough" },
                  ].map((sc) => (
                    <div
                      key={sc.keys}
                      className="flex items-center justify-between py-2.5 border-b last:border-b-0"
                    >
                      <span className="text-sm">{sc.desc}</span>
                      <kbd className="text-xs bg-muted px-2 py-1 rounded font-mono border shrink-0 ml-4">
                        {sc.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </SettingSection>
            )}

            {/* ── Account ── */}
            {section === "account" && (
              <SettingSection title="Account">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <p className="text-sm font-medium mt-0.5">
                      {(user as any)?.name ?? "—"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="text-sm font-medium mt-0.5">
                      {(user as any)?.email ?? "—"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Sign-in methods</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <AuthMethodBadge active={Boolean(authStatus?.hasGoogle)}>
                        Google
                      </AuthMethodBadge>
                      <AuthMethodBadge active={Boolean(authStatus?.hasPassword)}>
                        Password
                      </AuthMethodBadge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      A Gmail address still counts as a password account until you
                      actually sign in with Google OAuth.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium">Ledger security PIN</p>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Ledger opens only after a dedicated 4-digit PIN. Changing an existing PIN always goes through a reset link sent to your email.
                        </p>
                      </div>
                      {ledgerPinStatus?.hasPin ? (
                        <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/6 px-2.5 py-1 text-xs font-medium uppercase tracking-[0.16em] text-emerald-600">
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          Not set
                        </span>
                      )}
                    </div>

                    {ledgerPinStatus === undefined ? (
                      <div className="mt-4 text-sm text-muted-foreground">
                        Loading Ledger security status...
                      </div>
                    ) : ledgerPinStatus?.hasPin ? (
                      <div className="mt-4 space-y-3">
                        <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                          Reset emails go to{" "}
                          <span className="font-medium text-foreground">
                            {ledgerPinStatus.maskedEmail ??
                              ledgerPinStatus.email ??
                              "your account email"}
                          </span>
                          .
                        </div>
                        {ledgerResetCoolingDown ? (
                          <p className="text-xs text-muted-foreground">
                            A reset link was sent recently. Wait a minute before sending another one.
                          </p>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full sm:w-auto"
                          onClick={() => void handleSendLedgerResetLink()}
                          disabled={ledgerPinAction !== null || ledgerResetCoolingDown}
                        >
                          {ledgerPinAction === "reset" ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Mail className="mr-2 h-4 w-4" />
                          )}
                          Email reset link
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="ledger-pin">New Ledger PIN</Label>
                            <Input
                              id="ledger-pin"
                              type="password"
                              inputMode="numeric"
                              maxLength={4}
                              value={ledgerPin}
                              onChange={(event) =>
                                setLedgerPin(event.target.value.replace(/\D/g, "").slice(0, 4))
                              }
                              placeholder="4 digits"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ledger-pin-confirm">Confirm PIN</Label>
                            <Input
                              id="ledger-pin-confirm"
                              type="password"
                              inputMode="numeric"
                              maxLength={4}
                              value={ledgerPinConfirm}
                              onChange={(event) =>
                                setLedgerPinConfirm(event.target.value.replace(/\D/g, "").slice(0, 4))
                              }
                              placeholder="Repeat PIN"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Future PIN changes will only happen through an emailed reset link.
                        </p>
                        <Button
                          type="button"
                          className="w-full sm:w-auto"
                          onClick={() => void handleCreateLedgerPin()}
                          disabled={ledgerPinAction !== null}
                        >
                          {ledgerPinAction === "setup" ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Shield className="mr-2 h-4 w-4" />
                          )}
                          Create Ledger PIN
                        </Button>
                      </div>
                    )}
                  </div>

                  {authStatus === undefined ? (
                    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                      Checking connected sign-in methods...
                    </div>
                  ) : null}

                  {!authStatus?.hasGoogle && authStatus?.hasPassword ? (
                    <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
                      <div>
                        <p className="text-sm font-medium">Convert this account to Google-only</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          To keep the same data, first sign out and continue with
                          Google using this exact email. After that, MadVibe will
                          let you finish the conversion and remove password sign-in.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleStartGoogleConversion()}
                        disabled={authAction !== null}
                        className="w-full sm:w-auto"
                      >
                        {authAction === "start-google" ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Continue with Google
                      </Button>
                    </div>
                  ) : null}

                  {authStatus?.hasGoogle &&
                  (authStatus.hasLegacyPasswordAccount || authStatus.hasPassword) ? (
                    <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
                      <div>
                        <p className="text-sm font-medium">
                          {authStatus.hasLegacyPasswordAccount
                            ? "Finish moving your old password account to Google"
                            : "Remove password sign-in"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {authStatus.hasLegacyPasswordAccount
                            ? "We found an older password account for this email. Enter that password once and we’ll reattach Google to your original account, keep the existing data there, and disable password login."
                            : "Google is already connected. Enter your current password once to remove password sign-in and keep Google as the only way in."}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="conversion-password">Current password</Label>
                        <Input
                          id="conversion-password"
                          type="password"
                          value={conversionPassword}
                          onChange={(event) => setConversionPassword(event.target.value)}
                          placeholder="Enter your existing password"
                          autoComplete="current-password"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={() => void handleConvertPasswordToGoogle()}
                        disabled={authAction !== null}
                        className="w-full sm:w-auto"
                      >
                        {authAction === "finish-google" ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {authStatus.hasLegacyPasswordAccount
                          ? "Convert to Google-only"
                          : "Remove password sign-in"}
                      </Button>
                    </div>
                  ) : null}

                  {authStatus?.hasGoogle &&
                  !authStatus.hasPassword &&
                  !authStatus.hasLegacyPasswordAccount ? (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                      <p className="text-sm font-medium">This account already uses Google only</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        You can keep signing in with Google and your existing data
                        will stay on this account.
                      </p>
                    </div>
                  ) : null}
                </div>
              </SettingSection>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function AuthMethodBadge({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        active
          ? "border-foreground/20 bg-foreground/5 text-foreground"
          : "border-border bg-background text-muted-foreground"
      )}
    >
      {children}
    </span>
  );
}
