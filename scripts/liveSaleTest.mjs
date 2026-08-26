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
  }).then(async res => {
    const sc = res.headers.get("set-cookie");
    if (sc) cookie = sc.split(";")[0];
    return res;
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
  await client.auth.ownerLogin.mutate({ password: OWNER_PASSWORD });
  const tenants = await client.system.listTenants.query();
  const lib = tenants.find(t => t.code === "HUSSEINIYA_LIBRARY") || tenants[1];
  activeTenant = lib.id;
  let items = [];
  for (
    let off = 0;
    off < 2000 && items.filter(p => p.type === "service").length === 0;
    off += 100
  ) {
    const r = await client.products.list.query({ limit: 100, offset: off });
    items = r.items || [];
  }
  log(
    "scanned, services found:",
    items.filter(p => p.type === "service").length
  );
  let goods = items.find(p => p.type === "goods");
  if (goods && (goods.currentStock || 0) <= 0) {
    await client.products.setOpeningStock.mutate({
      productId: goods.id,
      quantity: 10,
      notes: "test",
    });
    goods = { ...goods, currentStock: 10 };
  }
  const service = items.find(p => p.type === "service");
  const saleItems = [];
  let total = 0;
  if (goods) {
    const up = parseFloat(goods.salePrice || "10") || 10;
    total += up;
    saleItems.push({
      productId: goods.id,
      productName: goods.name,
      quantity: 1,
      unitPrice: String(up),
      discount: "0",
    });
  }
  if (service) {
    const up = parseFloat(service.salePrice || "25") || 25;
    total += up;
    saleItems.push({
      productId: service.id,
      productName: service.name,
      quantity: 1,
      unitPrice: String(up),
      discount: "0",
    });
  }
  if (saleItems.length === 0) {
    log("no items to test");
    return;
  }
  const before = goods ? goods.currentStock : null;
  const sale = await client.sales.create.mutate({
    items: saleItems,
    paymentMethod: "card",
    paidAmount: String(total),
    discount: "0",
    taxRate: "15",
    country: "السعودية",
  });
  log("sale OK id:", sale?.id, "| items:", saleItems.length, "| total:", total);
  log("zatcaView:", JSON.stringify(sale?.zatcaView || null));
  log("globalCode:", sale?.globalCode || null);
  if (goods) {
    const after = await client.products.list.query({ limit: 100 });
    const g2 = (after.items || []).find(p => p.id === goods.id);
    log(
      "goods stock before/after:",
      before,
      "->",
      g2?.currentStock,
      "(must decrement by 1)"
    );
  }
  const daily = await client.sales.dailySummary.query({});
  log(
    "dailySummary invoices:",
    daily.invoiceCount,
    "totalSales:",
    daily.totalSales
  );
  log("DONE");
})().catch(e => {
  console.error(
    "ERR:",
    e?.message || e,
    "DATA:",
    JSON.stringify(e?.data || e?.cause || null).slice(0, 400)
  );
  process.exit(1);
});
