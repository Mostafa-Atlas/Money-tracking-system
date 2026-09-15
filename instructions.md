# Pocket — project instructions

## Authorization and scope
The user authorized building on 14 September 2026 after a requirements interview. Build the complete cash tracker described below. Keep this file and progress.md current. Do not publish publicly or push code without authorization.

## Product
- Single user, physical cash only, English, Egyptian pounds (EGP).
- Responsive PC/mobile webapp hosted on this PC and accessed through the user's Tailnet while the PC and app are running.
- PIN authentication; remember each unlocked browser for 24 hours. Never put the user's PIN in source, documentation, client code, or backups. Store a salted password hash locally.
- Ask for opening cash on first use. Never seed invented financial records.
- Occasional money received increases cash; an amount and optional note are sufficient.
- Expenses have a positive amount, category, optional lesson subject, optional description, and automatic date/time.
- Reject insufficient funds without saving. Every correction, deletion, or restore must preserve a valid, nonnegative ledger.
- Corrections can change amount, category/subject, description; transaction timestamps stay immutable. Incorrect records can be deleted subject to refund and balance constraints.
- Edit Balance records a visible adjustment; exclude adjustments from spending totals.
- Full/partial refunds link to an expense, add cash, and reduce net category spending. Cumulative refunds cannot exceed their expense. Preserve the refund's own timestamp. Refunds in period analytics are attributed to the date cash was returned, with gross expenses and refunds also shown separately.
- Initial categories: Lessons, Transport, Food. Initial lesson subject: Chemistry. Add/rename/archive categories and subjects; permanent deletion only when unused. Archived entries remain in historical records and are unavailable for new selection.
- History contains expenses, income, opening cash, adjustments, refunds. Search description/category/subject; filter dates, category, subject, and transaction type.
- Cairo timezone for display, calendar boundaries, and analytics. Default current week Sunday through Saturday; Today, This Month, All Time, custom date ranges.
- Analysis: net spent, refunds, largest spending category, category breakdown, daily spending, balance over time, lesson subjects. Never fake data or divide by zero in empty states.
- Backups: weekly automatically, latest 8 weekly snapshots retained, overdue backup at next server start; manual backups/download and restore. Create a recovery snapshot before restoration. Manual backups are retained separately. Financial backup data excludes credentials/sessions.

## UI direction
Use Pocket as the initial display name. Charcoal background, slightly lighter panels, teal accent, readable white and muted text. Compact Home overview; detailed graphs in Analysis. Desktop sidebar; four mobile bottom tabs: Home, Analysis, History, Settings. Cash balance and Add Expense are primary. Add Money is secondary. Mobile expense form is a bottom sheet; desktop uses a dialog. Show predicted remaining cash before saving. Numeric phone keyboard; inline errors retaining entered values; keyboard navigation, visible focus, labelled controls, reduced motion, touch-friendly targets. Charts must have readable values, accessible summaries, and honest empty states. No external fonts, CDNs, or online services required.

## Implementation decisions
Use existing Node.js 24 and built-in HTTP/SQLite/crypto/test modules, plus HTML/CSS/JavaScript and SVG. No dependency downloads needed. Store monetary values as integer piastres; calculate and validate on the server. Persist the ledger atomically in SQLite. Check revision numbers to prevent concurrent PC/mobile edits from overwriting each other. Use same-origin JSON mutation requests, rate-limited PIN authentication, HttpOnly SameSite cookies, and server-side sessions. Listen on loopback plus the detected Tailscale interface only by default. Store private files in ignored data/ and backups/ folders.

## Verification and delivery
Test money arithmetic, insufficient funds, refunds, corrections, archive rules, input validation, period boundaries, concurrent edits, authentication, backup rotation, restoration, persistence, and HTTP behaviour with temporary data. Browser-check primary flows and responsive layout where tools permit. Keep real user data empty for first-use opening balance. Clearly distinguish local browser/network checks from physical phone verification. Document start/stop and backup use in README.md. Update progress.md with actual evidence and remaining limitations.
