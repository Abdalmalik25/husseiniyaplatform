function requireEnv(name: string, value: string | undefined, minLength = 1): string {
  const v = value ?? "";
  if (process.env.NODE_ENV === "production" && v.length < minLength) {
    throw new Error(
      `[ENV] ${name} is missing or too short (need >=${minLength} chars) — refusing to start in production`
    );
  }
  return v;
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: requireEnv("JWT_SECRET", process.env.JWT_SECRET, 32),
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  ownerPassword: process.env.OWNER_PASSWORD ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  /** Master secret for encrypted backups (AES-256-GCM). Required in production. */
  backupEncryptionKey: requireEnv(
    "BACKUP_ENCRYPTION_KEY",
    process.env.BACKUP_ENCRYPTION_KEY,
    0
  ),
  /** Local directory for backup blobs when S3 is not configured. */
  backupDir: process.env.BACKUP_DIR ?? "",
};

// Fail-closed warnings for non-blocking but critical secrets
if (ENV.isProduction) {
  if (!ENV.databaseUrl) {
    console.warn("[ENV] DATABASE_URL is not set — health checks will report degraded");
  }
  if (!ENV.backupEncryptionKey || ENV.backupEncryptionKey.length < 16) {
    console.warn(
      "[ENV] BACKUP_ENCRYPTION_KEY is missing or <16 chars — encrypted backups are disabled (fail-closed)"
    );
  }
}
