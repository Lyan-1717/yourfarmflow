import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, TrendingUp, Wallet, Sprout, Activity, Home, Tractor } from "lucide-react";
import { formatRWF, formatDate } from "@/lib/format";
import { useCurrentProjectId, useProjects } from "@/lib/current-project";
import { NoProject } from "@/components/no-project";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — YourFarmFlow" }] }),
  component: Dashboard,
});

function Dashboard() {
  const projectId = useCurrentProjectId();
  const { data: projects = [] } = useProjects();
  const current = projects.find((p) => p.id === projectId);

  const { data } = useQuery({
    enabled: !!projectId,
    queryKey: ["dashboard", projectId],
    queryFn: async () => {
      const [exp, inc, crops, acts] = await Promise.all([
        supabase.from("expenses").select("amount").eq("project_id", projectId!),
        supabase.from("income").select("amount").eq("project_id", projectId!),
        supabase.from("crops").select("id,name,status").eq("project_id", projectId!),
        supabase.from("activities").select("id,type,activity_date,notes,crop_id").eq("project_id", projectId!).order("activity_date", { ascending: false }).limit(5),
      ]);
      const totalExp = (exp.data ?? []).reduce((s, r: any) => s + Number(r.amount), 0);
      const totalInc = (inc.data ?? []).reduce((s, r: any) => s + Number(r.amount), 0);
      const active = (crops.data ?? []).filter((c: any) => c.status === "growing").length;
      return { totalExp, totalInc, profit: totalInc - totalExp, active, recent: acts.data ?? [] };
    },
  });

  if (!projectId) return <NoProject label="the dashboard" />;

  const isFarm = current?.type !== "building";
  const stats = [
    { label: "Total Income", value: formatRWF(data?.totalInc ?? 0), icon: TrendingUp, color: "text-emerald-600" },
    { label: "Total Expenses", value: formatRWF(data?.totalExp ?? 0), icon: Receipt, color: "text-rose-600" },
    { label: "Estimated Profit", value: formatRWF(data?.profit ?? 0), icon: Wallet, color: (data?.profit ?? 0) >= 0 ? "text-primary" : "text-rose-600" },
    { label: isFarm ? "Active Crops" : "Active Items", value: String(data?.active ?? 0), icon: Sprout, color: "text-primary" },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
          {isFarm ? <Tractor className="h-5 w-5 text-primary" /> : <Home className="h-5 w-5 text-primary" />}
        </div>
        <div>
          <h2 className="text-2xl font-bold">{current?.name ?? "Dashboard"}</h2>
          <p className="text-muted-foreground text-sm capitalize">{current?.type === "building" ? "Building / House" : "Farm"}{current?.location ? ` · ${current.location}` : ""}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4" /> Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          {(data?.recent.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No activities yet. <Link to="/activities" className="underline">Log one</Link>.</p>
          ) : (
            <ul className="divide-y">
              {data!.recent.map((a: any) => (
                <li key={a.id} className="py-2 flex justify-between text-sm">
                  <span className="capitalize font-medium">{a.type}</span>
                  <span className="text-muted-foreground">{formatDate(a.activity_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
