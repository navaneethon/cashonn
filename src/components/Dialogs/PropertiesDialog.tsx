import { useState, useEffect } from "react";
import { useCashbookStore, useActiveCashbook } from "@/stores/cashbookStore";
import { useTranslation } from "@/i18n/useTranslation";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hashPassword } from "@/utils/password";

interface PropertiesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PropertiesDialog({ open, onOpenChange }: PropertiesDialogProps) {
  const activeCb = useActiveCashbook();
  const updateCashbook = useCashbookStore((s) => s.updateCashbook);
  const { t } = useTranslation();

  const [name, setName] = useState("");
  const [beginBalance, setBeginBalance] = useState("0");
  const [currency, setCurrency] = useState("₹");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [clearPassword, setClearPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const hasPassword = !!activeCb?.cashbook.passwordHash;

  useEffect(() => {
    if (open && activeCb) {
      setName(activeCb.cashbook.name);
      setBeginBalance(activeCb.cashbook.beginningBalance?.toString() ?? "0");
      setCurrency(activeCb.cashbook.currency ?? "₹");
      setNewPassword("");
      setConfirmPassword("");
      setClearPassword(false);
      setPasswordError("");
    }
  }, [open, activeCb]);

  const handleApply = async () => {
    if (!activeCb) return;

    const updates: Record<string, unknown> = {
      name,
      beginningBalance: parseFloat(beginBalance) || 0,
      currency,
    };

    if (newPassword) {
      if (newPassword !== confirmPassword) {
        setPasswordError("Passwords do not match");
        return;
      }
      const { hash, salt } = await hashPassword(newPassword);
      updates.passwordHash = hash;
      updates.passwordSalt = salt;
      setPasswordError("");
    } else if (clearPassword) {
      updates.passwordHash = null;
      updates.passwordSalt = null;
      setPasswordError("");
    }

    updateCashbook(updates as Parameters<typeof updateCashbook>[0]);
    setNewPassword("");
    setConfirmPassword("");
    setClearPassword(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t("properties.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("properties.name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("properties.beginBalance")}</Label>
              <Input
                type="number"
                value={beginBalance}
                onChange={(e) => setBeginBalance(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("properties.currency")}</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={3} />
            </div>
            <div className="space-y-2">
              <Label>{t("properties.created")}</Label>
              <Input value={activeCb?.cashbook.createdAt?.slice(0, 10) ?? ""} disabled />
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Password Protection</Label>
              {hasPassword && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Protected</span>
              )}
            </div>

            {hasPassword && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={clearPassword}
                  onChange={(e) => { setClearPassword(e.target.checked); if (e.target.checked) { setNewPassword(""); setConfirmPassword(""); } }}
                  className="size-4"
                />
                Remove password
              </label>
            )}

            {!clearPassword && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">{hasPassword ? "Change Password" : "Set Password"}</Label>
                  <Input
                    type="password"
                    placeholder={hasPassword ? "New password (blank = no change)" : "Password (optional)"}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setPasswordError(""); }}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Confirm</Label>
                  <Input
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(""); }}
                  />
                </div>
              </div>
            )}
            {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("dialog.cancel")}</Button>
          <Button onClick={handleApply}>{t("dialog.apply")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
