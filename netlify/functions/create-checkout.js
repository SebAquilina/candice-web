/* =========================================================================
   Stripe Checkout Session — Netlify Function
   Used when js/config.js  checkoutMode = "stripe_session".
   Requires env vars (set in Netlify dashboard, NEVER committed):
     STRIPE_SECRET_KEY   sk_live_... (or sk_test_...)
     STRIPE_PRICE_ID     price_...   (optional; falls back to inline $27)
     SITE_URL            https://the3dollarcandle.com  (optional)
   Deps:  npm i stripe   (see package.json)
   ========================================================================= */
const Stripe = require("stripe");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return { statusCode: 500, body: JSON.stringify({ error: "STRIPE_SECRET_KEY not set" }) };
  }
  const stripe = Stripe(key);

  let origin = process.env.SITE_URL;
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    origin = origin || body.origin;
  } catch (e) { /* ignore */ }
  origin = origin || (event.headers && (event.headers.origin || ("https://" + event.headers.host))) || "";

  const priceId = process.env.STRIPE_PRICE_ID;
  const line_items = priceId
    ? [{ price: priceId, quantity: 1 }]
    : [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 2700, // $27.00 — keep in sync with config.price
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
      // ?checkout=cancelled lets the analytics layer record abandonment
      success_url: origin + "/thank-you.html?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: origin + "/?checkout=cancelled#order",
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      // collect email so you can deliver the PDF / send the receipt
      customer_creation: "always"
    });
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
