"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAppStore } from "@/store/app.store";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { AppIcon } from "@/components/ui/app-icon";
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
} from "lucide-react";
import { toast } from "sonner";
import type { AccentColor, FontFamily, Theme } from "@/types/ui";

type Section = "appearance" | "maddy" | "keyboard" | "account";

export default function SettingsPage() {
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

  const updateSettings = useMutation(api.workspaces.updateSettings);
  const user = useQuery(api.workspaces.getCurrentUser);

  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [geminiInput, setGeminiInput] = useState(geminiApiKey);
  const [saving, setSaving] = useState(false);

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

  const navItems: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: "appearance", label: "Appearance", icon: <Palette className="w-4 h-4" /> },
    { id: "maddy", label: "Maddy AI", icon: <AppIcon className="w-4 h-4 rounded-md" /> },
    { id: "keyboard", label: "Keyboard shortcuts", icon: <Keyboard className="w-4 h-4" /> },
    { id: "account", label: "Account", icon: <Shield className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <div className="flex gap-8">
          {/* Sidebar nav */}
          <nav className="w-44 shrink-0">
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
          <div className="flex-1 space-y-8">
            {/* ── Appearance ── */}
            {section === "appearance" && (
              <>
                <SettingSection title="Theme">
                  <div className="flex gap-3">
                    {(
                      [
                        { value: "light", icon: <Sun className="w-4 h-4" />, label: "Light" },
                        { value: "dark", icon: <Moon className="w-4 h-4" />, label: "Dark" },
                        { value: "system", icon: <Monitor className="w-4 h-4" />, label: "System" },
                      ] as { value: Theme; icon: React.ReactNode; label: string }[]
                    ).map((t) => (
                      <button
                        key={t.value}
                        onClick={() => handleThemeChange(t.value)}
                        className={cn(
                          "flex flex-col items-center gap-2 px-4 py-3 rounded-xl border-2 text-xs font-medium transition-all",
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
                  <div className="flex gap-2">
                    {ACCENT_COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => {
                          setAccentColor(c.value as AccentColor);
                          updateSettings({ accentColor: c.value }).catch(() => {});
                        }}
                        className={cn(
                          "w-8 h-8 rounded-full transition-all ring-2 ring-offset-2",
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
                  <div className="flex gap-3">
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
                          "flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 text-xs transition-all",
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
                  <div className="space-y-2 max-w-sm">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={apiKeyVisible ? "text" : "password"}
                          value={geminiInput}
                          onChange={(e) => setGeminiInput(e.target.value)}
                          placeholder="AIza..."
                          className="pr-10"
                        />
                        <button
                          type="button"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                        size="sm"
                        className="bg-foreground text-background hover:opacity-90"
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
                      Semantic search across your knowledge base
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
                      className="flex items-center justify-between py-2 border-b last:border-b-0"
                    >
                      <span className="text-sm">{sc.desc}</span>
                      <kbd className="text-xs bg-muted px-2 py-1 rounded font-mono border">
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
  children: React.ReactNode;
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
