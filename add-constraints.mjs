import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || "";
if (!DATABASE_URL) { console.error("DATABASE_URL environment variable is required"); process.exit(1); }

const sql = neon(DATABASE_URL);

async function addConstraintsAndIndexes() {
  console.log('Adding CHECK constraints...\n');
  
  const checkConstraints = [
    { table: 'accounts', name: 'chk_account_tenant_not_null', sql: '"accounts"."tenantId" IS NOT NULL' },
    { table: 'api_keys', name: 'chk_api_key_tenant_not_null', sql: '"api_keys"."tenantId" IS NOT NULL' },
    { table: 'attendance', name: 'chk_attendance_tenant_not_null', sql: '"attendance"."tenantId" IS NOT NULL' },
    { table: 'audit_logs', name: 'chk_audit_log_tenant_not_null', sql: '"audit_logs"."tenantId" IS NOT NULL' },
    { table: 'billing_invoices', name: 'chk_billing_invoice_subtotal_not_negative', sql: '"billing_invoices"."subtotal" >= 0' },
    { table: 'billing_invoices', name: 'chk_billing_invoice_tax_not_negative', sql: '"billing_invoices"."taxAmount" >= 0' },
    { table: 'billing_invoices', name: 'chk_billing_invoice_total_not_negative', sql: '"billing_invoices"."total" >= 0' },
    { table: 'billing_invoices', name: 'chk_billing_invoice_tenant_not_null', sql: '"billing_invoices"."tenantId" IS NOT NULL' },
    { table: 'branches', name: 'chk_branch_tenant_not_null', sql: '"branches"."tenantId" IS NOT NULL' },
    { table: 'budgets', name: 'chk_budget_revenue_not_negative', sql: '"budgets"."targetRevenue" >= 0' },
    { table: 'budgets', name: 'chk_budget_expense_not_negative', sql: '"budgets"."targetExpense" >= 0' },
    { table: 'categories', name: 'chk_category_tenant_not_null', sql: '"categories"."tenantId" IS NOT NULL' },
    { table: 'currencies', name: 'chk_currency_rate_positive', sql: '"currencies"."rate" > 0' },
    { table: 'currencies', name: 'chk_currency_code_format', sql: '"currencies"."code" ~ \'^[A-Z]{3}$\'' },
    { table: 'customers', name: 'chk_customer_credit_limit_not_negative', sql: '"customers"."creditLimit" >= 0' },
    { table: 'customers', name: 'chk_customer_tenant_not_null', sql: '"customers"."tenantId" IS NOT NULL' },
    { table: 'departments', name: 'chk_department_tenant_not_null', sql: '"departments"."tenantId" IS NOT NULL' },
    { table: 'devices', name: 'chk_device_tenant_not_null', sql: '"devices"."tenantId" IS NOT NULL' },
    { table: 'documents', name: 'chk_document_tenant_not_null', sql: '"documents"."tenantId" IS NOT NULL' },
    { table: 'employees', name: 'chk_employee_salary_not_negative', sql: '"employees"."salary" >= 0' },
    { table: 'employees', name: 'chk_employee_tenant_not_null', sql: '"employees"."tenantId" IS NOT NULL' },
    { table: 'exchange_rates', name: 'chk_exchange_rate_positive', sql: '"exchange_rates"."rate" > 0' },
    { table: 'file_uploads', name: 'chk_file_upload_size_positive', sql: '"file_uploads"."fileSize" > 0' },
    { table: 'inventory_movements', name: 'chk_inventory_movement_quantity_not_zero', sql: '"inventory_movements"."quantity" != 0' },
    { table: 'inventory_movements', name: 'chk_inventory_movement_tenant_not_null', sql: '"inventory_movements"."tenantId" IS NOT NULL' },
    { table: 'journal_entries', name: 'chk_journal_total_not_negative', sql: '"journal_entries"."totalAmount" >= 0' },
    { table: 'journal_entries', name: 'chk_journal_tenant_not_null', sql: '"journal_entries"."tenantId" IS NOT NULL' },
    { table: 'journal_entries', name: 'chk_journal_immutable_posted', sql: 'CASE WHEN "journal_entries"."status" = \'posted\' THEN "journal_entries"."isImmutable" = true ELSE true END' },
    { table: 'opening_balances', name: 'chk_opening_balance_amount_not_negative', sql: '"opening_balances"."amount" >= 0' },
    { table: 'opening_balances', name: 'chk_opening_balance_exchange_rate_positive', sql: '"opening_balances"."exchangeRate" > 0' },
    { table: 'orders', name: 'chk_order_total_not_negative', sql: '"orders"."total" >= 0' },
    { table: 'orders', name: 'chk_order_tenant_not_null', sql: '"orders"."tenantId" IS NOT NULL' },
    { table: 'payment_history', name: 'chk_payment_history_amount_positive', sql: '"payment_history"."amount" > 0' },
    { table: 'payment_history', name: 'chk_payment_history_refund_not_negative', sql: '"payment_history"."refundedAmount" >= 0' },
    { table: 'payment_history', name: 'chk_payment_history_tenant_not_null', sql: '"payment_history"."tenantId" IS NOT NULL' },
    { table: 'payments', name: 'chk_payment_amount_positive', sql: '"payments"."amount" > 0' },
    { table: 'payments', name: 'chk_payment_base_amount_positive', sql: '"payments"."baseAmount" >= 0' },
    { table: 'payments', name: 'chk_payment_exchange_rate_positive', sql: '"payments"."exchangeRate" > 0' },
    { table: 'payments', name: 'chk_payment_tenant_not_null', sql: '"payments"."tenantId" IS NOT NULL' },
    { table: 'payroll_items', name: 'chk_payroll_item_basic_not_negative', sql: '"payroll_items"."basicSalary" >= 0' },
    { table: 'payroll_items', name: 'chk_payroll_item_deductions_not_negative', sql: '"payroll_items"."deductions" >= 0' },
    { table: 'payroll_items', name: 'chk_payroll_item_net_not_negative', sql: '"payroll_items"."net" >= 0' },
    { table: 'payroll_items', name: 'chk_payroll_item_tenant_not_null', sql: '"payroll_items"."tenantId" IS NOT NULL' },
    { table: 'payroll_runs', name: 'chk_payroll_run_total_not_negative', sql: '"payroll_runs"."totalNet" >= 0' },
    { table: 'payroll_runs', name: 'chk_payroll_run_tenant_not_null', sql: '"payroll_runs"."tenantId" IS NOT NULL' },
    { table: 'pos_orders', name: 'chk_pos_order_total_not_negative', sql: '"pos_orders"."total" >= 0' },
    { table: 'pos_orders', name: 'chk_pos_order_tenant_not_null', sql: '"pos_orders"."tenantId" IS NOT NULL' },
    { table: 'pos_sessions', name: 'chk_pos_session_tenant_not_null', sql: '"pos_sessions"."tenantId" IS NOT NULL' },
    { table: 'procurement_approvals', name: 'chk_procurement_approval_tenant_not_null', sql: '"procurement_approvals"."tenantId" IS NOT NULL' },
    { table: 'procurements', name: 'chk_procurement_quantity_positive', sql: '"procurements"."quantity" > 0' },
    { table: 'procurements', name: 'chk_procurement_estimated_cost_not_negative', sql: '"procurements"."estimatedCost" >= 0' },
    { table: 'procurements', name: 'chk_procurement_tenant_not_null', sql: '"procurements"."tenantId" IS NOT NULL' },
    { table: 'products', name: 'chk_product_purchase_price_not_negative', sql: '"products"."purchasePrice" >= 0' },
    { table: 'products', name: 'chk_product_sale_price_not_negative', sql: '"products"."salePrice" >= 0' },
    { table: 'products', name: 'chk_product_wholesale_price_not_negative', sql: '"products"."wholesalePrice" >= 0' },
    { table: 'products', name: 'chk_product_conversion_factor_positive', sql: '"products"."conversionFactor" > 0' },
    { table: 'products', name: 'chk_product_tenant_not_null', sql: '"products"."tenantId" IS NOT NULL' },
    { table: 'project_members', name: 'chk_project_member_tenant_not_null', sql: '"project_members"."tenantId" IS NOT NULL' },
    { table: 'project_tasks', name: 'chk_project_task_tenant_not_null', sql: '"project_tasks"."tenantId" IS NOT NULL' },
    { table: 'projects', name: 'chk_project_budget_not_negative', sql: '"projects"."budget" >= 0' },
    { table: 'projects', name: 'chk_project_tenant_not_null', sql: '"projects"."tenantId" IS NOT NULL' },
    { table: 'purchase_invoices', name: 'chk_purchase_invoice_subtotal_not_negative', sql: '"purchase_invoices"."subtotal" >= 0' },
    { table: 'purchase_invoices', name: 'chk_purchase_invoice_tax_rate_not_negative', sql: '"purchase_invoices"."taxRate" >= 0' },
    { table: 'purchase_invoices', name: 'chk_purchase_invoice_tax_amount_not_negative', sql: '"purchase_invoices"."taxAmount" >= 0' },
    { table: 'purchase_invoices', name: 'chk_purchase_invoice_discount_not_negative', sql: '"purchase_invoices"."discount" >= 0' },
    { table: 'purchase_invoices', name: 'chk_purchase_invoice_total_not_negative', sql: '"purchase_invoices"."total" >= 0' },
    { table: 'purchase_invoices', name: 'chk_purchase_invoice_paid_not_negative', sql: '"purchase_invoices"."paidAmount" >= 0' },
    { table: 'purchase_invoices', name: 'chk_purchase_invoice_exchange_rate_positive', sql: '"purchase_invoices"."exchangeRate" > 0' },
    { table: 'purchase_invoices', name: 'chk_purchase_invoice_base_amount_not_negative', sql: '"purchase_invoices"."baseAmount" >= 0' },
    { table: 'purchase_invoices', name: 'chk_purchase_invoice_tenant_not_null', sql: '"purchase_invoices"."tenantId" IS NOT NULL' },
    { table: 'quality_inspections', name: 'chk_quality_score_range', sql: '"quality_inspections"."score" IS NULL OR ("quality_inspections"."score" >= 0 AND "quality_inspections"."score" <= 100)' },
    { table: 'quality_inspections', name: 'chk_quality_tenant_not_null', sql: '"quality_inspections"."tenantId" IS NOT NULL' },
    { table: 'roles', name: 'chk_role_tenant_not_null', sql: '"roles"."tenantId" IS NOT NULL' },
    { table: 'sales_invoices', name: 'chk_sales_invoice_subtotal_not_negative', sql: '"sales_invoices"."subtotal" >= 0' },
    { table: 'sales_invoices', name: 'chk_sales_invoice_tax_rate_not_negative', sql: '"sales_invoices"."taxRate" >= 0' },
    { table: 'sales_invoices', name: 'chk_sales_invoice_tax_amount_not_negative', sql: '"sales_invoices"."taxAmount" >= 0' },
    { table: 'sales_invoices', name: 'chk_sales_invoice_discount_not_negative', sql: '"sales_invoices"."discount" >= 0' },
    { table: 'sales_invoices', name: 'chk_sales_invoice_total_not_negative', sql: '"sales_invoices"."total" >= 0' },
    { table: 'sales_invoices', name: 'chk_sales_invoice_paid_not_negative', sql: '"sales_invoices"."paidAmount" >= 0' },
    { table: 'sales_invoices', name: 'chk_sales_invoice_currency_rate_positive', sql: '"sales_invoices"."currencyRate" > 0' },
    { table: 'sales_invoices', name: 'chk_sales_invoice_tenant_not_null', sql: '"sales_invoices"."tenantId" IS NOT NULL' },
    { table: 'sales_invoices', name: 'chk_sales_invoice_status_posted_immutable', sql: 'CASE WHEN "sales_invoices"."status" IN (\'paid\', \'cancelled\') THEN "sales_invoices"."postedAt" IS NOT NULL ELSE true END' },
    { table: 'settings', name: 'chk_settings_tenant_not_null', sql: '"settings"."tenantId" IS NOT NULL' },
    { table: 'stock_adjustments', name: 'chk_stock_adjustment_tenant_not_null', sql: '"stock_adjustments"."tenantId" IS NOT NULL' },
    { table: 'subscription_plans', name: 'chk_subscription_plan_price_monthly_positive', sql: '"subscription_plans"."priceMonthly" > 0' },
    { table: 'subscription_plans', name: 'chk_subscription_plan_price_yearly_positive', sql: '"subscription_plans"."priceYearly" > 0' },
    { table: 'subscription_plans', name: 'chk_subscription_plan_currency_format', sql: '"subscription_plans"."currency" ~ \'^[A-Z]{3}$\'' },
    { table: 'suppliers', name: 'chk_supplier_tenant_not_null', sql: '"suppliers"."tenantId" IS NOT NULL' },
    { table: 'team_invitations', name: 'chk_team_invitation_tenant_not_null', sql: '"team_invitations"."tenantId" IS NOT NULL' },
    { table: 'tenant_subscriptions', name: 'chk_tenant_sub_tenant_not_null', sql: '"tenant_subscriptions"."tenantId" IS NOT NULL' },
    { table: 'tenants', name: 'chk_tenant_currency_valid', sql: '"tenants"."currency" ~ \'^[A-Z]{3}$\'' },
    { table: 'tickets', name: 'chk_ticket_tenant_not_null', sql: '"tickets"."tenantId" IS NOT NULL' },
    { table: 'transactions', name: 'chk_transaction_amount_not_negative', sql: '"transactions"."amount" >= 0' },
    { table: 'transactions', name: 'chk_transaction_base_amount_not_negative', sql: '"transactions"."baseAmount" >= 0' },
    { table: 'transactions', name: 'chk_transaction_exchange_rate_positive', sql: '"transactions"."exchangeRate" > 0' },
    { table: 'transactions', name: 'chk_transaction_tenant_not_null', sql: '"transactions"."tenantId" IS NOT NULL' },
    { table: 'transactions', name: 'chk_transaction_account_not_null', sql: '"transactions"."accountId" IS NOT NULL' },
    { table: 'units', name: 'chk_unit_conversion_positive', sql: '"units"."conversionFactor" > 0' },
    { table: 'units', name: 'chk_unit_tenant_not_null', sql: '"units"."tenantId" IS NOT NULL' },
    { table: 'user_roles', name: 'chk_user_role_tenant_not_null', sql: '"user_roles"."tenantId" IS NOT NULL' },
    { table: 'warehouse_transfers', name: 'chk_warehouse_transfer_quantity_positive', sql: '"warehouse_transfers"."quantity" > 0' },
    { table: 'warehouse_transfers', name: 'chk_warehouse_transfer_tenant_not_null', sql: '"warehouse_transfers"."tenantId" IS NOT NULL' },
    { table: 'warehouse_transfers', name: 'chk_warehouse_transfer_from_to_different', sql: '"warehouse_transfers"."fromWarehouseId" != "warehouse_transfers"."toWarehouseId"' },
    { table: 'warehouses', name: 'chk_warehouse_tenant_not_null', sql: '"warehouses"."tenantId" IS NOT NULL' },
    { table: 'webhooks', name: 'chk_webhook_tenant_not_null', sql: '"webhooks"."tenantId" IS NOT NULL' },
    { table: 'work_sites', name: 'chk_workSite_tenant_not_null', sql: '"work_sites"."tenantId" IS NOT NULL' },
  ];
  
  for (const c of checkConstraints) {
    try {
      await sql.unsafe(`ALTER TABLE "${c.table}" ADD CONSTRAINT "${c.name}" CHECK (${c.sql})`);
      console.log(`✓ ${c.name}`);
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log(`⊘ ${c.name} (exists)`);
      } else {
        console.log(`✗ ${c.name}: ${e.message}`);
      }
    }
  }
  
  console.log('\nAdding UNIQUE constraints...\n');
  
  const uniqueConstraints = [
    { table: 'accounts', name: 'accounts_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'activity_logs', name: 'activity_logs_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'api_keys', name: 'api_keys_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'attendance', name: 'attendance_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'attendance', name: 'attendance_employee_date_unique', cols: ['employeeId', 'date'] },
    { table: 'audit_logs', name: 'audit_logs_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'billing_invoices', name: 'billing_invoices_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'branches', name: 'branches_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'branches', name: 'branches_code_tenant_unique', cols: ['code', 'tenantId'] },
    { table: 'budgets', name: 'budgets_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'budgets', name: 'budgets_tenant_period_unique', cols: ['tenantId', 'periodName'] },
    { table: 'categories', name: 'categories_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'currencies', name: 'currencies_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'customers', name: 'customers_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'departments', name: 'departments_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'devices', name: 'devices_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'devices', name: 'devices_fingerprint_unique', cols: ['fingerprint'] },
    { table: 'documents', name: 'documents_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'employees', name: 'employees_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'exchange_rates', name: 'exchange_rates_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'exchange_rates', name: 'exchange_rates_pair_effective_unique', cols: ['baseCurrency', 'quoteCurrency', 'effectiveFrom'] },
    { table: 'feature_flags', name: 'feature_flags_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'feature_flags', name: 'feature_flags_tenant_key_unique', cols: ['tenantId', 'key'] },
    { table: 'file_uploads', name: 'file_uploads_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'inventory_movements', name: 'inventory_movements_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'journal_entries', name: 'journal_entries_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'login_attempts', name: 'login_attempts_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'notifications', name: 'notifications_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'opening_balances', name: 'opening_balances_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'opening_balances', name: 'openingBalances_account_period_tenant_unique', cols: ['accountId', 'periodName', 'tenantId'] },
    { table: 'orders', name: 'orders_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'payment_history', name: 'payment_history_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'payments', name: 'payments_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'payroll_items', name: 'payroll_items_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'payroll_items', name: 'payroll_items_run_employee_unique', cols: ['payrollRunId', 'employeeId'] },
    { table: 'payroll_runs', name: 'payroll_runs_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'payroll_runs', name: 'payroll_runs_tenant_period_unique', cols: ['tenantId', 'periodName'] },
    { table: 'permissions', name: 'permissions_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'pos_orders', name: 'pos_orders_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'pos_sessions', name: 'pos_sessions_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'procurement_approvals', name: 'procurement_approvals_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'procurement_approvals', name: 'procurement_approvals_proc_level_unique', cols: ['procurementId', 'level'] },
    { table: 'procurements', name: 'procurements_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'products', name: 'products_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'project_members', name: 'project_members_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'project_members', name: 'project_members_project_employee_unique', cols: ['projectId', 'employeeId'] },
    { table: 'project_tasks', name: 'project_tasks_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'projects', name: 'projects_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'purchase_invoices', name: 'purchase_invoices_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'quality_inspections', name: 'quality_inspections_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'roles', name: 'roles_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'sales_invoices', name: 'sales_invoices_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'settings', name: 'settings_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'stock_adjustments', name: 'stock_adjustments_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'subscription_plans', name: 'subscription_plans_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'suppliers', name: 'suppliers_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'team_invitations', name: 'team_invitations_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'tenant_subscriptions', name: 'tenant_subscriptions_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'tenants', name: 'tenants_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'tickets', name: 'tickets_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'transactions', name: 'transactions_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'units', name: 'units_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'user_branch_permissions', name: 'user_branch_permissions_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'user_branch_permissions', name: 'userBranchPermissions_tenant_user_branch_unique', cols: ['tenantId', 'userId', 'branchId'] },
    { table: 'user_roles', name: 'user_roles_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'users', name: 'users_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'warehouse_transfers', name: 'warehouse_transfers_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'warehouses', name: 'warehouses_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'webhook_deliveries', name: 'webhook_deliveries_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'webhooks', name: 'webhooks_GlobalId_unique', cols: ['GlobalId'] },
    { table: 'work_sites', name: 'work_sites_GlobalId_unique', cols: ['GlobalId'] },
  ];
  
  for (const u of uniqueConstraints) {
    try {
      await sql.unsafe(`ALTER TABLE "${u.table}" ADD CONSTRAINT "${u.name}" UNIQUE (${u.cols.join(', ')})`);
      console.log(`✓ ${u.name}`);
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log(`⊘ ${u.name} (exists)`);
      } else {
        console.log(`✗ ${u.name}: ${e.message}`);
      }
    }
  }
  
  console.log('\nAdding indexes...\n');
  
  const indexes = [
    { name: 'idx_accounts_tenant_type', table: 'accounts', cols: ['tenantId', 'type'] },
    { name: 'idx_activityLogs_session', table: 'activity_logs', cols: ['sessionId'] },
    { name: 'idx_activityLogs_entity', table: 'activity_logs', cols: ['entityType', 'entityId'] },
    { name: 'idx_activityLogs_chain', table: 'activity_logs', cols: ['tenantId', 'chainSequence'] },
    { name: 'idx_attendance_date', table: 'attendance', cols: ['date'] },
    { name: 'idx_audit_logs_session', table: 'audit_logs', cols: ['sessionId'] },
    { name: 'idx_audit_logs_entity_global', table: 'audit_logs', cols: ['entityGlobalId'] },
    { name: 'idx_audit_logs_chain', table: 'audit_logs', cols: ['tenantId', 'chainSequence'] },
    { name: 'idx_billing_invoice_currency', table: 'billing_invoices', cols: ['currencyId'] },
    { name: 'idx_currencies_tenant', table: 'currencies', cols: ['tenantId'] },
    { name: 'idx_customers_tenant_deleted', table: 'customers', cols: ['tenantId', 'deletedAt'] },
    { name: 'idx_customers_currency', table: 'customers', cols: ['currencyId'] },
    { name: 'idx_employees_currency', table: 'employees', cols: ['currencyId'] },
    { name: 'idx_file_uploads_hash', table: 'file_uploads', cols: ['sha256Hash'] },
    { name: 'idx_file_uploads_retention', table: 'file_uploads', cols: ['retentionExpiresAt'] },
    { name: 'idx_inventoryMovements_product', table: 'inventory_movements', cols: ['productId'] },
    { name: 'idx_inventoryMovements_warehouse', table: 'inventory_movements', cols: ['warehouseId'] },
    { name: 'idx_journal_currency', table: 'journal_entries', cols: ['currencyId'] },
    { name: 'idx_login_attempts_tenant_created', table: 'login_attempts', cols: ['tenantId', 'createdAt'] },
    { name: 'idx_login_attempts_ip', table: 'login_attempts', cols: ['ip'] },
    { name: 'idx_login_attempts_device', table: 'login_attempts', cols: ['deviceFingerprint'] },
    { name: 'idx_orders_currency', table: 'orders', cols: ['currencyId'] },
    { name: 'idx_payment_history_currency', table: 'payment_history', cols: ['currencyId'] },
    { name: 'idx_payments_currency', table: 'payments', cols: ['currencyId'] },
    { name: 'idx_payroll_items_employee', table: 'payroll_items', cols: ['employeeId'] },
    { name: 'idx_pos_orders_currency', table: 'pos_orders', cols: ['currencyId'] },
    { name: 'idx_pos_sessions_currency', table: 'pos_sessions', cols: ['currencyId'] },
    { name: 'idx_procurements_currency', table: 'procurements', cols: ['currencyId'] },
    { name: 'idx_products_tenant_deleted', table: 'products', cols: ['tenantId', 'deletedAt'] },
    { name: 'idx_products_currency', table: 'products', cols: ['currencyId'] },
    { name: 'idx_project_members_employee', table: 'project_members', cols: ['employeeId'] },
    { name: 'idx_project_tasks_assignee', table: 'project_tasks', cols: ['assigneeId'] },
    { name: 'idx_projects_currency', table: 'projects', cols: ['currencyId'] },
    { name: 'idx_purchaseInvoices_currency', table: 'purchase_invoices', cols: ['currencyId'] },
    { name: 'idx_salesInvoices_currency', table: 'sales_invoices', cols: ['currencyId'] },
    { name: 'idx_suppliers_tenant_deleted', table: 'suppliers', cols: ['tenantId', 'deletedAt'] },
    { name: 'idx_suppliers_currency', table: 'suppliers', cols: ['currencyId'] },
    { name: 'idx_tenant_sub_currency', table: 'tenant_subscriptions', cols: ['currencyId'] },
    { name: 'idx_tickets_assigned', table: 'tickets', cols: ['assignedToId'] },
    { name: 'idx_transactions_currency', table: 'transactions', cols: ['currencyId'] },
    { name: 'idx_transactions_tenant_account_date', table: 'transactions', cols: ['tenantId', 'accountId', 'transactionDate'] },
    { name: 'idx_users_session', table: 'users', cols: ['currentSessionId'] },
    { name: 'idx_webhook_deliveries_created', table: 'webhook_deliveries', cols: ['createdAt'] },
  ];
  
  for (const idx of indexes) {
    try {
      await sql.unsafe(`CREATE INDEX IF NOT EXISTS "${idx.name}" ON "${idx.table}" USING btree (${idx.cols.join(', ')})`);
      console.log(`✓ ${idx.name}`);
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log(`⊘ ${idx.name} (exists)`);
      } else {
        console.log(`✗ ${idx.name}: ${e.message}`);
      }
    }
  }
  
  console.log('\nDone!');
  process.exit(0);
}

addConstraintsAndIndexes().catch(console.error);