import { z } from "zod";
import { getDb } from "./db";
import { tenantProcedure, router } from "./_core/trpc";
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
} from "../drizzle/schema";
import { eq, desc, asc, and, sql, ilike, gte, lte } from "drizzle-orm";

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

export const erpRouter = router({
  // â”€â”€â”€ Ø§Ù„Ø£Ù‚Ø³Ø§Ù… â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  listDepartments: tenantProcedure.query(async ({ ctx }) => {
    if (!ctx.tenantId) return [];
    const db = await dbOrThrow();
    return db
      .select()
      .from(departments)
      .where(eq(departments.tenantId, ctx.tenantId))
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
        .delete(departments)
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
        .delete(employees)
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
          and(eq(employees.tenantId, tenantId), eq(employees.status, "active"))
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const tenantId = ctx.tenantId!;
      const seq = await nextSequence(db, procurements, tenantId);
      const [row] = await db
        .insert(procurements)
        .values({
          tenantId,
          requisitionNumber: `REQ-${tenantId}-${seq}`,
          itemName: input.itemName,
          description: input.description,
          departmentId: input.departmentId,
          requestedById: input.requestedById,
          quantity: input.quantity ?? "1",
          unit: input.unit ?? "Ù‚Ø·Ø¹Ø©",
          estimatedCost: input.estimatedCost ?? "0",
          currency: input.currency ?? "YER",
          supplierId: input.supplierId,
          status: "draft",
        })
        .returning();
      return row;
    }),

  approveProcurement: tenantProcedure
    .input(
      z.object({
        id: z.number(),
        decision: z.string(),
        note: z.string().optional(),
        level: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const tenantId = ctx.tenantId!;
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
      return { success: true };
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
