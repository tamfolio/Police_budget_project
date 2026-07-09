import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type {
  BudgetProposal, CreateBudgetProposalPayload, UpdateBudgetProposalPayload,
} from "@/lib/budgetProposalsApi";
import { listDepartments, type Department } from "@/lib/departmentsApi";
import { getBudgetCodeReference, type BudgetSubItem } from "@/lib/budgetCodesApi";

interface Props {
  open: boolean;
  mode: "create" | "edit";
  initial: BudgetProposal | null;
  onSubmit: (payload: CreateBudgetProposalPayload | UpdateBudgetProposalPayload) => Promise<void>;
  onClose: () => void;
}

export default function ProposalFormDialog({ open, mode, initial, onSubmit, onClose }: Props) {
  const currentYear = new Date().getFullYear();

  const [fiscalYear, setFiscalYear] = useState<string>(String(currentYear));
  const [departmentId, setDepartmentId] = useState("");
  const [subItemId, setSubItemId] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [subItems, setSubItems] = useState<BudgetSubItem[]>([]);
  const [refLoading, setRefLoading] = useState(false);

  // Fetch reference data once when the dialog opens
  useEffect(() => {
    if (!open) return;
    setRefLoading(true);
    Promise.all([
      listDepartments({ isActive: true }),
      getBudgetCodeReference(),
    ])
      .then(([depts, ref]) => {
        setDepartments(depts);
        setSubItems(ref.categories.flatMap(c => (c.subItems ?? []).map(s => ({ ...s, category: { code: c.code, name: c.name, sort: c.sort } }))));
      })
      .catch(() => toast.error("Could not load reference data."))
      .finally(() => setRefLoading(false));
  }, [open]);

  // Populate fields when editing
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
    if (!departmentId) {
      toast.error("Please select a department.");
      return;
    }
    if (!subItemId) {
      toast.error("Please select a budget sub-item.");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Amount must be a positive number.");
      return;
    }

    const payload: CreateBudgetProposalPayload = {
      fiscalYear: fy,
      departmentId,
      subItemId,
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

  const selectedDept = departments.find(d => d.id === departmentId);
  const selectedSub = subItems.find(s => s.code === subItemId);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New Budget Proposal" : "Edit Budget Proposal"}</DialogTitle>
          <DialogDescription className="text-[12px]">
            {mode === "create"
              ? "Create a draft proposal. You can submit it for officer review once saved."
              : "Only DRAFT proposals can be edited."}
          </DialogDescription>
        </DialogHeader>

        {refLoading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-[12px]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading reference data…
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px]">Fiscal year</Label>
              <Input type="number" min={2000} max={2100} value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)} className="h-8 text-[12px]" />
            </div>
            <div>
              <Label className="text-[11px]">Amount (NGN)</Label>
              <Input type="number" min={0.01} step={0.01} value={amount}
                onChange={(e) => setAmount(e.target.value)} className="h-8 text-[12px]"
                placeholder="e.g. 500000" />
            </div>

            <div className="col-span-2">
              <Label className="text-[11px]">Department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger className="h-9 text-[12px] mt-0.5">
                  <SelectValue placeholder={departments.length === 0 ? "No departments loaded" : "Select department…"}>
                    {selectedDept?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id} className="text-[12px]">{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label className="text-[11px]">Budget sub-item</Label>
              <Select value={subItemId} onValueChange={setSubItemId}>
                <SelectTrigger className="h-9 text-[12px] mt-0.5">
                  <SelectValue placeholder={subItems.length === 0 ? "No sub-items loaded" : "Select sub-item…"}>
                    {selectedSub ? `${selectedSub.code} — ${selectedSub.name}` : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {subItems.map(s => (
                    <SelectItem key={s.code} value={s.code} className="text-[12px]">
                      <span className="font-mono">{s.code}</span>
                      <span className="text-muted-foreground ml-1">— {s.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label className="text-[11px]">Description / justification</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
                maxLength={500} rows={3} className="text-[12px] mt-0.5"
                placeholder="Explain what this budget proposal covers and why it is needed." />
            </div>
            <div className="col-span-2">
              <Label className="text-[11px]">Notes <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                rows={2} className="text-[12px] mt-0.5"
                placeholder="Any additional internal notes." />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={saving || refLoading}>
            {saving ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Saving…</> : mode === "create" ? "Create draft" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
