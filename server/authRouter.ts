/**
 * Auth Router — Enterprise-grade authentication endpoints
 * Uses the enhanced auth service for registration, login, password reset, email verification, MFA
 */

import { timingSafeEqual } from "crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc } from "drizzle-orm";
import {
  publicProcedure,
  tenantProcedure,
  protectedProcedure,
  router,
} from "./_core/trpc";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME, ONE_MONTH_MS } from "../shared/const";
import { sdk } from "./_core/sdk";
import * as authService from "./services/authService";
import { getDb, upsertUser } from "./db";
import { requireTenantId } from "./_core/tenant";
import { verifyToken } from "./_core/totp";
import { getClientIp, geolocate, parseDevice } from "./_core/geo";
import {
  provisionGenericTenant,
  seedDefaultAccountsForTenant,
  defaultCityForCountry,
} from "./routers";
import {
  activityLogs,
  users,
  loginAttempts,
  tenants,
  branches,
} from "../drizzle/schema";

export const authRouter = router({
  // Get current authenticated user
  me: publicProcedure.query(({ ctx }) => ctx.user),

  // Logout - clear session cookie
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),

  // Owner login (local admin)
  ownerLogin: publicProcedure
    .input(z.object({ password: z.string().min(1).max(256) }))
    .mutation(async ({ ctx, input }) => {
      const expected = process.env.OWNER_PASSWORD;
      if (!expected) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "تسجيل دخول المالك غير مُهيأ",
        });
      }
      const a = Buffer.from(input.password);
      const b = Buffer.from(expected);
      const valid = a.length === b.length && timingSafeEqual(a, b);
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "كلمة المرور غير صحيحة",
        });
      }

      await upsertUser({
        openId: process.env.OWNER_OPEN_ID!,
        name: "Owner",
        loginMethod: "owner",
        lastSignedIn: new Date(),
      });

      const token = await sdk.createSessionToken(process.env.OWNER_OPEN_ID!, {
        name: "Owner",
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, {
        ...cookieOptions,
        maxAge: ONE_MONTH_MS,
      });

      return { success: true } as const;
    }),
  updateProfile: tenantProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email().optional().or(z.literal("")),
        themePreference: z.string(),
        emailNotifications: z.boolean(),
        whatsappNotifications: z.boolean(),
        compactMode: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .update(users)
        .set({
          name: input.name,
          email: input.email ? input.email : null,
          themePreference: input.themePreference,
          emailNotifications: input.emailNotifications,
          whatsappNotifications: input.whatsappNotifications,
          compactMode: input.compactMode,
        })
        .where(eq(users.id, ctx.user.id));

      await db.insert(activityLogs).values({
        userId: ctx.user.id,
        userName: input.name,
        action: "تحديث الملف الشخصي",
        details: `تم تحديث تفضيلات العرض والملف الشخصي بواسطة ${input.name}`,
      });

      return { success: true };
    }),

  getActivityLogs: tenantProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const tid = requireTenantId(ctx);
    const logs = await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.tenantId, tid))
      .orderBy(desc(activityLogs.createdAt))
      .limit(25);
    return logs;
  }),

  // Local subscriber login (username + password)
  login: publicProcedure
    .input(
      z.object({
        username: z.string().min(1).max(120),
        password: z.string().min(1).max(200),
        rememberMe: z.boolean().optional(),
        mfaToken: z.string().min(6).max(6).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return authService.loginUser(input, ctx);
    }),

  // Verify MFA token
  verifyMfa: publicProcedure
    .input(
      z.object({
        username: z.string().min(1),
        token: z.string().min(6).max(6),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "قاعدة البيانات غير متاحة",
        });

      const uname = input.username.trim();
      const user = (
        await db.select().from(users).where(eq(users.username, uname)).limit(1)
      )[0];

      if (!user || !(user as any).mfaSecret)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "المستخدم غير موجود",
        });

      const { verifyToken } = await import("./_core/totp");
      const ok = verifyToken((user as any).mfaSecret, input.token);
      if (!ok)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "رمز التحقق غير صحيح",
        });

      const { getClientIp, geolocate, parseDevice } = await import(
        "./_core/geo"
      );
      const ip = getClientIp(ctx.req);
      const geo = await geolocate(ip);
      const ua = ctx.req.headers["user-agent"];
      const device = (await import("./_core/geo")).parseDevice(ua);

      await db.insert(loginAttempts).values({
        username: uname,
        success: true,
        ip: ip || null,
        userAgent: ua || null,
        device,
        country: geo.country,
        city: geo.city,
        lat: geo.lat != null ? String(geo.lat) : null,
        lng: geo.lng != null ? String(geo.lng) : null,
        userId: user.id,
        tenantId: user.tenantId,
      });

      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || uname,
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_MONTH_MS,
      });

      return {
        ok: true as const,
        user: {
          id: user.id,
          name: user.name,
          tenantId: user.tenantId,
          role: user.role,
        },
      };
    }),

  setupMfa: tenantProcedure.mutation(async ({ ctx }) => {
    return authService.setupMfa(ctx);
  }),

  verifySetupMfa: tenantProcedure
    .input(z.object({ token: z.string().min(6).max(6) }))
    .mutation(async ({ input, ctx }) => {
      return authService.verifySetupMfa(ctx, input);
    }),

  disableMfa: tenantProcedure.mutation(async ({ ctx }) => {
    return authService.disableMfa(ctx);
  }),

  // Self-serve signup: creates a new organisation + admin user
  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(2).max(120),
        username: z
          .string()
          .min(3)
          .max(120)
          .regex(/^[a-zA-Z0-9_.-]+$/, "اسم المستخدم: حروف وأرقام و . _ - فقط"),
        password: z.string().min(8).max(200),
        country: z.string().max(100).optional(),
        currency: z.string().max(50).optional(),
        email: z.string().email().optional().or(z.literal("")),
        acceptTerms: z.literal(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return authService.registerUser(input, ctx);
    }),

  // Forgot password - request reset
  forgotPassword: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      return authService.requestPasswordReset(input);
    }),

  // Reset password with token
  resetPassword: publicProcedure
    .input(
      z
        .object({
          token: z.string().min(32).max(128),
          password: z.string().min(8).max(200),
          confirmPassword: z.string().min(8).max(200),
        })
        .refine(data => data.password === data.confirmPassword, {
          message: "كلمات المرور غير متطابقة",
          path: ["confirmPassword"],
        })
    )
    .mutation(async ({ input }) => {
      return authService.resetPassword(input);
    }),

  // Verify email with token
  verifyEmail: publicProcedure
    .input(z.object({ token: z.string().min(32).max(128) }))
    .mutation(async ({ input }) => {
      return authService.verifyEmail(input);
    }),

  // Resend verification email
  resendVerificationEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      return authService.resendVerificationEmail(input);
    }),

  // Get login history
  getLoginHistory: tenantProcedure.query(async ({ ctx }) => {
    return authService.getLoginHistory(ctx);
  }),

  // Revoke all sessions
  revokeAllSessions: tenantProcedure.mutation(async ({ ctx }) => {
    return authService.revokeAllSessions(ctx);
  }),

  // Onboard existing user (create tenant for OAuth users)
  onboard: protectedProcedure
    .input(
      z.object({
        institutionName: z.string().min(1),
        currency: z.string().optional(),
        country: z.string().optional(),
        managerName: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (ctx.user.tenantId) {
        throw new Error("المستخدم مسجل بالفعل في مؤسسة");
      }

      const tid = await provisionGenericTenant(db, {
        name: input.institutionName,
        code: `T-${Date.now()}`,
        country: input.country,
        currency: input.currency,
      });

      const [branch] = await db
        .insert(branches)
        .values({
          tenantId: tid,
          name: "الفرع الرئيسي",
          code: "HQ-01",
          city: defaultCityForCountry(input.country),
          isMain: true,
        })
        .returning();

      await db
        .update(users)
        .set({ tenantId: tid, role: "admin" })
        .where(eq(users.id, ctx.user.id));

      await seedDefaultAccountsForTenant(tid, {
        institutionName: input.institutionName,
        managerName: input.managerName,
        currency: input.currency,
      });

      return { tenantId: tid, branchId: branch.id };
    }),
});
