import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, TrendingUp, Wallet, Sprout, Activity, Home, Tractor, Beef, Users } from "lucide-react";
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
  const ptype = current?.type;
  const isLivestock = ptype === "livestock";

  const { data } = useQuery({
    enabled: !!projectId,
    queryKey: ["dashboard", projectId, ptype],
    queryFn: async () => {
      const recentTable = isLivestock ? "livestock_activities" : "activities";
      const [exp, inc, crops, livestock, acts, regAnimals] = await Promise.all([
        supabase.from("expenses").select("amount").eq("project_id", projectId!),
        supabase.from("income").select("amount").eq("project_id", projectId!),
        isLivestock
          ? Promise.resolve({ data: [] as any[] })
          : supabase.from("crops").select("id,name,status").eq("project_id", projectId!),
        isLivestock
          ? supabase.from("livestock").select("id,quantity").eq("project_id", projectId!)
          : Promise.resolve({ data: [] as any[] }),
        supabase.from(recentTable).select("id,type,activity_date,notes").eq("project_id", projectId!).order("activity_date", { ascending: false }).limit(5),
        isLivestock
          ? supabase.from("animals").select("estimated_value,animal_type,status").eq("project_id", projectId!)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const totalExp = (exp.data ?? []).reduce((s, r: any) => s + Number(r.amount), 0);
      const totalInc = (inc.data ?? []).reduce((s, r: any) => s + Number(r.amount), 0);
      const active = (crops.data ?? []).filter((c: any) => c.status === "growing").length;
      const groups = (livestock.data ?? []).length;
      const animals = (livestock.data ?? []).reduce((s: number, r: any) => s + Number(r.quantity || 0), 0);
      const live = (regAnimals.data ?? []).filter((a: any) => a.status !== "Sold" && a.status !== "Deceased");
      const netWorth = live.reduce((s: number, a: any) => s + Number(a.estimated_value || 0), 0);
      const byType: Record<string, number> = {};
      live.forEach((a: any) => { byType[a.animal_type] = (byType[a.animal_type] || 0) + Number(a.estimated_value || 0); });
      return { totalExp, totalInc, profit: totalInc - totalExp, active, groups, animals, recent: acts.data ?? [], netWorth, byType };
    },
  });

  if (!projectId) return <NoProject label="the dashboard" />;

  const isFarm = ptype === "farm";
  const baseStats = [
    { label: isLivestock ? "Livestock Income" : "Total Income", value: formatRWF(data?.totalInc ?? 0), icon: TrendingUp, color: "text-emerald-600" },
    { label: isLivestock ? "Livestock Expenses" : "Total Expenses", value: formatRWF(data?.totalExp ?? 0), icon: Receipt, color: "text-rose-600" },
    { label: "Estimated Profit", value: formatRWF(data?.profit ?? 0), icon: Wallet, color: (data?.profit ?? 0) >= 0 ? "text-primary" : "text-rose-600" },
  ];
  const stats = isLivestock
    ? [
        { label: "Animal Groups", value: String(data?.groups ?? 0), icon: Beef, color: "text-primary" },
        { label: "Total Animals", value: String(data?.animals ?? 0), icon: Users, color: "text-primary" },
        ...baseStats,
      ]
    : [
        ...baseStats,
        { label: isFarm ? "Active Crops" : "Active Items", value: String(data?.active ?? 0), icon: Sprout, color: "text-primary" },
      ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
          {isFarm ? <Tractor className="h-5 w-5 text-primary" /> : isLivestock ? <Beef className="h-5 w-5 text-primary" /> : <Home className="h-5 w-5 text-primary" />}
        </div>
        <div>
          <h2 className="text-2xl font-bold">{current?.name ?? "Dashboard"}</h2>
          <p className="text-muted-foreground text-sm">{ptype === "building" ? "Building / Construction" : ptype === "livestock" ? "Livestock Farm" : "Crop Farm"}{current?.location ? ` · ${current.location}` : ""}</p>
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

      {isLivestock && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Livestock Net Worth</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-bold">{formatRWF(data?.netWorth ?? 0)}</p>
              <p className="text-xs text-muted-foreground">Excludes sold & deceased animals</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(data?.byType ?? {}).map(([t, v]) => (
                <div key={t} className="rounded border p-2 text-sm flex justify-between">
                  <span className="text-muted-foreground">{t}</span>
                  <span className="font-semibold">{formatRWF(v as number)}</span>
                </div>
              ))}
              {Object.keys(data?.byType ?? {}).length === 0 && (
                <p className="text-sm text-muted-foreground sm:col-span-3">Add individual animals with values from the <Link to="/animals" className="underline">Animals</Link> page to compute net worth.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4" /> Recent {isLivestock ? "Livestock " : ""}Activities</CardTitle>
        </CardHeader>
        <CardContent>
          {(data?.recent.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No activities yet. <Link to={isLivestock ? "/livestock" : "/activities"} className="underline">Log one</Link>.</p>
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
