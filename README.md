# HomePulse

**HomePulse** is a personal finance management and analytics platform built for high-clarity expense tracking, budget management, subscription monitoring, debt elimination, and savings growth.

Designed with clean typography, tabular figure alignment, and responsive data visualizations, HomePulse operates client-side with persistent local storage, custom PDF report generation, and instant multi-currency conversion.

---

## Key Features

### 1. Executive Dashboard
- **Financial Metric Cards**: Instant visibility into monthly spending, total income, net savings rate, and remaining budget headroom.
- **Budget Threshold Notification System**: Accessible alert badge indicator in the dashboard header that automatically monitors category expenditures. Flags any category exceeding 80% of its monthly allowance with an amber warning badge, and categories at or over 100% with a rose alert badge, complete with an interactive notification dropdown, breakdown of overages/headroom, transaction filtering, and direct inline budget adjustment.
- **Cumulative Budget Progress Bar**: Visual progress indicator showing real-time monthly burn against cumulative budget across all active categories, color-coded by financial health thresholds (normal, cautionary, and over-budget).
- **Upcoming Monthly Bills**: Dedicated scheduled billing tracker highlighting all recurring subscriptions due within the next 7 days, complete with due dates, amounts, and urgent badges.
- **Recent Transactions Feed**: Quick access to latest entries with one-click modal editing.

### 2. Financial Ledger (Transactions)
- **Live Search & Filter**: Real-time instant query filtering matching merchant names, descriptions, and tags.
- **Date Presets & Custom Ranges**: Quickly scope transactions by current month, previous month, last 30/90 days, year-to-date, or custom start/end dates.
- **Category Filter**: Segment expenses and revenues by custom category taxonomy.
- **Batch Management**: Multi-row selection for batch deletions and review.
- **Gemini AI Category Suggester**: Automated helper function powered by `gemini-3.8-flash` on the server that predicts and suggests financial categories in real time as the user types merchant names (e.g., "Trader Joe's", "Whole Foods", "Delta Air Lines", "Chevron", "Netflix") or transaction titles. Includes debounced auto-detection, interactive one-tap quick category chips, confidence scores, reasoning insights, and seamless offline heuristic fallbacks to maximize manual ledger entry speed.
- **Full CRUD Support**: Add, edit, inspect, and delete transactions with support for recurring intervals and payment methods.

### 3. Analytics & Cash Flow Projections
- **Cash Flow History & Projected Forecast**: Interactive area and bar charts displaying historical daily/weekly cash flow plus a forward **Projected Mode** simulating month-end inflow, outflow, and net cash balance.
- **Standing Recurring Transactions & Automated Modeling**: Define recurring income (e.g. primary tech salary, freelance advisory retainers) and scheduled obligations (e.g. apartment rent, health insurance, utility baselines) with customizable frequency (monthly, bi-weekly, weekly, yearly) and day-of-month schedules.
- **Automatic Cash Flow Projection Engine**: Mathematically projects active recurring salaries and fixed bills across 30, 60, and 90-day forward horizons, combining guaranteed inflows with fixed commitments, active subscriptions, and discretionary daily burn velocity.
- **Cash Flow Runway & Outflow Modes**: Toggle between net cash surplus runway (cumulative income minus cumulative expenses) and cumulative outflow against the monthly budget ceiling.
- **One-Click Post to Ledger**: Instantly post scheduled occurrences into the actual transaction ledger for the current month without duplicate data entry.
- **Category Spending Distribution**: Interactive donut charts highlighting proportion of discretionary vs. essential expenditures.

### 4. Budgets & Savings Goals
- **Category Budgeting**: Monthly limits per category with dynamic warning states when nearing or exceeding allocations.
- **Target Savings Goals**: Visual progress bars tracking emergency funds, large purchases, or travel funds, with direct deposit contribution actions.

### 5. Subscriptions Management
- **Recurring Commitment Tracker**: Monitor recurring SaaS, streaming, utility, and membership fees.
- **Billing Frequency**: Support for monthly and annual billing cycles with auto-normalized monthly burn calculation.
- **Active / Paused Status**: Toggle subscriptions on or off to inspect the effect on recurring monthly overhead.

