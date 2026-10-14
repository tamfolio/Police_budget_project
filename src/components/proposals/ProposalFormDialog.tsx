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
import { listAies } from "@/lib/aiesApi";

interface FlatLineItem {
  lineItemId: string;
  subItemId: string;
  label: string;
  aieNo: string;
  budgetAmount: number;
}

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
  const [lineItemId, setLineItemId] = useState("");
  const [subItemId, setSubItemId] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [justification, setJustification] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [flatItems, setFlatItems] = useState<FlatLineItem[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [aiesLoading, setAiesLoading] = useState(false);

  // Fetch departments once when dialog opens
  useEffect(() => {
    if (!open) return;
    setDeptLoading(true);
    listDepartments({ isActive: true })
      .then(setDepartments)
      .catch(() => toast.error("Could not load departments."))
      .finally(() => setDeptLoading(false));
  }, [open]);

  // Fetch AIE line items whenever fiscal year changes
  useEffect(() => {
    if (!open) return;
    const fy = Number(fiscalYear);
    if (!fy || fy < 2000 || fy > 2100) return;
    setAiesLoading(true);
    listAies({ fiscalYear: fy })
      .then(aies => {
        const items: FlatLineItem[] = [];
        for (const aie of aies) {
          for (const item of (aie.lineItems ?? [])) {
            if (!item.id) continue;
            items.push({
              lineItemId: item.id,
              subItemId: item.subItemCodeId,
              label: item.subItemLabel ?? item.subItemCodeId,
              aieNo: aie.aieNo,
              budgetAmount: item.budgetAmount,
            });
          }
        }
        setFlatItems(items);
      })
      .catch(() => toast.error("Could not load AIE line items."))
      .finally(() => setAiesLoading(false));
  }, [open, fiscalYear]);

  // Populate fields when editing
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setFiscalYear(String(initial.fiscalYear));
      setDepartmentId(initial.departmentId);
      setLineItemId(initial.targetLineItem?.id ?? initial.lineItemId ?? "");
      setSubItemId(initial.targetLineItem?.subItemCodeId ?? initial.subItemId ?? "");
      setAmount(String(initial.amount));
      setJustification(initial.justification ?? initial.description ?? "");
      setNotes(initial.notes ?? "");
    } else {
      setFiscalYear(String(currentYear));
      setDepartmentId("");
      setLineItemId("");
      setSubItemId("");
      setAmount("");
      setJustification("");
      setNotes("");
    }
  }, [open, initial, currentYear]);

  const handleLineItemChange = (val: string) => {
    const item = flatItems.find(i => i.lineItemId === val);
    if (item) {
      setLineItemId(item.lineItemId);
      setSubItemId(item.subItemId);
    }
  };

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
    if (!lineItemId) {
      toast.error("Please select an AIE line item.");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Amount must be a positive number.");
      return;
    }
    if (justification.trim().length < 10) {
      toast.error("Justification must be at least 10 characters.");
      return;
    }

    const payload: CreateBudgetProposalPayload = {
      fiscalYear: fy,
      departmentId,
      justification: justification.trim(),
      items: [{ lineItemId, amount: amt }],
    };
    if (notes.trim()) payload.notes = notes.trim();

    setSaving(true);
    try {
      await onSubmit(payload);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const item = flatItems.find(i => i.lineItemId === lineItemId);
      if (item && msg.includes(lineItemId)) {
        throw new Error(msg.replace(lineItemId, `"${item.label}"`));
      }
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const selectedDept = departments.find(d => d.id === departmentId);
  const selectedItem = flatItems.find(i => i.lineItemId === lineItemId);
  const refLoading = deptLoading || aiesLoading;

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
            <Select value={departmentId} onValueChange={setDepartmentId} disabled={deptLoading}>
              <SelectTrigger className="h-9 text-[12px] mt-0.5">
                <SelectValue placeholder={deptLoading ? "Loading…" : departments.length === 0 ? "No departments loaded" : "Select department…"}>
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
            <Label className="text-[11px]">AIE line item</Label>
            {aiesLoading ? (
              <div className="flex items-center gap-1.5 mt-1.5 text-[12px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading line items…
              </div>
            ) : (
              <Select value={lineItemId} onValueChange={handleLineItemChange}>
                <SelectTrigger className="h-9 text-[12px] mt-0.5">
                  <SelectValue placeholder={flatItems.length === 0 ? "No AIE line items for this fiscal year" : "Select line item…"}>
                    {selectedItem
                      ? `${selectedItem.aieNo} · ${selectedItem.label}`
                      : lineItemId
                        ? "Current selection"
                        : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {flatItems.map(item => (
                    <SelectItem key={item.lineItemId} value={item.lineItemId} className="text-[12px]">
                      <span className="font-mono text-muted-foreground text-[10px]">{item.aieNo}</span>
                      <span className="ml-1.5">{item.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="col-span-2">
            <Label className="text-[11px]">Description / justification</Label>
            <Textarea value={justification} onChange={(e) => setJustification(e.target.value)}
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

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={saving || refLoading}>
            {saving
              ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Saving…</>
              : mode === "create" ? "Create draft" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
