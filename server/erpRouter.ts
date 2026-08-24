import { z } from "zod";
import { getDb } from "./db";
import { runProactiveAlerts } from "./automation";
import { tenantProcedure, adminProcedure, router } from "./_core/trpc";
import {
  departments,
  employees,
  attendance,
  payrollRuns,
  payrollItems,
  projects,
  projectTasks,
  projectMembers,
  procurements,
  procurementApprovals,
  tickets,
  qualityInspections,
  accounts,
  journalEntries,
  transactions,
  branches,
  activityLogs,
  products,
  salesInvoices,
  purchaseInvoices,
  notifications,
} from "../drizzle/schema";
import { eq, desc, asc, and, sql, ilike, gte, lte, isNull, ne } from "drizzle-orm";
import { createNotification } from "./notifications";

async function dbOrThrow() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

async function nextSequence(db: any, table: any, tenantId: number) {
  const [row] = await db
    .select({ c: sql`count(*)` })
    .from(table)
    .where(eq(table.tenantId, tenantId));
  return Number(row?.c ?? 0) + 1;
}

// ═══════════════════════════════════════════════════════════════════════
//  Payroll → Ledger integration
//  Every payroll run posts a balanced journal entry: Salary Expense (debit)
//  vs Accrued Payroll Payable (credit) — grouped under one journal entry
//  for full source traceability (the integrated backbone).
// ═══════════════════════════════════════════════════════════════════════

async function postPayrollGlEntries(
  db: any,
  opts: {
    tenantId: number;
    userId: number | null;
    periodName: string;
    totalNet: number;
  }
): Promise<void> {
  const findAccount = async (code: string) => {
    const rows = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.code, code), eq(accounts.tenantId, opts.tenantId)))
      .limit(1);
    return rows[0];
  };
  const expenseAcc = await findAccount("7000"); // Salary Expense
  const payableAcc = await findAccount("2010"); // Accrued Payroll / Payables
  if (!expenseAcc || !payableAcc) return; // chart not seeded — skip safely

  // Default branch dimension (tenant's main branch) for full location traceability.
  const bRows = await db
    .select()
    .from(branches)
    .where(eq(branches.tenantId, opts.tenantId))
    .orderBy(desc(branches.isMain))
    .limit(1);
  const effectiveBranchId = bRows[0]?.id ?? null;

  const amt = opts.totalNet.toFixed(2);
  const pending = [
    {
      tenantId: opts.tenantId,
      accountId: expenseAcc.id,
      branchId: effectiveBranchId,
      amount: amt,
      type: "debit" as const,
      transactionDate: new Date(),
      narration: `مصاريف رواتب — ${opts.periodName}`,
      lifecycleStatus: "posted" as const,
      referenceType: "payroll",
      referenceId: null,
      sourceModule: "payroll",
      userId: opts.userId,
    },
    {
      tenantId: opts.tenantId,
      accountId: payableAcc.id,
      branchId: effectiveBranchId,
      amount: amt,
      type: "credit" as const,
      transactionDate: new Date(),
      narration: `التزام رواتب مستحقة — ${opts.periodName}`,
      lifecycleStatus: "posted" as const,
      referenceType: "payroll",
      referenceId: null,
      sourceModule: "payroll",
      userId: opts.userId,
    },
  ];
  if (pending.length === 0) return;
  const total = pending.reduce((s, e) => s + parseFloat(e.amount), 0);
  const [je] = await db
    .insert(journalEntries)
    .values({
      tenantId: opts.tenantId,
      branchId: effectiveBranchId,
      sourceModule: "payroll",
      sourceRefType: "payroll",
      sourceRefId: null,
      referenceNo: opts.periodName,
      status: "posted",
      totalAmount: total.toFixed(2),
      createdById: opts.userId,
      postedAt: new Date(),
    })
    .returning();
  for (const e of pending) {
    await db.insert(transactions).values({ ...e, journalEntryId: je.id });
  }
}

/**
 * Posts a balanced journal entry when a procurement requisition is received:
 *   Debit  — Inventory / Purchases (5000)
 *   Credit — Accounts Payable (2010)
 * Skips safely if the chart of accounts isn't seeded for this tenant.
 * Defaults the branch dimension to the tenant's main branch.
 */
