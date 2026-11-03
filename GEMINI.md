# HomePulse — Generation History & Prompt Log

This file records the prompts and requests provided to generate and enhance **HomePulse** (Household Budget & Personal Finance Tracker), along with the architecture and capabilities implemented in response.

---

## 📋 Chronological Prompt & Request Log

### 1. Application Creation & Core Architecture
> **Initial Goal**: Build a comprehensive, production-grade personal and household finance tracking web application.

**Key capabilities created:**
- **Financial Dashboard**: Summary cards (Monthly Income, Spending, Savings Rate, Net Worth), dynamic cash flow charts, upcoming recurring bills, and budget alert notifications.
- **Budget Management**: Category-by-category budget allocation, variance analysis, visual progress bars, and over-budget warnings.
- **Transaction Tracker**: Full CRUD operations for income and expense transactions, filtering by category/date/account, and search.
- **Debt & Payoff Calculator**: Snowball vs. Avalanche strategy comparisons, payoff date forecasting, and interest saved estimates.
- **Subscriptions & Recurring Expenses**: Tracking renewal dates, billing cycles, cancellation candidates, and annual totals.
- **Monthly Financial Reports**: Detailed printable and downloadable monthly executive summaries.

---

### 2. SQLite Database Capability
> **User Command**:
> *"Add SQLite database capability"*

**Implementation details:**
- Added a full server-side SQLite database engine using `better-sqlite3`.
- Created relational tables: `transactions`, `budgets`, `debts`, `recurring_transactions`, and `settings`.
- Pre-seeded tables with realistic household financial data so the database is immediately usable.
- Implemented Express backend REST API endpoints:
  - `GET /api/db/health`
  - `GET /api/db/stats`
  - `GET /api/db/query` (with parameterized SQL query support)
  - `POST /api/db/reset`
- Added an interactive **SQLite Database Studio** tab in the UI (`SqliteView.tsx`) allowing:
  - Direct SQL query execution (`SELECT`, `INSERT`, `UPDATE`, `DELETE`)
  - Schema browser showing column definitions and primary keys
  - One-click sample queries (e.g., top spending categories, monthly averages)
  - Database table reset and re-seed buttons.

---

### 3. AI-Powered Category Suggestion with Gemini
> **User Command**:
> *"Implement a helper function using Gemini that suggests categories for new transactions based on their merchant name/description to improve manual entry speed."*

