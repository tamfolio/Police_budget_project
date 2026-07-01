import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type {
  BudgetProposal, CreateBudgetProposalPayload, UpdateBudgetProposalPayload,
} from "@/lib/budgetProposalsApi";

interface Props {
  open: boolean;
  mode: "create" | "edit";
  initial: BudgetProposal | null;
  onSubmit: (payload: CreateBudgetProposalPayload | UpdateBudgetProposalPayload) => Promise<void>;
  onClose: () => void;
}

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.trim());

export default function ProposalFormDialog({ open, mode, initial, onSubmit, onClose }: Props) {
  const currentYear = new Date().getFullYear();
  const [fiscalYear, setFiscalYear] = useState<string>(String(currentYear));
  const [departmentId, setDepartmentId] = useState("");
  const [subItemId, setSubItemId] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setFiscalYear(String(initial.fiscalYear));
      setDepartmentId(initial.departmentId);
      setSubItemId(initial.subItemId);
      setAmount(String(initial.amount));
      setDescription(initial.description ?? "");
      setNotes(initial.notes ?? "");
    } else {
      setFiscalYear(String(currentYear));
      setDepartmentId("");
      setSubItemId("");
      setAmount("");
      setDescription("");
      setNotes("");
    }
  }, [open, initial, currentYear]);

  const handleSubmit = async () => {
    const fy = Number(fiscalYear);
    if (!Number.isInteger(fy) || fy < 2000 || fy > 2100) {
      toast.error("Fiscal year must be between 2000 and 2100.");
      return;
    }
    if (!isUuid(departmentId)) {
      toast.error("Department ID must be a UUID.");
      return;
    }
    if (!isUuid(subItemId)) {
      toast.error("Sub-item ID must be a UUID.");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Amount must be a positive number.");
      return;
    }
    const payload: CreateBudgetProposalPayload = {
      fiscalYear: fy,
      departmentId: departmentId.trim(),
      subItemId: subItemId.trim(),
      amount: amt,
    };
    if (description.trim()) payload.description = description.trim();
    if (notes.trim()) payload.notes = notes.trim();

    setSaving(true);
    try {
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New Budget Proposal" : "Edit Budget Proposal"}</DialogTitle>
          <DialogDescription className="text-[12px]">
            {mode === "create"
              ? "Create a draft proposal. You can submit it for review once saved."
              : "Only DRAFT proposals can be edited."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px]">Fiscal year</Label>
            <Input type="number" min={2000} max={2100} value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)} className="h-8 text-[12px]" />
          </div>
          <div>
            <Label className="text-[11px]">Amount (NGN)</Label>
            <Input type="number" min={0.01} step={0.01} value={amount}
              onChange={(e) => setAmount(e.target.value)} className="h-8 text-[12px]" />
          </div>
          <div className="col-span-2">
            <Label className="text-[11px]">Department ID (UUID)</Label>
            <Input value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}
              className="h-8 text-[12px] font-mono" placeholder="00000000-0000-0000-0000-000000000000" />
          </div>
          <div className="col-span-2">
            <Label className="text-[11px]">Sub-item ID (UUID)</Label>
            <Input value={subItemId} onChange={(e) => setSubItemId(e.target.value)}
              className="h-8 text-[12px] font-mono" placeholder="00000000-0000-0000-0000-000000000000" />
          </div>
          <div className="col-span-2">
            <Label className="text-[11px]">Description / justification</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
              maxLength={500} rows={3} className="text-[12px]" />
          </div>
          <div className="col-span-2">
            <Label className="text-[11px]">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-[12px]" />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : mode === "create" ? "Create draft" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}