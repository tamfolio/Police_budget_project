import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  CreateExpenditurePayload, ExpenditureRecord, UpdateExpenditurePayload,
} from "@/lib/expendituresApi";

interface Props {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  initial?: ExpenditureRecord | null;
  onSubmit: (payload: CreateExpenditurePayload | UpdateExpenditurePayload) => Promise<void>;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function ExpenditureFormDialog({ open, onClose, mode, initial, onSubmit }: Props) {
  const [fiscalYear, setFiscalYear] = useState<string>(String(new Date().getFullYear()));
  const [expenseDate, setExpenseDate] = useState(today());
  const [voucherNo, setVoucherNo] = useState("");
  const [payee, setPayee] = useState("");
  const [subItemCode, setSubItemCode] = useState("");
  const [aieId, setAieId] = useState("");
  const [grossAmount, setGrossAmount] = useState("");
  const [whtAmount, setWhtAmount] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setFiscalYear(String(initial.fiscalYear ?? ""));
      setExpenseDate(initial.expenseDate ?? today());
      setVoucherNo(initial.voucherNo ?? "");
      setPayee(initial.payee ?? "");
      setSubItemCode(initial.subItemCode ?? "");
      setAieId(initial.aieId ?? "");
      setGrossAmount(String(initial.grossAmount ?? ""));
      setWhtAmount(String(initial.whtAmount ?? "0"));
      setDescription(initial.description ?? "");
    } else {
      setFiscalYear(String(new Date().getFullYear()));
      setExpenseDate(today());
      setVoucherNo("");
      setPayee("");
      setSubItemCode("");
      setAieId("");
      setGrossAmount("");
      setWhtAmount("");
      setDescription("");
    }
  }, [open, mode, initial]);

  const gross = Number(grossAmount) || 0;
  const wht = Number(whtAmount) || 0;
  const net = Math.max(0, gross - wht);

  const submit = async () => {
    if (!fiscalYear || Number(fiscalYear) < 2000) { toast.error("Fiscal year is required."); return; }
    if (!expenseDate) { toast.error("Expense date is required."); return; }
    if (!voucherNo.trim()) { toast.error("Voucher number is required."); return; }
    if (!payee.trim()) { toast.error("Payee is required."); return; }
    if (!subItemCode.trim()) { toast.error("Sub-item code is required."); return; }
    if (!(gross > 0)) { toast.error("Gross amount must be greater than zero."); return; }
    if (wht < 0 || wht > gross) { toast.error("WHT must be between 0 and gross."); return; }

    const payload: CreateExpenditurePayload = {
      fiscalYear: Number(fiscalYear),
      expenseDate,
      voucherNo: voucherNo.trim(),
      payee: payee.trim(),
      subItemCode: subItemCode.trim(),
      grossAmount: gross,
      whtAmount: wht,
    };
    if (aieId.trim()) payload.aieId = aieId.trim();
    if (description.trim()) payload.description = description.trim();

    setBusy(true);
    try { await onSubmit(payload); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New expenditure voucher" : "Edit expenditure voucher"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px]">Fiscal year</Label>
            <Input type="number" value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} className="h-9 mt-1" />
          </div>
          <div>
            <Label className="text-[11px]">Expense date</Label>
            <Input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="h-9 mt-1" />
          </div>
          <div>
            <Label className="text-[11px]">Voucher no.</Label>
            <Input value={voucherNo} onChange={e => setVoucherNo(e.target.value)} placeholder="PV/2026/001" className="h-9 mt-1" />
          </div>
          <div>
            <Label className="text-[11px]">Sub-item code</Label>
            <Input value={subItemCode} onChange={e => setSubItemCode(e.target.value)} placeholder="22020301(a)" className="h-9 mt-1" />
          </div>
          <div className="col-span-2">
            <Label className="text-[11px]">Payee</Label>
            <Input value={payee} onChange={e => setPayee(e.target.value)} placeholder="ABC Supplies Limited" className="h-9 mt-1" />
          </div>
          <div>
            <Label className="text-[11px]">Gross amount (₦)</Label>
            <Input type="number" step="0.01" value={grossAmount} onChange={e => setGrossAmount(e.target.value)} className="h-9 mt-1 tabular-nums" />
          </div>
          <div>
            <Label className="text-[11px]">WHT amount (₦)</Label>
            <Input type="number" step="0.01" value={whtAmount} onChange={e => setWhtAmount(e.target.value)} className="h-9 mt-1 tabular-nums" />
          </div>
          <div className="col-span-2 text-[12px] text-muted-foreground">
            Net (gross − WHT): <span className="font-semibold tabular-nums text-foreground">₦{net.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="col-span-2">
            <Label className="text-[11px]">AIE ID (optional)</Label>
            <Input value={aieId} onChange={e => setAieId(e.target.value)} placeholder="UUID" className="h-9 mt-1 font-mono text-[12px]" />
          </div>
          <div className="col-span-2">
            <Label className="text-[11px]">Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {mode === "create" ? "Create draft" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}