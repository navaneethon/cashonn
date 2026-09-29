export type CustomColumnType = "text" | "list" | "amount";

export interface CustomColumnOption {
  id: string;
  name: string;
  capitalizedName: string;
}

export interface CustomColumn {
  id: string;
  name: string;
  type: CustomColumnType;
  options: CustomColumnOption[];
}

export interface Transaction {
  id: string;
  date: string;
  type: "income" | "expense";
  category: string;
  subcategory: string;
  description: string;
  amount: number;
  orderOfEntry: number;
  customData: Record<string, string>;
}

export interface Category {
  id: string;
  name: string;
  capitalizedName: string;
  subcategories: Subcategory[];
}

export interface Subcategory {
  id: string;
  name: string;
  capitalizedName: string;
}

export interface RegularPayment {
  id: string;
  name: string;
  interval: { value: number; unit: "days" | "weeks" | "months" | "years" };
  nextPayment: string;
  category: string;
  subcategory: string;
  description: string;
  amount: number;
  type: "income" | "expense";
}

export interface CashBookSettings {
  colorScheme: "system" | "light" | "dark";
  dateFormat: string;
  amountFormat: string;
  recordNumbering: "none" | "sequential";
  visibleColumns: string[];
  splitIncomeExpenseColumns: boolean;
  sortBy: string;
  sortDirection: "asc" | "desc";
  customColumns: CustomColumn[];
}

export interface CashBook {
  id: string;
  name: string;
  description: string;
  currency: string;
  beginningBalance: number;
  createdAt: string;
  passwordHash?: string;
  passwordSalt?: string;
  type: "standard" | "business";
  transactions: Transaction[];
  categories: Category[];
  regularPayments: RegularPayment[];
  settings: CashBookSettings;
}

export interface OpenCashbook {
  cashbook: CashBook;
  filePath: string;
  isDirty: boolean;
}

export interface AppState {
  openCashbooks: OpenCashbook[];
  activeCashbookId: string | null;
}

export type DialogType =
  | "new-cashbook"
  | "filter"
  | "sort"
  | "properties"
  | "password"
  | "columns"
  | "category-names"
  | "regular-payments"
  | "import-csv"
  | null;
