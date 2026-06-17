/* =========================================================================
   The $3 Luxury Candle — interactions
   Plain vanilla JS. Reads window.SITE_CONFIG (js/config.js).
   ========================================================================= */
(function () {
  "use strict";
  var CFG = window.SITE_CONFIG || {};

  /* ---------- current year in footer ---------- */
  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- checkout (Stripe) ---------- */
  function fireBeginCheckout() {
    if (typeof window.track === "function") {
      window.track("begin_checkout", { value: CFG.price || 27, currency: CFG.currency || "USD" });
    }
  }

  function wireBuyButtons() {
    var mode = CFG.checkoutMode || "payment_link";
    var link = (CFG.paymentLinkUrl || "").trim();
    var endpoint = (CFG.sessionEndpoint || "").trim();

    document.querySelectorAll(".js-buy").forEach(function (el) {
      if (mode === "payment_link" && link) {
        // Stripe Payment Link — plain navigation, fire funnel event on click
        el.setAttribute("href", link);
        el.setAttribute("rel", "noopener");
        el.addEventListener("click", fireBeginCheckout);

      } else if (mode === "stripe_session" && endpoint) {
        // Serverless Checkout Session — POST, then redirect to Stripe
        el.setAttribute("href", "#");
        el.addEventListener("click", function (e) {
          e.preventDefault();
          fireBeginCheckout();
          var original = el.textContent;
          el.style.pointerEvents = "none";
          el.textContent = "Taking you to checkout…";
          fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ origin: location.origin })
          })
            .then(function (r) { return r.json(); })
            .then(function (data) {
              if (data && data.url) { window.location.href = data.url; }
              else { throw new Error("no url"); }
            })
            .catch(function () {
              el.style.pointerEvents = "";
              el.textContent = original;
              // graceful fallback: scroll to the order block
              var order = document.getElementById("order");
              if (order) order.scrollIntoView({ behavior: "smooth" });
              alert("Sorry — checkout is taking a moment. Please try again.");
            });
        });

      } else {
        // not configured yet → smooth-scroll to the order section so the page still demos
        el.setAttribute("href", "#order");
      }
    });
  }
  wireBuyButtons();

  /* ---------- social links from config ---------- */
  (function wireSocial() {
    var s = CFG.social || {};
    document.querySelectorAll("[data-social]").forEach(function (el) {
      var key = el.getAttribute("data-social");
      var href = (s[key] || "").trim();
      if (href) {
        el.setAttribute("href", href);
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener");
      } else {
        // hide unconfigured social links so we never ship dead "#" links
        el.style.display = "none";
      }
    });
  })();

  /* ---------- mobile nav ---------- */
  var toggle = document.getElementById("nav-toggle");
  var links = document.getElementById("nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- smooth scroll for in-page anchors ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll(".qa button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var qa = btn.closest(".qa");
      var answer = qa.querySelector(".a");
      var isOpen = qa.classList.toggle("open");
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      answer.style.maxHeight = isOpen ? answer.scrollHeight + "px" : null;
    });
  });

  /* ---------- countdown timers ---------- */
  function resolveDeadline() {
    var base = new Date(CFG.launchEndsISO || "");
    if (isNaN(base.getTime())) return null;
    var roll = (CFG.rollForwardDays || 0) * 86400000;
    var now = Date.now();
    if (roll > 0) {
      // keep rolling the deadline forward in whole increments until it's future
      while (base.getTime() <= now) base = new Date(base.getTime() + roll);
    }
    return base;
  }
  var deadline = resolveDeadline();
  var cdEls = document.querySelectorAll(".countdown");

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function renderCountdown() {
    if (!deadline || !cdEls.length) return;
    var diff = deadline.getTime() - Date.now();
    if (diff < 0) diff = 0;
    var d = Math.floor(diff / 86400000);
    var h = Math.floor((diff % 86400000) / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    var s = Math.floor((diff % 60000) / 1000);
    var html =
      (d > 0 ? unit(d, "days") : "") +
      unit(h, "hrs") + unit(m, "min") + unit(s, "sec");
    cdEls.forEach(function (el) { el.innerHTML = html; });
  }
  function unit(v, label) {
    return '<span class="unit"><b>' + pad(v) + "</b><span>" + label + "</span></span>";
  }
  if (deadline && cdEls.length) {
    renderCountdown();
    setInterval(renderCountdown, 1000);
  }

  /* ---------- exit-intent modal ---------- */
  (function exitIntent() {
    var cfg = CFG.exitIntent || {};
    if (!cfg.enabled) return;
    var modal = document.getElementById("exit-modal");
    if (!modal) return;

    var KEY = "c3lc_exit_seen";
    var suppressMs = (cfg.suppressHours || 24) * 3600000;

    function recentlySeen() {
      try {
        var t = parseInt(localStorage.getItem(KEY) || "0", 10);
        return t && (Date.now() - t) < suppressMs;
      } catch (e) { return false; }
    }
    function markSeen() {
      try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
    }
    function open() {
      if (recentlySeen()) return;
      modal.classList.add("show");
      markSeen();
      document.removeEventListener("mouseout", onMouseOut);
    }
    function close() { modal.classList.remove("show"); }

    function onMouseOut(e) {
      // fired when the cursor leaves toward the top of the viewport (tab/close)
      if (!e.relatedTarget && e.clientY <= 0) open();
    }

    // desktop: leave-intent
    if (!recentlySeen()) {
      document.addEventListener("mouseout", onMouseOut);
      // mobile fallback: show after sustained scroll + delay
      var shown = false;
      window.addEventListener("scroll", function () {
        if (shown) return;
        if (window.scrollY > document.body.scrollHeight * 0.45) {
          shown = true;
          setTimeout(function () { if (!recentlySeen()) open(); }, 1200);
        }
      }, { passive: true });
    }

    var x = document.getElementById("exit-close");
    var skip = document.getElementById("exit-skip");
    if (x) x.addEventListener("click", close);
    if (skip) skip.addEventListener("click", close);
    modal.addEventListener("click", function (e) { if (e.target === modal) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  })();

})();