### 6. Debts & Liabilities
- **Liability Tracking**: Monitor credit cards, auto loans, student loans, mortgages, and personal loans.
- **APR & Interest Burden**: Track annual percentage rates (APR) with automated weighted average interest calculation and monthly interest burden estimation.
- **Visual Debt vs. Savings Summary**: Comparative balance gauge comparing liquid reserve assets against total outstanding liabilities, with a solvency coverage ratio.
- **Payoff Strategy Simulator**:
  - **Debt Avalanche**: Prioritizes accounts with the highest interest rates first to minimize total interest paid over time.
  - **Debt Snowball**: Prioritizes lowest balance accounts first for accelerated account eliminations and psychological momentum.
  - **Extra Payment Slider**: Simulates accelerated payoff duration and interest saved with extra monthly paydowns.
- **Quick Paydown Action**: Log payments directly to decrease balances, with optional automatic ledger expense entry.

### 7. SQLite Database Capability & Studio
- **Native SQLite 3 Engine**: Server-backed relational database storage (`data/homepulse.sqlite`) running `better-sqlite3` with Write-Ahead Logging (`PRAGMA journal_mode = WAL`) and foreign key integrity.
- **SQL Query Studio**: Interactive SQL console with syntax cues, monospace editor, preset financial queries (category rollups, monthly cash flow, debt avalanche APR order, subscriptions), query execution timing (ms), and CSV export.
- **Table Schema & Index Explorer**: Visual inspector for all SQLite tables (`transactions`, `categories`, `subscriptions`, `debts`, `recurring_transactions`, `savings_goals`, `sql_query_history`) with column data types (`TEXT`, `REAL`, `INTEGER`), primary keys, constraints, and one-click "Browse Rows" execution.
- **Atomic Two-Way State Synchronization**: Seamlessly syncs React client state into SQLite within an atomic database transaction (`db.transaction()`) and auto-hydrates on startup.
- **Full Database Portability**: Direct one-click download of the binary `.sqlite` database file and comprehensive text `.sql` DDL/DML dump scripts, plus a batch SQL script runner for custom migrations.

### 8. Data Portability & Reports
- **CSV Export**: Download complete transaction history as an RFC 4180-compliant CSV spreadsheet.
- **JSON Backup & Restore**: Full export and import of all user transactions, budgets, subscriptions, and debts.
- **SQLite Binary & SQL Dump Export**: Download standalone `homepulse.sqlite` binary or SQL schema/data dump file.
- **Monthly Summary PDF Generator**: Generates and downloads a branded PDF performance report via `jsPDF`, detailing income, expenses, category breakdowns, savings performance, and pending bills.
- **Interactive Report Modal**: In-app text-based breakdown of financial performance for fast monthly reviews.

---

