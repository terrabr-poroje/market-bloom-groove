# Smart load finder for buyers (AI search)

## What the buyer sees
- A box on the "find loads" page where the buyer writes a request in plain Persian, for example: «۲ تن گوجه درجه یک برای تحویل در میدان بار اصفهان تا پنجشنبه».
- The system works out the product, amount, delivery place and time, then shows them so the buyer can check and correct them.
- A ranked list of matching loads appears. Each one shows a match score and a short reason in Persian (for example "same province, enough stock, price within your buyer group").
- If nothing matches, the buyer sees close alternatives (a nearby city, a different grade) with the reason.

## Rules (enforced on the server)
- Only published, active loads that this buyer is allowed to see are used: the buyer's group (retail, wholesale, special, special pro) and their geographic access.
- The price shown is the buyer's group price, read from the database. The AI never sets or changes prices or stock.
- The AI only reads and ranks. It cannot place orders or change any data.
- Sign-in is required. A per-user limit stops misuse and runaway costs.

## How it works
1. The buyer's text goes to the server. The AI turns it into structured fields: product, grade, amount and unit, destination, deadline.
2. The server filters loads in the database by product, stock, the buyer's access and region, and returns at most about 50 candidates.
3. The AI ranks only those candidates and writes a reason for each. The server checks that every load it returns really was one of the candidates.
4. Results show in the page, right to left, on mobile and desktop.

## Prerequisites (blockers)
- **TERRABAR's existing Supabase must be connected.** Without it there are no real loads to search.
- **Read the current tables** (loads, prices, stock, buyer groups, regions) to map the filters. Read-only, no changes.
- **Database changes, if any** (for example a usage log or limit table): proposed separately and applied only after your explicit approval.

## Technical details
- Server function with `requireSupabaseAuth`. Queries run as the user, so the RLS policies already in the database apply.
- Lovable AI Gateway, model `openai/gpt-6-astra` on `/v1/responses`, called from the server only. Structured output uses a strict JSON schema. Responses are streamed and read in full on the server.
- Two steps: (a) extract the request fields, (b) rank the candidate IDs. The returned IDs are checked against the candidate set.
- Errors: 402/403/429 are shown to the user as clear Persian messages. No automatic retry loops.
- Optional (needs your approval): a request log table for the per-user limit and later quality review.

## Out of scope
- Meta and WhatsApp, automatic orders, AI-set prices.
