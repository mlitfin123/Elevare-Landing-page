# Pre‑Launch Page — Mailchimp

1) **index_mailchimp.html** — wired for Mailchimp embedded signups  
   - Replace placeholders in the form `action` URL with your values:
     - `<YOUR_DC>` = your Mailchimp data center (e.g. `us5`)
     - `<YOUR_U>` = `u` parameter from your Mailchimp embed link
     - `<YOUR_LIST_ID>` = `id` parameter from your Mailchimp embed link
   - Fields map to common merge tags:
     - `EMAIL`, `FNAME`, `CITY`, `SPECIALTY` (trainer), `GOAL` (client), `ROLE`, `TAGS`
   - Set your **thank‑you redirect** inside **Mailchimp form settings** for the audience. Point it to `thank-you.html` on your domain.

3) **thank-you.html** — confirmation page shown after successful signup.

4) **styles.css** — shared styling for both versions.
