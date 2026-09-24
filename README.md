# FinSathi

Prototype for a neobank for Indian MSME suppliers. Tracks B2B invoices against MSMED Act
payment deadlines (15 days without a written agreement, up to 45 days with one) and
simulates matching incoming bank credits (Account Aggregator mock) to open invoices.

```bash
npm install
npm run dev   # http://localhost:3000
```

All data lives in React state and resets on refresh. Sample invoices are generated relative
to today's date, so the demo always shows a mix of overdue, due soon and paid.
