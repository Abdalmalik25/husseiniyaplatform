-- Nuclear Performance Indexes v2
-- Critical indexes for multi-tenant SaaS ERP queries
-- Generated: 2026-08-25

-- ============================================================
-- SALES INVOICES - Critical for Module A (Sales Reps) + Module B (Offers)
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_sales_invoices_tenant_salesrep" ON "sales_invoices" USING btree ("tenantId", "salesRepId");
CREATE INDEX IF NOT EXISTS "idx_sales_invoices_tenant_offer" ON "sales_invoices" USING btree ("tenantId", "offerId");
CREATE INDEX IF NOT EXISTS "idx_sales_invoices_tenant_status_date" ON "sales_invoices" USING btree ("tenantId", "status", "invoiceDate");
CREATE INDEX IF NOT EXISTS "idx_sales_invoices_tenant_customer_date" ON "sales_invoices" USING btree ("tenantId", "customerId", "invoiceDate");
CREATE INDEX IF NOT EXISTS "idx_sales_invoices_tenant_currency" ON "sales_invoices" USING btree ("tenantId", "currencyId");

-- ============================================================
-- SALES INVOICE ITEMS - Line-level queries
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_sales_invoice_items_invoice" ON "sales_invoice_items" USING btree ("salesInvoiceId");
CREATE INDEX IF NOT EXISTS "idx_sales_invoice_items_product" ON "sales_invoice_items" USING btree ("productId");
CREATE INDEX IF NOT EXISTS "idx_sales_invoice_items_offer" ON "sales_invoice_items" USING btree ("offerId");

-- ============================================================
-- PURCHASE INVOICES - Procurement module
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_purchase_invoices_tenant_supplier_date" ON "purchase_invoices" USING btree ("tenantId", "supplierId", "invoiceDate");
CREATE INDEX IF NOT EXISTS "idx_purchase_invoices_tenant_status_date" ON "purchase_invoices" USING btree ("tenantId", "status", "invoiceDate");
CREATE INDEX IF NOT EXISTS "idx_purchase_invoices_tenant_currency" ON "purchase_invoices" USING btree ("tenantId", "currencyId");

-- ============================================================
-- MESSAGES - Module F (Real-time messaging)
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_messages_tenant_sender_receiver" ON "messages" USING btree ("tenantId", "senderId", "receiverId");
CREATE INDEX IF NOT EXISTS "idx_messages_tenant_receiver_read" ON "messages" USING btree ("tenantId", "receiverId", "readAt");
CREATE INDEX IF NOT EXISTS "idx_messages_tenant_created" ON "messages" USING btree ("tenantId", "createdAt" DESC);

-- ============================================================
-- CUSTOM FIELDS - Module D (EAV pattern)
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_custom_field_values_entity" ON "custom_field_values" USING btree ("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "idx_custom_field_values_def" ON "custom_field_values" USING btree ("customFieldDefId");
CREATE INDEX IF NOT EXISTS "idx_custom_field_defs_tenant_entity" ON "custom_field_defs" USING btree ("tenantId", "entityType");

-- ============================================================
-- BIOMETRIC TEMPLATES - Module E (Security)
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_biometric_templates_tenant_employee" ON "biometric_templates" USING btree ("tenantId", "employeeId");
CREATE INDEX IF NOT EXISTS "idx_biometric_templates_tenant_type" ON "biometric_templates" USING btree ("tenantId", "templateType");

-- ============================================================
-- OFFERS - Module B (Discounts/Promotions)
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_offers_tenant_active" ON "offers" USING btree ("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS "idx_offers_tenant_category" ON "offers" USING btree ("tenantId", "categoryId");
CREATE INDEX IF NOT EXISTS "idx_offers_tenant_dates" ON "offers" USING btree ("tenantId", "validFrom", "validTo");

-- ============================================================
-- SALES REPS - Module A (Commissions)
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_sales_reps_tenant_active" ON "sales_reps" USING btree ("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS "idx_sales_reps_tenant_user" ON "sales_reps" USING btree ("tenantId", "userId");

