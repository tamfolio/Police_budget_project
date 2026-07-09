import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound, Loader2, PenLine, Trash2, Upload, UserCircle2 } from "lucide-react";
import { uploadFile, getDownloadUrl, deleteStorageObject } from "@/lib/storageApi";

const SIG_KEY_STORAGE = "pab.signatureKey";

export default function ProfileSettingsPage() {
  const { user, updatePassword } = useAuth();

  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  const [sigKey, setSigKey] = useState<string | null>(() => localStorage.getItem(SIG_KEY_STORAGE));
  const [sigUrl, setSigUrl] = useState<string | null>(null);
  const [sigBusy, setSigBusy] = useState(false);

  const sigInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { document.title = "Profile Settings – NPF BMS"; }, []);

  // Load the download URL for the stored signature key on mount
  useEffect(() => {
    if (!sigKey) return;
    getDownloadUrl(sigKey)
      .then(res => setSigUrl(res.downloadUrl))
      .catch(() => {
        // Key no longer exists in storage — clear it
        localStorage.removeItem(SIG_KEY_STORAGE);
        setSigKey(null);
      });
  }, [sigKey]);

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    if (pwd !== pwd2) { toast.error("Passwords do not match."); return; }
    setSavingPwd(true);
    const { error } = await updatePassword(pwd);
    setSavingPwd(false);
    if (error) { toast.error(error); return; }
    setPwd(""); setPwd2("");
    toast.success("Password updated.");
  };

  const uploadSignature = async (file: File) => {
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      toast.error("Use a PNG or JPG signature image."); return;
    }
    if (file.size > 1024 * 1024) { toast.error("Signature image must be under 1 MB."); return; }
    setSigBusy(true);
    try {
      const res = await uploadFile(file, `signatures/${user?.id}`);
      localStorage.setItem(SIG_KEY_STORAGE, res.key);
      setSigKey(res.key);
      const dl = await getDownloadUrl(res.key);
      setSigUrl(dl.downloadUrl);
      toast.success("Signature saved.");
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setSigBusy(false);
      if (sigInputRef.current) sigInputRef.current.value = "";
    }
  };

  const removeSignature = async () => {
    if (!sigKey || !confirm("Remove your saved signature?")) return;
    setSigBusy(true);
    try {
      await deleteStorageObject(sigKey);
      localStorage.removeItem(SIG_KEY_STORAGE);
      setSigKey(null);
      setSigUrl(null);
      toast.success("Signature removed.");
    } catch {
      toast.error("Could not remove signature.");
    } finally {
      setSigBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold font-serif">Profile &amp; account</h1>
        <p className="text-[12px] text-muted-foreground">
          Manage your sign-in details and document signature.
        </p>
      </div>

      {/* Profile — read-only */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <UserCircle2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold font-serif">Profile</h2>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px]">Email</Label>
          <Input value={user?.email ?? ""} readOnly disabled className="h-9 text-[12px]" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px]">Full name</Label>
          <Input value={user?.fullName ?? ""} readOnly disabled className="h-9 text-[12px]" />
          <p className="text-[10px] text-muted-foreground">
            Contact your System Administrator to update your name or email.
          </p>
        </div>
      </div>

      {/* Change password */}
      <form onSubmit={savePassword} className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold font-serif">Change password</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="pwd" className="text-[12px]">New password</Label>
            <Input
              id="pwd" type="password" autoComplete="new-password"
              value={pwd} onChange={e => setPwd(e.target.value)} className="h-9 text-[12px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pwd2" className="text-[12px]">Confirm new password</Label>
            <Input
              id="pwd2" type="password" autoComplete="new-password"
              value={pwd2} onChange={e => setPwd2(e.target.value)} className="h-9 text-[12px]"
            />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">Minimum 8 characters. You'll stay signed in after the change.</p>
        <Button type="submit" disabled={savingPwd}>
          {savingPwd && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
          {savingPwd ? "Updating…" : "Update password"}
        </Button>
      </form>

      {/* Signature */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <PenLine className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold font-serif">Signature</h2>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Upload a PNG or JPG of your signature (transparent background recommended, max 1 MB).
          It will appear on AIE warrants and approval PDFs next to your name.
        </p>
        {sigUrl ? (
          <div className="flex items-center gap-4">
            <img
              src={sigUrl} alt="Your signature"
              className="h-16 max-w-[260px] object-contain rounded border border-border bg-white p-1"
            />
            <Button
              type="button" variant="ghost" size="sm"
              onClick={removeSignature} disabled={sigBusy}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3 mr-1" />Remove
            </Button>
          </div>
        ) : (
          <p className="text-[11px] italic text-muted-foreground">No signature on file.</p>
        )}
        <div>
          <input
            ref={sigInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadSignature(f); }}
          />
          <Button
            type="button" variant="outline" size="sm"
            disabled={sigBusy}
            onClick={() => sigInputRef.current?.click()}
          >
            {sigBusy
              ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              : <Upload className="h-3 w-3 mr-1" />}
            {sigUrl ? "Replace" : "Upload"} signature
          </Button>
        </div>
      </div>
    </div>
  );
}
