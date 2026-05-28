import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { FileText, Plus, Eye, Trash2, Calendar, ShieldAlert } from "lucide-react";
import { PremiumDateTimePicker } from "@/components/ui/premium-date-time-picker";
import { cn } from "@/lib/utils";

interface DocumentsTabProps {
  vehicleId: Id<"garageVehicles">;
  openLogModal: boolean;
  setOpenLogModal: (open: boolean) => void;
}

const DOCUMENT_TYPES = [
  { value: "rc", label: "Registration Certificate (RC) 📄" },
  { value: "insurance_policy", label: "Insurance Policy 🛡️" },
  { value: "puc", label: "Pollution Certificate (PUC) 🌿" },
  { value: "service_bill", label: "Service Bill 🔧" },
  { value: "warranty_card", label: "Warranty Card 🛡️" },
  { value: "other", label: "Other Document 📄" },
] as const;

export function DocumentsTab({
  vehicleId,
  openLogModal,
  setOpenLogModal,
}: DocumentsTabProps) {
  const documents = useQuery(api.garage.listDocuments, { vehicleId });
  const createDocument = useMutation(api.garage.createDocument);
  const deleteDocument = useMutation(api.garage.deleteDocument);

  // Form State
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<typeof DOCUMENT_TYPES[number]["value"]>("rc");
  const [label, setLabel] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setType("rc");
    setLabel("");
    setFileUrl("");
    setExpiryDate("");
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!label.trim()) {
      toast.error("Document label is required");
      return;
    }
    if (!fileUrl.trim()) {
      toast.error("Document link/file URL is required");
      return;
    }

    setLoading(true);
    try {
      await createDocument({
        vehicleId,
        type,
        label,
        fileUrl,
        expiryDate: expiryDate ? expiryDate : undefined,
        notes: notes ? notes : undefined,
      });

      toast.success("Document added!");
      resetForm();
      setOpenLogModal(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to log document");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: Id<"garageDocuments">) => {
    if (confirm("Are you sure you want to delete this document from the vault?")) {
      try {
        await deleteDocument({ id });
        toast.success("Document deleted");
      } catch (err) {
        toast.error("Failed to delete document");
      }
    }
  };

  const getDocTypeIcon = (docType: string) => {
    switch (docType) {
      case "insurance_policy":
        return "🛡️";
      case "puc":
        return "🌿";
      case "service_bill":
        return "🔧";
      case "rc":
        return "📄";
      default:
        return "📄";
    }
  };

  const now = Date.now();

  return (
    <div className="space-y-6">
      {/* Document grid list */}
      <div className="space-y-4">
        {documents === undefined ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton-shimmer h-32 rounded-xl" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="border border-dashed border-border/60 rounded-xl p-8 text-center bg-card/20 space-y-3">
            <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium text-foreground">No documents uploaded yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Safeguard your RC, insurance policy PDF, PUC certs, or service bills in your encrypted vault.
            </p>
            <Button size="sm" onClick={() => setOpenLogModal(true)} className="rounded-xl mt-2">
              Upload Document
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc: any) => {
              let daysLeft: number | null = null;
              if (doc.expiryDate) {
                daysLeft = Math.ceil((new Date(doc.expiryDate).getTime() - now) / (1000 * 86400));
              }

              return (
                <div key={doc._id} className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between h-40 relative group">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getDocTypeIcon(doc.type)}</span>
                      <span className="text-xs font-bold text-foreground truncate max-w-[150px]">
                        {doc.label}
                      </span>
                    </div>
                    <span className="text-[9px] bg-[var(--notion-gray-bg)] border border-border/40 text-muted-foreground font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider block w-fit">
                      {doc.type.replace("_", " ")}
                    </span>
                  </div>

                  {daysLeft !== null && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className={cn(
                        daysLeft <= 0
                          ? "text-notion-red-text"
                          : daysLeft <= 30
                            ? "text-notion-yellow-text"
                            : "text-muted-foreground"
                      )}>
                        {daysLeft <= 0 ? "Expired ⚠️" : `Expires in ${daysLeft} days`}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center border-t border-border/30 pt-3">
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" /> View Doc
                    </a>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(doc._id)}
                      className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-[var(--notion-gray-bg)] rounded-lg md:opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Document Dialog Form */}
      <Dialog open={openLogModal} onOpenChange={(v) => { if (!v) { resetForm(); setOpenLogModal(false); } }}>
        <DialogContent className="max-w-md rounded-2xl border border-border/60 bg-card p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <FileText className="h-5 w-5 text-primary" />
              Upload Document to Vault
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Add your registration paper, insurance copy, or service receipt.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Document Label *</label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Registration Paper RC (Original)"
                className="rounded-xl border-border/60"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Document Type *</label>
              <Select value={type} onValueChange={(val: any) => setType(val)}>
                <SelectTrigger className="rounded-xl border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">File Link / URL *</label>
              <Input
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://madvibe.vault/docs/rc_him.pdf"
                className="rounded-xl border-border/60"
              />
            </div>

            <div className="space-y-1.5 flex flex-col">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expiry Date (Optional)</label>
              <PremiumDateTimePicker
                value={(() => {
                  if (!expiryDate) return null;
                  const parts = expiryDate.split("-");
                  if (parts.length !== 3) return null;
                  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();
                })()}
                onChange={(ms) => {
                  if (ms === null) {
                    setExpiryDate("");
                  } else {
                    const dateObj = new Date(ms);
                    const yyyy = dateObj.getFullYear();
                    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
                    const dd = String(dateObj.getDate()).padStart(2, "0");
                    setExpiryDate(`${yyyy}-${mm}-${dd}`);
                  }
                }}
                variant="input"
                placeholder="Select expiry date"
                className="w-full rounded-xl border-border/60 h-10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="RC original matches chassis Himalayan"
                className="rounded-xl border-border/60"
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/60 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => { resetForm(); setOpenLogModal(false); }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="rounded-xl"
            >
              {loading ? "Adding..." : "Upload Doc"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
