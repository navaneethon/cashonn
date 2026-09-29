import { useState } from "react";
import { useCashbookStore } from "@/stores/cashbookStore";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CURRENCIES = ["₹", "$", "€", "£", "¥", "A$", "C$", "CHF", "kr", "R$"];

interface NewCashbookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewCashbookDialog({ open, onOpenChange }: NewCashbookDialogProps) {
  const openNewCashbook = useCashbookStore((s) => s.openNewCashbook);

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("₹");
  const [beginBalance, setBeginBalance] = useState("0");

  const handleCreate = () => {
    if (!name.trim()) return;
    openNewCashbook(name.trim(), currency, parseFloat(beginBalance) || 0);
    onOpenChange(false);
    setStep(1);
    setName("");
    setCurrency("₹");
    setBeginBalance("0");
  };

  const handleClose = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setStep(1);
      setName("");
      setCurrency("₹");
      setBeginBalance("0");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>New Cash-book</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Cashbook name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter cashbook name"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <div className="flex flex-wrap gap-2">
                {CURRENCIES.map((c) => (
                  <Button
                    key={c}
                    variant={currency === c ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrency(c)}
                  >
                    {c}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Beginning balance</Label>
              <Input
                type="number"
                value={beginBalance}
                onChange={(e) => setBeginBalance(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {step === 1 && (
            <Button disabled={!name.trim()} onClick={handleCreate}>Create</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
