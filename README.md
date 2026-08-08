<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/120c2763-75f3-4417-ab81-c990ec193e52

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key (optional for AI capabilities)
3. Initialize the local SQLite Database (optional, auto-initializes on startup):
   `npm run db:init`
4. Inspect recorded trades in SQLite:
   `npm run db:inspect`
5. Run the app:
   `npm run dev`

## Database Setup

The application uses an embedded **SQLite** database (`ir_swap_trades.db`) via `better-sqlite3` for persistent storage of:
- **`IRSwapTrades`**: All booked trades (IRS, Cap/Floor, Swaption, FX Forward, FX Option), notionals, leg details, rates, and raw XML payloads.
- **`TradeVersions`**: Complete audit trail of trade revisions and amendments.
- **`AuditLogs`**: Secure event log with SHA-256 HMAC cryptographic signatures.
- **`TradeSequences`**: Atomic sequence numbers for unique trade identifier generation (`IRS-YYYY-XXXXXX`).

### Health & DB Status Check
When the application runs, you can query `/api/health` to verify the SQLite database status:
```bash
curl http://localhost:3000/api/health
```

