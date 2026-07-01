import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import npfLogo from "@/assets/npf-logo.png";

export default function AuthPage() {
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { document.title = "Sign in – Nigeria Police Force Budget and Accounting Digital System"; }, []);

  if (loading) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading…</div>;
  if (user) return <Navigate to="/dashboard" replace />;

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) { toast.error(error); return; }
    toast.success("Signed in.");
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-primary/5 to-background p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <img src={npfLogo} alt="Nigeria Police Force coat of arms" className="w-12 h-12 object-contain shrink-0" />
          <div className="min-w-0">
            <h1 className="text-[13px] leading-tight font-bold font-serif">Nigeria Police Force</h1>
            <p className="text-[12px] leading-tight font-serif text-foreground">Budget and Accounting Digital System</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Finance House</p>
          </div>
        </div>
        <form onSubmit={onSignIn} className="space-y-3 mt-4">
          <div><Label>Email</Label><Input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} /></div>
          <div><Label>Password</Label><Input type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={busy}>{busy?"Signing in…":"Sign In"}</Button>
          <p className="text-[11px] text-muted-foreground">Accounts are created by your System Administrator.</p>
        </form>
      </div>
    </div>
  );
}