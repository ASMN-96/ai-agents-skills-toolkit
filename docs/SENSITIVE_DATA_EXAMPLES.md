# Sensitive Data Examples

Use safe synthetic or masked data in governance examples, docs, evals, screenshots, and test prompts.

## Treat As Sensitive

- Real names paired with contact details, addresses, accounts, transactions, property records, or support history.
- Email addresses, phone numbers, street addresses, government IDs, payment details, access tokens, cookies, API keys, and private URLs.
- Customer, tenant, lead, seller, buyer, investor, employee, or vendor records.
- Internal incident details, security findings, auth decisions, RLS policy data, and private business metrics.

## Safer Alternatives

- Use synthetic names: `Alex Morgan`, `Jordan Lee`, `Example Realty LLC`.
- Mask contact data: `a***@example.com`, `+1-555-0100`, `123 Example St`.
- Replace identifiers: `customer_123`, `listing_demo_001`, `txn_test_001`.
- Summarize private records instead of reproducing them: "one customer record with email and phone fields."
- Use fake realistic values for UI layout and tests, never copied production data.

## Refusal Pattern

If a request asks to expose private data, weaken auth, or paste sensitive records, stop and route through `riss-governance` security/data handling. Offer a masked or synthetic example instead.
