"use client";

import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { Check, Cloud, Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OciFormState = {
  namespace: string;
  bucketName: string;
  region: string;
  tenancyOcid: string;
  userOcid: string;
  fingerprint: string;
  privateKeyPem: string;
};

const EMPTY: OciFormState = {
  namespace: "",
  bucketName: "",
  region: "",
  tenancyOcid: "",
  userOcid: "",
  fingerprint: "",
  privateKeyPem: "",
};

export function OciConfigSection() {
  const config = useQuery(api.automations.ociSettings.getOciConfig);
  const saveOciConfig = useMutation(api.automations.ociSettings.saveOciConfig);
  const clearOciConfig = useMutation(api.automations.ociSettings.clearOciConfig);
  const testOciConnection = useAction(api.automations.ociUploader.testOciConnection);

  const [form, setForm] = useState<OciFormState>(EMPTY);
  const [keyVisible, setKeyVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (config) setForm(config);
  }, [config]);

  const handleField = (key: keyof OciFormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    for (const key of Object.keys(form) as Array<keyof OciFormState>) {
      if (!form[key].trim()) {
        toast.error(`Field "${labelFor(key)}" cannot be empty.`);
        return;
      }
    }
    setSaving(true);
    try {
      await saveOciConfig({ oci: form });
      toast.success("OCI credentials saved");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save OCI credentials");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await testOciConnection({});
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    } catch (err: any) {
      toast.error(err?.message ?? "Test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("Remove the saved OCI credentials?")) return;
    try {
      await clearOciConfig();
      setForm(EMPTY);
      toast.success("OCI credentials cleared");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not clear");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-sky-500/10 text-sky-500">
            <Cloud className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Oracle Cloud Object Storage</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Hosts uploaded pin images and exposes a public URL the Pinterest bulk importer can pull. Required by the
              Image Uploader and Pin Manager automations.
            </p>
            {config ? (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                <Check className="h-3 w-3" /> Configured
              </span>
            ) : (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/5 px-2 py-0.5 text-[11px] font-medium text-amber-600">
                Not configured
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <FieldInput
          label="Namespace"
          placeholder="ax8rkudqtchh"
          value={form.namespace}
          onChange={handleField("namespace")}
        />
        <FieldInput
          label="Bucket name"
          placeholder="pinterest-affiliate-assets"
          value={form.bucketName}
          onChange={handleField("bucketName")}
        />
        <FieldInput
          label="Region"
          placeholder="ap-hyderabad-1"
          value={form.region}
          onChange={handleField("region")}
        />
        <FieldInput
          label="Key fingerprint"
          placeholder="aa:bb:cc:..."
          value={form.fingerprint}
          onChange={handleField("fingerprint")}
        />
        <FieldInput
          label="Tenancy OCID"
          placeholder="ocid1.tenancy.oc1.."
          value={form.tenancyOcid}
          onChange={handleField("tenancyOcid")}
          fullWidth
        />
        <FieldInput
          label="User OCID"
          placeholder="ocid1.user.oc1.."
          value={form.userOcid}
          onChange={handleField("userOcid")}
          fullWidth
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Private key (PEM)</Label>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setKeyVisible((v) => !v)}
          >
            {keyVisible ? (
              <span className="inline-flex items-center gap-1"><EyeOff className="h-3 w-3" /> Hide</span>
            ) : (
              <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> Show</span>
            )}
          </button>
        </div>
        <textarea
          value={form.privateKeyPem}
          onChange={(e) => handleField("privateKeyPem")(e.target.value)}
          rows={6}
          placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
          className={`w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs leading-relaxed shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${keyVisible ? "" : "blur-[3px] hover:blur-0 focus:blur-0"}`}
        />
        <p className="text-[11px] text-muted-foreground">
          The PEM is stored on Convex against your user record. Only you can read it back through this form.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          Save credentials
        </Button>
        <Button
          variant="outline"
          onClick={() => void handleTest()}
          disabled={testing || !config}
        >
          {testing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Cloud className="mr-1.5 h-4 w-4" />}
          Test connection
        </Button>
        {config && (
          <Button
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => void handleClear()}
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> Remove
          </Button>
        )}
      </div>
    </div>
  );
}

function FieldInput({
  label,
  placeholder,
  value,
  onChange,
  fullWidth,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (next: string) => void;
  fullWidth?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${fullWidth ? "md:col-span-2" : ""}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10"
      />
    </div>
  );
}

function labelFor(key: keyof OciFormState): string {
  return {
    namespace: "Namespace",
    bucketName: "Bucket name",
    region: "Region",
    tenancyOcid: "Tenancy OCID",
    userOcid: "User OCID",
    fingerprint: "Key fingerprint",
    privateKeyPem: "Private key",
  }[key];
}
