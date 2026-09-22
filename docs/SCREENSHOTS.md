# Screenshots

Portfolio screenshots live in `docs/screenshots/` (ignored sample data only — never real cash).

## How to capture (5 min, no real data)

1. Start the disposable preview (never touches production):
   ```powershell
   node scripts/ui-preview.mjs
   ```
2. Open http://127.0.0.1:4311, PIN `24682468`.
3. Create a few sample records: opening balance, 2–3 expenses (Food, Transport, Lessons/Chemistry), 1 income, 1 partial refund.
4. Capture:
   - `home-desktop.png` — Home at 1280px wide
   - `analysis-desktop.png` — Analysis at 1280px wide
   - `home-mobile.png` — Home at 390px wide (DevTools device toolbar)
5. Save them in this folder, then update the table in `README.md`.

Tips: use a clean browser profile, hide bookmarks bar, Cairo daylight screenshot reads best on the charcoal/teal theme.