async function postProcurementGlEntries(
  db: any,
  opts: {
    tenantId: number;
    userId: number | null;
    requisitionNumber: string;
    itemName: string;
    amount: string;
  }
) {
  const findAccount = async (code: string) => {
    const rows = await db
      .select()
      .from(accounts)
      .where(
        and(eq(accounts.code, code), eq(accounts.tenantId, opts.tenantId))
      )
      .limit(1);
    return rows[0];
  };
  const expenseAcc = await findAccount("5000"); // Inventory / Purchases
  const payableAcc = await findAccount("2010"); // Accounts Payable
  if (!expenseAcc || !payableAcc) return;

  const bRows = await db
    .select()
    .from(branches)
    .where(eq(branches.tenantId, opts.tenantId))
    .orderBy(desc(branches.isMain))
    .limit(1);
  const effectiveBranchId = bRows[0]?.id ?? null;

  const amt = opts.amount;
  const pending = [
    {
      tenantId: opts.tenantId,
      accountId: expenseAcc.id,
      branchId: effectiveBranchId,
      amount: amt,
      type: "debit" as const,
      transactionDate: new Date(),
      narration: `استلام توريد — ${opts.itemName} (${opts.requisitionNumber})`,
      lifecycleStatus: "posted" as const,
      referenceType: "procurement",
      referenceId: null,
      sourceModule: "procurement",
      userId: opts.userId,
    },
    {
      tenantId: opts.tenantId,
      accountId: payableAcc.id,
      branchId: effectiveBranchId,
      amount: amt,
      type: "credit" as const,
      transactionDate: new Date(),
      narration: `التزام مورد مستحق — ${opts.itemName}`,
      lifecycleStatus: "posted" as const,
      referenceType: "procurement",
      referenceId: null,
      sourceModule: "procurement",
      userId: opts.userId,
    },
  ];
  const total = pending.reduce((s, e) => s + parseFloat(e.amount), 0);
  const [je] = await db
    .insert(journalEntries)
    .values({
      tenantId: opts.tenantId,
      branchId: effectiveBranchId,
      sourceModule: "procurement",
      sourceRefType: "procurement",
      sourceRefId: null,
      referenceNo: opts.requisitionNumber,
      status: "posted",
      totalAmount: total.toFixed(2),
      createdById: opts.userId,
      postedAt: new Date(),
    })
    .returning();
  for (const e of pending) {
    await db.insert(transactions).values({ ...e, journalEntryId: je.id });
  }
}

