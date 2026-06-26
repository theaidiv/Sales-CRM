export type Role = "Admin" | "Sales Head" | "Sales Executive";
export type CustomerCategory = "Regular" | "Detached" | "New";
export type HealthBand = "Healthy" | "Stable" | "At Risk" | "Detached Risk";
export type OppStage =
  | "New"
  | "Contacted"
  | "Meeting Scheduled"
  | "Quotation Shared"
  | "Negotiation"
  | "Won"
  | "Lost"
  | "On Hold";
export type ActivityType =
  | "Call"
  | "Meeting"
  | "Visit"
  | "Follow-Up"
  | "Quotation"
  | "Order"
  | "Email";

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: Role;
  team: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  company_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  country: string | null;
  industry: string | null;
  assigned_to: string | null;
  category: CustomerCategory;
  last_contact_date: string | null;
  last_order_date: string | null;
  total_revenue: number;
  status: string;
  health_score: number;
  health_band: HealthBand;
  notes: string | null;
  created_at: string;
}

export interface Opportunity {
  id: string;
  customer_id: string | null;
  title: string;
  assigned_to: string | null;
  stage: OppStage;
  value: number;
  probability: number;
  expected_close_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  user_id: string | null;
  customer_id: string | null;
  opportunity_id: string | null;
  activity_date: string;
  notes: string | null;
  outcome: string | null;
  created_at: string;
}

export interface OrderRow {
  id: string;
  customer_id: string | null;
  amount: number;
  order_date: string;
  created_at: string;
}

export interface Quotation {
  id: string;
  customer_id: string | null;
  opportunity_id: string | null;
  amount: number;
  status: "Draft" | "Sent" | "Accepted" | "Rejected";
  quote_date: string;
  created_at: string;
}

export interface Target {
  id: string;
  scope: "company" | "team" | "user";
  period_type: "annual" | "quarterly" | "monthly";
  period: string;
  owner_id: string | null;
  team: string | null;
  target_amount: number;
  achieved_amount: number;
  created_at: string;
}

export interface Comment {
  id: string;
  entity_type: "customer" | "opportunity";
  entity_id: string;
  user_id: string | null;
  body: string;
  created_at: string;
}

// Stage win-probability weights used by the projection engine.
export const STAGE_PROBABILITY: Record<OppStage, number> = {
  New: 0.1,
  Contacted: 0.2,
  "Meeting Scheduled": 0.35,
  "Quotation Shared": 0.55,
  Negotiation: 0.75,
  Won: 1,
  Lost: 0,
  "On Hold": 0.15,
};
