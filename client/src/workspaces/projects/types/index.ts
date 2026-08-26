export type ProjectStatus =
  | "planning"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled"
  | "archived";

export type TaskStatus = "todo" | "in_progress" | "review" | "done" | "blocked";

export type TaskPriority = "low" | "medium" | "high" | "critical" | "urgent";

export type ActivityType =
  | "task_created"
  | "task_updated"
  | "task_completed"
  | "comment_added"
  | "file_attached"
  | "status_changed"
  | "assignee_changed"
  | "deadline_changed"
  | "milestone_reached"
  | "budget_alert"
  | "risk_identified"
  | "meeting_scheduled";

export interface ProjectMember {
  id: number;
  projectId: number;
  userId: number;
  employeeId?: number;
  role: "owner" | "manager" | "lead" | "member" | "viewer";
  permissions: ProjectPermission[];
  joinedAt: string;
  user?: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    role: string;
  };
  employee?: {
    id: number;
    fullName: string;
    jobTitle: string;
    department?: string;
  };
}

export type ProjectPermission =
  | "view"
  | "edit"
  | "manage_tasks"
  | "manage_members"
  | "manage_budget"
  | "view_reports"
  | "manage_settings"
  | "delete_project";

export interface Project {
  id: number;
  tenantId: number;
  code: string;
  name: string;
  nameAr?: string;
  description?: string;
  status: ProjectStatus;
  startDate: string;
  endDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  budget: number;
  spentBudget: number;
  committedBudget: number;
  currency: string;
  managerId?: number;
  customerId?: number;
  departmentId?: number;
  parentProjectId?: number;
  tags: string[];
  customFields: Record<string, any>;
  progress: number;
  health: "green" | "yellow" | "red";
  riskLevel: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
  createdById: number;
  manager?: {
    id: number;
    name: string;
    email: string;
  };
  customer?: {
    id: number;
    name: string;
    code: string;
  };
  department?: {
    id: number;
    name: string;
  };
  members?: ProjectMember[];
  tasks?: Task[];
  stats?: ProjectStats;
}

export interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  totalHours: number;
  loggedHours: number;
  estimatedHours: number;
  budgetUtilization: number;
  scheduleVariance: number;
  costVariance: number;
  spi: number; // Schedule Performance Index
  cpi: number; // Cost Performance Index
}

export interface Task {
  id: number;
  projectId: number;
  parentTaskId?: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: number;
  reporterId: number;
  startDate?: string;
  dueDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  estimatedHours: number;
  loggedHours: number;
  remainingHours: number;
  progress: number;
  storyPoints?: number;
  tags: string[];
  dependencies: number[];
  customFields: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  assignee?: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
  reporter?: {
    id: number;
    name: string;
  };
  subtasks?: Task[];
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
  timeEntries?: TimeEntry[];
  activity?: Activity[];
}

export interface TaskComment {
  id: number;
  taskId: number;
  userId: number;
  content: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt?: string;
  user?: {
    id: number;
    name: string;
    avatar?: string;
  };
}

export interface TaskAttachment {
  id: number;
  taskId: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedById: number;
  createdAt: string;
}

export interface TimeEntry {
  id: number;
  taskId: number;
  userId: number;
  date: string;
  hours: number;
  description?: string;
  billable: boolean;
  approved: boolean;
  approvedById?: number;
  approvedAt?: string;
  createdAt: string;
  user?: {
    id: number;
    name: string;
  };
}

export interface Activity {
  id: number;
  projectId?: number;
  taskId?: number;
  userId: number;
  type: ActivityType;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  user?: {
    id: number;
    name: string;
    avatar?: string;
  };
}

export interface Milestone {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  date: string;
  status: "pending" | "achieved" | "missed";
  linkedTasks: number[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectBudget {
  id: number;
  projectId: number;
  category: string;
  planned: number;
  committed: number;
  actual: number;
  variance: number;
  variancePercent: number;
  currency: string;
  period: string;
  items: BudgetItem[];
}

export interface BudgetItem {
  id: number;
  budgetId: number;
  name: string;
  description?: string;
  planned: number;
  committed: number;
  actual: number;
  vendor?: string;
  invoiceRef?: string;
  date?: string;
}

export interface Risk {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  probability: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  severity: "low" | "medium" | "high" | "critical";
  status: "identified" | "assessed" | "mitigating" | "monitoring" | "closed";
  ownerId?: number;
  mitigationPlan?: string;
  contingencyPlan?: string;
  identifiedDate: string;
  reviewedDate?: string;
  closedDate?: string;
  owner?: {
    id: number;
    name: string;
  };
}

export interface Issue {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "resolved" | "closed";
  assigneeId?: number;
  reportedById: number;
  reportedDate: string;
  resolvedDate?: string;
  rootCause?: string;
  resolution?: string;
  assignee?: {
    id: number;
    name: string;
  };
}

export interface ProjectFilter {
  status?: ProjectStatus[];
  managerId?: number;
  customerId?: number;
  departmentId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  tags?: string[];
  health?: ("green" | "yellow" | "red")[];
}

export interface TaskFilter {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assigneeId?: number;
  projectId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  tags?: string[];
  overdue?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface DashboardKPI {
  label: string;
  value: number | string;
  change?: number;
  changeType?: "increase" | "decrease" | "neutral";
  trend?: number[];
  format?: "number" | "currency" | "percent" | "duration";
  icon?: string;
  color?: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  category?: string;
  date?: string;
}

export interface ProjectTimelineEvent {
  id: string;
  projectId: number;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  type: "milestone" | "task" | "phase" | "meeting" | "deadline" | "delivery";
  status: "planned" | "in_progress" | "completed" | "delayed";
  color?: string;
  progress?: number;
  assignee?: string;
}
