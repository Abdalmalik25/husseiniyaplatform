import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { consumeCredit, createAppointment, createContactMessage, createServiceRequest, createProject, createService, getAdminContent, getAdminInbox, getCreditTransactions, getDevices, getOrCreateCreditWallet, getOrCreateSubscription, getPendingSyncs, getProperties, getPublicContent, markSyncComplete, registerDevice, updateAppointmentStatus, updateServiceRequestStatus, updateSubscription, enqueueSync, getCustomers, createCustomer, getSuppliers, createSupplier, getProducts, createProduct, adjustStock, getInventoryTransactions, getInvoices, createInvoice, getCustomerOrders, createCustomerOrder, getDistributionChannels, createDistributionChannel, getDistributions, createDistribution, getPayments, createPayment, getExpenses, createExpense, getCommerceDashboard, getOrCreateOrganization, getChartOfAccounts, createAccount, getBranches, createBranch, getCurrencies, createCurrency, seedDefaultCurrencies, getUnitsOfMeasure, createUnitOfMeasure, seedDefaultUnits, getEmployees, createEmployee, getJournalEntries, createJournalEntry, getDailyTransactions, createDailyTransaction, getTestimonials, createTestimonial, getArticles, createArticle, getStudentServices, createStudentService, getAlerts, getAiInsights, recordPageView, recordVisitorSession, recordClientInteraction, getActivityLogs, createActivityLog } from "./db";
import { createCheckoutRequest } from "./payments";

