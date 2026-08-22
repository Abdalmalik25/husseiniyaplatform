import { relations } from "drizzle-orm";
import {
  users,
  tenants,
  branches,
  userBranchPermissions,
  accounts,
  transactions,
  openingBalances,
  budgets,
  settings,
  activityLogs,
  products,
  warehouses,
  inventoryMovements,
  customers,
  suppliers,
  salesInvoices,
  salesInvoiceItems,
  purchaseInvoices,
  purchaseInvoiceItems,
  orders,
  orderItems,
  payments,
  subscriptionPlans,
  tenantSubscriptions,
  billingInvoices,
  paymentHistory,
  auditLogs,
  notifications,
  teamInvitations,
  currencies,
  exchangeRates,
  fileUploads,
  apiKeys,
  webhooks,
  webhookDeliveries,
  featureFlags,
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
} from "./schema";

// ─── Tenants ─────────────────────────────────────────────────────
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  branches: many(branches),
  settings: many(settings),
  subscriptions: many(tenantSubscriptions),
  activityLogs: many(activityLogs),
  auditLogs: many(auditLogs),
  notifications: many(notifications),
  teamInvitations: many(teamInvitations),
  apiKeys: many(apiKeys),
  webhooks: many(webhooks),
  featureFlags: many(featureFlags),
}));

// ─── Users ───────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  branchPermissions: many(userBranchPermissions),
  activityLogs: many(activityLogs),
  auditLogs: many(auditLogs),
  notifications: many(notifications),
  sentInvitations: many(teamInvitations),
  apiKeys: many(apiKeys),
  fileUploads: many(fileUploads),
}));

// ─── Branches ────────────────────────────────────────────────────
export const branchesRelations = relations(branches, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [branches.tenantId],
    references: [tenants.id],
  }),
  userPermissions: many(userBranchPermissions),
  transactions: many(transactions),
  salesInvoices: many(salesInvoices),
  purchaseInvoices: many(purchaseInvoices),
}));

// ─── User Branch Permissions ─────────────────────────────────────
export const userBranchPermissionsRelations = relations(
  userBranchPermissions,
  ({ one }) => ({
    user: one(users, {
      fields: [userBranchPermissions.userId],
      references: [users.id],
    }),
    branch: one(branches, {
      fields: [userBranchPermissions.branchId],
      references: [branches.id],
    }),
    tenant: one(tenants, {
      fields: [userBranchPermissions.tenantId],
      references: [tenants.id],
    }),
  })
);

// ─── Accounts ────────────────────────────────────────────────────
export const accountsRelations = relations(accounts, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [accounts.tenantId],
    references: [tenants.id],
  }),
  parentAccount: one(accounts, {
    fields: [accounts.parentAccountId],
    references: [accounts.id],
    relationName: "accountHierarchy",
  }),
  childAccounts: many(accounts, { relationName: "accountHierarchy" }),
  transactions: many(transactions),
  openingBalances: many(openingBalances),
}));

// ─── Transactions ────────────────────────────────────────────────
export const transactionsRelations = relations(transactions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [transactions.tenantId],
    references: [tenants.id],
  }),
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  branch: one(branches, {
    fields: [transactions.branchId],
    references: [branches.id],
  }),
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

// ─── Opening Balances ────────────────────────────────────────────
export const openingBalancesRelations = relations(
  openingBalances,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [openingBalances.tenantId],
      references: [tenants.id],
    }),
    account: one(accounts, {
      fields: [openingBalances.accountId],
      references: [accounts.id],
    }),
  })
);

// ─── Budgets ─────────────────────────────────────────────────────
export const budgetsRelations = relations(budgets, ({ one }) => ({
  tenant: one(tenants, {
    fields: [budgets.tenantId],
    references: [tenants.id],
  }),
}));

// ─── Settings ────────────────────────────────────────────────────
export const settingsRelations = relations(settings, ({ one }) => ({
  tenant: one(tenants, {
    fields: [settings.tenantId],
    references: [tenants.id],
  }),
}));

// ─── Activity Logs ───────────────────────────────────────────────
export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [activityLogs.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

// ─── Products ────────────────────────────────────────────────────
export const productsRelations = relations(products, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [products.tenantId],
    references: [tenants.id],
  }),
  supplier: one(suppliers, {
    fields: [products.supplierId],
    references: [suppliers.id],
  }),
  inventoryMovements: many(inventoryMovements),
}));

// ─── Warehouses ──────────────────────────────────────────────────
export const warehousesRelations = relations(warehouses, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [warehouses.tenantId],
    references: [tenants.id],
  }),
  inventoryMovements: many(inventoryMovements),
}));

// ─── Inventory Movements ─────────────────────────────────────────
export const inventoryMovementsRelations = relations(
  inventoryMovements,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [inventoryMovements.tenantId],
      references: [tenants.id],
    }),
    product: one(products, {
      fields: [inventoryMovements.productId],
      references: [products.id],
    }),
    warehouse: one(warehouses, {
      fields: [inventoryMovements.warehouseId],
      references: [warehouses.id],
    }),
  })
);

