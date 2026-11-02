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
