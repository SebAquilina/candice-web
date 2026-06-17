# The $3 Luxury Candle — sales site

A fast, conversion-optimized landing site for Candice's ebook **The $3 Luxury Candle**
(*How to Make Clean, Non-Toxic Soy and Beeswax Candles for a Fraction of Retail Cost*).

Pure static **HTML / CSS / vanilla JS** — no build step, hosts anywhere. Optional
serverless function for Stripe Checkout. Built-in analytics layer (traffic, geography,
time-on-site, scroll/exit, and the checkout funnel).

---

## ⚡ Quick start (preview locally)

```bash
# from the project root
python3 -m http.server 8080
# open http://localhost:8080
```

Everything works out of the box in "demo mode": buy buttons scroll to the order
section, the sample PDF downloads on the thank-you page, and analytics stays off
until you add IDs.

---

## 🔧 The one file you edit: `js/config.js`

Almost all setup happens in **`js/config.js`** — no other code changes needed for launch.
It holds **public values only** (links + public IDs), so it's safe to commit. Secret
keys live in environment variables (see Stripe below).

It controls: the Stripe checkout link/mode, the launch countdown, analytics provider IDs,
social links, and the exit-intent popup.

---

## 💳 Stripe checkout

Pick **one** mode in `config.js → checkoutMode`:

### Mode A — `payment_link` (simplest, no server) ✅ recommended to launch
1. In Stripe → **Payment Links**, create a link for a $27 one-time product.
2. Set its **after-payment redirect** to `https://YOURDOMAIN/thank-you.html`.
3. Paste the link into `config.js → paymentLinkUrl`.

Works on any static host. Stripe handles cards, Apple/Google Pay, receipts, and tax.

### Mode B — `stripe_session` (fully integrated, gives precise abandonment tracking)
Uses the included serverless function (`netlify/functions/create-checkout.js` for
Netlify, or `api/create-checkout.js` for Vercel).

1. `npm install` (installs the `stripe` dependency).
2. Set env vars in your host's dashboard (see `.env.example`):
   - `STRIPE_SECRET_KEY` (required)
   - `STRIPE_PRICE_ID` (optional — otherwise it charges an inline $27)
   - `SITE_URL` (optional)
3. In `config.js`: set `checkoutMode: "stripe_session"` and point `sessionEndpoint`
   at `/.netlify/functions/create-checkout` (Netlify) or `/api/create-checkout` (Vercel).

The success URL is `/thank-you.html`; the cancel URL returns to `/?checkout=cancelled`,
which the analytics layer logs as a `checkout_cancelled` event.

> Keep the price consistent in three spots if you change it: `config.js → price`, the
> visible `$27`/`$47` copy in `index.html`, and the function's `unit_amount` (2700).

---

## 📈 Analytics — what you asked for

Set any provider's ID in `config.js → analytics` (leave blank to disable it). The site
emits a unified set of events to whatever you enable:

| You wanted to know…                        | Event / source                         | Best provider(s)          |
|--------------------------------------------|----------------------------------------|---------------------------|
| How many people visited                    | automatic pageviews                    | any                       |
| What country they're from                  | built into the provider                | GA4, Plausible, PostHog   |
| How long they spent on the site            | `time_on_page` (total + engaged secs)  | GA4, Plausible, PostHog   |
| **Where they left** (drop-off point)       | `scroll_depth` (25/50/75/90/100%) + recordings | Clarity, PostHog  |
| **Whether they left at checkout**          | funnel: `begin_checkout` → `purchase` / `checkout_cancelled` | GA4, Plausible, PostHog |
| Downloads after purchase                   | `download`                             | any                       |

**Recommended combo:** **GA4 _or_ Plausible** for the funnel numbers, **plus Microsoft
Clarity** (free) so you can literally *watch session recordings* of where people drop.
PostHog is a great single-tool alternative (funnels + replay in one).

To get IDs:
- **GA4:** Google Analytics → Admin → Data Streams → `G-XXXXXXXXXX`. Mark `begin_checkout`
  and `purchase` as conversions; build a funnel exploration.
- **Plausible:** add the site, use the domain; set `begin_checkout`, `purchase`,
  `checkout_cancelled` as Goals → funnel.
- **Microsoft Clarity:** create a project → copy the project ID.
- **PostHog:** project API key (`phc_...`) + host.

Set `analytics.debug: true` to see every event in the browser console while testing.

---

## 📄 Delivering the PDF (the product)

A **sample/placeholder PDF** is included so the whole purchase → download flow is testable
today:

- `downloads/the-3-dollar-luxury-candle.pdf` — wired to the "Download the Book" button
- `downloads/bonuses.zip` — wired to the "Download the bonuses" button
- regenerate them any time with `npm run sample-pdf` (`tools/make_sample_pdf.py`)

**Before launch**, choose one:
1. **Recommended — gated delivery:** let Stripe/your store email the real file (Stripe can
   send it via a post-payment automation, or use Gumroad/Lemon Squeezy/Payhip), and point
   the thank-you buttons at that link. This stops people sharing a public file URL.
2. **Quick swap:** replace the two files in `downloads/` with the real exports. Simplest,
   but the URLs are public/guessable — fine for a soft launch, not ideal long-term.

---

## 🖼️ Images

The hero book cover and the About photo use on-brand **SVG placeholders** that render
immediately. The HTML already references the real filenames and falls back automatically:

- Drop the real cover in as **`assets/book-cover.png`** → it replaces the placeholder, no code change.
- Drop Candice's photo in as **`assets/candice.jpg`** → same.
- Replace `assets/og-image.svg` with a 1200×630 PNG for nicer social-share previews.

(The two source images provided — the book cover and the workshop photo — go here.)

---

## 🚀 Deploy

Static site; deploy anywhere. The repo includes `netlify.toml`, `vercel.json`, and
`_redirects`.

- **Netlify:** connect the repo (publish dir `.`, no build command), or drag-and-drop the
  folder. Serverless function auto-detected in `netlify/functions/`.
- **Vercel:** import the repo; `api/create-checkout.js` becomes a function automatically.
- **Cloudflare Pages / GitHub Pages:** works as-is for static + Payment Link mode (no
  serverless function on GH Pages — use `payment_link` there).

After deploying, set the real domain in the canonical/OG/sitemap URLs (search the repo for
`the3dollarcandle.com`) and add your analytics + Stripe values to `config.js` / env vars.

---

## 📁 Structure

```
index.html              # the landing/sales page (the funnel)
disclaimer.html         # fire-safety + educational disclaimer (liability)
refund.html             # 30-day guarantee
terms.html              # terms of service (template)
privacy.html            # privacy policy (template)
thank-you.html          # post-purchase download/delivery page
404.html
css/styles.css          # full design system (warm candle palette)
js/config.js            # ← edit me: Stripe, analytics, links
js/analytics.js         # provider loader + unified track() + funnel/scroll/time
js/main.js              # nav, countdown, FAQ, exit-intent, checkout wiring
assets/                 # SVG placeholders + favicon + OG image
downloads/              # SAMPLE pdf + bonuses zip (replace before launch)
netlify/functions/      # Stripe Checkout (Netlify)
api/                    # Stripe Checkout (Vercel)
tools/make_sample_pdf.py
```

## ⚠️ Notes
- The legal pages (terms/privacy) are **templates** — have a professional review them.
- Candle making involves open flame; the disclaimer is intentionally prominent and linked.
- The `claude-*` model identifier and internal notes are kept out of all shipped files.