-- ============================================================
-- TRANSACTIONS - Core accounting (already has some, adding more)
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_transactions_tenant_account_date" ON "transactions" USING btree ("tenantId", "accountId", "transactionDate");
CREATE INDEX IF NOT EXISTS "idx_transactions_tenant_journal" ON "transactions" USING btree ("tenantId", "journalEntryId");
CREATE INDEX IF NOT EXISTS "idx_transactions_tenant_reversed" ON "transactions" USING btree ("tenantId", "isReversed");
CREATE INDEX IF NOT EXISTS "idx_transactions_tenant_currency" ON "transactions" USING btree ("tenantId", "currencyId");

-- ============================================================
-- JOURNAL ENTRIES - Core accounting
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_journal_entries_tenant_date" ON "journal_entries" USING btree ("tenantId", "entryDate");
CREATE INDEX IF NOT EXISTS "idx_journal_entries_tenant_status" ON "journal_entries" USING btree ("tenantId", "status");
CREATE INDEX IF NOT EXISTS "idx_journal_entries_tenant_posted" ON "journal_entries" USING btree ("tenantId", "postedAt");

-- ============================================================
-- INVENTORY MOVEMENTS - Stock tracking
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_inventory_movements_tenant_product_date" ON "inventory_movements" USING btree ("tenantId", "productId", "movementDate");
CREATE INDEX IF NOT EXISTS "idx_inventory_movements_tenant_warehouse" ON "inventory_movements" USING btree ("tenantId", "warehouseId");
CREATE INDEX IF NOT EXISTS "idx_inventory_movements_tenant_type" ON "inventory_movements" USING btree ("tenantId", "movementType");

-- ============================================================
-- WAREHOUSE STOCK - Real-time stock levels
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_warehouse_stock_tenant_product" ON "warehouse_stock" USING btree ("tenantId", "productId");
CREATE INDEX IF NOT EXISTS "idx_warehouse_stock_tenant_warehouse" ON "warehouse_stock" USING btree ("tenantId", "warehouseId");

