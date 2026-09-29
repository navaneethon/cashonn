export type TranslationKey = keyof typeof en;

const en = {
  // Menu
  "menu.file": "File",
  "menu.display": "Display",
  "menu.advanced": "Advanced",
  "menu.language": "Language",
  "menu.survey": "Survey",
  "menu.help": "Help",
  "menu.open": "Menu",

  // File menu
  "file.new": "New",
  "file.open": "Open",
  "file.save": "Save",
  "file.saveAs": "Save As...",
  "file.importCSV": "Import CSV...",
  "file.exportCSV": "Export CSV...",
  "file.properties": "Properties",
  "file.exit": "Exit",

  // Display menu
  "display.colourScheme": "Theme",
  "display.dateFormat": "Date Format",
  "display.amountFormat": "Amount Format",
  "display.filter": "Filter Options...",
  "display.sort": "Sort By...",

  // Advanced menu
  "advanced.regularPayments": "Regular Payments...",
  "advanced.categoryNames": "Names of Categories...",
  "advanced.columns": "Columns...",

  // Toolbar
  "toolbar.new": "New",
  "toolbar.open": "Open",
  "toolbar.save": "Save",
  "toolbar.print": "Print",
  "toolbar.refresh": "Refresh",
  "toolbar.filter": "Filter",
  "toolbar.sort": "Sort",
  "toolbar.newEntry": "New Entry",
  "toolbar.delete": "Delete",
  "toolbar.hidePanel": "Hide Panel",
  "toolbar.showPanel": "Show Panel",

  // Tabs
  "tab.close": "Close",

  // Ledger
  "ledger.noCashbook": "No cashbook open",
  "ledger.createFirst": "Create a new cashbook or open an existing one.",
  "ledger.createButton": "Create New",
  "ledger.openButton": "Open Cashbook",
  "ledger.noTransactions": "No transactions yet.",
  "ledger.date": "Date",
  "ledger.description": "Description",
  "ledger.category": "Category",
  "ledger.subcategory": "Sub-Category",
  "ledger.income": "Income",
  "ledger.expense": "Expense",
  "ledger.amount": "Amount",

  // Error boundary
  "error.title": "Something went wrong",
  "error.retry": "Try again",

  // Entry panel
  "entry.newEntry": "New Entry",
  "entry.editEntry": "Edit Entry",
  "entry.date": "Date",
  "entry.type": "Type",
  "entry.income": "Income",
  "entry.expense": "Expense",
  "entry.amount": "Amount",
  "entry.category": "Category",
  "entry.subcategory": "Sub-Category",
  "entry.description": "Description",
  "entry.add": "Add",
  "entry.update": "Update",
  "entry.cancel": "Cancel",

  // Summary
  "summary.title": "Summary",
  "summary.records": "Records",
  "summary.income": "Income",
  "summary.expense": "Expense",
  "summary.balance": "Balance",
  "summary.filtered": "filtered",

  // Status bar
  "status.ready": "Ready",
  "status.filtered": "Filtered",

  // Dialogs
  "dialog.cancel": "Cancel",
  "dialog.apply": "Apply",
  "dialog.close": "Close",
  "confirmDelete.title": "Delete Entry",
  "confirmDelete.message": "Are you sure you want to delete this entry?",
  "confirmDelete.confirm": "Delete",

  // New cashbook
  "newCashbook.title": "New Cash-book",
  "newCashbook.name": "Cashbook name *",
  "newCashbook.namePlaceholder": "Enter cashbook name",
  "newCashbook.currency": "Currency",
  "newCashbook.beginBalance": "Beginning balance",
  "newCashbook.create": "Create",

  // Filter
  "filter.title": "Filter Options",
  "filter.fromDate": "From date",
  "filter.toDate": "To date",
  "filter.category": "Sub-Category",
  "filter.all": "All",
  "filter.clear": "Clear Filter",
  "sort.title": "Sort By",
  "sort.sortBy": "Sort by",
  "sort.direction": "Direction",
  "sort.ascending": "Ascending",
  "sort.descending": "Descending",
  "sort.clear": "Clear Sort",
  "sort.manual": "Manual (drag order)",

  // Properties
  "properties.title": "Properties",
  "properties.name": "Name",
  "properties.beginBalance": "Beginning balance",
  "properties.currency": "Currency",
  "properties.created": "Created",

  // Display settings
  "displaySettings.title": "Display Settings",
  "displaySettings.colorScheme": "Color Scheme",
  "displaySettings.dateFormat": "Date Format",
  "displaySettings.amountFormat": "Amount Format",
  "displaySettings.systemDefault": "System Default",
  "displaySettings.green": "Green",
  "displaySettings.dark": "Dark",
  "displaySettings.blue": "Blue",

  // Columns
  "columns.title": "Columns",
  "columns.splitAmount": "Split Income/Expense columns",

  // Category names
  "categoryNames.title": "Names of Categories",

  // Regular payments
  "regularPayments.title": "Regular Payments",
  "regularPayments.name": "Name *",
  "regularPayments.type": "Type",
  "regularPayments.amount": "Amount *",
  "regularPayments.category": "Category",
  "regularPayments.every": "Every",
  "regularPayments.nextPayment": "Next payment",
  "regularPayments.description": "Description",
  "regularPayments.add": "Add",
  "regularPayments.noPayments": "No regular payments defined.",

  // CSV import dialog
  "importCsv.title": "Import CSV — map columns",
  "importCsv.empty": "No data rows found in this CSV file.",
  "importCsv.rowsFound": "Rows:",
  "importCsv.mapHint": "Assign each column a role. Unmapped columns become custom columns.",
  "importCsv.columns": "Columns",
  "importCsv.customName": "Custom column name",
  "importCsv.summary": "Mapped:",
  "importCsv.standardCols": "standard ·",
  "importCsv.customCols": "custom",
  "importCsv.importBtn": "Import",
  "importCsv.role.date": "Date",
  "importCsv.role.type": "Category (Income/Expense)",
  "importCsv.role.subcategory": "Subcategory",
  "importCsv.role.description": "Description",
  "importCsv.role.amount": "Amount",
  "importCsv.role.custom": "Custom column",
  "importCsv.role.skip": "Skip",

  // Help
  "help.guide": "Documentation",
  "help.guideSubtitle": "Quick guide to using Cashonn.",
  "help.section.cashbook": "Cash books",
  "help.cashbook.new": "File → New (Ctrl+N) to create a book (.cshon).",
  "help.cashbook.open": "File → Open (Ctrl+O) to load a book; password-protected books prompt for a password.",
  "help.cashbook.save": "File → Save (Ctrl+S) keeps changes on disk; dirty tabs show an unsaved marker.",
  "help.cashbook.tabs": "Multiple books open as tabs — close a tab to free it.",
  "help.section.entries": "Entries",
  "help.entries.add": "Use the right-hand entry panel: date, income/expense, subcategory, description, amount → Add.",
  "help.entries.edit": "Click a ledger row to load it into the entry panel, then Update.",
  "help.entries.date": "Type a date in the Display format, or click the calendar icon for a picker.",
  "help.entries.categories": "Type a new subcategory name to create it on the fly.",
  "help.section.display": "View",
  "help.display.filter": "Display → Filter Options narrows the ledger and summary by date and category.",
  "help.display.sort": "Display → Sort By orders rows; header sort also works.",
  "help.display.format": "Display menu changes theme, date format, and amount format.",
  "help.section.csv": "CSV",
  "help.csv.import": "File → Import CSV maps columns before anything is written.",
  "help.csv.export": "File → Export CSV writes the current (filtered) view.",

  // About
  "about.title": "About Cashonn",
  "about.tagline": "Cross-platform desktop cash ledger.",
  "about.app": "Application",
  "about.version": "Version",
  "about.author": "Author",
  "about.identifier": "Identifier",
  "about.copyright": "© 2026 Navaneeth Narayanan. All rights reserved.",

  // Survey
  "survey.charts": "Charts (coming soon)",
  "survey.empty": "Charts are planned for a future release.",
} as const;