**Implementation details:**
- Integrated the `@google/genai` TypeScript SDK.
- Created `/api/suggest-category` endpoint on the Express server (`server/gemini.ts`) using Gemini models (`gemini-2.5-flash`).
- Created client-side helper `suggestCategory(merchantOrDescription)` in `src/utils/categorySuggester.ts`:
  - Intelligent merchant pattern matcher as instantaneous client-side fallback (e.g., Trader Joe's ➔ Groceries, Netflix ➔ Entertainment, Shell ➔ Transportation).
  - Live Gemini API call with confidence score and reasoning explanation.
- Enhanced the `AddTransactionModal` with:
  - Automatic debounced AI suggestion pill when typing a merchant name.
  - One-click "Apply Suggested Category" chip.
  - Manual "✨ Suggest Category with AI" button with loading spinners and feedback.

---

### 4. CSV Transaction File Import
> **User Command**:
> *"Create a file upload input in the ExportImportModal that allows users to import transactions from a CSV file into the application state."*

**Implementation details:**
- Built a robust CSV file parser (`src/utils/csvParser.ts`) supporting:
  - Standard banking formats (Chase, Bank of America, Wells Fargo, Mint, YNAB).
  - Header auto-detection (identifies `Date`, `Description`/`Merchant`, `Amount`, `Category`, `Account`).
  - Positive/negative amount normalization and automatic debit/credit type assignment.
  - Comma and quotation escaping handling.
- Enhanced `ExportImportModal.tsx` with:
  - Drag-and-drop file upload zone for `.csv` files.
  - Interactive file preview table with sample detected rows.
  - Customizable column mapping dropdowns (Date, Amount, Description, Category).
  - Validation checks before importing.
  - Batch merge into existing application state without overwriting existing data.
  - Downloadable sample CSV template.

---

### 5. Repository Setup & Source Code Export
> **User Commands**:
> - *"Where is the code saved in local machine"*
> - *"which folder code is saved on my local machine"*
> - *"Commit the code to https://github.com/venkatkodali"*
> - *"created homepulse repository, please push into that"*

**Implementation details:**
- Added a one-click **"Download Source Code (.zip)"** feature in the `ExportImportModal` so the entire project can be downloaded locally directly from the browser.
- Initialized local git repository with `main` branch:
  ```bash
  git init -b main
  git config user.name "venkatkodali"
  git config user.email "kodaliv@gmail.com"
  git add .
  git commit -m "feat: HomePulse - Household Budget & Personal Finance Tracker with SQLite and AI categorization"
  ```
- Guided GitHub Personal Access Token permissions (enabling repository `Contents: Read and write`).
- Pushed all 43 source files (15,166 lines of code) to:
  `https://github.com/venkatkodali/homepulse`
- Sanitized remote credentials back to standard HTTPS URL for security.

---

### 6. Dependency Resolution Fix (`esbuild` & `vite 8`)
> **User Command / Issue**:
> *"npm install -> npm error code ERESOLVE: Could not resolve dependency: peerOptional esbuild@^0.27.0 || ^0.28.0 from vite@8.3.5, Found: esbuild@0.25.12"*

**Implementation details:**
- Vite 8 requires peer optional `esbuild` version `^0.27.0 || ^0.28.0`.
- Updated `devDependencies` in `package.json` from `"esbuild": "^0.25.0"` to `"esbuild": "^0.28.0"`.
- Cleaned peer dependency conflict for seamless `npm install` on local clones without requiring `--legacy-peer-deps`.

---

### 7. Clean Slate & 'Clear All Data' Feature
> **User Commands**:
> - *"How can i remove sample data and start with my own data"*
> - *"Create a 'Clear All Data' button within the Export/Import modal that allows users to reset their local storage state to empty, providing a clean slate for their own personal transaction data."*

**Implementation details:**
- Added a prominent **"Clear All Data (Clean Slate)"** button within the `ExportImportModal`:
  - **Export & Reports Tab**: Dedicated "Reset & Clean Slate Management" card with a red action button to empty local storage and database records.
  - **Import CSV Tab**: Contextual banner notifying users of existing sample data with a quick 1-click "Clear All Data" action before uploading bank statements.
- Added safety confirmation modal with:
  - Clear breakdown of items to be removed.
  - Checkbox option to also clear sample subscriptions, recurring bills, and debts (enabled by default).
  - Preservation of standard budget category definitions (Groceries, Housing, Utilities, etc.) so users can immediately log personal transactions without configuring categories from scratch.
  - Safety tip with instant option to restore the default sample dataset at any time.
- Updated application state logic in `App.tsx`:
  - Supported empty local storage arrays (`homepulse_transactions: []`) without falling back to demo data.
  - Added `homepulse_data_cleared` persistence flag so page reloads honor the clean slate.
  - Added `POST /api/sqlite/clear` backend endpoint to synchronize database tables alongside local storage.
  - Added clean empty-state displays on the Dashboard and Transactions views.

### 8. Official Brand Logo Integration
> **User Command**:
> *"Please add this logo to the app"* (with user attachment `/public/assets/aistudio/image_806b5b1b.png`)

**Implementation details:**
- Integrated the provided high-resolution HomePulse logo mark (featuring house symbol, financial pulse waveform, upward growth arrow, bar chart, and "HomePul$e" branding on midnight-navy backdrop).
- **Navigation Bar (`TopBar.tsx`)**: Replaced the initial generic letter avatar with a sleek, clickable logo badge (`image_806b5b1b.png`) with responsive branding and dashboard navigation on click.
- **Favicon & Web App Identity (`index.html`)**: Added high-resolution favicon links, Apple touch icon, and OpenGraph/Twitter social cards pointing directly to `/assets/aistudio/image_806b5b1b.png`.
- **Monthly Summary Report Modal (`MonthlyReportModal.tsx`)**: Incorporated the brand logo in the report header for executive presentation and printed audits.
- **Data Management & CSV Import Modal (`ExportImportModal.tsx`)**: Promoted brand identity in the data import/export modal header.
- **Empty State Display (`DashboardView.tsx`)**: Enhanced clean-slate dashboard empty state with the official logo badge.

### 9. Git Commit & Repository Synchronization
> **User Command**:
> *"Commit chnages to git"*

**Implementation details:**
- Initialized and configured git repository with `main` branch.
- Added all project updates including official branding, favicon, OpenGraph metadata, report logo integration, and clean-slate enhancements.
### 10. Monthly Budget Cap Adjustment Workflow
> **User Command**:
> *"How can i change the Monthly Budget Cap value"*

**Implementation details:**
- Clarified that the **Monthly Budget Cap** is calculated dynamically as the cumulative sum of category targets (Housing, Groceries, Dining, Utilities, Transportation, etc.).
- Enhanced the **Dashboard View (`DashboardView.tsx`)**:
  - Made the **"Monthly Budget Cap"** metric card directly clickable with an interactive hover effect and `Edit ↗` / `Manage →` buttons that jump straight to the Budgets management tab.
  - Added an **"Edit Caps ↗"** quick-action button in the **Monthly Budget Progress Bar (`MonthlyBudgetProgressBar.tsx`)** header for one-click access.
### 11. Real-Time Multi-Device Synchronization Engine
> **User Command**:
> *"Please check multi-device, not working as expected"*

**Root cause analysis:**
- Data state was previously persisted only in the browser's local storage (`localStorage`), which is completely isolated to a single client device.
- Local mutations (adding transactions, editing, deleting, adjusting budgets, clearing sample data) only mutated React state and local storage, without automatically pushing to the central SQLite server database.
- Secondary devices (mobile phones, laptops, separate browsers) never received updates from the primary device and initialized with stale mock data.

**Implementation details:**
- **Central Authoritative SQLite Sync**:
  - Added `app_metadata` table in SQLite schema to track `data_version` timestamps across all connected devices.
  - Added `GET /api/sync/version` lightweight polling endpoint on Express backend.
  - Added timestamp versioning to `GET /api/data`, `POST /api/sync`, `POST /api/sqlite/clear`, and `POST /api/sqlite/reset`.
- **Automatic Auto-Sync on Mutations**:
  - Implemented debounced auto-sync (`triggerPushToServer`) across all user mutations (adding transactions, editing, deleting, budget updates, debt payoff, subscriptions, recurring rules, CSV imports, and clean-slate resets).
- **Live Cross-Device Poller & Tab Focus Listeners**:
  - Added a 3.5-second lightweight version poller on the frontend.
  - Added immediate sync triggers on `window.focus` and `document.visibilitychange` so waking up a phone screen or switching tabs instantly refreshes from the central database.
- **Live Sync Indicator**:
### 12. Dev Server Recovery & Dependency Resolution (`clsx` & `@babel/runtime`)
> **User Command**:
> *"The dev server didn't start, please fix it"*

**Root cause analysis:**
- Vite pre-bundling failed due to unlisted transitive dependencies required by `recharts` (`clsx`) and `jspdf` (`@babel/runtime`).
- The development process was not actively listening on port 3000.

**Implementation details:**
- Installed `clsx` and `@babel/runtime` directly into `package.json` dependencies.
- Re-compiled and verified clean bundle compilation with Vite and TypeScript.
### 13. Preview Resolution & Vite OptimizeDeps Configuration
> **User Command**:
> *"Preview not showing"*

**Root cause analysis:**
- Vite 8 dynamic dependency discovery was triggering `504 Outdated Optimize Dep` on runtime requests for `recharts` and `jspdf` due to orphan background processes and missing pre-bundle definitions.
- Orphan node processes were competing for memory and cache locks.

**Implementation details:**
- Terminated orphan node/tsx server tasks to ensure a single clean control-plane process.
- Configured explicit `optimizeDeps.include` in `vite.config.ts` for all core client packages (`react`, `react-dom`, `recharts`, `jspdf`, `clsx`, `lucide-react`, `motion`).
### 14. Frequently Used Tags Suggestion List in AddTransactionModal
> **User Command**:
> *"Update the AddTransactionModal to include a 'Frequently Used Tags' suggestion list based on existing transactions, allowing users to select tags with one click during creation."*

**Implementation details:**
- Enhanced `AddTransactionModal` with an interactive **Frequently Used Tags** section:
  - Dynamically computes tag frequencies across all existing transactions with fallback to common household expense categories (`groceries`, `dining`, `bills`, `subscription`, `work`, `travel`, `health`, `entertainment`).
  - Renders top tags with individual usage count badges.
  - Enabled **one-click toggle interaction**: clicking an unselected tag appends it to the comma-separated tags field and highlights it with a checkmark badge (`✓`), while clicking an active tag deselects and removes it.
  - Added real-time bidirectional synchronization: typing in the tags text box automatically toggles the corresponding tag chips.
  - Added a convenient `Clear (N)` button when tags are active.
### 15. Global Search Bar in TopBar Across All Views
> **User Command**:
> *"Implement a global search bar in the TopBar component to allow users to quickly filter transactions by merchant, title, or tags across all views."*

**Implementation details:**
- **TopBar Search Input (`TopBar.tsx`)**:
  - Implemented a sleek global search input with `Search` icon, clean clear button (`X`), and keyboard shortcut indicator (`/` or `Cmd+K` / `Ctrl+K`).
  - Added global keyboard listener: pressing `/` or `Cmd+K` immediately focuses the search field from anywhere in the app, while `Esc` clears or blurs it.
- **Cross-View Multi-Attribute Transaction Filtering (`App.tsx`)**:
  - Implemented reactive `filteredTransactions` matching query text across `merchant`, `title` (description), and `tags` arrays.
  - Propagated filtered transactions to all views: **Dashboard**, **Ledger (Transactions)**, **Analytics**, **Budgets**, **Debts**, and **SQLite Studio**.
  - Dashboard scoped transactions immediately adjust cash flow charts, burn velocity, and category totals to reflect filtered transactions.
- **Active Filter Indicator Banner (`App.tsx`)**:
  - Displays a clean visual notification bar when search is active showing current filter query, number of matching transactions, and an instant 1-click **"Clear search"** action.
- **Ledger Local Search Tag Matching (`TransactionsView.tsx`)**:
  - Updated ledger table search to also filter by `tags` in addition to description and merchant payee.

---

## 🛠️ Technology Stack Summary

| Layer | Technologies |
|---|---|
| **Frontend Framework** | React 19, TypeScript, Vite |
| **Styling & Icons** | Tailwind CSS v4, Lucide React Icons |
| **Charts & Visualizations** | Recharts (ResponsiveContainer, Bar, Line, Area, Pie, Donut) |
| **Backend & APIs** | Node.js, Express, tsx |
| **Database** | SQLite (`better-sqlite3`) |
| **AI Integration** | Google GenAI SDK (`@google/genai`, Gemini 2.5 Flash) |
| **Utilities** | JSZip, FileSaver, Date formatting, CSV parsing engine |

---

## 🚀 How to Run Locally

1. **Clone the repository**:
   ```bash
   git clone https://github.com/venkatkodali/homepulse.git
   cd homepulse
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your `GEMINI_API_KEY` (optional, built-in smart merchant matching works without it).

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.
