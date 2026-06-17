/* =========================================================================
   Stripe Checkout Session — Vercel Serverless Function
   Used when js/config.js  checkoutMode = "stripe_session" and
   sessionEndpoint = "/api/create-checkout".
   Set env vars in the Vercel dashboard (never commit them):
     STRIPE_SECRET_KEY, STRIPE_PRICE_ID (optional), SITE_URL (optional)
   Deps:  npm i stripe   (see package.json)
   ========================================================================= */
const Stripe = require("stripe");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    res.status(500).json({ error: "STRIPE_SECRET_KEY not set" });
    return;
  }
  const stripe = Stripe(key);

  const origin =
    process.env.SITE_URL ||
    (req.body && req.body.origin) ||
    req.headers.origin ||
    ("https://" + req.headers.host);

  const priceId = process.env.STRIPE_PRICE_ID;
  const line_items = priceId
    ? [{ price: priceId, quantity: 1 }]
    : [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 2700, // $27.00
          product_data: {
            name: "The $3 Luxury Candle (ebook + bonuses)",
            description: "Clean, non-toxic soy & beeswax candle making — by Candice"
          }
        }
      }];

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: origin + "/thank-you.html?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: origin + "/?checkout=cancelled#order",
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      customer_creation: "always"
    });
    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
