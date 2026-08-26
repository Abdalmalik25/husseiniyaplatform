import { config } from "dotenv";
config();

import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not found in .env");
  process.exit(1);
}

const host = url.split("@")[1]?.split("/")[0];
console.log("Connecting to:", host);

const sql = neon(url);

try {
  // Discover columns first
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`;
  console.log("\n=== USERS TABLE COLUMNS ===");
  console.log(cols.map(c => c.column_name).join(", "));

  const tcols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'tenants' ORDER BY ordinal_position`;
  console.log("\n=== TENANTS TABLE COLUMNS ===");
  console.log(tcols.map(c => c.column_name).join(", "));

  // Use SELECT * to avoid column name issues
  const usersRaw = await sql`SELECT * FROM users ORDER BY id`;
  console.log("\n=== ALL USERS / SUBSCRIBERS (" + usersRaw.length + ") ===");
  console.log(JSON.stringify(usersRaw, null, 2));

  // Local subscribers — access via dynamic keys
  const localUsers = usersRaw.filter((u) => {
    const lm = u["loginMethod"] || u["loginmethod"] || u["login_method"];
    const un = u["username"];
    return lm === "local" && un;
  });
  console.log("\n=== LOCAL SUBSCRIBERS (username + password hash) ===");
  console.log(
    JSON.stringify(
      localUsers.map((u) => ({
        id: u["id"],
        username: u["username"],
        name: u["name"],
        email: u["email"],
        role: u["role"],
        // كلمة المرور مشفّرة — لا يمكن استرجاعها
        passwordHash: u["passwordHash"] || u["passwordhash"],
        hashAlgorithm: "scrypt$<salt>$<hash>",
        loginMethod: u["loginMethod"] || u["loginmethod"],
        lastSignedIn: u["lastSignedIn"] || u["last_signed_in"],
        tenantId: u["tenantId"] || u["tenant_id"],
        mfaEnabled: u["mfaEnabled"] || u["mfa_enabled"],
      })),
      null,
      2
    )
  );

  // Tenants
  const tenantsRaw = await sql`SELECT * FROM tenants ORDER BY id`;
  console.log("\n=== TENANTS / ORGANIZATIONS ===");
  console.log(JSON.stringify(tenantsRaw, null, 2));
} catch (e) {
  console.error("Error:", e.message || e);
  process.exit(1);
}
