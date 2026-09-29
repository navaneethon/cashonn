import { useState } from "react";
import { useCashbookStore } from "@/stores/cashbookStore";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyPassword } from "@/utils/password";

interface PasswordPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PasswordPromptDialog({ open, onOpenChange }: PasswordPromptDialogProps) {
  const pendingCashbook = useCashbookStore((s) => s.pendingCashbook);
  const resolvePendingCashbook = useCashbookStore((s) => s.resolvePendingCashbook);

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (!pendingCashbook) return;
    setVerifying(true);
    setError("");

    try {
      const valid = await verifyPassword(password, pendingCashbook.cashbook.passwordHash!, pendingCashbook.cashbook.passwordSalt!);
      if (valid) {
        resolvePendingCashbook(pendingCashbook);
        setPassword("");
        setError("");
        onOpenChange(false);
      } else {
        setError("Incorrect password");
      }
    } catch {
      setError("Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !verifying) handleVerify();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Password Required</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            This cashbook is password protected.
          </p>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setPassword(""); setError(""); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button onClick={handleVerify} disabled={!password || verifying}>
            {verifying ? "Verifying..." : "Open"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
