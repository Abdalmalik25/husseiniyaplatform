/**
 * ALHUSAINIA — SyncJav.js (website integration bridge)
 * =====================================================
 * Lightweight helper to link your website with the ALHUSAINIA storefront
 * and sync the shopping cart in real time.
 *
 * USAGE (add before </body>):
 *   <script src="/SyncJav.js"></script>
 *   <script>
 *     SyncJav.init({
 *       storeUrl: "https://your-platform.vercel.app/store" // public store address
 *     });
 *   </script>
 *
 * FEATURES:
 *   - SyncJav.openStore()        -> open the full storefront in a new tab
 *   - SyncJav.embed(selector)    -> load the storefront inside an element (iframe)
 *   - SyncJav.fetchCatalog()     -> read products/categories from the platform API
 *   - SyncJav.sync(cart)         -> persist the visitor's cart (localStorage)
 *   - SyncJav.getSyncCart()      -> read the visitor's synced cart
 *   - SyncJav.placeOrder(payload)-> send an order directly to the platform API
 *   - auto: any element with [data-store="open"] opens the storefront on click
 *
 * API (CORS-enabled public endpoints):
 *   GET  {base}/api/web/catalog         -> { ok, items, categories }
 *   POST {base}/api/web/place-order     -> { ok, orderId, orderNumber }
 */
(function (global) {
  "use strict";

  var CONFIG = { storeUrl: "/store" };

  function apiBase() {
    return CONFIG.storeUrl.split("/store")[0];
  }

  function init(options) {
    if (options) {
      if (options.storeUrl) CONFIG.storeUrl = options.storeUrl;
    }
    document.querySelectorAll("[data-store=open]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        openStore();
      });
    });
    global.SyncJav = API;
    return API;
  }

  function openStore() {
    window.open(CONFIG.storeUrl, "_blank", "noopener");
  }

  function embed(selector, height) {
    var el = typeof selector === "string" ? document.querySelector(selector) : selector;
    if (!el) return null;
    var frame = document.createElement("iframe");
    frame.src = CONFIG.storeUrl;
    frame.setAttribute("style", "width:100%;height:" + (height || 600) + "px;border:0;border-radius:12px;");
    frame.setAttribute("allow", "geolocation");
    el.appendChild(frame);
    return frame;
  }

  /** Fetch the live catalog (products + categories) from the platform. */
  function fetchCatalog(params) {
    var q = params || {};
    var url = apiBase() + "/api/web/catalog";
    var sep = "?";
    if (q.search) { url += sep + "search=" + encodeURIComponent(q.search); sep = "&"; }
    if (q.category) { url += sep + "category=" + encodeURIComponent(q.category); sep = "&"; }
    return fetch(url).then(function (r) { return r.json(); });
  }

  function sync(cart) {
    try {
      localStorage.setItem("alhusainia_cart", JSON.stringify(cart || []));
      return true;
    } catch (e) { return false; }
  }

  function getSyncCart() {
    try { return JSON.parse(localStorage.getItem("alhusainia_cart") || "[]"); }
    catch (e) { return []; }
  }

  /**
   * Send an order straight to the platform API (no login required).
   * payload: { customerName, customerPhone?, deliveryAddress?, notes?, items: [{productId, quantity}] }
   * Returns a Promise<{ ok, orderId?, orderNumber?, error? }>
   */
  function placeOrder(payload) {
    return fetch(apiBase() + "/api/web/place-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); });
  }

  var API = { init: init, openStore: openStore, embed: embed, fetchCatalog: fetchCatalog, sync: sync, getSyncCart: getSyncCart, placeOrder: placeOrder };
  global.SyncJav = API;
})(window);