const personFields = { name: z.string().min(2), phone: z.string().min(7), email: z.string().email().optional().or(z.literal("")) };

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 }); return { success: true } as const; }),
  }),
  content: publicProcedure.query(async () => { const content = await getPublicContent(); return { ...content, properties: await getProperties(), testimonials: await getTestimonials(), articles: await getArticles(), studentServices: await getStudentServices() }; }),
  credits: router({
    me: protectedProcedure.query(({ ctx }) => getOrCreateCreditWallet(ctx.user.id)),
    history: protectedProcedure.query(({ ctx }) => getCreditTransactions(ctx.user.id)),
    consume: protectedProcedure.input(z.object({ reference: z.string().max(160).optional() })).mutation(({ ctx, input }) => consumeCredit(ctx.user.id, input.reference)),
    checkout: protectedProcedure.input(z.object({ planId: z.string().min(1) })).mutation(({ input }) => createCheckoutRequest(input.planId)),
  }),
  subscription: router({
    me: protectedProcedure.query(({ ctx }) => getOrCreateSubscription(ctx.user.id)),
    update: protectedProcedure.input(z.object({ planId: z.string().min(1), status: z.enum(["active", "cancelled", "expired", "trial"]) })).mutation(({ ctx, input }) => updateSubscription(ctx.user.id, input.planId, input.status)),
  }),
  sync: router({
    registerDevice: protectedProcedure.input(z.object({ deviceId: z.string().min(1), platform: z.string().min(1), name: z.string().optional() })).mutation(({ ctx, input }) => registerDevice(ctx.user.id, input.deviceId, input.platform, input.name)),
    devices: protectedProcedure.query(({ ctx }) => getDevices(ctx.user.id)),
    pending: protectedProcedure.input(z.object({ deviceId: z.string().optional() })).query(({ ctx, input }) => getPendingSyncs(ctx.user.id, input.deviceId)),
    enqueue: protectedProcedure.input(z.object({ deviceId: z.string().min(1), entityType: z.string().min(1), entityId: z.string().min(1), operation: z.enum(["create", "update", "delete"]), payload: z.any().optional() })).mutation(({ ctx, input }) => enqueueSync(ctx.user.id, input.deviceId, input.entityType, input.entityId, input.operation, input.payload)),
    complete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => markSyncComplete(input.id)),
  }),
  commerce: router({
    dashboard: protectedProcedure.query(({ ctx }) => getCommerceDashboard(ctx.user.id)),
    customers: router({
      list: protectedProcedure.query(({ ctx }) => getCustomers(ctx.user.id)),
      create: protectedProcedure.input(z.object({ name: z.string().min(2), phone: z.string().optional(), email: z.string().email().optional().or(z.literal("")), address: z.string().optional(), type: z.enum(["individual", "company", "government", "student"]).optional() })).mutation(({ ctx, input }) => createCustomer(ctx.user.id, input)),
    }),
    suppliers: router({
      list: protectedProcedure.query(({ ctx }) => getSuppliers(ctx.user.id)),
      create: protectedProcedure.input(z.object({ name: z.string().min(2), phone: z.string().optional(), email: z.string().email().optional().or(z.literal("")), address: z.string().optional() })).mutation(({ ctx, input }) => createSupplier(ctx.user.id, input)),
    }),
    products: router({
      list: protectedProcedure.query(({ ctx }) => getProducts(ctx.user.id)),
      create: protectedProcedure.input(z.object({ name: z.string().min(2), sku: z.string().optional(), category: z.string().optional(), unit: z.string().optional(), costPrice: z.number().optional(), sellingPrice: z.number().optional(), stockQuantity: z.number().optional(), minStock: z.number().optional() })).mutation(({ ctx, input }) => createProduct(ctx.user.id, input)),
      adjustStock: protectedProcedure.input(z.object({ productId: z.number(), quantity: z.number().int().positive(), type: z.enum(["in", "out", "adjustment"]), reference: z.string().optional() })).mutation(({ ctx, input }) => adjustStock(ctx.user.id, input.productId, input.quantity, input.type, input.reference)),
      transactions: protectedProcedure.query(({ ctx }) => getInventoryTransactions(ctx.user.id)),
    }),
    invoices: router({
      list: protectedProcedure.query(({ ctx }) => getInvoices(ctx.user.id)),
      create: protectedProcedure.input(z.object({ invoiceNumber: z.string().min(1), type: z.enum(["sales", "purchase"]), customerId: z.number().optional(), supplierId: z.number().optional(), status: z.enum(["draft", "issued", "paid", "partial", "overdue", "cancelled"]).optional(), subtotal: z.number().optional(), discount: z.number().optional(), tax: z.number().optional(), total: z.number().optional(), paidAmount: z.number().optional(), notes: z.string().optional(), items: z.array(z.object({ description: z.string().min(1), quantity: z.number(), unitPrice: z.number() })).optional() })).mutation(({ ctx, input }) => createInvoice(ctx.user.id, input)),
    }),
    orders: router({
      list: protectedProcedure.query(({ ctx }) => getCustomerOrders(ctx.user.id)),
      create: protectedProcedure.input(z.object({ orderNumber: z.string().min(1), customerId: z.number().optional(), status: z.enum(["new", "processing", "shipped", "delivered", "cancelled"]).optional(), total: z.number().optional(), notes: z.string().optional(), items: z.array(z.object({ description: z.string().min(1), quantity: z.number(), unitPrice: z.number() })).optional() })).mutation(({ ctx, input }) => createCustomerOrder(ctx.user.id, input)),
    }),
    distribution: router({
      channels: protectedProcedure.query(({ ctx }) => getDistributionChannels(ctx.user.id)),
      createChannel: protectedProcedure.input(z.object({ name: z.string().min(2), type: z.enum(["retail", "wholesale", "online", "agent", "other"]).optional(), location: z.string().optional() })).mutation(({ ctx, input }) => createDistributionChannel(ctx.user.id, input)),
      list: protectedProcedure.query(({ ctx }) => getDistributions(ctx.user.id)),
      create: protectedProcedure.input(z.object({ channelId: z.number(), productId: z.number(), quantity: z.number().int().positive() })).mutation(({ ctx, input }) => createDistribution(ctx.user.id, input)),
    }),
    payments: router({
      list: protectedProcedure.query(({ ctx }) => getPayments(ctx.user.id)),
      create: protectedProcedure.input(z.object({ amount: z.number().positive(), type: z.enum(["receive", "pay"]), method: z.string().optional(), reference: z.string().optional(), invoiceId: z.number().optional(), customerId: z.number().optional(), supplierId: z.number().optional() })).mutation(({ ctx, input }) => createPayment(ctx.user.id, input)),
    }),
    expenses: router({
      list: protectedProcedure.query(({ ctx }) => getExpenses(ctx.user.id)),
      create: protectedProcedure.input(z.object({ amount: z.number().positive(), category: z.string().min(2), description: z.string().optional() })).mutation(({ ctx, input }) => createExpense(ctx.user.id, input)),
    }),
  }),
  accounting: router({
    organization: protectedProcedure.query(({ ctx }) => getOrCreateOrganization(ctx.user.id)),
    accounts: router({
      list: protectedProcedure.query(({ ctx }) => getChartOfAccounts(ctx.user.id)),
      create: protectedProcedure.input(z.object({ code: z.string().min(1), name: z.string().min(2), type: z.enum(["asset", "liability", "equity", "revenue", "expense"]), category: z.string().optional(), parentId: z.number().optional(), openingBalance: z.number().optional() })).mutation(({ ctx, input }) => createAccount(ctx.user.id, input)),
    }),
    branches: router({
      list: protectedProcedure.query(({ ctx }) => getBranches(ctx.user.id)),
      create: protectedProcedure.input(z.object({ name: z.string().min(2), code: z.string().optional(), address: z.string().optional(), phone: z.string().optional() })).mutation(({ ctx, input }) => createBranch(ctx.user.id, input)),
    }),
    currencies: router({
      list: protectedProcedure.query(async ({ ctx }) => { await seedDefaultCurrencies(ctx.user.id); return getCurrencies(ctx.user.id); }),
      create: protectedProcedure.input(z.object({ code: z.string().min(1), name: z.string().min(2), symbol: z.string().optional(), exchangeRate: z.number().optional(), isBase: z.number().optional() })).mutation(({ ctx, input }) => createCurrency(ctx.user.id, input)),
    }),
    units: router({
      list: protectedProcedure.query(async ({ ctx }) => { await seedDefaultUnits(ctx.user.id); return getUnitsOfMeasure(ctx.user.id); }),
      create: protectedProcedure.input(z.object({ name: z.string().min(1), abbreviation: z.string().optional() })).mutation(({ ctx, input }) => createUnitOfMeasure(ctx.user.id, input)),
    }),
    employees: router({
      list: protectedProcedure.query(({ ctx }) => getEmployees(ctx.user.id)),
      create: protectedProcedure.input(z.object({ name: z.string().min(2), role: z.string().optional(), phone: z.string().optional(), email: z.string().email().optional().or(z.literal("")), salary: z.number().optional() })).mutation(({ ctx, input }) => createEmployee(ctx.user.id, input)),
    }),
    journal: router({
      list: protectedProcedure.query(({ ctx }) => getJournalEntries(ctx.user.id)),
      create: protectedProcedure.input(z.object({ entryNumber: z.string().min(1), description: z.string().optional(), entryDate: z.date().optional(), currencyCode: z.string().optional(), exchangeRate: z.number().optional(), lines: z.array(z.object({ accountId: z.number(), debit: z.number().default(0), credit: z.number().default(0), description: z.string().optional() })).min(2) })).mutation(({ ctx, input }) => createJournalEntry(ctx.user.id, input)),
    }),
    transactions: router({
      list: protectedProcedure.query(({ ctx }) => getDailyTransactions(ctx.user.id)),
      create: protectedProcedure.input(z.object({ transactionNumber: z.string().min(1), transactionType: z.enum(["voucher", "invoice", "request", "order", "receipt", "payment", "transfer", "adjustment", "other"]), transactionDate: z.date().optional(), accountId: z.number().optional(), customerId: z.number().optional(), supplierId: z.number().optional(), employeeId: z.number().optional(), agentId: z.number().optional(), distributorId: z.number().optional(), productId: z.number().optional(), amount: z.number().optional(), currencyCode: z.string().optional(), exchangeRate: z.number().optional(), quantity: z.number().optional(), unitId: z.number().optional(), description: z.string().optional(), status: z.string().optional() })).mutation(({ ctx, input }) => createDailyTransaction(ctx.user.id, input)),
    }),
  }),
  requests: router({
    service: publicProcedure.input(z.object({ ...personFields, serviceType: z.string().min(2), details: z.string().min(5) })).mutation(({ input }) => createServiceRequest(input)),
    appointment: publicProcedure.input(z.object({ ...personFields, specialty: z.string().min(2), appointmentDate: z.string().min(4), appointmentTime: z.string().min(2), notes: z.string().optional() })).mutation(({ input }) => createAppointment(input)),
    contact: publicProcedure.input(z.object({ ...personFields, message: z.string().min(5) })).mutation(({ input }) => createContactMessage(input)),
  }),
  admin: router({
    inbox: adminProcedure.query(() => getAdminInbox()),
    content: adminProcedure.query(() => getAdminContent()),
    updateRequestStatus: adminProcedure.input(z.object({ id: z.number(), status: z.enum(["new", "contacted", "closed"]) })).mutation(({ input }) => updateServiceRequestStatus(input.id, input.status)),
    updateAppointmentStatus: adminProcedure.input(z.object({ id: z.number(), status: z.enum(["new", "confirmed", "completed", "cancelled"]) })).mutation(({ input }) => updateAppointmentStatus(input.id, input.status)),
    dashboard: protectedProcedure.query(({ ctx }) => ({ isAdmin: ctx.user.role === "admin" })),
    createService: adminProcedure.input(z.object({ category: z.enum(["engineering", "realEstate", "consulting"]), title: z.string().min(2), description: z.string().min(5), icon: z.string().default("sparkles") })).mutation(({ input }) => createService(input)),
    createProject: adminProcedure.input(z.object({ title: z.string().min(2), category: z.string().min(2), location: z.string().optional(), description: z.string().min(5), imageUrl: z.string().optional() })).mutation(({ input }) => createProject(input)),
    createTestimonial: adminProcedure.input(z.object({ clientName: z.string().min(2), clientTitle: z.string().optional(), clientCompany: z.string().optional(), content: z.string().min(10), rating: z.number().min(1).max(5).optional(), serviceType: z.string().optional(), imageUrl: z.string().optional(), isFeatured: z.boolean().optional() })).mutation(({ input }) => createTestimonial(input)),
    createArticle: adminProcedure.input(z.object({ title: z.string().min(2), slug: z.string().min(2), excerpt: z.string().optional(), content: z.string().min(10), category: z.string().optional(), authorName: z.string().optional(), imageUrl: z.string().optional(), readTime: z.number().optional() })).mutation(({ input }) => createArticle(input)),
    createStudentService: adminProcedure.input(z.object({ title: z.string().min(2), description: z.string().min(5), icon: z.string().optional(), price: z.number().optional(), originalPrice: z.number().optional(), discountPercent: z.number().optional(), category: z.string().optional() })).mutation(({ input }) => createStudentService({ ...input, price: input.price != null ? String(input.price) : undefined, originalPrice: input.originalPrice != null ? String(input.originalPrice) : undefined })),
  }),
  analytics: router({
    pageView: publicProcedure.input(z.object({ sessionId: z.string().min(1), page: z.string().min(1), visitorId: z.string().optional(), title: z.string().optional() })).mutation(({ input }) => recordPageView(input.sessionId, input.page, input.visitorId, input.title)),
    visitorSession: publicProcedure.input(z.object({ sessionId: z.string().min(1), visitorId: z.string().optional(), ipAddress: z.string().optional(), userAgent: z.string().optional(), referrer: z.string().optional(), firstPage: z.string().optional(), device: z.string().optional(), browser: z.string().optional(), os: z.string().optional() })).mutation(({ input }) => recordVisitorSession(input.sessionId, input)),
    clientInteraction: publicProcedure.input(z.object({ interactionType: z.string().min(1), page: z.string().min(1), visitorId: z.string().optional(), metadata: z.any().optional() })).mutation(({ input }) => recordClientInteraction(input.interactionType, input.page, undefined, input.visitorId, input.metadata)),
  }),
  intelligence: router({
    alerts: protectedProcedure.query(({ ctx }) => getAlerts(ctx.user.id)),
    insights: protectedProcedure.query(({ ctx }) => getAiInsights(null, true)),
    activityLog: protectedProcedure.query(({ ctx }) => getActivityLogs(null)),
  }),
});

export type AppRouter = typeof appRouter;
