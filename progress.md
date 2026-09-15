# Pocket — build progress

## Status
First complete version built and launched on 14 September 2026. Requirements are recorded in instructions.md. Production is ready for the user's opening cash balance; no test financial records were added to production.

## Checklist
- [x] Complete requirements interview and receive build authorization.
- [x] Confirm empty project and installed Node.js 24; no packages need downloading.
- [x] Record scope and UI direction.
- [x] Implement persistent cash ledger and validation.
- [x] Implement PIN sessions and access controls.
- [x] Implement weekly/manual backup and restore.
- [x] Build responsive Home, Analysis, History, Settings, and entry forms.
- [x] Test financial and HTTP behaviour with isolated temporary data.
- [x] Verify desktop/mobile layout and browser workflows.
- [x] Document launch, Tailnet access, backup, and recovery.
- [x] Launch production app with no sample financial data.

## Decisions and observations
- App name: Pocket. Charcoal/teal interface, compact Home, detailed Analysis.
- Installed Node.js: 24.18.0; bundled runtime also available at 24.19.0.
- Both loopback and the detected Tailnet HTTP endpoints returned 200 from the host PC during initial verification. Physical phone access was not verified.
- No code or financial data existed in the project directory at initial inspection.

## Implemented
- SQLite persistence with atomic mutations, integer piastres, revision conflict handling, and nonnegative chronological ledger validation.
- Opening cash, occasional income, categorized expenses, optional subjects/descriptions, original-time corrections, deletion constraints, balance adjustments, partial/full refunds.
- Category/subject creation, rename, archive/unarchive, and deletion only when unused.
- Cairo date boundaries, Sunday-first weeks, Today/This Month/All Time/custom filters, history search/type/category/subject/date filtering and pagination.
- Server-calculated analysis: gross expenses, refunds, net spending, category and lesson subject breakdowns, daily/monthly spending, closing cash. Cash charts start when tracking begins, with no invented earlier balance.
- PIN stored as a salted scrypt hash; server-side 24-hour sessions with hashed tokens and HttpOnly SameSite cookies; login throttling and same-origin mutation controls.
- Automatic weekly snapshots, latest 8 retained, overdue catch-up, separate manual snapshots/downloads, validated restore with pre-restore recovery copy. Credentials excluded from portable backups.
- Dependency-free local assets, charcoal/teal styling, desktop sidebar, mobile bottom tabs and expense sheet, readable mobile chart axes, inline errors, accessible chart value tables.

## Verification evidence
- `node --test tests/ledger.test.mjs tests/server.test.mjs`: **25 passed, 0 failed**.
- `C:\nvm4w\nodejs\npm.cmd run check`: all JavaScript syntax checks passed.
- Browser tests used a separate preview database on loopback port 4311. Confirmed opening balance, successful PIN login, rejection of overspending with values preserved, expense entry with Chemistry, correction preserving timestamp, partial refund, income, history search + type filter, subject creation/archive, direct balance edit, manual backup and full UI restore.
- Restore test: changed cash from 570 to 565 EGP, restored the manual snapshot to 570 EGP, and observed the automatic recovery copy. These were disposable test records only.
- Inspected desktop layout and phone widths of 390 and 375 pixels. Home, Analysis, History, and Settings had no horizontal overflow in the checks. Mobile entry sheet and archived-subject removal were verified visually.
- Tested a custom period before tracking began: no invented balances and clear empty states.
- No browser console errors/warnings observed during the final checks.
- Production PIN login succeeded and the app was left at the opening-balance screen. Production ledger remained uninitialized with zero transactions.

## Running app
- PC: http://127.0.0.1:4310
- Tailnet: use the PC address printed when starting the server.
- The initial build was launched in the background. This is historical evidence, not a current process-status claim. Runtime logs are kept locally in the ignored artifacts/ directory.
- Later launches: double-click start-pocket.cmd or run `node server.mjs`. Foreground runs stop with Ctrl+C.
- The user's default npm PowerShell shim points at a missing npm-cli.js. The app does not depend on that shim; direct Node and `C:\nvm4w\nodejs\npm.cmd` work. No global npm repair or package installation was performed.

## Remaining practical verification
- Open the Tailnet URL from the physical phone to verify its network/firewall path. The phone itself was not available to this task.
- Enter the user's real opening cash amount. This was intentionally left for the user.
- Automatic weekly timing and retention were exercised with an injected clock; the app has not yet been running for a real week.

## Repository preparation — 15 September 2026
- User authorized committing and pushing the project to `Mostafa-Atlas/Money-tracking-system-`.
- Expanded README with fresh-clone setup, initial PIN creation, everyday start/stop, phone access, optional configuration, backup/restore, tests, isolated preview, and troubleshooting.
- Kept live cash records, database/authentication state, backups, test data, and runtime artifacts outside version control; added database and environment-file ignore patterns.
- Removed the host's specific Tailnet address and obsolete process ID from published documentation.
- Pre-commit verification on 15 September: 25 tests passed; JavaScript syntax checks passed; no matches for the configured production PIN or common credential markers in publishable source files.
