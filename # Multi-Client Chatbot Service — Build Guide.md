\# Multi-Client Chatbot Service — Build Guide

This is a build brief for a single chatbot service that serves many clients from one deployment. Hand this whole file to Claude Code, follow the steps in order, and copy-paste the prompts where shown.

\*\*Important for the person following this:\*\* You do not need to write code. Claude Code writes everything. Your job is to copy keys, paste prompts, add rows in Supabase, and relay any error messages back to Claude Code.

\---

\#\# What we are building

\- \*\*One\*\* Next.js project deployed \*\*once\*\* to Vercel.  
\- That single deployment serves \*\*unlimited clients\*\*, each with their own personality and their own website.  
\- The \*\*OpenAI API key lives in exactly one place\*\*: Vercel's environment variables. Never on any client website, never in the widget.  
\- \*\*Supabase\*\* is the control panel. Add a client \= add a row. Change a personality \= edit a row. Limit or pause a client \= edit a number. No redeploying, ever.

\#\#\# The pieces

| Piece | What it does | Where it lives |  
|---|---|---|  
| \`widget.js\` | The chat bubble that gets added to a client's site. Reads a \`data-client-id\`. Holds no secrets. | Served from Vercel, pasted on client sites |  
| \`/api/chat\` | The backend. Looks up the client, checks safety rules, calls OpenAI, logs usage. The only place the key is used. | Vercel |  
| \`clients\` table | One row per client: id, personality, allowed domain, message limit, messages used. | Supabase |  
| \`logs\` table | Record of usage so you can see spend per client. | Supabase |

\#\#\# The rules that keep it safe (your bill insurance)

1\. \*\*Origin check\*\* — each client's widget only works on their own registered website domain. Stops people copying the snippet onto other sites.  
2\. \*\*Per-client monthly message limit\*\* — when a client hits their cap, requests are blocked politely instead of calling OpenAI. This makes your worst-case cost a known, capped number.  
3\. \*\*Usage logging\*\* — every message increments that client's count so you can see who is using how much.

\---

\#\# Step 0 — Accounts and the key (do once)

1\. Make free accounts: \*\*vercel.com\*\*, \*\*supabase.com\*\*, \*\*platform.openai.com\*\*.  
2\. In OpenAI, create an \*\*API key\*\*. Copy it into a private notes file. This is the only thing that costs money. It goes into Vercel later and nowhere else.  
3\. In Supabase, create a new project. When it finishes setting up, you will need three values later (Claude Code will tell you exactly which): the \*\*Project URL\*\*, the \*\*anon key\*\*, and the \*\*service role key\*\*. Keep them in your notes file.

\---

\#\# Step 1 — Open Claude Code in VS Code

1\. Make a new empty folder, e.g. \`remotely-chatbot\`.  
2\. Open it in VS Code.  
3\. Open the terminal and start Claude Code.  
4\. You will talk to it in plain English from here.

\---

\#\# Step 2 — Build the whole thing (paste this prompt into Claude Code)

\> Build a multi-client chatbot service on Next.js (App Router, TypeScript) for deployment to Vercel. One single deployment must serve many clients.  
\>  
\> Requirements:  
\> \- A public \`widget.js\` file that adds a chat bubble and chat panel to any website. It reads a \`data-client-id\` attribute from its own script tag and sends that id with every message. It must contain no API keys or secrets.  
\> \- An \`/api/chat\` route that: (1) reads the message and the client-id, (2) looks up that client's system prompt, allowed domain, monthly message limit, and messages used from a Supabase \`clients\` table, (3) checks the request's Origin header against that client's allowed domain and rejects mismatches, (4) checks the client's monthly limit and returns a polite "limit reached" message if exceeded, (5) calls the OpenAI API using my key from an environment variable, (6) increments the client's message count and writes a row to a \`logs\` table.  
\> \- Give me the exact Supabase SQL to create the \`clients\` and \`logs\` tables, including columns for id, name, system\_prompt, allowed\_domain, monthly\_limit, messages\_used.  
\> \- Stream the reply back to the widget so it feels like typing.  
\>  
\> I do not code. Keep it as simple as possible. Walk me through every step: where to paste the Supabase SQL, how to push to GitHub, how to deploy to Vercel, and exactly which environment variables to add and where. Number the steps and tell me what to click.

Let it finish building. Then read the instructions it gives you and continue below.

\---

\#\# Step 3 — Set up the Supabase tables

1\. Claude Code will hand you a block of \*\*SQL\*\*.  
2\. In Supabase, open your project, go to the \*\*SQL Editor\*\* (left sidebar).  
3\. Paste the SQL and click \*\*Run\*\*.  
4\. Go to \*\*Table Editor\*\* and confirm you can see a \`clients\` table and a \`logs\` table.

If anything errors, copy the red error text and paste it back into Claude Code.

\---

\#\# Step 4 — Deploy to Vercel

Follow Claude Code's exact instructions. It will be roughly:

1\. Push the project to GitHub (Claude Code runs the commands; you may need to log in once).  
2\. Go to vercel.com, \*\*Add New Project\*\*, import the GitHub repo.  
3\. \*\*Before deploying\*\*, open \*\*Environment Variables\*\* and add (names will be confirmed by Claude Code):  
   \- \`OPENAI\_API\_KEY\` \= your OpenAI key  
   \- \`SUPABASE\_URL\` \= your Supabase Project URL  
   \- \`SUPABASE\_SERVICE\_KEY\` \= your Supabase service role key  
4\. Click \*\*Deploy\*\*.  
5\. Vercel gives you one URL, e.g. \`https://remotelybot.vercel.app\`. \*\*This single URL serves every client.\*\* Save it.

This is the only place your OpenAI key ever lives.

\---

\#\# Step 5 — Add a client (repeat this per client, no code)

In Supabase, go to \*\*Table Editor → clients → Insert row\*\*:

| Column | Example value |  
|---|---|  
| id | \`craftsfabrics\` |  
| name | CraftsFabrics |  
| system\_prompt | You are a friendly assistant for CraftsFabrics, a UK fabric shop. Help customers with products, shipping, and orders. Be warm and brief. |  
| allowed\_domain | \`craftsfabrics.com\` |  
| monthly\_limit | \`2000\` |  
| messages\_used | \`0\` |

Save. That client now exists. Onboarding a new client is just this one row.

\*\*Tip:\*\* the \`system\_prompt\` is plain English. Write it like you are briefing a new support assistant on their first day. What is the business, what should they help with, what tone, anything they should never say.

\---

\#\# Step 6 — Give the client their snippet

Every client gets the \*\*same URL\*\* but \*\*their own id\*\*:

\`\`\`html  
\<script src="https://remotelybot.vercel.app/widget.js" data-client-id="craftsfabrics"\>\</script\>  
\`\`\`

Where they paste it (just before the closing \`\</body\>\` tag):

\- \*\*Shopify:\*\* Online Store → Themes → Edit code → \`theme.liquid\`, before \`\</body\>\`.  
\- \*\*WordPress:\*\* install a "header and footer scripts" plugin and paste it in the footer box.  
\- \*\*Plain HTML site:\*\* before \`\</body\>\` in the page template.

That is the entire install on their end. The widget sends its client-id to your backend, your backend loads that client's personality and rules, and your OpenAI key answers.

\---

\#\# Step 7 — Manage everything from Supabase

You never redeploy for any of this. It all happens by editing rows.

\- \*\*Change a bot's personality:\*\* edit that client's \`system\_prompt\`.  
\- \*\*Raise or lower a limit:\*\* edit \`monthly\_limit\`.  
\- \*\*See usage:\*\* look at \`messages\_used\`, and the \`logs\` table for detail.  
\- \*\*Pause a client (e.g. unpaid):\*\* set \`monthly\_limit\` to \`0\`.  
\- \*\*Reset monthly counts:\*\* set \`messages\_used\` back to \`0\` at the start of each month (later you can automate this).

\---

\#\# When something breaks

This is normal. The usual culprits and the fix is always the same: \*\*copy the exact error and paste it into Claude Code.\*\*

\- \*\*Widget shows but says forbidden / 403:\*\* the Origin check does not match. Tell Claude Code: "The Origin check is blocking the real client site. The site is at \`https://www.craftsfabrics.com\`. Make the domain check also accept the \`www.\` version and ignore http vs https." Domain typos and the missing \`www.\` are the number one cause.  
\- \*\*Bot does not answer at all:\*\* usually the OpenAI key is missing or misnamed in Vercel env vars, or you forgot to redeploy after adding it. Tell Claude Code the symptom.  
\- \*\*"Limit reached" when it should not be:\*\* check \`messages\_used\` vs \`monthly\_limit\` in Supabase.

\---

\#\# The order that actually gets you live

Do not build everything at once. The milestone is \*\*one bot, deployed, embedded on a test page, with the Origin check and limit working.\*\*

1\. Build (Step 2\) and deploy (Step 4\) first.  
2\. Add \*\*one\*\* test client whose \`allowed\_domain\` is a test page you control.  
3\. Confirm it answers, the wrong domain is rejected, and setting the limit to 2 actually blocks the 3rd message.  
4\. Only then onboard CraftsFabrics as a real client.

Everything after the first working client is just repeating Step 5 and Step 6\. Get one paid and live before adding any extra features.  
