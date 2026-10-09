# Setting up Infinity Scribe on Cloudflare (short links on scribe.infinitydrumming.com)

About 15 minutes, all in your Cloudflare dashboard. Nothing here touches your
GHL website or your email. GitHub Pages keeps serving groove.infinitydrumming.com
the whole time, so nothing goes down while you set this up.

What you get:

- Infinity Scribe at **scribe.infinitydrumming.com** (and a Cloudflare address
  like `infinity-scribe.pages.dev` for testing).
- Your own short links, like `scribe.infinitydrumming.com/s/Ab3kP9xy`, made by
  **Save & Share**.
- A free preview link for every change before it goes live.

"Make it live" stays the same: when a change is merged into `master`, Cloudflare
updates the site by itself.

## 1. Connect the app

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** tab →
   **Connect to Git**.
2. Choose GitHub, allow Cloudflare to see **infinitydrumming/GrooveScribe**, and
   pick it.
3. Project name: `infinity-scribe` (this becomes `infinity-scribe.pages.dev`).
   Production branch: **master**.
4. Build settings: Framework preset **None**, Build command **empty**, Build
   output directory **`/`**.
5. **Save and Deploy**. After a minute it says the site is live at
   `https://infinity-scribe.pages.dev`. Open it: it's Infinity Scribe.

## 2. Make the short-link store

1. **Workers & Pages** → **KV** (under "Storage & Databases" in newer dashboards)
   → **Create a namespace**.
2. Name it `infinity-scribe-short-links` → **Add**.

## 3. Give the app the store

1. **Workers & Pages** → your **infinity-scribe** project → **Settings** →
   **Bindings** (older dashboards: Settings → Functions → KV namespace bindings).
2. **Add** → **KV namespace**.
   Variable name: **`SHORT_LINKS`** (exactly like that, capitals and underscore).
   KV namespace: **infinity-scribe-short-links**. Save.
3. **Deployments** → on the latest deployment, **⋯** → **Retry deployment**, so
   it picks up the store.

**Check it:** open `https://infinity-scribe.pages.dev`, press **Save & Share**.
The link box should show `https://infinity-scribe.pages.dev/s/...` (8 letters and
numbers). Open that link in a new tab: your groove comes back.

## 4. Add scribe.infinitydrumming.com

1. Your **infinity-scribe** project → **Custom domains** → **Set up a custom
   domain** → `scribe.infinitydrumming.com` → **Continue**.
2. Then one of these, depending on where your DNS is (Namecheap → Domain List →
   Manage → **Nameservers**):
   - **Custom DNS ending in `ns.cloudflare.com`:** Cloudflare adds the record
     itself. Click **Activate domain**. Done.
   - **Namecheap BasicDNS:** Cloudflare shows a CNAME to add. In Namecheap →
     **Advanced DNS** → **Add new record**: Type **CNAME Record**, Host **`scribe`**,
     Value **`infinity-scribe.pages.dev`**, TTL Automatic. Save. Back in
     Cloudflare it turns **Active** within minutes (occasionally up to an hour).

**Check it:** open `https://scribe.infinitydrumming.com` and make a short link.
It should start `https://scribe.infinitydrumming.com/s/`.

## 5. Later, when you're happy: groove.infinitydrumming.com too

Tell Claude and it will walk you through it. In short: add
`groove.infinitydrumming.com` as a second custom domain in the same project and
point its DNS record at `infinity-scribe.pages.dev` instead of GitHub. Every old
link keeps working, because both addresses serve the same app. Until then GitHub
Pages keeps serving it as now.

## Good to know

- **Cost:** your Workers Paid plan covers it. Each short link is one small entry.
- **Privacy:** only the groove's link is stored, nothing about who made it.
- **Safety:** it only shortens Infinity Scribe groove links, so nobody can use it
  to disguise other links.
- **Same groove, same link:** shortening the same groove twice gives the same
  short link.
- **Old gscribe.com links** still go wherever they went before. On GitHub Pages
  (before this setup), Save & Share falls back to the old Groove Scribe short
  links, which rely on a Google service that is being shut down.
- The code is in `functions/api/shorten.js` (makes a short link) and
  `functions/s/[code].js` (opens one).