const ml: Record<TranslationKey, string> = {
  // Menu
  "menu.file": "ഫയൽ",
  "menu.display": "ഡിസ്‌പ്ലേ",
  "menu.advanced": "വിപുലം",
  "menu.language": "ഭാഷ",
  "menu.survey": "സർവേ",
  "menu.help": "സഹായം",
  "menu.open": "മെനു",

  // File menu
  "file.new": "പുതിയ",
  "file.open": "തുറക്കുക",
  "file.save": "സേവ് ചെയ്യുക",
  "file.saveAs": "മറ്റൊരു പേരിൽ സേവ് ചെയ്യുക",
  "file.properties": "ഗുണങ്ങൾ",
  "file.importCSV": "CSV ഇംപോർട്ട് ചെയ്യുക...",
  "file.exportCSV": "CSV എക്സ്പോർട്ട് ചെയ്യുക...",
  "file.exit": "പുറത്തുകടക്കുക",

  // Display menu
  "display.colourScheme": "തീം",
  "display.dateFormat": "തീയതി ഫോർമാറ്റ്",
  "display.amountFormat": "തുക ഫോർമാറ്റ്",
  "display.filter": "ഫിൽറ്റർ ഓപ്ഷനുകൾ...",
  "display.sort": "സോർട്ട് ചെയ്യുക...",

  // Advanced menu
  "advanced.regularPayments": "നിത്യ പേയ്‌മെന്റുകൾ...",
  "advanced.categoryNames": "വിഭാഗങ്ങളുടെ പേരുകൾ...",
  "advanced.columns": "കോളങ്ങൾ...",

  // Toolbar
  "toolbar.new": "പുതിയ",
  "toolbar.open": "തുറക്കുക",
  "toolbar.save": "സേവ് ചെയ്യുക",
  "toolbar.print": "പ്രിന്റ്",
  "toolbar.refresh": "പുതുക്കുക",
  "toolbar.filter": "ഫിൽറ്റർ",
  "toolbar.sort": "സോർട്ട്",
  "toolbar.newEntry": "പുതിയ എൻട്രി",
  "toolbar.delete": "ഇല്ലാതാക്കുക",
  "toolbar.hidePanel": "പാനൽ മറയ്ക്കുക",
  "toolbar.showPanel": "പാനൽ കാണിക്കുക",

  // Tabs
  "tab.close": "അടയ്ക്കുക",

  // Ledger
  "ledger.noCashbook": "ക്യാഷ്‌ബുക്ക് തുറന്നിട്ടില്ല",
  "ledger.createFirst": "ഒരു പുതിയ ക്യാഷ്‌ബുക്ക് സൃഷ്ടിക്കുക അല്ലെങ്കിൽ നിലവിലുള്ളത് തുറക്കുക.",
  "ledger.createButton": "പുതിയത് സൃഷ്ടിക്കുക",
  "ledger.openButton": "ക്യാഷ്‌ബുക്ക് തുറക്കുക",
  "ledger.noTransactions": "ഇതുവരെ ഇടപാടുകൾ ഇല്ല.",
  "ledger.date": "തീയതി",
  "ledger.description": "വിവരണം",
  "ledger.category": "വിഭാഗം",
  "ledger.subcategory": "ഉപവിഭാഗം",
  "ledger.income": "വരവ്",
  "ledger.expense": "ചെലവ്",
  "ledger.amount": "തുക",

  // Error boundary
  "error.title": "എന്തോ പിഴവ് സംഭവിച്ചു",
  "error.retry": "വീണ്ടും ശ്രമിക്കുക",

  // Entry panel
  "entry.newEntry": "പുതിയ എൻട്രി",
  "entry.editEntry": "എൻട്രി എഡിറ്റ് ചെയ്യുക",
  "entry.date": "തീയതി",
  "entry.type": "തരം",
  "entry.income": "വരവ്",
  "entry.expense": "ചെലവ്",
  "entry.amount": "തുക",
  "entry.category": "വിഭാഗം",
  "entry.subcategory": "ഉപവിഭാഗം",
  "entry.description": "വിവരണം",
  "entry.add": "ചേർക്കുക",
  "entry.update": "പുതുക്കുക",
  "entry.cancel": "റദ്ദാക്കുക",

  // Summary
  "summary.title": "സംഗ്രഹം",
  "summary.records": "റെക്കോർഡുകൾ",
  "summary.income": "വരവ്",
  "summary.expense": "ചെലവ്",
  "summary.balance": "ബാലൻസ്",
  "summary.filtered": "ഫിൽറ്റർ ചെയ്തത്",

  // Status bar
  "status.ready": "തയ്യാറാണ്",
  "status.filtered": "ഫിൽറ്റർ ചെയ്തു",

  // Dialogs
  "dialog.cancel": "റദ്ദാക്കുക",
  "dialog.apply": "പ്രയോഗിക്കുക",
  "dialog.close": "അടയ്ക്കുക",
  "confirmDelete.title": "എൻട്രി ഇല്ലാതാക്കുക",
  "confirmDelete.message": "ഈ എൻട്രി ഇല്ലാതാക്കണോ എന്ന് ഉറപ്പാണോ?",
  "confirmDelete.confirm": "ഇല്ലാതാക്കുക",

  // New cashbook
  "newCashbook.title": "പുതിയ ക്യാഷ്‌ബുക്ക്",
  "newCashbook.name": "ക്യാഷ്‌ബുക്ക് പേര് *",
  "newCashbook.namePlaceholder": "ക്യാഷ്‌ബുക്ക് പേര് നൽകുക",
  "newCashbook.currency": "കറൻസി",
  "newCashbook.beginBalance": "ആരംഭ ബാലൻസ്",
  "newCashbook.create": "സൃഷ്ടിക്കുക",

  // Filter
  "filter.title": "ഫിൽറ്റർ ഓപ്ഷനുകൾ",
  "filter.fromDate": "തുടങ്ങുന്ന തീയതി",
  "filter.toDate": "അവസാന തീയതി",
  "filter.category": "വിഭാഗം",
  "filter.all": "എല്ലാം",
  "filter.clear": "ഫിൽറ്റർ മായ്ക്കുക",

  // Sort
  "sort.title": "സോർട്ട് ചെയ്യുക",
  "sort.sortBy": "സോർട്ട് ചെയ്യുക",
  "sort.direction": "ദിശ",
  "sort.ascending": "ആരോഹണം",
  "sort.descending": "അവരോഹണം",
  "sort.clear": "സോർട്ട് മായ്ക്കുക",
  "sort.manual": "കൈമാറ്റം (വലിച്ചുനിരത്തൽ ക്രമം)",

  // Properties
  "properties.title": "ഗുണങ്ങൾ",
  "properties.name": "പേര്",
  "properties.beginBalance": "ആരംഭ ബാലൻസ്",
  "properties.currency": "കറൻസി",
  "properties.created": "സൃഷ്ടിച്ചു",

  // Display settings
  "displaySettings.title": "ഡിസ്‌പ്ലേ ക്രമീകരണങ്ങൾ",
  "displaySettings.colorScheme": "നിറ സ്കീം",
  "displaySettings.dateFormat": "തീയതി ഫോർമാറ്റ്",
  "displaySettings.amountFormat": "തുക ഫോർമാറ്റ്",
  "displaySettings.systemDefault": "സിസ്റ്റം ഡിഫോൾട്ട്",
  "displaySettings.green": "പച്ച",
  "displaySettings.dark": "ഇരുണ്ട",
  "displaySettings.blue": "നീല",

  // Columns
  "columns.title": "കോളങ്ങൾ",
  "columns.splitAmount": "വരവ്/ചെലവ് കോളങ്ങൾ വേർതിരിക്കുക",

  // Category names
  "categoryNames.title": "വിഭാഗങ്ങളുടെ പേരുകൾ",

  // Regular payments
  "regularPayments.title": "നിത്യ പേയ്‌മെന്റുകൾ",
  "regularPayments.name": "പേര് *",
  "regularPayments.type": "തരം",
  "regularPayments.amount": "തുക *",
  "regularPayments.category": "വിഭാഗം",
  "regularPayments.every": "എല്ലാ",
  "regularPayments.nextPayment": "അടുത്ത പേയ്‌മെന്റ്",
  "regularPayments.description": "വിവരണം",
  "regularPayments.add": "ചേർക്കുക",
  "regularPayments.noPayments": "നിത്യ പേയ്‌മെന്റുകൾ നിർവചിച്ചിട്ടില്ല.",

  // CSV import dialog
  "importCsv.title": "CSV ഇംപോർട്ട് — കോളങ്ങൾ മാപ്പ് ചെയ്യുക",
  "importCsv.empty": "ഈ CSV ഫയലിൽ ഡാറ്റ വരികൾ കണ്ടെത്തിയില്ല.",
  "importCsv.rowsFound": "വരികൾ:",
  "importCsv.mapHint": "ഓരോ കോളത്തിനും ഒരു റോൾ നൽകുക. മാപ്പ് ചെയ്യാത്തവ കസ്റ്റം കോളങ്ങളാകും.",
  "importCsv.columns": "കോളങ്ങൾ",
  "importCsv.customName": "കസ്റ്റം കോളത്തിന്റെ പേര്",
  "importCsv.summary": "മാപ്പ് ചെയ്തത്:",
  "importCsv.standardCols": "സ്റ്റാൻഡേർഡ് ·",
  "importCsv.customCols": "കസ്റ്റം",
  "importCsv.importBtn": "ഇംപോർട്ട്",
  "importCsv.role.date": "തീയതി",
  "importCsv.role.type": "വിഭാഗം (വരവ്/ചെലവ്)",
  "importCsv.role.subcategory": "ഉപവിഭാഗം",
  "importCsv.role.description": "വിവരണം",
  "importCsv.role.amount": "തുക",
  "importCsv.role.custom": "കസ്റ്റം കോളം",
  "importCsv.role.skip": "ഒഴിവാക്കുക",

  // Help
  "help.guide": "ഡോക്കുമെന്റേഷൻ",
  "help.guideSubtitle": "Cashonn ഉപയോഗിക്കുന്നതിനുള്ള ദ്രുത ഗൈഡ്.",
  "help.section.cashbook": "ക്യാഷ്‌ബുക്കുകൾ",
  "help.cashbook.new": "ഫയൽ → പുതിയ ക്യാഷ്‌ബുക്ക് (Ctrl+N) ഉണ്ടാക്കുക (.cshon).",
  "help.cashbook.open": "ഫയൽ → തുറക്കുക (Ctrl+O); പാസ്‌വേഡ് ഉള്ളത് പാസ്‌വേഡ് ചോദിക്കും.",
  "help.cashbook.save": "ഫയൽ → സേവ് (Ctrl+S) മാറ്റങ്ങൾ സൂക്ഷിക്കും; സൂക്ഷിക്കാത്ത ടാബുകൾ അടയാളപ്പെടുത്തുന്നു.",
  "help.cashbook.tabs": "ഒന്നിലധികം പുസ്തകങ്ങൾ ടാബായി തുറക്കാം.",
  "help.section.entries": "എൻട്രികൾ",
  "help.entries.add": "വലത് എൻട്രി പാനലിൽ: തീയതി, വരവ്/ചെലവ്, ഉപവിഭാഗം, വിവരണം, തുക → ചേർക്കുക.",
  "help.entries.edit": "ഒരു വരി ക്ലിക്ക് ചെയ്ത് എഡിറ്റ് ചെയ്യുക, പിന്നെ പുതുക്കുക.",
  "help.entries.date": "തീയതി ഫോർമാറ്റിൽ ടൈപ്പ് ചെയ്യുക അല്ലെങ്കിൽ കലണ്ടർ ഐക്കൺ ഉപയോഗിക്കുക.",
  "help.entries.categories": "പുതിയ ഉപവിഭാഗം ടൈപ്പ് ചെയ്താൽ അത് സൃഷ്ടിക്കപ്പെടും.",
  "help.section.display": "കാഴ്ച",
  "help.display.filter": "ഡിസ്‌പ്ലേ → ഫിൽറ്റർ തീയതി/വിഭാഗം അനുസരിച്ച് ചുരുക്കും.",
  "help.display.sort": "ഡിസ്‌പ്ലേ → സോർട്ട് വരികൾ ക്രമപ്പെടുത്തും.",
  "help.display.format": "ഡിസ്‌പ്ലേ മെനുവിൽ തീം, തീയതി, തുക ഫോർമാറ്റ് മാറ്റാം.",
  "help.section.csv": "CSV",
  "help.csv.import": "ഫയൽ → CSV ഇംപോർട്ട് കളങ്ങൾ മാപ്പ് ചെയ്യുന്നു.",
  "help.csv.export": "ഫയൽ → CSV എക്സ്പോർട്ട് നിലവിലെ കാഴ്ച എഴുതുന്നു.",

  // About
  "about.title": "Cashonn വിവരങ്ങൾ",
  "about.tagline": "ക്രോസ്-പ്ലാറ്റ്‌ഫോം ഡെസ്ക്ടോപ്പ് ക്യാഷ് ലെജർ.",
  "about.app": "അപ്ലിക്കേഷൻ",
  "about.version": "പതിപ്പ്",
  "about.author": "രചയിതാവ്",
  "about.identifier": "അഡൻറിഫയർ",
  "about.copyright": "© 2026 Navaneeth Narayanan. എല്ലാ അവകാശങ്ങളും നിലനിർത്തിയിരിക്കുന്നു.",

  // Survey
  "survey.charts": "ചാർട്ടുകൾ (വരുന്നു)",
  "survey.empty": "ചാർട്ടുകൾ ഭാവി പതിപ്പിൽ വരും.",
} as const;

export const translations = { en, ml };