// ─── Customers ───────────────────────────────────────────────────
export const customersRelations = relations(customers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [customers.tenantId],
    references: [tenants.id],
  }),
  salesInvoices: many(salesInvoices),
  orders: many(orders),
}));

// ─── Suppliers ───────────────────────────────────────────────────
export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [suppliers.tenantId],
    references: [tenants.id],
  }),
  products: many(products),
  purchaseInvoices: many(purchaseInvoices),
}));

// ─── Sales Invoices ──────────────────────────────────────────────
export const salesInvoicesRelations = relations(
  salesInvoices,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [salesInvoices.tenantId],
      references: [tenants.id],
    }),
    customer: one(customers, {
      fields: [salesInvoices.customerId],
      references: [customers.id],
    }),
    branch: one(branches, {
      fields: [salesInvoices.branchId],
      references: [branches.id],
    }),
    user: one(users, {
      fields: [salesInvoices.userId],
      references: [users.id],
    }),
    items: many(salesInvoiceItems),
  })
);

// ─── Sales Invoice Items ─────────────────────────────────────────
export const salesInvoiceItemsRelations = relations(
  salesInvoiceItems,
  ({ one }) => ({
    invoice: one(salesInvoices, {
      fields: [salesInvoiceItems.invoiceId],
      references: [salesInvoices.id],
    }),
    product: one(products, {
      fields: [salesInvoiceItems.productId],
      references: [products.id],
    }),
  })
);

// ─── Purchase Invoices ───────────────────────────────────────────
export const purchaseInvoicesRelations = relations(
  purchaseInvoices,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [purchaseInvoices.tenantId],
      references: [tenants.id],
    }),
    supplier: one(suppliers, {
      fields: [purchaseInvoices.supplierId],
      references: [suppliers.id],
    }),
    branch: one(branches, {
      fields: [purchaseInvoices.branchId],
      references: [branches.id],
    }),
    user: one(users, {
      fields: [purchaseInvoices.userId],
      references: [users.id],
    }),
    items: many(purchaseInvoiceItems),
  })
);

// ─── Purchase Invoice Items ──────────────────────────────────────
export const purchaseInvoiceItemsRelations = relations(
  purchaseInvoiceItems,
  ({ one }) => ({
    invoice: one(purchaseInvoices, {
      fields: [purchaseInvoiceItems.invoiceId],
      references: [purchaseInvoices.id],
    }),
    product: one(products, {
      fields: [purchaseInvoiceItems.productId],
      references: [products.id],
    }),
  })
);

// ─── Orders ──────────────────────────────────────────────────────
export const ordersRelations = relations(orders, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [orders.tenantId],
    references: [tenants.id],
  }),
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

// ─── Order Items ─────────────────────────────────────────────────
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

// ─── Payments ────────────────────────────────────────────────────
export const paymentsRelations = relations(payments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [payments.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
}));

// ─── Subscription Plans ──────────────────────────────────────────
export const subscriptionPlansRelations = relations(
  subscriptionPlans,
  ({ many }) => ({
    tenantSubscriptions: many(tenantSubscriptions),
  })
);

// ─── Tenant Subscriptions ────────────────────────────────────────
export const tenantSubscriptionsRelations = relations(
  tenantSubscriptions,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [tenantSubscriptions.tenantId],
      references: [tenants.id],
    }),
    plan: one(subscriptionPlans, {
      fields: [tenantSubscriptions.planId],
      references: [subscriptionPlans.id],
    }),
    invoices: many(billingInvoices),
  })
);

// ─── Billing Invoices ────────────────────────────────────────────
export const billingInvoicesRelations = relations(
  billingInvoices,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [billingInvoices.tenantId],
      references: [tenants.id],
    }),
    subscription: one(tenantSubscriptions, {
      fields: [billingInvoices.subscriptionId],
      references: [tenantSubscriptions.id],
    }),
    payments: many(paymentHistory),
  })
);

// ─── Payment History ─────────────────────────────────────────────
export const paymentHistoryRelations = relations(paymentHistory, ({ one }) => ({
  tenant: one(tenants, {
    fields: [paymentHistory.tenantId],
    references: [tenants.id],
  }),
  invoice: one(billingInvoices, {
    fields: [paymentHistory.invoiceId],
    references: [billingInvoices.id],
  }),
}));

