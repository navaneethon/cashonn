import { useState } from "react";
import { useCashbookStore, useActiveCashbook } from "@/stores/cashbookStore";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";

interface RegularPaymentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegularPaymentsDialog({ open, onOpenChange }: RegularPaymentsDialogProps) {
  const activeCb = useActiveCashbook();
  const addRegularPayment = useCashbookStore((s) => s.addRegularPayment);
  const removeRegularPayment = useCashbookStore((s) => s.removeRegularPayment);
  const ensureSubcategory = useCashbookStore((s) => s.ensureSubcategory);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [intervalValue, setIntervalValue] = useState("1");
  const [intervalUnit, setIntervalUnit] = useState<"days" | "weeks" | "months" | "years">("months");
  const [nextPayment, setNextPayment] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");

  const payments = activeCb?.cashbook.regularPayments ?? [];

  const handleAdd = () => {
    if (!name || !amount || !nextPayment) return;
    const trimmedName = name.trim();

    // Flat list: registering once makes the sub-category available on both the
    // income and expense sides, so no per-category seeding is needed.
    ensureSubcategory(trimmedName);

    addRegularPayment({
      name: trimmedName,
      type: "expense",
      amount: parseFloat(amount) || 0,
      interval: { value: parseInt(intervalValue) || 1, unit: intervalUnit },
      nextPayment,
      category: "expenses",
      subcategory: trimmedName,
      description,
    });
    setName("");
    setAmount("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Regular Payments</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead>Next</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    No regular payments defined.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.amount}</TableCell>
                    <TableCell>Every {p.interval.value} {p.interval.unit}</TableCell>
                    <TableCell>{p.nextPayment}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => removeRegularPayment(p.id)}>
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
            <div className="space-y-1.5">
              <Label className="text-xs">Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rent, Salary" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Amount *</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Every</Label>
              <div className="flex gap-2">
                <Input type="number" className="w-20" value={intervalValue} onChange={(e) => setIntervalValue(e.target.value)} />
                <select
                  className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                  value={intervalUnit}
                  onChange={(e) => setIntervalUnit(e.target.value as "days" | "weeks" | "months" | "years")}
                >
                  <option value="days">days</option>
                  <option value="weeks">weeks</option>
                  <option value="months">months</option>
                  <option value="years">years</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Next payment</Label>
              <Input type="date" value={nextPayment} onChange={(e) => setNextPayment(e.target.value)} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={handleAdd} disabled={!name || !amount}>
                Add
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