-- ============================================================
-- PRODUCTS - Catalog queries
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_products_tenant_category" ON "products" USING btree ("tenantId", "categoryId");
CREATE INDEX IF NOT EXISTS "idx_products_tenant_active" ON "products" USING btree ("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS "idx_products_tenant_code" ON "products" USING btree ("tenantId", "code");

-- ============================================================
-- CUSTOMERS / SUPPLIERS - CRM queries
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_customers_tenant_active" ON "customers" USING btree ("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS "idx_customers_tenant_code" ON "customers" USING btree ("tenantId", "code");
CREATE INDEX IF NOT EXISTS "idx_suppliers_tenant_active" ON "suppliers" USING btree ("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS "idx_suppliers_tenant_code" ON "suppliers" USING btree ("tenantId", "code");

-- ============================================================
-- PAYMENTS - Cash flow
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_payments_tenant_date" ON "payments" USING btree ("tenantId", "paymentDate");
CREATE INDEX IF NOT EXISTS "idx_payments_tenant_customer" ON "payments" USING btree ("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "idx_payments_tenant_supplier" ON "payments" USING btree ("tenantId", "supplierId");
CREATE INDEX IF NOT EXISTS "idx_payments_tenant_method" ON "payments" USING btree ("tenantId", "paymentMethod");

-- ============================================================
-- PAYROLL - HR module
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_payroll_runs_tenant_period" ON "payroll_runs" USING btree ("tenantId", "periodStart", "periodEnd");
CREATE INDEX IF NOT EXISTS "idx_payroll_items_tenant_employee" ON "payroll_items" USING btree ("tenantId", "employeeId");
CREATE INDEX IF NOT EXISTS "idx_attendance_tenant_employee_date" ON "attendance" USING btree ("tenantId", "employeeId", "date");

-- ============================================================
-- PROJECTS / TASKS - Project management
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_projects_tenant_status" ON "projects" USING btree ("tenantId", "status");
CREATE INDEX IF NOT EXISTS "idx_project_tasks_tenant_project" ON "project_tasks" USING btree ("tenantId", "projectId");
CREATE INDEX IF NOT EXISTS "idx_project_tasks_tenant_assignee" ON "project_tasks" USING btree ("tenantId", "assigneeId");
CREATE INDEX IF NOT EXISTS "idx_project_tasks_tenant_status" ON "project_tasks" USING btree ("tenantId", "status");

-- ============================================================
-- PROCUREMENT - Procurement module
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_procurements_tenant_status" ON "procurements" USING btree ("tenantId", "status");
CREATE INDEX IF NOT EXISTS "idx_procurements_tenant_supplier" ON "procurements" USING btree ("tenantId", "supplierId");
CREATE INDEX IF NOT EXISTS "idx_procurement_approvals_tenant_procurement" ON "procurement_approvals" USING btree ("tenantId", "procurementId");

-- ============================================================
-- TICKETS - Support module
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_tickets_tenant_status" ON "tickets" USING btree ("tenantId", "status");
CREATE INDEX IF NOT EXISTS "idx_tickets_tenant_assignee" ON "tickets" USING btree ("tenantId", "assigneeId");
CREATE INDEX IF NOT EXISTS "idx_tickets_tenant_customer" ON "tickets" USING btree ("tenantId", "customerId");

-- ============================================================
-- FISCAL PERIODS - Module I (Period closing)
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_fiscal_periods_tenant_status" ON "fiscal_periods" USING btree ("tenantId", "status");
CREATE INDEX IF NOT EXISTS "idx_fiscal_periods_tenant_dates" ON "fiscal_periods" USING btree ("tenantId", "startDate", "endDate");

-- ============================================================
-- BUDGETS / BUDGET SCENARIOS - Module K
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_budgets_tenant_period" ON "budgets" USING btree ("tenantId", "periodName");
CREATE INDEX IF NOT EXISTS "idx_budget_scenarios_tenant" ON "budget_scenarios" USING btree ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_budget_lines_tenant_scenario" ON "budget_lines" USING btree ("tenantId", "scenarioId");

-- ============================================================
-- COST CENTERS / ALLOCATION - Module J
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_cost_centers_tenant" ON "cost_centers" USING btree ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_allocation_rules_tenant" ON "allocation_rules" USING btree ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_allocation_runs_tenant" ON "allocation_runs" USING btree ("tenantId");

-- ============================================================
-- VARIANCE ANALYSES - Module L
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_variance_analyses_tenant_period" ON "variance_analyses" USING btree ("tenantId", "periodName");
CREATE INDEX IF NOT EXISTS "idx_variance_analyses_tenant_account" ON "variance_analyses" USING btree ("tenantId", "accountId");

-- ============================================================
-- KPIs - Module M
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_kpis_tenant" ON "kpis" USING btree ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_kpi_measurements_tenant_kpi_date" ON "kpi_measurements" USING btree ("tenantId", "kpiId", "measurementDate");

-- ============================================================
-- CONSOLIDATION - Module N
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_consolidation_entities_tenant" ON "consolidation_entities" USING btree ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_consolidation_adjustments_tenant_entity" ON "consolidation_adjustments" USING btree ("tenantId", "entityId");

-- ============================================================
-- RECURRING EXPENSES - Module O
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_recurring_expenses_tenant_active" ON "recurring_expenses" USING btree ("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS "idx_recurring_expense_runs_tenant_expense" ON "recurring_expense_runs" USING btree ("tenantId", "recurringExpenseId");

-- ============================================================
-- SCHEDULED JOURNAL ENTRIES - Module P
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_scheduled_journal_entries_tenant_next" ON "scheduled_journal_entries" USING btree ("tenantId", "nextRunAt");
CREATE INDEX IF NOT EXISTS "idx_scheduled_journal_entries_tenant_active" ON "scheduled_journal_entries" USING btree ("tenantId", "isActive");

-- ============================================================
-- SYNC METADATA - Offline-first sync
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_sync_metadata_tenant_entity" ON "sync_metadata" USING btree ("tenantId", "entityType", "entityId");
CREATE INDEX IF NOT EXISTS "idx_sync_metadata_tenant_synced" ON "sync_metadata" USING btree ("tenantId", "lastSyncedAt");

-- ============================================================
-- AUDIT LOGS / ACTIVITY LOGS - Compliance
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_audit_logs_tenant_entity_date" ON "audit_logs" USING btree ("tenantId", "entityType", "entityId", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_activity_logs_tenant_user_date" ON "activity_logs" USING btree ("tenantId", "userId", "createdAt");

-- ============================================================
-- FILE UPLOADS - Document management
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_file_uploads_tenant_entity" ON "file_uploads" USING btree ("tenantId", "entityType", "entityId");
CREATE INDEX IF NOT EXISTS "idx_file_uploads_tenant_user" ON "file_uploads" USING btree ("tenantId", "uploadedById");

-- ============================================================
-- NOTIFICATIONS - Real-time alerts
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_notifications_tenant_user_read" ON "notifications" USING btree ("tenantId", "userId", "readAt");
CREATE INDEX IF NOT EXISTS "idx_notifications_tenant_created" ON "notifications" USING btree ("tenantId", "createdAt" DESC);

-- ============================================================
-- POS SESSIONS / ORDERS - Point of Sale
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_pos_sessions_tenant_user" ON "pos_sessions" USING btree ("tenantId", "userId");
CREATE INDEX IF NOT EXISTS "idx_pos_sessions_tenant_status" ON "pos_sessions" USING btree ("tenantId", "status");
CREATE INDEX IF NOT EXISTS "idx_pos_orders_tenant_session" ON "pos_orders" USING btree ("tenantId", "sessionId");
CREATE INDEX IF NOT EXISTS "idx_pos_orders_tenant_date" ON "pos_orders" USING btree ("tenantId", "createdAt");

-- ============================================================
-- OPENING BALANCES - Period initialization
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_opening_balances_tenant_period" ON "opening_balances" USING btree ("tenantId", "periodName");
CREATE INDEX IF NOT EXISTS "idx_opening_balances_tenant_account" ON "opening_balances" USING btree ("tenantId", "accountId");

-- ============================================================
-- EXCHANGE RATES - Multi-currency
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_exchange_rates_tenant_from_to_date" ON "exchange_rates" USING btree ("tenantId", "fromCurrencyId", "toCurrencyId", "rateDate");

-- ============================================================
-- SETTINGS - Tenant configuration
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_settings_tenant" ON "settings" USING btree ("tenantId");

-- ============================================================
-- USERS / RBAC - Authentication & Authorization
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_users_tenant_email" ON "users" USING btree ("tenantId", "email");
CREATE INDEX IF NOT EXISTS "idx_users_tenant_active" ON "users" USING btree ("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS "idx_user_roles_tenant_user" ON "user_roles" USING btree ("tenantId", "userId");
CREATE INDEX IF NOT EXISTS "idx_user_roles_tenant_role" ON "user_roles" USING btree ("tenantId", "roleId");
CREATE INDEX IF NOT EXISTS "idx_user_branch_permissions_tenant_user" ON "user_branch_permissions" USING btree ("tenantId", "userId");

-- ============================================================
-- DEVICES - Biometric/Attendance devices
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_devices_tenant_active" ON "devices" USING btree ("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS "idx_devices_tenant_worksite" ON "devices" USING btree ("tenantId", "workSiteId");

-- ============================================================
-- WORK SITES - Multi-location
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_work_sites_tenant" ON "work_sites" USING btree ("tenantId");

-- ============================================================
-- BRANCHES - Multi-branch
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_branches_tenant" ON "branches" USING btree ("tenantId");

-- ============================================================
-- TENANT SUBSCRIPTIONS - SaaS billing
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_tenant_subscriptions_tenant" ON "tenant_subscriptions" USING btree ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_tenant_subscriptions_status" ON "tenant_subscriptions" USING btree ("status");

-- ============================================================
-- BILLING INVOICES - SaaS billing
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_billing_invoices_tenant_tenant" ON "billing_invoices" USING btree ("tenantId", "tenantSubscriptionId");
CREATE INDEX IF NOT EXISTS "idx_billing_invoices_tenant_status" ON "billing_invoices" USING btree ("tenantId", "status");

-- ============================================================
-- PAYMENT HISTORY - SaaS billing
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_payment_history_tenant_billing" ON "payment_history" USING btree ("tenantId", "billingInvoiceId");

-- ============================================================
-- WEBHOOKS / DELIVERIES - Integrations
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_webhooks_tenant" ON "webhooks" USING btree ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_tenant_webhook" ON "webhook_deliveries" USING btree ("tenantId", "webhookId");

-- ============================================================
-- API KEYS - Integrations
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_api_keys_tenant" ON "api_keys" USING btree ("tenantId");

-- ============================================================
-- TEAM INVITATIONS - Onboarding
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_team_invitations_tenant" ON "team_invitations" USING btree ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_team_invitations_tenant_email" ON "team_invitations" USING btree ("tenantId", "email");

-- ============================================================
-- FEATURE FLAGS - Feature toggles
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_feature_flags_tenant" ON "feature_flags" USING btree ("tenantId");

-- ============================================================
-- TRANSLATIONS - i18n
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_translations_tenant_locale" ON "translations" USING btree ("tenantId", "locale");
CREATE INDEX IF NOT EXISTS "idx_translations_tenant_key" ON "translations" USING btree ("tenantId", "translationKey");

-- ============================================================
-- PRODUCT UNITS - Inventory UoM
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_product_units_tenant_product" ON "product_units" USING btree ("tenantId", "productId");

-- ============================================================
-- CATEGORIES - Product categorization
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_categories_tenant_parent" ON "categories" USING btree ("tenantId", "parentId");

-- ============================================================
-- UNITS - Unit of measure
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_units_tenant" ON "units" USING btree ("tenantId");

-- ============================================================
-- WAREHOUSE TRANSFERS - Inter-warehouse
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_warehouse_transfers_tenant_from_to" ON "warehouse_transfers" USING btree ("tenantId", "fromWarehouseId", "toWarehouseId");
CREATE INDEX IF NOT EXISTS "idx_warehouse_transfers_tenant_status" ON "warehouse_transfers" USING btree ("tenantId", "status");

-- ============================================================
-- STOCK ADJUSTMENTS - Inventory corrections
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_stock_adjustments_tenant_warehouse" ON "stock_adjustments" USING btree ("tenantId", "warehouseId");
CREATE INDEX IF NOT EXISTS "idx_stock_adjustments_tenant_product" ON "stock_adjustments" USING btree ("tenantId", "productId");

-- ============================================================
-- INVENTORY BATCHES - Batch tracking
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_inventory_batches_tenant_product" ON "inventory_batches" USING btree ("tenantId", "productId");
CREATE INDEX IF NOT EXISTS "idx_inventory_batches_tenant_expiry" ON "inventory_batches" USING btree ("tenantId", "expiryDate");

-- ============================================================
-- STOCK RESERVATIONS - Reservation system
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_stock_reservations_tenant_product" ON "stock_reservations" USING btree ("tenantId", "productId");
CREATE INDEX IF NOT EXISTS "idx_stock_reservations_tenant_order" ON "stock_reservations" USING btree ("tenantId", "orderId");

-- ============================================================
-- CYCLE COUNTS - Inventory audit
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_cycle_counts_tenant_warehouse" ON "cycle_counts" USING btree ("tenantId", "warehouseId");
CREATE INDEX IF NOT EXISTS "idx_cycle_count_lines_tenant_count" ON "cycle_count_lines" USING btree ("tenantId", "cycleCountId");

-- ============================================================
-- INVENTORY VALUATION LAYERS - FIFO/LIFO
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_inventory_valuation_layers_tenant_product" ON "inventory_valuation_layers" USING btree ("tenantId", "productId");
CREATE INDEX IF NOT EXISTS "idx_inventory_valuation_layers_tenant_warehouse" ON "inventory_valuation_layers" USING btree ("tenantId", "warehouseId");

-- ============================================================
-- DOCUMENTS - Document management
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_documents_tenant_entity" ON "documents" USING btree ("tenantId", "entityType", "entityId");

-- ============================================================
-- REPORT DEFINITIONS / EXECUTIONS - Reporting engine
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_report_definitions_tenant" ON "report_definitions" USING btree ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_report_executions_tenant_definition" ON "report_executions" USING btree ("tenantId", "reportDefinitionId");
CREATE INDEX IF NOT EXISTS "idx_report_executions_tenant_user" ON "report_executions" USING btree ("tenantId", "executedById");

-- ============================================================
-- QUALITY INSPECTIONS - Quality control
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_quality_inspections_tenant_procurement" ON "quality_inspections" USING btree ("tenantId", "procurementId");
CREATE INDEX IF NOT EXISTS "idx_quality_inspections_tenant_result" ON "quality_inspections" USING btree ("tenantId", "result");

-- ============================================================
-- ORDERS / ORDER ITEMS - Sales orders
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_orders_tenant_customer" ON "orders" USING btree ("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "idx_orders_tenant_status" ON "orders" USING btree ("tenantId", "status");
CREATE INDEX IF NOT EXISTS "idx_order_items_tenant_order" ON "order_items" USING btree ("tenantId", "orderId");
CREATE INDEX IF NOT EXISTS "idx_order_items_tenant_product" ON "order_items" USING btree ("tenantId", "productId");

-- ============================================================
-- ACCOUNTS - Chart of accounts
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_accounts_tenant_parent" ON "accounts" USING btree ("tenantId", "parentAccountId");
CREATE INDEX IF NOT EXISTS "idx_accounts_tenant_type" ON "accounts" USING btree ("tenantId", "type");
CREATE INDEX IF NOT EXISTS "idx_accounts_tenant_code" ON "accounts" USING btree ("tenantId", "code");

-- ============================================================
-- DEPARTMENTS / EMPLOYEES - HR
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_departments_tenant_parent" ON "departments" USING btree ("tenantId", "parentId");
CREATE INDEX IF NOT EXISTS "idx_employees_tenant_department" ON "employees" USING btree ("tenantId", "departmentId");
CREATE INDEX IF NOT EXISTS "idx_employees_tenant_status" ON "employees" USING btree ("tenantId", "status");
CREATE INDEX IF NOT EXISTS "idx_employees_tenant_user" ON "employees" USING btree ("tenantId", "userId");

-- ============================================================
-- LOGIN ATTEMPTS - Security audit
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_login_attempts_tenant_user" ON "login_attempts" USING btree ("tenantId", "userId");
CREATE INDEX IF NOT EXISTS "idx_login_attempts_tenant_ip" ON "login_attempts" USING btree ("tenantId", "ipAddress");
CREATE INDEX IF NOT EXISTS "idx_login_attempts_tenant_created" ON "login_attempts" USING btree ("tenantId", "createdAt" DESC);

-- ============================================================
-- PERMISSIONS - RBAC
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_permissions_tenant" ON "permissions" USING btree ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_roles_tenant" ON "roles" USING btree ("tenantId");

-- ============================================================
-- COMPOSITE COVERING INDEXES for common query patterns
-- ============================================================

-- Sales invoice list with customer + rep + offer (Reporting)
CREATE INDEX IF NOT EXISTS "idx_sales_invoices_report_covering" ON "sales_invoices" USING btree ("tenantId", "invoiceDate" DESC) INCLUDE ("customerId", "salesRepId", "offerId", "status", "totalAmount", "currencyId");

-- Transaction list for trial balance (Accounting)
CREATE INDEX IF NOT EXISTS "idx_transactions_trial_balance_covering" ON "transactions" USING btree ("tenantId", "accountId", "transactionDate") INCLUDE ("type", "amount", "isReversed", "currencyId", "exchangeRate", "baseAmount");

-- Inventory stock levels (Real-time)
CREATE INDEX IF NOT EXISTS "idx_warehouse_stock_realtime_covering" ON "warehouse_stock" USING btree ("tenantId", "productId", "warehouseId") INCLUDE ("quantityOnHand", "quantityReserved", "quantityAvailable");

-- Payments for cash flow (Finance)
CREATE INDEX IF NOT EXISTS "idx_payments_cashflow_covering" ON "payments" USING btree ("tenantId", "paymentDate" DESC) INCLUDE ("customerId", "supplierId", "amount", "paymentMethod", "currencyId");

-- Messages for inbox (Messaging)
CREATE INDEX IF NOT EXISTS "idx_messages_inbox_covering" ON "messages" USING btree ("tenantId", "receiverId", "createdAt" DESC) INCLUDE ("senderId", "subject", "body", "readAt");

-- ============================================================
-- PARTIAL INDEXES for filtered queries
-- ============================================================

-- Active sales reps only
CREATE INDEX IF NOT EXISTS "idx_sales_reps_tenant_active_partial" ON "sales_reps" USING btree ("tenantId") WHERE "isActive" = true;

-- Active offers only
CREATE INDEX IF NOT EXISTS "idx_offers_tenant_active_partial" ON "offers" USING btree ("tenantId", "validFrom", "validTo") WHERE "isActive" = true;

-- Open fiscal periods only
CREATE INDEX IF NOT EXISTS "idx_fiscal_periods_tenant_open_partial" ON "fiscal_periods" USING btree ("tenantId", "startDate", "endDate") WHERE "status" = 'open';

-- Unread notifications only
CREATE INDEX IF NOT EXISTS "idx_notifications_tenant_unread_partial" ON "notifications" USING btree ("tenantId", "userId", "createdAt" DESC) WHERE "readAt" IS NULL;

-- Unread messages only
CREATE INDEX IF NOT EXISTS "idx_messages_tenant_unread_partial" ON "messages" USING btree ("tenantId", "receiverId", "createdAt" DESC) WHERE "readAt" IS NULL;

-- Active projects only
CREATE INDEX IF NOT EXISTS "idx_projects_tenant_active_partial" ON "projects" USING btree ("tenantId", "startDate", "endDate") WHERE "status" = 'active';

-- Active recurring expenses only
CREATE INDEX IF NOT EXISTS "idx_recurring_expenses_tenant_active_partial" ON "recurring_expenses" USING btree ("tenantId", "nextRunAt") WHERE "isActive" = true;

-- Scheduled journal entries due
CREATE INDEX IF NOT EXISTS "idx_scheduled_journal_entries_due_partial" ON "scheduled_journal_entries" USING btree ("tenantId", "nextRunAt") WHERE "isActive" = true AND "nextRunAt" <= now();

-- Pending procurements only
CREATE INDEX IF NOT EXISTS "idx_procurements_tenant_pending_partial" ON "procurements" USING btree ("tenantId", "createdAt") WHERE "status" = 'pending';

-- Open tickets only
CREATE INDEX IF NOT EXISTS "idx_tickets_tenant_open_partial" ON "tickets" USING btree ("tenantId", "createdAt" DESC) WHERE "status" IN ('open', 'in_progress');

-- Active POS sessions only
CREATE INDEX IF NOT EXISTS "idx_pos_sessions_tenant_active_partial" ON "pos_sessions" USING btree ("tenantId", "userId", "openedAt") WHERE "status" = 'open';

-- ============================================================
-- STATISTICS UPDATE (run after index creation)
-- ============================================================
ANALYZE;