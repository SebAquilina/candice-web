/* =========================================================================
   SITE CONFIG  —  edit this ONE file to wire the site to Stripe + analytics.
   Nothing else needs to change for a basic launch.
   (No secret keys live here — only public IDs and links. Safe to commit.)
   ========================================================================= */
window.SITE_CONFIG = {

  /* =======================================================================
     1) CHECKOUT  (Stripe)
     -----------------------------------------------------------------------
     Two supported modes — pick one with `checkoutMode`:

     A) "payment_link"  (simplest, no server)
        Create a Stripe Payment Link for the $27 product, set its
        "after payment" redirect to  https://YOURDOMAIN/thank-you.html
        Paste the link below. Works on any static host.

     B) "stripe_session"  (uses the included serverless function)
        Deploy netlify/functions/create-checkout.js (Netlify) OR
        api/create-checkout.js (Vercel) with your STRIPE_SECRET_KEY set as
        an env var. Buttons will POST to `sessionEndpoint`, get a Stripe
        Checkout URL back, and redirect. Gives a clean cancel-url so we can
        measure checkout abandonment precisely.
     ======================================================================= */
  checkoutMode: "payment_link",            // "payment_link" | "stripe_session"
  paymentLinkUrl: "",                      // e.g. "https://buy.stripe.com/xxxxxxxx"
  sessionEndpoint: "/.netlify/functions/create-checkout", // Vercel: "/api/create-checkout"

  price:    27,
  currency: "USD",

  /* =======================================================================
     2) LAUNCH COUNTDOWN  (urgency timer in the top bar + exit popup)
     ======================================================================= */
  launchEndsISO: "2026-06-30T23:59:59",
  rollForwardDays: 7,        // auto-roll so it never shows 00:00:00 (0 = let it expire)

  /* =======================================================================
     3) ANALYTICS  (set the IDs you have; leave blank to disable a provider)
     -----------------------------------------------------------------------
     What you asked for, and which provider answers it:
       • visitors / pageviews ........ all
       • country of visitor .......... GA4, Plausible, PostHog
       • time on site ................ GA4, Plausible, PostHog
       • WHERE people left (scroll/exit + watch a recording) .... Clarity, PostHog
       • left at checkout (begin_checkout -> purchase funnel) ... GA4, Plausible, PostHog
     Recommended combo: GA4 (or Plausible) for the funnel numbers
     + Microsoft Clarity (free) to literally watch where people drop.
     ======================================================================= */
  analytics: {
    ga4:       { measurementId: "" },   // "G-XXXXXXXXXX"
    plausible: { domain: "" },          // "the3dollarcandle.com"
    posthog:   { key: "", host: "https://us.i.posthog.com" }, // "phc_xxx"
    clarity:   { id: "" },              // "abcdefghij"
    debug: false                        // true = also console.log every event
  },

  /* =======================================================================
     4) SOCIAL / CHANNEL LINKS  (blank = link hidden automatically)
     ======================================================================= */
  social: {
    youtube:   "",   // "https://youtube.com/@candicecandles"
    instagram: "",   // "https://instagram.com/candicecandles"
    tiktok:    ""
  },

  /* =======================================================================
     5) EXIT-INTENT POPUP
     ======================================================================= */
  exitIntent: {
    enabled: true,
    suppressHours: 24   // don't re-show to the same visitor for N hours
  }
};
