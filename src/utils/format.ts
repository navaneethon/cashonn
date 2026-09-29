export function formatCurrency(amount: number, currency: string = "₹"): string {
  const n = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  const formatted = n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${formatted}`;
}

export function formatDate(dateStr: string, format: string = "dd-mm-yyyy"): string {
  // Prefer ISO yyyy-mm-dd parts (avoids UTC shift from Date parsing)
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  let day: number, month: number, year: number;
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    day = date.getDate();
    month = date.getMonth() + 1;
    year = date.getFullYear();
  }
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  const yyyy = String(year);

  switch (format) {
    case "mm-dd-yyyy": return `${mm}-${dd}-${yyyy}`;
    case "yyyy-mm-dd": return `${yyyy}-${mm}-${dd}`;
    case "dd/mm/yyyy": return `${dd}/${mm}/${yyyy}`;
    case "mm/dd/yyyy": return `${mm}/${dd}/${yyyy}`;
    case "dd-mm-yyyy":
    default: return `${dd}-${mm}-${yyyy}`;
  }
}

/** Parse a user-typed date in the given display format → ISO yyyy-mm-dd, or null. */
export function parseDate(input: string, format: string = "dd-mm-yyyy"): string | null {
  const s = input.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const parts = s.split(/[-/]/);
  const fmtParts = format.split(/[-/]/);
  if (parts.length !== 3 || fmtParts.length !== 3) return null;

  let day = 0;
  let month = 0;
  let year = 0;
  for (let i = 0; i < 3; i++) {
    const key = fmtParts[i].toLowerCase();
    const raw = parts[i];
    if (!/^\d+$/.test(raw)) return null;
    const n = parseInt(raw, 10);
    if (key.startsWith("d")) day = n;
    else if (key.startsWith("m")) month = n;
    else if (key.startsWith("y")) {
      // Require a full 4-digit year while typing "yyyy"
      if (key.length >= 4 && raw.length < 4) return null;
      year = n;
    } else return null;
  }
  if (year < 100) year += 2000;
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) return null;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

/** Case-insensitive alphabetic compare for dropdown option labels. */
export function byLabel(
  a: { name: string; capitalizedName?: string },
  b: { name: string; capitalizedName?: string }
): number {
  const la = (a.capitalizedName || a.name).toLocaleLowerCase();
  const lb = (b.capitalizedName || b.name).toLocaleLowerCase();
  return la.localeCompare(lb);
}
