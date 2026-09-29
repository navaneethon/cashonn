import { useState } from "react";
import { useCashbookStore, useActiveCashbook } from "@/stores/cashbookStore";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CategoryNamesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryNamesDialog({ open, onOpenChange }: CategoryNamesDialogProps) {
  const activeCb = useActiveCashbook();
  const updateCategoryNames = useCashbookStore((s) => s.updateCategoryNames);

  const [incomesName, setIncomesName] = useState(activeCb?.cashbook.categories[0]?.capitalizedName ?? "Incomes");
  const [expensesName, setExpensesName] = useState(activeCb?.cashbook.categories[1]?.capitalizedName ?? "Expenses");

  const handleApply = () => {
    updateCategoryNames({
      incomesUpper: incomesName,
      incomesLower: incomesName.toLowerCase(),
      expensesUpper: expensesName,
      expensesLower: expensesName.toLowerCase(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Names of Categories</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Income category name</Label>
            <Input value={incomesName} onChange={(e) => setIncomesName(e.target.value)} placeholder="e.g. Income, Earnings" />
          </div>
          <div className="space-y-2">
            <Label>Expense category name</Label>
            <Input value={expensesName} onChange={(e) => setExpensesName(e.target.value)} placeholder="e.g. Expense, Spending" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