export const erpRouter = router({
  // â”€â”€â”€ Ø§Ù„Ø£Ù‚Ø³Ø§Ù… â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  listDepartments: tenantProcedure.query(async ({ ctx }) => {
    if (!ctx.tenantId) return [];
    const db = await dbOrThrow();
      return db
        .select()
        .from(departments)
        .where(
          and(
            eq(departments.tenantId, ctx.tenantId),
            isNull(departments.deletedAt)
          )
        )
        .orderBy(asc(departments.name));
  }),

  createDepartment: tenantProcedure
    .input(
      z.object({
        code: z.string().min(1),
        name: z.string().min(1),
        managerId: z.number().optional(),
        parentDepartmentId: z.number().optional(),
        costCenter: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const tenantId = ctx.tenantId!;
      const [row] = await db
        .insert(departments)
        .values({
          tenantId,
          code: input.code,
          name: input.name,
          managerId: input.managerId,
          parentDepartmentId: input.parentDepartmentId,
          costCenter: input.costCenter,
          isActive: input.isActive ?? true,
        })
        .returning();
      return row;
    }),

  updateDepartment: tenantProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        managerId: z.number().nullish(),
        costCenter: z.string().nullish(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const { id, ...rest } = input;
      await db
        .update(departments)
        .set(rest as any)
        .where(
          and(eq(departments.id, id), eq(departments.tenantId, ctx.tenantId!))
        );
      return { success: true };
    }),

  deleteDepartment: tenantProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      await db
        .update(departments)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(departments.id, input.id),
            eq(departments.tenantId, ctx.tenantId!)
          )
        );
      return { success: true };
    }),

  // â”€â”€â”€ Ø§Ù„Ù…ÙˆØ¸ÙÙˆÙ† â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  listEmployees: tenantProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          status: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return [];
      const db = await dbOrThrow();
      const where = [
        eq(employees.tenantId, ctx.tenantId),
        isNull(employees.deletedAt),
        input?.status ? eq(employees.status, input.status as any) : undefined,
        input?.search
          ? ilike(employees.fullName, `%${input.search}%`)
          : undefined,
      ].filter(Boolean) as any[];
      return db
        .select()
        .from(employees)
        .where(and(...where))
        .orderBy(asc(employees.fullName));
    }),

  createEmployee: tenantProcedure
    .input(
      z.object({
        code: z.string().min(1),
        fullName: z.string().min(1),
        jobTitle: z.string().min(1),
        departmentId: z.number().optional(),
        userId: z.number().optional(),
        nationalId: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        hireDate: z.string().optional(),
        salary: z.string().optional(),
        currency: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const tenantId = ctx.tenantId!;
      const [row] = await db
        .insert(employees)
        .values({
          tenantId,
          code: input.code,
          fullName: input.fullName,
          jobTitle: input.jobTitle,
          departmentId: input.departmentId,
          userId: input.userId,
          nationalId: input.nationalId,
          phone: input.phone,
          email: input.email,
          hireDate: input.hireDate ? new Date(input.hireDate) : null,
          salary: input.salary ?? "0",
          currency: input.currency ?? "YER",
          status: (input.status as any) ?? "active",
        })
        .returning();
      return row;
    }),

  updateEmployee: tenantProcedure
    .input(
      z.object({
        id: z.number(),
        fullName: z.string().optional(),
        jobTitle: z.string().optional(),
        departmentId: z.number().nullish(),
        phone: z.string().nullish(),
        email: z.string().nullish(),
        salary: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const { id, ...rest } = input;
      await db
        .update(employees)
        .set(rest as any)
        .where(
          and(eq(employees.id, id), eq(employees.tenantId, ctx.tenantId!))
        );
      return { success: true };
    }),

  deleteEmployee: tenantProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      await db
        .update(employees)
        .set({ deletedAt: new Date() })
        .where(
          and(eq(employees.id, input.id), eq(employees.tenantId, ctx.tenantId!))
        );
      return { success: true };
    }),

  // â”€â”€â”€ Ø§Ù„Ø­Ø¶ÙˆØ± â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  listAttendance: tenantProcedure
    .input(
      z
        .object({
          from: z.string().optional(),
          to: z.string().optional(),
          employeeId: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return [];
      const db = await dbOrThrow();
      const where = [
        eq(attendance.tenantId, ctx.tenantId),
        input?.employeeId
          ? eq(attendance.employeeId, input.employeeId)
          : undefined,
        input?.from ? gte(attendance.date, new Date(input.from)) : undefined,
        input?.to ? lte(attendance.date, new Date(input.to)) : undefined,
      ].filter(Boolean) as any[];
      return db
        .select()
        .from(attendance)
        .where(and(...where))
        .orderBy(desc(attendance.date));
    }),

  createAttendance: tenantProcedure
    .input(
      z.object({
        employeeId: z.number(),
        date: z.string(),
        status: z.string().default("present"),
        checkIn: z.string().optional(),
        checkOut: z.string().optional(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const tenantId = ctx.tenantId!;
      const [row] = await db
        .insert(attendance)
        .values({
          tenantId,
          employeeId: input.employeeId,
          date: new Date(input.date),
          status: input.status as any,
          checkIn: input.checkIn ? new Date(input.checkIn) : null,
          checkOut: input.checkOut ? new Date(input.checkOut) : null,
          note: input.note,
        })
        .returning();
      return row;
    }),

  // â”€â”€â”€ Ø§Ù„Ø±ÙˆØ§ØªØ¨ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  listPayrollRuns: tenantProcedure.query(async ({ ctx }) => {
    if (!ctx.tenantId) return [];
    const db = await dbOrThrow();
    return db
      .select()
      .from(payrollRuns)
      .where(eq(payrollRuns.tenantId, ctx.tenantId))
      .orderBy(desc(payrollRuns.createdAt));
  }),

  createPayrollRun: tenantProcedure
    .input(
      z.object({
        periodName: z.string().min(1),
        fromDate: z.string(),
        toDate: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const tenantId = ctx.tenantId!;
      const active = await db
        .select()
        .from(employees)
        .where(
          and(
            eq(employees.tenantId, tenantId),
            eq(employees.status, "active"),
            isNull(employees.deletedAt)
          )
        );
      const items = active.map((e: any) => ({
        tenantId,
        payrollRunId: 0 as unknown as number,
        employeeId: e.id,
        basicSalary: e.salary,
        deductions: "0",
        net: e.salary,
      }));
      const [run] = await db
        .insert(payrollRuns)
        .values({
          tenantId,
          periodName: input.periodName,
          fromDate: new Date(input.fromDate),
          toDate: new Date(input.toDate),
          totalNet: active
            .reduce((s: number, e: any) => s + (parseFloat(e.salary) || 0), 0)
            .toString(),
          status: "draft",
          createdById: ctx.user.id,
        })
        .returning();
      if (items.length) {
        await db
          .insert(payrollItems)
          .values(items.map((i: any) => ({ ...i, payrollRunId: run.id })));
      }
      const totalNet = active.reduce(
        (s: number, e: any) => s + (parseFloat(e.salary) || 0),
        0
      );
      if (totalNet > 0) {
        await postPayrollGlEntries(db, {
          tenantId,
          userId: ctx.user.id,
          periodName: input.periodName,
          totalNet,
        });
      }
      return run;
    }),

  // â”€â”€â”€ Ø§Ù„Ù…Ø´Ø§Ø±ÙŠØ¹ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  listProjects: tenantProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return [];
      const db = await dbOrThrow();
      const where = [
        eq(projects.tenantId, ctx.tenantId),
        input?.status ? eq(projects.status, input.status as any) : undefined,
      ].filter(Boolean) as any[];
      return db
        .select()
        .from(projects)
        .where(and(...where))
        .orderBy(desc(projects.createdAt));
    }),

  createProject: tenantProcedure
    .input(
      z.object({
        code: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional(),
        status: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        budget: z.string().optional(),
        managerId: z.number().optional(),
        customerId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const tenantId = ctx.tenantId!;
      const [row] = await db
        .insert(projects)
        .values({
          tenantId,
          code: input.code,
          name: input.name,
          description: input.description,
          status: (input.status as any) ?? "planning",
          startDate: input.startDate ? new Date(input.startDate) : null,
          endDate: input.endDate ? new Date(input.endDate) : null,
          budget: input.budget ?? "0",
          managerId: input.managerId,
          customerId: input.customerId,
        })
        .returning();
      return row;
    }),

  updateProject: tenantProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().nullish(),
        status: z.string().optional(),
        budget: z.string().optional(),
        endDate: z.string().nullish(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const { id, ...rest } = input;
      const set: any = { ...rest };
      if (rest.endDate !== undefined)
        set.endDate = rest.endDate ? new Date(rest.endDate) : null;
      await db
        .update(projects)
        .set(set)
        .where(and(eq(projects.id, id), eq(projects.tenantId, ctx.tenantId!)));
      return { success: true };
    }),

  deleteProject: tenantProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      await db.delete(projectTasks).where(eq(projectTasks.projectId, input.id));
      await db
        .delete(projectMembers)
        .where(eq(projectMembers.projectId, input.id));
      await db
        .delete(projects)
        .where(
          and(eq(projects.id, input.id), eq(projects.tenantId, ctx.tenantId!))
        );
      return { success: true };
    }),

  // â”€â”€â”€ Ù…Ù‡Ø§Ù… Ø§Ù„Ù…Ø´Ø§Ø±ÙŠØ¹ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  listProjectMembers: tenantProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return [];
      const db = await dbOrThrow();
      return db
        .select()
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, input.projectId),
            eq(projectMembers.tenantId, ctx.tenantId)
          )
        )
        .orderBy(asc(projectMembers.id));
    }),

  listTasks: tenantProcedure
    .input(z.object({ projectId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return [];
      const db = await dbOrThrow();
      const where = [
        eq(projectTasks.tenantId, ctx.tenantId),
        input?.projectId
          ? eq(projectTasks.projectId, input.projectId)
          : undefined,
      ].filter(Boolean) as any[];
      return db
        .select()
        .from(projectTasks)
        .where(and(...where))
        .orderBy(asc(projectTasks.status));
    }),

  createTask: tenantProcedure
    .input(
      z.object({
        projectId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
        assigneeId: z.number().optional(),
        dueDate: z.string().optional(),
        estimatedHours: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const tenantId = ctx.tenantId!;
      const [row] = await db
        .insert(projectTasks)
        .values({
          tenantId,
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          status: (input.status as any) ?? "todo",
          priority: (input.priority as any) ?? "medium",
          assigneeId: input.assigneeId,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          estimatedHours: input.estimatedHours,
        })
        .returning();
      return row;
    }),

  updateTask: tenantProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.string().optional(),
        priority: z.string().optional(),
        assigneeId: z.number().nullish(),
        actualHours: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const { id, ...rest } = input;
      await db
        .update(projectTasks)
        .set(rest as any)
        .where(
          and(eq(projectTasks.id, id), eq(projectTasks.tenantId, ctx.tenantId!))
        );
      return { success: true };
    }),

  deleteTask: tenantProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      await db
        .delete(projectTasks)
        .where(
          and(
            eq(projectTasks.id, input.id),
            eq(projectTasks.tenantId, ctx.tenantId!)
          )
        );
      return { success: true };
    }),

  // â”€â”€â”€ Ø£Ø¹Ø¶Ø§Ø¡ Ø§Ù„Ù…Ø´Ø§Ø±ÙŠØ¹ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  addProjectMember: tenantProcedure
    .input(
      z.object({
        projectId: z.number(),
        employeeId: z.number(),
        roleInProject: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const [row] = await db
        .insert(projectMembers)
        .values({
          tenantId: ctx.tenantId!,
          projectId: input.projectId,
          employeeId: input.employeeId,
          roleInProject: input.roleInProject,
        })
        .returning();
      return row;
    }),

  removeProjectMember: tenantProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      await db
        .delete(projectMembers)
        .where(
          and(
            eq(projectMembers.id, input.id),
            eq(projectMembers.tenantId, ctx.tenantId!)
          )
        );
      return { success: true };
    }),

  // â”€â”€â”€ Ø§Ù„Ù…Ø´ØªØ±ÙŠØ§Øª â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  listProcurements: tenantProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return [];
      const db = await dbOrThrow();
      const where = [
        eq(procurements.tenantId, ctx.tenantId),
        input?.status
          ? eq(procurements.status, input.status as any)
          : undefined,
      ].filter(Boolean) as any[];
      return db
        .select()
        .from(procurements)
        .where(and(...where))
        .orderBy(desc(procurements.createdAt));
    }),

  // Procurement control-tower KPIs. Values are calculated from tenant-scoped
  // records so the dashboard remains accurate even when no invoices exist.
  getProcurementKpis: tenantProcedure.query(async ({ ctx }) => {
    const db = await dbOrThrow();
    const rows = await db
      .select({
        status: procurements.status,
        estimatedCost: procurements.estimatedCost,
        receivedCost: procurements.receivedCost,
        createdAt: procurements.createdAt,
      })
      .from(procurements)
      .where(eq(procurements.tenantId, ctx.tenantId!));
    const kpis = {
      total: rows.length,
      draft: 0,
      pending: 0,
      approved: 0,
      received: 0,
      rejected: 0,
      estimatedValue: 0,
      receivedValue: 0,
      openValue: 0,
      overdueApprovalDays: 0,
    };
    const now = Date.now();
    for (const row of rows) {
      const status = String(row.status);
      if (status in kpis) (kpis as any)[status] += 1;
      const estimated = Number(row.estimatedCost || 0);
      const received = Number(row.receivedCost || 0);
      kpis.estimatedValue += Number.isFinite(estimated) ? estimated : 0;
      kpis.receivedValue += Number.isFinite(received) ? received : 0;
      if (["draft", "pending", "approved"].includes(status)) {
        kpis.openValue += Number.isFinite(estimated) ? estimated : 0;
        if (status === "pending" && row.createdAt) {
          kpis.overdueApprovalDays = Math.max(
            kpis.overdueApprovalDays,
            Math.floor((now - new Date(row.createdAt).getTime()) / 86400000)
          );
        }
      }
    }
    return kpis;
  }),

  createProcurement: tenantProcedure
    .input(
      z.object({
        itemName: z.string().min(1),
        description: z.string().optional(),
        departmentId: z.number().optional(),
        requestedById: z.number().optional(),
        quantity: z.string().optional(),
        unit: z.string().optional(),
        estimatedCost: z.string().optional(),
        currency: z.string().optional(),
        supplierId: z.number().optional(),
        // ─── Multi-step approval (Module A) ──────────────────────────
        approvers: z.array(z.number().int().positive()).max(10).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const tenantId = ctx.tenantId!;
      const quantity = Number(input.quantity ?? "1");
      const estimatedCost = Number(input.estimatedCost ?? "0");
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error("الكمية يجب أن تكون رقماً أكبر من صفر");
      }
      if (!Number.isFinite(estimatedCost) || estimatedCost < 0) {
        throw new Error("التكلفة التقديرية يجب ألا تكون سالبة");
      }
      const approverIds = input.approvers && input.approvers.length
        ? [...new Set(input.approvers)]
        : [];
      const approvers = approverIds.length ? approverIds : null;
      const seq = await nextSequence(db, procurements, tenantId);
      const [row] = await db
        .insert(procurements)
        .values({
          tenantId,
          requisitionNumber: `REQ-${tenantId}-${seq}`,
          itemName: input.itemName,
          description: input.description,
          departmentId: input.departmentId,
          requestedById: input.requestedById ?? ctx.user.id,
          quantity: quantity.toString(),
          unit: input.unit ?? "قطعة",
          estimatedCost: estimatedCost.toString(),
          currency: input.currency ?? "YER",
          supplierId: input.supplierId,
          approvers,
          approvalStep: 0,
          approvalLog: null,
          // With an approver chain the requisition awaits sequential sign-off.
          status: approvers ? "pending" : "draft",
        })
        .returning();
      await createNotification(db, {
        tenantId,
        userId: null,
        title: "طلب جديد",
        body: `تم إنشاء طلب توريد جديد: ${row.itemName} (${row.requisitionNumber})`,
        link: "/requisitions",
        type: "requisition",
      });
      // Notify the first approver in the chain (if any).
      if (approvers && approvers.length > 0) {
        await createNotification(db, {
          tenantId,
          userId: approvers[0],
          title: "طلب بانتظار اعتمادك",
          body: `طلب التوريد ${row.requisitionNumber} بانتظار خطوة الاعتماد 1 من ${approvers.length}`,
          link: "/requisitions",
          type: "requisition",
        });
      }
      return row;
    }),

  approveProcurement: tenantProcedure
    .input(
      z.object({
        id: z.number(),
        decision: z.enum(["approved", "rejected"]),
        note: z.string().optional(),
        level: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const tenantId = ctx.tenantId!;
      const [rec] = await db
        .select()
        .from(procurements)
        .where(
          and(
            eq(procurements.id, input.id),
            eq(procurements.tenantId, tenantId)
          )
        )
        .limit(1);
      if (!rec) throw new Error("الطلب غير موجود");
      if (["approved", "received", "rejected"].includes(String(rec.status))) {
        throw new Error("لا يمكن تغيير اعتماد طلب مكتمل أو مرفوض");
      }

      const approvers: number[] = Array.isArray(rec.approvers)
        ? (rec.approvers as number[])
        : [];
      const step = Number(rec.approvalStep) || 0;

      // ─── Sequential gate (Module A) ───────────────────────────────
      if (approvers.length > 0) {
        const currentApprover = approvers[step];
        if (ctx.user.id !== currentApprover) {
          throw new Error(
            `غير مخول للاعتماد في هذه الخطوة — بانتظار المستخدم رقم ${currentApprover}`
          );
        }
        const logEntry = {
          by: ctx.user.id,
          at: new Date().toISOString(),
          action: input.decision,
          note: input.note ?? null,
        };
        const prevLog: any[] = Array.isArray(rec.approvalLog)
          ? (rec.approvalLog as any[])
          : [];
        const newLog = [...prevLog, logEntry];
        await db.insert(procurementApprovals).values({
          tenantId,
          procurementId: input.id,
          approverId: ctx.user.id,
          level: step + 1,
          decision: input.decision as any,
          note: input.note,
        });
        if (input.decision === "rejected") {
          await db
            .update(procurements)
            .set({ status: "rejected", approvalLog: newLog })
            .where(
              and(
                eq(procurements.id, input.id),
                eq(procurements.tenantId, tenantId)
              )
            );
        } else {
          const nextStep = step + 1;
          const fullyApproved = nextStep >= approvers.length;
          await db
            .update(procurements)
            .set({
              approvalStep: nextStep,
              approvalLog: newLog,
              status: fullyApproved ? "approved" : "pending",
              approvedById: fullyApproved ? ctx.user.id : null,
            })
            .where(
              and(
                eq(procurements.id, input.id),
                eq(procurements.tenantId, tenantId)
              )
            );
          // Notify the next approver in the chain.
          if (!fullyApproved && approvers[nextStep]) {
            await createNotification(db, {
              tenantId,
              userId: approvers[nextStep],
              title: "طلب بانتظار اعتمادك",
              body: `طلب التوريد ${rec.requisitionNumber} بانتظار خطوة الاعتماد ${nextStep + 1} من ${approvers.length}`,
              link: "/requisitions",
              type: "requisition",
            });
          }
        }
      } else {
        // ─── Legacy fallback: single approver (unchanged behaviour) ──
        await db.insert(procurementApprovals).values({
          tenantId,
          procurementId: input.id,
          approverId: ctx.user.id,
          level: input.level ?? 1,
          decision: input.decision as any,
          note: input.note,
        });
        if (input.decision === "approved") {
          await db
            .update(procurements)
            .set({ status: "approved", approvedById: ctx.user.id })
            .where(
              and(
                eq(procurements.id, input.id),
                eq(procurements.tenantId, tenantId)
              )
            );
        } else if (input.decision === "rejected") {
          await db
            .update(procurements)
            .set({ status: "rejected" })
            .where(
              and(
                eq(procurements.id, input.id),
                eq(procurements.tenantId, tenantId)
              )
            );
        }
      }

      if (rec?.requestedById) {
        await createNotification(db, {
          tenantId,
          userId: rec.requestedById,
          title: "تم تحديث طلبك",
          body: `طلب التوريد ${rec.requisitionNumber} تم ${input.decision === "approved" ? "اعتماده" : "رفضه"}`,
          link: "/requisitions",
          type: "requisition",
        });
      }
      return { success: true };
    }),

  // Goods receipt on a requisition → posts a payable journal entry.
  receiveProcurement: tenantProcedure
    .input(
      z.object({
        id: z.number(),
        actualCost: z.string().optional(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) throw new Error("يجب إنشاء مؤسسة أولاً");
      const db = await dbOrThrow();
      const tenantId = ctx.tenantId;
      const [rec] = await db
        .select()
        .from(procurements)
        .where(
          and(eq(procurements.id, input.id), eq(procurements.tenantId, tenantId))
        )
        .limit(1);
      if (!rec) throw new Error("الطلب غير موجود");
      if (rec.status !== "approved") {
        throw new Error("لا يمكن استلام الطلب قبل اعتماده بالكامل");
      }
      const parsedAmount = input.actualCost == null || input.actualCost.trim() === ""
        ? Number(rec.estimatedCost)
        : Number(input.actualCost);
      if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
        throw new Error("التكلفة الفعلية يجب أن تكون رقماً غير سالب");
      }
      const amount = parsedAmount.toFixed(2);
      const result = await db.transaction(async (tx: any) => {
        const updated = await tx
          .update(procurements)
          .set({ status: "received", receivedCost: amount, updatedAt: new Date() })
          .where(
            and(
              eq(procurements.id, input.id),
              eq(procurements.tenantId, tenantId),
              eq(procurements.status, "approved")
            )
          )
          .returning({ id: procurements.id });
        if (!updated.length) throw new Error("تم استلام الطلب مسبقاً أو تغيرت حالته");
        await postProcurementGlEntries(tx, {
        tenantId,
        userId: ctx.user?.id ?? null,
        requisitionNumber: rec.requisitionNumber,
        itemName: rec.itemName,
          amount,
        });
        await tx.insert(activityLogs).values({
        tenantId,
        userId: ctx.user?.id ?? 0,
        action: `استلام توريد #${rec.requisitionNumber}`,
          details: `البند: ${rec.itemName} — المبلغ: ${amount}${input.note ? ` — ${input.note}` : ""}`,
        });
        return { success: true };
      });
      return result;
    }),

  listProcurementApprovals: tenantProcedure
    .input(z.object({ procurementId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return [];
      const db = await dbOrThrow();
      return db
        .select()
        .from(procurementApprovals)
        .where(
          and(
            eq(procurementApprovals.procurementId, input.procurementId),
            eq(procurementApprovals.tenantId, ctx.tenantId)
          )
        )
        .orderBy(asc(procurementApprovals.level));
    }),

  // â”€â”€â”€ ØªØ°Ø§ÙƒØ± Ø®Ø¯Ù…Ø© Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  listTickets: tenantProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return [];
      const db = await dbOrThrow();
      const where = [
        eq(tickets.tenantId, ctx.tenantId),
        input?.status ? eq(tickets.status, input.status as any) : undefined,
      ].filter(Boolean) as any[];
      return db
        .select()
        .from(tickets)
        .where(and(...where))
        .orderBy(desc(tickets.createdAt));
    }),

  createTicket: tenantProcedure
    .input(
      z.object({
        subject: z.string().min(1),
        description: z.string().optional(),
        customerName: z.string().optional(),
        customerPhone: z.string().optional(),
        priority: z.string().optional(),
        assignedToId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const tenantId = ctx.tenantId!;
      const seq = await nextSequence(db, tickets, tenantId);
      const [row] = await db
        .insert(tickets)
        .values({
          tenantId,
          ticketNumber: `TKT-${tenantId}-${seq}`,
          subject: input.subject,
          description: input.description,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          priority: (input.priority as any) ?? "medium",
          assignedToId: input.assignedToId,
          status: "open",
        })
        .returning();
      return row;
    }),

  updateTicket: tenantProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.string().optional(),
        priority: z.string().optional(),
        assignedToId: z.number().nullish(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const { id, ...rest } = input;
      await db
        .update(tickets)
        .set(rest as any)
        .where(and(eq(tickets.id, id), eq(tickets.tenantId, ctx.tenantId!)));
      return { success: true };
    }),

  // â”€â”€â”€ Ø§Ù„Ø¬ÙˆØ¯Ø© â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  deleteTicket: tenantProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      await db
        .delete(tickets)
        .where(
          and(eq(tickets.id, input.id), eq(tickets.tenantId, ctx.tenantId!))
        );
      return { success: true };
    }),

  listInspections: tenantProcedure.query(async ({ ctx }) => {
    if (!ctx.tenantId) return [];
    const db = await dbOrThrow();
    return db
      .select()
      .from(qualityInspections)
      .where(eq(qualityInspections.tenantId, ctx.tenantId))
      .orderBy(desc(qualityInspections.createdAt));
  }),

  createInspection: tenantProcedure
    .input(
      z.object({
        code: z.string().min(1),
        title: z.string().min(1),
        type: z.string().optional(),
        result: z.string().optional(),
        inspectedById: z.number().optional(),
        relatedEntity: z.string().optional(),
        score: z.string().optional(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const tenantId = ctx.tenantId!;
      const [row] = await db
        .insert(qualityInspections)
        .values({
          tenantId,
          code: input.code,
          title: input.title,
          type: input.type,
          result: (input.result as any) ?? "pass",
          inspectedById: input.inspectedById,
          relatedEntity: input.relatedEntity,
          score: input.score,
          note: input.note,
        })
        .returning();
      return row;
    }),

  // â”€â”€â”€ Ù„ÙˆØ­Ø© Ù…Ø¹Ù„ÙˆÙ…Ø§Øª ERP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  deleteInspection: tenantProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      await db
        .delete(qualityInspections)
        .where(
          and(
            eq(qualityInspections.id, input.id),
            eq(qualityInspections.tenantId, ctx.tenantId!)
          )
        );
      return { success: true };
    }),

  // ── اقتراحات إعادة الطلب (Module C): منتجات وصل مخزونها لنقطة إعادة الطلب ──
  listReorderSuggestions: tenantProcedure.query(async ({ ctx }) => {
    if (!ctx.tenantId) return [];
    const db = await dbOrThrow();
    const rows = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.tenantId, ctx.tenantId),
          isNull(products.deletedAt),
          sql`${products.currentStock} <= ${products.reorderPoint}`,
          sql`${products.reorderPoint} > 0`
        )
      )
      .orderBy(asc(products.name));
    return rows.map((p: any) => ({
      product: p,
      currentStock: Number(p.currentStock) || 0,
      reorderPoint: Number(p.reorderPoint) || 0,
      reorderQty: Number(p.reorderQty) || 0,
      suggestedQty:
        Number(p.reorderQty) > 0
          ? Number(p.reorderQty)
          : Math.max(0, Number(p.reorderPoint) - Number(p.currentStock)),
    }));
  }),

  // ── توليد طلبات توريد تلقائياً من اقتراحات إعادة الطلب (Module 4) ──
  // Iterates all products that have hit their reorder point and creates one
  // draft procurement requisition per product (reusing createProcurement's
  // sequence + insert pattern). Idempotent per call (new rows each run).
  generateProcurementsFromReorder: adminProcedure.mutation(async ({ ctx }) => {
    if (!ctx.tenantId) throw new Error("يجب إنشاء مؤسسة أولاً");
    const db = await dbOrThrow();
    const tenantId = ctx.tenantId;
    const rows = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.tenantId, tenantId),
          isNull(products.deletedAt),
          sql`${products.currentStock} <= ${products.reorderPoint}`,
          sql`${products.reorderPoint} > 0`
        )
      );
    const suggestions = rows.map((p: any) => ({
      product: p,
      suggestedQty:
        Number(p.reorderQty) > 0
          ? Number(p.reorderQty)
          : Math.max(0, Number(p.reorderPoint) - Number(p.currentStock)),
    }));

    let created = 0;
    for (const s of suggestions) {
      if (s.suggestedQty <= 0) continue;
      const seq = await nextSequence(db, procurements, tenantId);
      await db.insert(procurements).values({
        tenantId,
        requisitionNumber: `REQ-${tenantId}-${seq}`,
        itemName: s.product.name,
        description: "أُنشئ تلقائياً من اقتراح إعادة الطلب",
        requestedById: ctx.user?.id,
        quantity: String(s.suggestedQty),
        unit: s.product.unit || "قطعة",
        estimatedCost: String(
          (Number(s.product.purchasePrice || 0) || 0) * s.suggestedQty
        ),
        currency: "YER",
        supplierId: s.product.supplierId ?? null,
        status: "draft",
      });
      created++;
    }
    return { created, total: suggestions.length };
  }),

  // ── تنبيهات استباقية (Module C) ──
  // Scans the tenant and raises in-app notifications via createNotification:
  //  (1) products at/below reorderPoint → "منتج تحت نقطة إعادة الطلب"
  //  (2) receivables/payables past due with an outstanding balance →
  //      "مستحق متأخر"
  // De-dupes: skips any (type, link) already notified & still unread in 24h.
  processAlerts: adminProcedure.mutation(async ({ ctx }) => {
    if (!ctx.tenantId) throw new Error("يجب إنشاء مؤسسة أولاً");
    // Delegates to the shared automation engine (server/automation.ts) so the
    // same logic also runs from the Vercel cron trigger.
    return runProactiveAlerts(ctx.tenantId);
  }),

  getDashboard: tenantProcedure.query(async ({ ctx }) => {
    if (!ctx.tenantId) return null;
    const db = await dbOrThrow();
    const tenantId = ctx.tenantId;
    const cnt = async (table: any, extra?: any) =>
      (
        await db
          .select({ c: sql`count(*)` })
          .from(table)
          .where(and(eq(table.tenantId, tenantId), ...(extra ? [extra] : [])))
      )[0]?.c;

    const [
      employeesCount,
      activeProjects,
      openTickets,
      pendingReqs,
      inspections,
    ] = await Promise.all([
      cnt(employees),
      cnt(projects, eq(projects.status, "active")),
      cnt(tickets, eq(tickets.status, "open")),
      cnt(procurements, eq(procurements.status, "pending")),
      cnt(qualityInspections),
    ]);

    return {
      employees: Number(employeesCount ?? 0),
      activeProjects: Number(activeProjects ?? 0),
      openTickets: Number(openTickets ?? 0),
      pendingRequisitions: Number(pendingReqs ?? 0),
      inspections: Number(inspections ?? 0),
    };
  }),
});
