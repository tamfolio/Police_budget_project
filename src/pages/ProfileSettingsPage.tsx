import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserCircle2, KeyRound, PenLine, Upload, Trash2 } from "lucide-react";

export default function ProfileSettingsPage() {
  const { user, updatePassword } = useAuth();
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [sigUrl, setSigUrl] = useState<string | null>(null);
  const [sigBusy, setSigBusy] = useState(false);

  useEffect(() => { document.title = "Profile Settings – NPF BMS"; }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("full_name, signature_url").eq("user_id", user.id).maybeSingle();
      setFullName(data?.full_name ?? (user.user_metadata as any)?.full_name ?? "");
      setSigUrl((data as any)?.signature_url ?? null);
      setLoading(false);
    })();
  }, [user]);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingName(true);
    const trimmed = fullName.trim();
    const { error: pErr } = await supabase.from("profiles").update({ full_name: trimmed || null }).eq("user_id", user.id);
    if (pErr) { toast.error(pErr.message); setSavingName(false); return; }
    const { error: mErr } = await supabase.auth.updateUser({ data: { full_name: trimmed } });
    if (mErr) toast.error(mErr.message);
    else toast.success("Profile updated.");
    setSavingName(false);
  };

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
    if (!user) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) { toast.error("Use a PNG or JPG signature image."); return; }
    if (file.size > 1024 * 1024) { toast.error("Signature image must be under 1 MB."); return; }
    setSigBusy(true);
    const ext = file.type === "image/png" ? "png" : "jpg";
    const path = `${user.id}/signature.${ext}`;
    const up = await supabase.storage.from("signatures").upload(path, file, { upsert: true, contentType: file.type });
    if (up.error) { setSigBusy(false); toast.error(up.error.message); return; }
    const { data: pub } = supabase.storage.from("signatures").getPublicUrl(path);
    const url = `${pub.publicUrl}?v=${Date.now()}`;
    const { error } = await supabase.from("profiles").update({ signature_url: url }).eq("user_id", user.id);
    setSigBusy(false);
    if (error) { toast.error(error.message); return; }
    setSigUrl(url);
    toast.success("Signature saved.");
  };

  const removeSignature = async () => {
    if (!user || !sigUrl) return;
    if (!confirm("Remove your saved signature?")) return;
    setSigBusy(true);
    await supabase.storage.from("signatures").remove([`${user.id}/signature.png`, `${user.id}/signature.jpg`]);
    const { error } = await supabase.from("profiles").update({ signature_url: null }).eq("user_id", user.id);
    setSigBusy(false);
    if (error) { toast.error(error.message); return; }
    setSigUrl(null);
    toast.success("Signature removed.");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold font-serif">Profile & account</h1>
        <p className="text-[12px] text-muted-foreground">Update how you appear across NPF BMS and manage your sign-in details.</p>
      </div>

      <form onSubmit={saveName} className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <UserCircle2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold font-serif">Profile</h2>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[12px]">Email</Label>
          <Input id="email" value={user?.email ?? ""} readOnly disabled className="h-9 text-[12px]" />
          <p className="text-[10px] text-muted-foreground">Contact your System Administrator to change your email.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="full_name" className="text-[12px]">Full name</Label>
          <Input
            id="full_name" value={fullName} onChange={e => setFullName(e.target.value)}
            placeholder="e.g. Adaeze Okeke" className="h-9 text-[12px]" disabled={loading}
          />
          <p className="text-[10px] text-muted-foreground">This appears in your dashboard greeting and in audit entries.</p>
        </div>
        <Button type="submit" disabled={savingName || loading}>{savingName ? "Saving…" : "Save profile"}</Button>
      </form>

      <form onSubmit={savePassword} className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold font-serif">Change password</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="pwd" className="text-[12px]">New password</Label>
            <Input id="pwd" type="password" autoComplete="new-password" value={pwd} onChange={e => setPwd(e.target.value)} className="h-9 text-[12px]" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pwd2" className="text-[12px]">Confirm new password</Label>
            <Input id="pwd2" type="password" autoComplete="new-password" value={pwd2} onChange={e => setPwd2(e.target.value)} className="h-9 text-[12px]" />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">Minimum 8 characters. You'll stay signed in after the change.</p>
        <Button type="submit" disabled={savingPwd}>{savingPwd ? "Updating…" : "Update password"}</Button>
      </form>

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <PenLine className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold font-serif">Signature</h2>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Upload a PNG or JPG of your signature (transparent background recommended, max 1 MB).
          It will be rendered on AIE warrants and other approval PDFs next to your name once you sign off.
        </p>
        {sigUrl ? (
          <div className="flex items-center gap-4">
            <img src={sigUrl} alt="Your signature" className="h-16 max-w-[260px] object-contain rounded border border-border bg-white p-1" />
            <Button type="button" variant="ghost" size="sm" onClick={removeSignature} disabled={sigBusy} className="text-destructive">
              <Trash2 className="h-3 w-3 mr-1" />Remove
            </Button>
          </div>
        ) : (
          <p className="text-[11px] italic text-muted-foreground">No signature on file.</p>
        )}
        <div>
          <input
            id="sig-upload"
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadSignature(f); e.currentTarget.value = ""; }}
          />
          <Button type="button" variant="outline" size="sm" disabled={sigBusy} onClick={() => document.getElementById("sig-upload")?.click()}>
            <Upload className="h-3 w-3 mr-1" />{sigUrl ? "Replace" : "Upload"} signature
          </Button>
        </div>
      </div>
    </div>
  );
}