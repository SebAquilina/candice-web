/* =========================================================================
   Analytics layer for The $3 Luxury Candle
   - Loads only the providers you configured in js/config.js
   - Exposes window.track(event, props) that fans out to all of them
   - Auto-tracks: pageview, scroll depth (where people leave), engagement
     time (how long they stayed), and the checkout funnel
     (begin_checkout -> purchase / checkout_cancelled).
   No cookies of our own; providers manage their own per their policies.
   ========================================================================= */
(function () {
  "use strict";
  var CFG = (window.SITE_CONFIG && window.SITE_CONFIG.analytics) || {};
  var price = (window.SITE_CONFIG && window.SITE_CONFIG.price) || 27;
  var currency = (window.SITE_CONFIG && window.SITE_CONFIG.currency) || "USD";
  var DEBUG = !!CFG.debug;

  function log() { if (DEBUG && window.console) console.log.apply(console, ["[analytics]"].concat([].slice.call(arguments))); }
  function loadScript(src, attrs) {
    var s = document.createElement("script");
    s.async = true; s.src = src;
    if (attrs) Object.keys(attrs).forEach(function (k) { s.setAttribute(k, attrs[k]); });
    document.head.appendChild(s);
    return s;
  }

  /* ---------------- provider bootstrap ---------------- */

  // Google Analytics 4
  var ga4 = (CFG.ga4 && CFG.ga4.measurementId || "").trim();
  if (ga4) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", ga4, { send_page_view: true });
    loadScript("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ga4));
    log("GA4 enabled", ga4);
  }

  // Plausible (privacy-friendly; supports custom events as "goals")
  var plausibleDomain = (CFG.plausible && CFG.plausible.domain || "").trim();
  if (plausibleDomain) {
    window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments); };
    var ps = loadScript("https://plausible.io/js/script.tagged-events.js");
    ps.setAttribute("data-domain", plausibleDomain);
    log("Plausible enabled", plausibleDomain);
  }

  // PostHog (funnels + session replay = watch where people drop)
  var phKey = (CFG.posthog && CFG.posthog.key || "").trim();
  var phHost = (CFG.posthog && CFG.posthog.host) || "https://us.i.posthog.com";
  if (phKey) {
    !function (t, e) { var o, n, p, r; e.__SV || (window.posthog = e, e._i = [], e.init = function (i, s, a) { function g(t, e) { var o = e.split("."); 2 == o.length && (t = t[o[0]], e = o[1]), t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; } (p = t.createElement("script")).type = "text/javascript", p.async = !0, p.src = s.api_host + "/static/array.js", (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(p, r); var u = e; for (void 0 !== a ? u = e[a] = [] : a = "posthog", u.people = u.people || [], u.toString = function (t) { var e = "posthog"; return "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e; }, u.people.toString = function () { return u.toString(1) + ".people (stub)"; }, o = "capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "), n = 0; n < o.length; n++) g(u, o[n]); e._i.push([i, s, a]); }, e.__SV = 1); }(document, window.posthog || []);
    window.posthog.init(phKey, { api_host: phHost, capture_pageview: true, capture_pageleave: true });
    log("PostHog enabled");
  }

  // Microsoft Clarity (free heatmaps + session recordings)
  var clarityId = (CFG.clarity && CFG.clarity.id || "").trim();
  if (clarityId) {
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", clarityId);
    log("Clarity enabled");
  }

  /* ---------------- unified event dispatch ---------------- */
  window.track = function (event, props) {
    props = props || {};
    log(event, props);
    try { if (ga4 && window.gtag) window.gtag("event", event, props); } catch (e) {}
    try { if (plausibleDomain && window.plausible) window.plausible(event, { props: props }); } catch (e) {}
    try { if (phKey && window.posthog) window.posthog.capture(event, props); } catch (e) {}
    try { if (clarityId && window.clarity) window.clarity("event", event); } catch (e) {}
  };

  /* ---------------- scroll depth = "where they left" ---------------- */
  (function scrollDepth() {
    var marks = [25, 50, 75, 90, 100];
    var hit = {};
    function check() {
      var doc = document.documentElement;
      var scrolled = (window.scrollY || doc.scrollTop) + window.innerHeight;
      var pct = Math.min(100, Math.round((scrolled / doc.scrollHeight) * 100));
      marks.forEach(function (m) {
        if (pct >= m && !hit[m]) { hit[m] = true; window.track("scroll_depth", { percent: m }); }
      });
    }
    var t;
    window.addEventListener("scroll", function () {
      clearTimeout(t); t = setTimeout(check, 200);
    }, { passive: true });
    check();
  })();

  /* ---------------- engagement time = "how long they stayed" ---------------- */
  (function engagement() {
    var start = Date.now();
    var active = 0, last = start, isActive = true;
    function tick() { if (isActive) active += Date.now() - last; last = Date.now(); }
    ["mousemove", "keydown", "scroll", "touchstart", "click"].forEach(function (ev) {
      window.addEventListener(ev, function () { isActive = true; tick(); }, { passive: true });
    });
    document.addEventListener("visibilitychange", function () {
      tick(); isActive = !document.hidden;
    });
    function send() {
      tick();
      var totalSec = Math.round((Date.now() - start) / 1000);
      var activeSec = Math.round(active / 1000);
      window.track("time_on_page", { total_seconds: totalSec, engaged_seconds: activeSec, page: location.pathname });
    }
    // send when leaving the page
    window.addEventListener("pagehide", send);
    document.addEventListener("visibilitychange", function () { if (document.hidden) send(); });
  })();

  /* ---------------- funnel: purchase / cancel on landing ---------------- */
  (function funnelOnLoad() {
    // Thank-you page = a completed purchase
    if (/thank-?you/i.test(location.pathname)) {
      var oncePurchase = "c3lc_purchase_" + (location.search || "");
      try {
        if (!sessionStorage.getItem(oncePurchase)) {
          sessionStorage.setItem(oncePurchase, "1");
          window.track("purchase", { value: price, currency: currency, transaction_id: getParam("session_id") || getParam("order") || "" });
        }
      } catch (e) {
        window.track("purchase", { value: price, currency: currency });
      }
    }
    // Returned with ?checkout=cancelled  → measured abandonment
    if (getParam("checkout") === "cancelled") {
      window.track("checkout_cancelled", { value: price, currency: currency });
    }
  })();

  function getParam(name) {
    try { return new URLSearchParams(location.search).get(name); } catch (e) { return null; }
  }
})();