## Tech Stack & Frameworks

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **UI Framework** | [React 19](https://react.dev/) | Modern functional components with hooks and clean state isolation |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) | Strict typing for transaction schemas, category metadata, and debt models |
| **Build & Dev Tool** | [Vite 6 / 8](https://vitejs.dev/) | Sub-second HMR and optimized production bundling |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | `@import "tailwindcss";` with `@custom-variant dark` for dual-theme support |
| **Charts** | [Recharts](https://recharts.org/) | Responsive SVG charts (BarChart, PieChart, AreaChart, ResponsiveContainer) |
| **Icons** | [Lucide React](https://lucide.dev/) | Clean, accessible vector icons |
| **PDF Generation** | [jsPDF](https://github.com/parallax/jsPDF) | High-resolution client-side PDF document generation |
| **Database** | [SQLite 3](https://www.sqlite.org/) via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | Embedded relational database with WAL journaling, zero latency, and schema introspection |
| **Runtime / Server**| [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/) | Full-stack entry point with Vite middleware support (`server.ts`) |

---

## Project Structure

```
.
├── index.html                  # HTML entry point with metadata & web fonts
├── metadata.json               # Applet configuration & metadata
├── package.json                # Project dependencies and script definitions
├── tsconfig.json               # TypeScript compiler configuration
├── vite.config.ts              # Vite bundler configuration
├── server.ts                   # Express server entry point & SQLite API endpoints
├── server/
│   └── db.ts                   # SQLite schema, PRAGMA setup, query runner, sync engine
├── data/
│   └── homepulse.sqlite        # SQLite 3 persistent database file
└── src/
    ├── main.tsx                # React DOM mount point
    ├── App.tsx                 # Root application state & navigation router
    ├── index.css               # Global styles, Tailwind directives & dark mode setup
    ├── types/
    │   └── index.ts            # Core TypeScript interfaces (Transaction, SqliteStatus, etc.)
    ├── data/
    │   └── initialData.ts      # Default seed dataset (transactions, categories, debts)
    ├── utils/
    │   ├── formatters.ts       # Currency conversion, dates, CSV export utilities
    │   └── monthlyReportGenerator.ts # jsPDF report generation engine
    └── components/
        ├── layout/
        │   └── TopBar.tsx      # Navigation header adhering to 3-zone contract
        ├── dashboard/
        │   └── MonthlyBudgetProgressBar.tsx # Visual budget progress bar
        ├── views/
        │   ├── DashboardView.tsx     # Overview with KPIs, bills, and budget burn
        │   ├── TransactionsView.tsx  # Searchable, filterable ledger table
        │   ├── AnalyticsView.tsx     # Recharts spending trends & future projections
        │   ├── BudgetsView.tsx       # Category limits and savings goals
        │   ├── SubscriptionsView.tsx # Recurring bills manager
        │   ├── DebtsView.tsx         # Liabilities tracker, debt vs savings, payoff simulator
        │   └── SqliteView.tsx        # Interactive SQLite Query Studio, Schema Inspector & DDL export
        ├── recurring/
        │   └── RecurringTransactionsModal.tsx # Recurring rules & schedule manager
        └── modals/
            ├── AddTransactionModal.tsx  # Log new expense or income
            ├── EditTransactionModal.tsx # Edit or remove existing transaction
            ├── AddEditDebtModal.tsx     # Add or edit loan / credit card accounts
            ├── ExportImportModal.tsx    # Data backup, CSV export, SQLite .db download & PDF report
            └── MonthlyReportModal.tsx   # Text summary report modal with PDF action
```

---

## Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or later (v20+ recommended)
- **npm**: v9.0.0 or later

### Installation

1. Clone or navigate to the repository directory:
   ```bash
   cd /path/to/applet
   ```

2. Install all dependencies:
   ```bash
   npm install
   ```

### Running Locally (Development)

Start the Vite development server:
```bash
npm run dev
```

The application will be served at `http://localhost:3000`.

### Type Checking & Linting

Validate TypeScript types across the entire codebase:
```bash
npm run lint
```
*(Runs `tsc --noEmit`)*

### Production Build

Create an optimized, minified production build:
```bash
npm run build
```

Compiled assets will be placed in the `dist/` directory.

### Preview Production Build

Preview the generated production build locally:
```bash
npm run preview
```

---

## Design & Engineering Conventions

1. **Tabular Numerals**: All numerical figures, currency amounts, and dates use `font-mono` or `tabular-nums` to eliminate layout jitter and maintain vertical alignment.
2. **Zero-Pill Discipline**: Metadata (timestamps, categories, status labels) is presented with clean typography and typographic separators (`·`, `/`), reserving pill buttons strictly for interactive segmented controls.
3. **Dual-Theme Support**: Light and Dark modes are implemented using Tailwind v4's `@custom-variant dark (&:where(.dark, .dark *));`. All color classes feature paired light and dark values without destructive `!important` CSS overrides.
4. **Data Isolation & Privacy**: All transactions, debts, categories, and settings are stored locally in the browser's `localStorage` (`homepulse_*` keys). No financial data is sent to external servers.
