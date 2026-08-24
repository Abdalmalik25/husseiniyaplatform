import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { createTRPCProxyClient, httpLink } = require("@trpc/client");
const superjson = require("superjson");

const BASE = "https://husseiniya-platform-coral.vercel.app";
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || "pQnrmT8NL3o0cKDtsy9S";

let cookie = "";
const fetchWithCookie = (url, init = {}) => {
  const headers = { ...(init.headers || {}) };
  if (cookie) headers["Cookie"] = cookie;
  return fetch(url, {
    ...init,
    headers,
    credentials: "include",
    signal: AbortSignal.timeout(120000),
  })
    .then(async (res) => {
      const sc = res.headers.get("set-cookie");
      if (sc) cookie = sc.split(";")[0];
      return res;
    })
    .catch((err) => {
      console.error("FETCH FAILED:", url, err?.message, err?.cause);
      throw err;
    });
};

let activeTenant = null;
const makeClient = () =>
  createTRPCProxyClient({
    links: [
      httpLink({
        url: BASE + "/api/trpc",
        transformer: superjson,
        fetch: fetchWithCookie,
        headers: () =>
          activeTenant != null ? { "x-tenant-id": String(activeTenant) } : {},
      }),
    ],
  });

const log = (...a) => console.log(...a);

(async () => {
  const client = makeClient();

  const login = await client.auth.ownerLogin.mutate({ password: OWNER_PASSWORD });
  log("1) ownerLogin ok:", !!login);

  // Apply schema migration (adds columns + tables + seeds accounts) for ALL tenants
  const mig = await client.system.migratePos.mutate();
  log("2) migratePos:", JSON.stringify(mig));

  const tenants = await client.system.listTenants.query();
  const lib = tenants.find((t) => t.code === "HUSSEINIYA_LIBRARY") || tenants[1];
  log("3) library tenant:", lib?.id, lib?.code);

  activeTenant = lib.id;

  // Settings now expose POS config
  const settings = await client.accounting.getSettings.query();
  log("4) settings has posConfig:", !!settings.posConfig, "| paymentMethods:", Array.isArray(settings.paymentMethods) ? settings.paymentMethods.length : "n/a");

  // Inventory summary (should now have new fields)
  const summary = await client.products.inventorySummary.query();
  log("5) inventorySummary:", JSON.stringify(summary));

  // Valuation
  const val = await client.products.valuation.query();
  log("6) valuation items:", val.items?.length, "| totalValue:", val.totalValue, "| totalRetail:", val.totalRetail);

  // Low stock
  const low = await client.products.lowStock.query();
  log("7) lowStock count:", low.length);

  // Warehouses (idempotent: reuse if exist)
  let whList = await client.warehouses.list.query();
  let wh = whList.find((w) => w.code === "WH1");
  let wh2 = whList.find((w) => w.code === "WH2");
  if (!wh) {
    const r = await client.warehouses.create.mutate({ code: "WH1", name: "المخزن الرئيسي", location: "صنعاء" });
    wh = r.warehouse;
  }
  if (!wh2) {
    const r = await client.warehouses.create.mutate({ code: "WH2", name: "مخزن فرعي", location: "عدن" });
    wh2 = r.warehouse;
  }
  log("8) warehouses:", wh?.id, wh2?.id);

  // Set opening stock on a product
  const prods = await client.products.list.query({ limit: 10 });
  const p = (prods.items || [])[0];
  if (p) {
    const adj = await client.products.setOpeningStock.mutate({ productId: p.id, quantity: 50, notes: "جرد افتتاحي" });
    log("9) setOpeningStock:", JSON.stringify(adj));
    const card = await client.products.stockCard.query({ productId: p.id });
    log("10) stockCard movements:", card.movements?.length, "| balance:", card.product?.currentStock);
  } else {
    log("9) no products to test opening stock");
  }

  if (p && wh && wh2) {
    try {
      const tr = await client.products.transferStock.mutate({
        productId: p.id,
        fromWarehouseId: wh.id,
        toWarehouseId: wh2.id,
        quantity: 5,
      });
      log("11) transferStock:", JSON.stringify(tr));
    } catch (e) {
      log("11) transferStock error:", String(e?.message || e).slice(0, 200));
    }
  }

  whList = await client.warehouses.list.query();
  log("12) warehouses:", whList.map((w) => w.code).join(","));

  log("\nINVENTORY DONE");
})().catch((e) => {
  console.error("SCRIPT ERROR:", e?.message || e, "CAUSE:", e?.cause);
  process.exit(1);
});
