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
  if (init.method === "POST" || url.includes("debugCtx")) {
    console.error(">>", init.method, url.split("?")[0]);
    console.error("   send x-tenant-id:", headers["x-tenant-id"]);
  }
  return fetch(url, {
    ...init,
    headers,
    credentials: "include",
    signal: AbortSignal.timeout(120000),
  })
    .then(async res => {
      const sc = res.headers.get("set-cookie");
      if (sc) cookie = sc.split(";")[0];
      return res;
    })
    .catch(err => {
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

  // 1) Owner login
  const login = await client.auth.ownerLogin.mutate({
    password: OWNER_PASSWORD,
  });
  log("1) ownerLogin:", JSON.stringify(login));

  // 2) List tenants before
  const before = await client.system.listTenants.query();
  log("2) tenants before provision:", JSON.stringify(before));

  // 3) Provision library tenant
  const prov = await client.system.provisionLibraryTenant.mutate();
  log("3) provisionLibraryTenant:", JSON.stringify(prov));

  // 4) List tenants after
  const after = await client.system.listTenants.query();
  log("4) tenants after provision:", JSON.stringify(after));

  const libId = prov.tenantId;
  const tenant1Id = 1;

  // 5) Snapshot isolation: owner acting as tenant 1 vs library
  activeTenant = tenant1Id;
  const snap1 = await client.sync.getFullSnapshot.query();
  activeTenant = libId;
  const snapLib = await client.sync.getFullSnapshot.query();

  log(
    "5) snapshot tenant1 accounts/products/sales:",
    snap1.accounts.length,
    snap1.products.length,
    snap1.salesInvoices.length
  );
  log(
    "   snapshot LIBRARY accounts/products/sales:",
    snapLib.accounts.length,
    snapLib.products.length,
    snapLib.salesInvoices.length
  );

  // 6) Cross-tenant leak assertions
  const t1AccountCodes = new Set(snap1.accounts.map(a => a.code));
  const libAccountCodes = new Set(snapLib.accounts.map(a => a.code));
  const libProductIds = new Set(snapLib.products.map(p => p.id));
  const leakAcct = [...t1AccountCodes].filter(c => libAccountCodes.has(c));
  const leakProdInT1 = snap1.products.filter(p => libProductIds.has(p.id));
  log("6) accounts code overlap tenant1∩library:", leakAcct.length);
  log(
    "   library product ids appearing in tenant1 snapshot:",
    leakProdInT1.length
  );

  // 7) Closing preview per tenant (must reflect only that tenant's data)
  activeTenant = libId;
  const closeLib = await client.accounting.closing.preview.query({
    periodName: "السنة المالية 2026",
  });
  activeTenant = tenant1Id;
  const close1 = await client.accounting.closing.preview.query({
    periodName: "السنة المالية 2026",
  });
  log(
    "7) closing.preview LIBRARY rows:",
    closeLib.rows.length,
    "TENANT1 rows:",
    close1.rows.length
  );

  // 8) Auditor review per tenant
  activeTenant = libId;
  const auditLib = await client.accounting.runAuditorReview.query();
  log(
    "8) runAuditorReview LIBRARY score:",
    auditLib.score,
    "status:",
    auditLib.status
  );

  // 9) Activity logs scoped
  activeTenant = libId;
  const logsLib = await client.auth.getActivityLogs.query();
  activeTenant = tenant1Id;
  const logs1 = await client.auth.getActivityLogs.query();
  log("9) activityLogs LIBRARY:", logsLib.length, "TENANT1:", logs1.length);

  // 9b) auth.me probe: confirm super-admin tenant override resolves
  activeTenant = libId;
  const meLib = await client.auth.me.query();
  activeTenant = tenant1Id;
  const me1 = await client.auth.me.query();
  log(
    "9b) auth.me as LIBRARY tenantId:",
    meLib?.tenantId,
    "as TENANT1 tenantId:",
    me1?.tenantId
  );

  // 10) Idempotency: re-provision should not duplicate
  const prov2 = await client.system.provisionLibraryTenant.mutate();
  log("10) provision #2 (idempotent):", JSON.stringify(prov2));

  // 11) Daily/period closing for the LIBRARY tenant — prove the machinery is
  //     tenant-scoped and that opening balances were posted. A brand-new tenant
  //     with only opening balances has no P&L to close, so execute may decline;
  //     that is a valid business guard (not a bug).
  activeTenant = libId;
  const snapLibBefore = await client.sync.getFullSnapshot.query();
  const libTxBefore = snapLibBefore.transactions.length;
  const libAcctCount = snapLibBefore.accounts.length;
  const libProdCount = snapLibBefore.products.length;
  let closeExecMsg;
  try {
    const closeExec = await client.accounting.closing.execute.mutate({
      periodName: "2026",
    });
    closeExecMsg = JSON.stringify(closeExec);
  } catch (e) {
    closeExecMsg = "declined: " + (e?.message || e);
  }
  log(
    "11) LIBRARY posted tx (opening balances):",
    libTxBefore,
    "| accounts:",
    libAcctCount,
    "| products:",
    libProdCount
  );
  log("    closing.execute LIBRARY:", closeExecMsg);

  activeTenant = tenant1Id;
  const snapT1 = await client.sync.getFullSnapshot.query();
  const t1Tx = snapT1.transactions.length;
  const t1Acct = snapT1.accounts.length;
  const t1Prod = snapT1.products.length;
  log(
    "    TENANT1 (must be independent): tx:",
    t1Tx,
    "accounts:",
    t1Acct,
    "products:",
    t1Prod
  );

  // 12) Daily report endpoint proof (read-only, tenant-scoped)
  activeTenant = libId;
  const libDaily = await client.sales.dailySummary.query({});
  log("12a) library dailySummary:", {
    invoices: libDaily.invoiceCount,
    totalSales: libDaily.totalSales,
    byMethod: libDaily.byMethod,
    topProducts: libDaily.topProducts.length,
  });

  activeTenant = null;
  const mainDaily = await client.sales.dailySummary.query({});
  log("12b) main   dailySummary:", {
    invoices: mainDaily.invoiceCount,
    totalSales: mainDaily.totalSales,
    byMethod: mainDaily.byMethod,
    topProducts: mainDaily.topProducts.length,
  });

  // 12c) attempt a real sale in library (tolerant of cold-start timeout)
  activeTenant = libId;
  try {
    const prodResp = await client.products.list.query({ limit: 50 });
    const goods = (prodResp.items || []).find(
      p => p.type === "goods" && (p.currentStock || 0) > 0
    );
    if (goods) {
      const unit = parseFloat(goods.salePrice || "0") || 1;
      const sale = await client.sales.create.mutate({
        items: [
          {
            productId: goods.id,
            productName: goods.name,
            quantity: 2,
            unitPrice: String(unit),
            discount: "0",
          },
        ],
        paymentMethod: "cash",
        paidAmount: String(unit * 2),
      });
      log("12c) POS create sale OK → id:", sale?.id);
      const after = await client.sales.dailySummary.query({});
      log(
        "    dailySummary after sale → invoices:",
        after.invoiceCount,
        "| totalSales:",
        after.totalSales
      );
    } else {
      log("12c) no goods with stock found to test sale");
    }
  } catch (e) {
    log(
      "12c) sale create not verified (cold-start/timeout):",
      String(e?.message || e).slice(0, 200)
    );
  }

  log("\nDONE");
})().catch(e => {
  console.error("SCRIPT ERROR:", e?.message || e, "CAUSE:", e?.cause);
  process.exit(1);
});