// ─── Audit Logs ──────────────────────────────────────────────────
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [auditLogs.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// ─── Notifications ───────────────────────────────────────────────
export const notificationsRelations = relations(notifications, ({ one }) => ({
  tenant: one(tenants, {
    fields: [notifications.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// ─── Team Invitations ────────────────────────────────────────────
export const teamInvitationsRelations = relations(
  teamInvitations,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [teamInvitations.tenantId],
      references: [tenants.id],
    }),
    inviter: one(users, {
      fields: [teamInvitations.invitedBy],
      references: [users.id],
    }),
  })
);

// ─── File Uploads ────────────────────────────────────────────────
export const fileUploadsRelations = relations(fileUploads, ({ one }) => ({
  tenant: one(tenants, {
    fields: [fileUploads.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [fileUploads.userId],
    references: [users.id],
  }),
}));

// ─── API Keys ────────────────────────────────────────────────────
export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  tenant: one(tenants, {
    fields: [apiKeys.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

// ─── Webhooks ────────────────────────────────────────────────────
export const webhooksRelations = relations(webhooks, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [webhooks.tenantId],
    references: [tenants.id],
  }),
  deliveries: many(webhookDeliveries),
}));

// ─── Webhook Deliveries ──────────────────────────────────────────
export const webhookDeliveriesRelations = relations(
  webhookDeliveries,
  ({ one }) => ({
    webhook: one(webhooks, {
      fields: [webhookDeliveries.webhookId],
      references: [webhooks.id],
    }),
  })
);

// ─── Feature Flags ───────────────────────────────────────────────
export const featureFlagsRelations = relations(featureFlags, ({ one }) => ({
  tenant: one(tenants, {
    fields: [featureFlags.tenantId],
    references: [tenants.id],
  }),
}));

// ─── Exchange Rates ──────────────────────────────────────────────
export const exchangeRatesRelations = relations(exchangeRates, () => ({}));

// ─── Departments ─────────────────────────────────────────────────
export const departmentsRelations = relations(departments, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [departments.tenantId],
    references: [tenants.id],
  }),
  employees: many(employees),
  procurements: many(procurements),
}));

// ─── Employees ───────────────────────────────────────────────────
export const employeesRelations = relations(employees, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [employees.tenantId],
    references: [tenants.id],
  }),
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
  attendance: many(attendance),
  payrollItems: many(payrollItems),
  projectMemberships: many(projectMembers),
}));

// ─── Attendance ──────────────────────────────────────────────────
export const attendanceRelations = relations(attendance, ({ one }) => ({
  tenant: one(tenants, {
    fields: [attendance.tenantId],
    references: [tenants.id],
  }),
  employee: one(employees, {
    fields: [attendance.employeeId],
    references: [employees.id],
  }),
}));

// ─── Payroll Runs ────────────────────────────────────────────────
export const payrollRunsRelations = relations(payrollRuns, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [payrollRuns.tenantId],
    references: [tenants.id],
  }),
  items: many(payrollItems),
}));

// ─── Payroll Items ───────────────────────────────────────────────
export const payrollItemsRelations = relations(payrollItems, ({ one }) => ({
  tenant: one(tenants, {
    fields: [payrollItems.tenantId],
    references: [tenants.id],
  }),
  run: one(payrollRuns, {
    fields: [payrollItems.payrollRunId],
    references: [payrollRuns.id],
  }),
  employee: one(employees, {
    fields: [payrollItems.employeeId],
    references: [employees.id],
  }),
}));

// ─── Projects ────────────────────────────────────────────────────
export const projectsRelations = relations(projects, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [projects.tenantId],
    references: [tenants.id],
  }),
  manager: one(employees, {
    fields: [projects.managerId],
    references: [employees.id],
  }),
  tasks: many(projectTasks),
  members: many(projectMembers),
}));

// ─── Project Tasks ───────────────────────────────────────────────
export const projectTasksRelations = relations(projectTasks, ({ one }) => ({
  tenant: one(tenants, {
    fields: [projectTasks.tenantId],
    references: [tenants.id],
  }),
  project: one(projects, {
    fields: [projectTasks.projectId],
    references: [projects.id],
  }),
  assignee: one(employees, {
    fields: [projectTasks.assigneeId],
    references: [employees.id],
  }),
}));

// ─── Project Members ─────────────────────────────────────────────
export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [projectMembers.tenantId],
    references: [tenants.id],
  }),
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  employee: one(employees, {
    fields: [projectMembers.employeeId],
    references: [employees.id],
  }),
}));

// ─── Procurements ────────────────────────────────────────────────
export const procurementsRelations = relations(
  procurements,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [procurements.tenantId],
      references: [tenants.id],
    }),
    department: one(departments, {
      fields: [procurements.departmentId],
      references: [departments.id],
    }),
    approvals: many(procurementApprovals),
  })
);

// ─── Procurement Approvals ───────────────────────────────────────
export const procurementApprovalsRelations = relations(
  procurementApprovals,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [procurementApprovals.tenantId],
      references: [tenants.id],
    }),
    procurement: one(procurements, {
      fields: [procurementApprovals.procurementId],
      references: [procurements.id],
    }),
  })
);

// ─── Tickets ─────────────────────────────────────────────────────
export const ticketsRelations = relations(tickets, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tickets.tenantId],
    references: [tenants.id],
  }),
  assignee: one(employees, {
    fields: [tickets.assignedToId],
    references: [employees.id],
  }),
}));

// ─── Quality Inspections ─────────────────────────────────────────
export const qualityInspectionsRelations = relations(
  qualityInspections,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [qualityInspections.tenantId],
      references: [tenants.id],
    }),
    inspector: one(employees, {
      fields: [qualityInspections.inspectedById],
      references: [employees.id],
    }),
  })
);
