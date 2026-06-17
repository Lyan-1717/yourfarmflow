import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentProjectId, useProjects } from "@/lib/current-project";
import { NoProject } from "@/components/no-project";
import { formatRWF } from "@/lib/format";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";

export const Route = createFileRoute("/_authenticated/statistics")({
  head: () => ({ meta: [{ title: "Livestock Statistics — YourFarmFlow" }] }),
  component: StatsPage,
});

const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#6366f1", "#06b6d4"];

function StatsPage() {
  const projectId = useCurrentProjectId();
  const { data: projects = [] } = useProjects();
  const project = projects.find((p) => p.id === projectId);

  const { data: animals = [] } = useQuery({
    enabled: !!projectId, queryKey: ["animals", projectId],
    queryFn: async () => (await supabase.from("animals").select("*").eq("project_id", projectId!)).data ?? [],
  });
  const { data: births = [] } = useQuery({
    enabled: !!projectId, queryKey: ["births", projectId],
    queryFn: async () => (await supabase.from("birth_records").select("*").eq("project_id", projectId!).order("birth_date")).data ?? [],
  });
  const { data: groups = [] } = useQuery({
    enabled: !!projectId, queryKey: ["livestock", projectId],
    queryFn: async () => (await supabase.from("livestock").select("*").eq("project_id", projectId!)).data ?? [],
  });
  const { data: income = [] } = useQuery({
    enabled: !!projectId, queryKey: ["income", projectId],
    queryFn: async () => (await supabase.from("income").select("*").eq("project_id", projectId!)).data ?? [],
  });
  const { data: expenses = [] } = useQuery({
    enabled: !!projectId, queryKey: ["expenses", projectId],
    queryFn: async () => (await supabase.from("expenses").select("*").eq("project_id", projectId!)).data ?? [],
  });
  const { data: milk = [] } = useQuery({
    enabled: !!projectId, queryKey: ["milk", projectId],
    queryFn: async () => (await supabase.from("milk_records").select("*").eq("project_id", projectId!)).data ?? [],
  });

  if (!projectId) return <NoProject label="statistics" />;
  if (project && project.type !== "livestock") {
    return <div className="max-w-3xl mx-auto"><Card><CardHeader><CardTitle>Livestock only</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Switch to a Livestock project.</CardContent></Card></div>;
  }

  // Births by month
  const birthsByMonth: Record<string, number> = {};
  births.forEach((b: any) => {
    const m = b.birth_date.slice(0, 7);
    birthsByMonth[m] = (birthsByMonth[m] || 0) + Number(b.num_offspring);
  });
  const birthChart = Object.entries(birthsByMonth).map(([m, v]) => ({ month: m, births: v }));

  // Mortality
  const deceased = animals.filter((a: any) => a.status === "Deceased").length;
  const sold = animals.filter((a: any) => a.status === "Sold").length;
  const alive = animals.length - deceased - sold;
  const mortalityRate = animals.length ? (deceased / animals.length) * 100 : 0;

  // Type breakdown
  const byType: Record<string, number> = {};
  animals.forEach((a: any) => { byType[a.animal_type] = (byType[a.animal_type] || 0) + 1; });
  const typeChart = Object.entries(byType).map(([name, value]) => ({ name, value }));

  // Revenue/expense by month
  const finByMonth: Record<string, { income: number; expense: number }> = {};
  income.forEach((r: any) => { const m = r.income_date.slice(0,7); finByMonth[m] = finByMonth[m] || { income: 0, expense: 0 }; finByMonth[m].income += Number(r.amount); });
  expenses.forEach((r: any) => { const m = r.expense_date.slice(0,7); finByMonth[m] = finByMonth[m] || { income: 0, expense: 0 }; finByMonth[m].expense += Number(r.amount); });
  const finChart = Object.entries(finByMonth).sort().map(([m, v]) => ({ month: m, ...v, profit: v.income - v.expense }));

  const totalMilk = milk.reduce((s: number, m: any) => s + Number(m.liters), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Livestock Statistics</h2>
        <p className="text-muted-foreground text-sm">Herd, financial, and production trends.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Herd size</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{alive}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Births recorded</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{births.reduce((s: number, b: any) => s + Number(b.num_offspring), 0)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Mortality rate</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{mortalityRate.toFixed(1)}%</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total milk</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totalMilk.toFixed(0)} L</CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Births by month</CardTitle></CardHeader><CardContent className="h-64">
          {birthChart.length === 0 ? <p className="text-sm text-muted-foreground">No births recorded.</p> :
            <ResponsiveContainer><BarChart data={birthChart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Bar dataKey="births" fill="hsl(var(--primary))" /></BarChart></ResponsiveContainer>}
        </CardContent></Card>

        <Card><CardHeader><CardTitle>Population by type</CardTitle></CardHeader><CardContent className="h-64">
          {typeChart.length === 0 ? <p className="text-sm text-muted-foreground">No animals yet.</p> :
            <ResponsiveContainer><PieChart><Pie data={typeChart} dataKey="value" nameKey="name" outerRadius={80} label>{typeChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>}
        </CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle>Revenue, expenses & profit by month</CardTitle></CardHeader><CardContent className="h-72">
        {finChart.length === 0 ? <p className="text-sm text-muted-foreground">No financial data yet.</p> :
          <ResponsiveContainer><LineChart data={finChart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} /><Tooltip formatter={(v: number) => formatRWF(v)} /><Line dataKey="income" stroke="#10b981" /><Line dataKey="expense" stroke="#ef4444" /><Line dataKey="profit" stroke="hsl(var(--primary))" strokeWidth={2} /></LineChart></ResponsiveContainer>}
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Per-group breakdown</CardTitle></CardHeader><CardContent>
        <ul className="divide-y">
          {groups.map((g: any) => {
            const inGroup = animals.filter((a: any) => a.group_id === g.id);
            const value = inGroup.reduce((s: number, a: any) => s + Number(a.estimated_value || 0), 0);
            return (
              <li key={g.id} className="py-2 flex justify-between text-sm">
                <span><b>{g.name}</b> <span className="text-muted-foreground">· {g.animal_type}</span></span>
                <span>{inGroup.length} animals · <b>{formatRWF(value)}</b></span>
              </li>
            );
          })}
        </ul>
      </CardContent></Card>
    </div>
  );
}