import { createClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/auth";
import {
  buildAnalytics, recentRevenueMap, monthlyRevenueSeries, revenueByFiscalYear,
  type DashboardData, type MonthPoint, type YoYPoint,
} from "@/lib/analytics";
import type {
  Profile, Customer, Opportunity, Activity, Quotation, Target, Comment, OrderRow,
} from "@/lib/types";

/**
 * Role-scoped data access. Sales Executives see only records assigned to them;
 * Admin / Sales Head see everything. Filtering happens here in the app layer.
 */
export async function getCustomers(profile: Profile): Promise<Customer[]> {
  const supabase = createClient();
  let q = supabase.from("customers").select("*").order("total_revenue", { ascending: false });
  if (!isManager(profile.role)) q = q.eq("assigned_to", profile.id);
  const { data } = await q.limit(2000);
  return (data as Customer[]) ?? [];
}

export async function getOpportunities(profile: Profile): Promise<Opportunity[]> {
  const supabase = createClient();
  let q = supabase.from("opportunities").select("*").order("value", { ascending: false });
  if (!isManager(profile.role)) q = q.eq("assigned_to", profile.id);
  const { data } = await q.limit(2000);
  return (data as Opportunity[]) ?? [];
}

export async function getActivities(profile: Profile, limit = 200): Promise<Activity[]> {
  const supabase = createClient();
  let q = supabase.from("activities").select("*").order("activity_date", { ascending: false });
  if (!isManager(profile.role)) q = q.eq("user_id", profile.id);
  const { data } = await q.limit(limit);
  return (data as Activity[]) ?? [];
}

export async function getQuotations(profile: Profile): Promise<Quotation[]> {
  const supabase = createClient();
  // Quotations are filtered by the customers the user can see.
  const customers = await getCustomers(profile);
  const ids = customers.map((c) => c.id);
  if (ids.length === 0) return [];
  const { data } = await supabase.from("quotations").select("*").in("customer_id", ids).limit(2000);
  return (data as Quotation[]) ?? [];
}

export async function getOrders(profile: Profile, customers?: Customer[]): Promise<OrderRow[]> {
  const supabase = createClient();
  const manager = isManager(profile.role);
  const ids = manager ? [] : (customers ?? (await getCustomers(profile))).map((c) => c.id);
  if (!manager && ids.length === 0) return [];

  // Paginate explicitly — Supabase caps each request at 1000 rows.
  const rows: OrderRow[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    let q = supabase.from("orders").select("*").order("order_date", { ascending: false }).range(from, from + page - 1);
    if (!manager) q = q.in("customer_id", ids);
    const { data } = await q;
    if (!data || data.length === 0) break;
    rows.push(...(data as OrderRow[]));
    if (data.length < page) break;
  }
  return rows;
}

export async function getTargets(): Promise<Target[]> {
  const supabase = createClient();
  const { data } = await supabase.from("targets").select("*");
  return (data as Target[]) ?? [];
}

export async function getProfiles(): Promise<Profile[]> {
  const supabase = createClient();
  const { data } = await supabase.from("profiles").select("*");
  return (data as Profile[]) ?? [];
}

export interface AnalyticsBundle extends DashboardData {
  orders: OrderRow[];
  monthlySeries: MonthPoint[];
  yoy: YoYPoint[];
  quotations: Quotation[];
  allTargets: Target[];
  recent: Record<string, number>;
}

/** One-shot fetch + compute for the analytics-heavy pages. */
export async function getAnalyticsBundle(profile: Profile): Promise<AnalyticsBundle> {
  const customers = await getCustomers(profile);
  const [opportunities, quotations, allTargets, orders] = await Promise.all([
    getOpportunities(profile),
    getQuotations(profile),
    getTargets(),
    getOrders(profile, customers),
  ]);
  const recent = recentRevenueMap(orders);
  const analytics = buildAnalytics(profile, customers, opportunities, quotations, allTargets, recent);
  return {
    ...analytics,
    orders,
    quotations,
    allTargets,
    recent,
    monthlySeries: monthlyRevenueSeries(orders, 24),
    yoy: revenueByFiscalYear(orders, 3),
  };
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const supabase = createClient();
  const { data } = await supabase.from("customers").select("*").eq("id", id).single();
  return (data as Customer) ?? null;
}

export async function getCustomerTimeline(customerId: string): Promise<{
  activities: Activity[];
  comments: Comment[];
  opportunities: Opportunity[];
}> {
  const supabase = createClient();
  const [a, c, o] = await Promise.all([
    supabase.from("activities").select("*").eq("customer_id", customerId).order("activity_date", { ascending: false }).limit(50),
    supabase.from("comments").select("*").eq("entity_type", "customer").eq("entity_id", customerId).order("created_at", { ascending: false }).limit(50),
    supabase.from("opportunities").select("*").eq("customer_id", customerId).order("value", { ascending: false }),
  ]);
  return {
    activities: (a.data as Activity[]) ?? [],
    comments: (c.data as Comment[]) ?? [],
    opportunities: (o.data as Opportunity[]) ?? [],
  };
}
