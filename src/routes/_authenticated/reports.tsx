import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCurrentProjectId, useProjects } from "@/lib/current-project";
import { NoProject } from "@/components/no-project";
import { formatRWF } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — YourFarmFlow" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const projectId = useCurrentProjectId();
  const { data: projects = [] } = useProjects();
  const project = projects.find((p) => p.id === projectId);
  const type = project?.type;

  const { data: expenses = [] } = useQuery({ enabled: !!projectId, queryKey: ["expenses", projectId], queryFn: async () => (await supabase.from("expenses").select("*").eq("project_id", projectId!)).data ?? [] });
  const { data: income = [] } = useQuery({ enabled: !!projectId, queryKey: ["income", projectId], queryFn: async () => (await supabase.from("income").select("*").eq("project_id", projectId!)).data ?? [] });
  const { data: crops = [] } = useQuery({ enabled: !!projectId && type === "farm", queryKey: ["crops", projectId], queryFn: async () => (await supabase.from("crops").select("*").eq("project_id", projectId!)).data ?? [] });
  const { data: activities = [] } = useQuery({ enabled: !!projectId && type === "farm", queryKey: ["activities", projectId], queryFn: async () => (await supabase.from("activities").select("*").eq("project_id", projectId!)).data ?? [] });
  const { data: animals = [] } = useQuery({ enabled: !!projectId && type === "livestock", queryKey: ["animals", projectId], queryFn: async () => (await supabase.from("animals").select("*").eq("project_id", projectId!)).data ?? [] });
  const { data: groups = [] } = useQuery({ enabled: !!projectId && type === "livestock", queryKey: ["livestock", projectId], queryFn: async () => (await supabase.from("livestock").select("*").eq("project_id", projectId!)).data ?? [] });
  const { data: cActs = [] } = useQuery({ enabled: !!projectId && type === "building", queryKey: ["construction_activities", projectId], queryFn: async () => (await supabase.from("construction_activities").select("*").eq("project_id", projectId!)).data ?? [] });

  if (!projectId) return <NoProject label="reports" />;

  const totalExp = expenses.reduce((s: number, r: any) => s + Number(r.amount), 0);
  const totalInc = income.reduce((s: number, r: any) => s + Number(r.amount), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Reports</h2>
        <p className="text-muted-foreground text-sm">Overview and detailed breakdowns for {project?.name}.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total income</CardTitle></CardHeader><CardContent className="text-xl font-bold text-emerald-600">{formatRWF(totalInc)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total expenses</CardTitle></CardHeader><CardContent className="text-xl font-bold text-rose-600">{formatRWF(totalExp)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Profit / loss</CardTitle></CardHeader><CardContent className="text-xl font-bold">{formatRWF(totalInc - totalExp)}</CardContent></Card>
      </div>

      {type === "farm" && (
        <Card><CardHeader><CardTitle>Crop profitability</CardTitle></CardHeader><CardContent>
          {crops.length === 0 ? <p className="text-sm text-muted-foreground">No crops yet.</p> : (
            <Table><TableHeader><TableRow><TableHead>Crop</TableHead><TableHead className="text-right">Material</TableHead><TableHead className="text-right">Labor</TableHead><TableHead className="text-right">Total cost</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Profit</TableHead></TableRow></TableHeader>
              <TableBody>
                {crops.map((c: any) => {
                  const cActIds = new Set(activities.filter((a: any) => a.crop_id === c.id).map((a: any) => a.id));
                  const cExp = expenses.filter((e: any) => cActIds.has(e.activity_id));
                  const mat = cExp.filter((e: any) => e.expense_type === "material").reduce((s: number, e: any) => s + Number(e.amount), 0);
                  const lab = cExp.filter((e: any) => e.expense_type === "labor").reduce((s: number, e: any) => s + Number(e.amount), 0);
                  const other = cExp.filter((e: any) => e.expense_type !== "material" && e.expense_type !== "labor").reduce((s: number, e: any) => s + Number(e.amount), 0);
                  const rev = income.filter((i: any) => (i.source ?? "").toLowerCase().includes(c.name.toLowerCase())).reduce((s: number, i: any) => s + Number(i.amount), 0);
                  const tot = mat + lab + other;
                  return <TableRow key={c.id}><TableCell className="font-medium">{c.name}</TableCell><TableCell className="text-right">{formatRWF(mat)}</TableCell><TableCell className="text-right">{formatRWF(lab)}</TableCell><TableCell className="text-right">{formatRWF(tot)}</TableCell><TableCell className="text-right">{formatRWF(rev)}</TableCell><TableCell className="text-right font-semibold">{formatRWF(rev - tot)}</TableCell></TableRow>;
                })}
              </TableBody>
            </Table>
          )}
        </CardContent></Card>
      )}

      {type === "livestock" && (
        <Card><CardHeader><CardTitle>Livestock net worth by group</CardTitle></CardHeader><CardContent>
          <Table><TableHeader><TableRow><TableHead>Group</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Animals</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
            <TableBody>
              {groups.map((g: any) => {
                const inG = animals.filter((a: any) => a.group_id === g.id);
                const v = inG.reduce((s: number, a: any) => s + Number(a.estimated_value || 0), 0);
                return <TableRow key={g.id}><TableCell>{g.name}</TableCell><TableCell>{g.animal_type}</TableCell><TableCell className="text-right">{inG.length}</TableCell><TableCell className="text-right font-semibold">{formatRWF(v)}</TableCell></TableRow>;
              })}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}

      {type === "building" && (
        <Card><CardHeader><CardTitle>Construction activity costs</CardTitle></CardHeader><CardContent>
          {cActs.length === 0 ? <p className="text-sm text-muted-foreground">No activities yet.</p> : (
            <Table><TableHeader><TableRow><TableHead>Activity</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Material</TableHead><TableHead className="text-right">Labor</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {cActs.map((a: any) => {
                  const ex = expenses.filter((e: any) => e.construction_activity_id === a.id);
                  const mat = ex.filter((e: any) => e.expense_type === "material").reduce((s: number, e: any) => s + Number(e.amount), 0);
                  const lab = ex.filter((e: any) => e.expense_type === "labor").reduce((s: number, e: any) => s + Number(e.amount), 0);
                  return <TableRow key={a.id}><TableCell className="font-medium">{a.name}</TableCell><TableCell>{a.status}</TableCell><TableCell className="text-right">{formatRWF(mat)}</TableCell><TableCell className="text-right">{formatRWF(lab)}</TableCell><TableCell className="text-right font-semibold">{formatRWF(mat + lab)}</TableCell></TableRow>;
                })}
              </TableBody>
            </Table>
          )}
        </CardContent></Card>
      )}

      <Card><CardHeader><CardTitle>Activity-based expense breakdown</CardTitle></CardHeader><CardContent>
        {(() => {
          const material = expenses.filter((e: any) => e.expense_type === "material").reduce((s: number, e: any) => s + Number(e.amount), 0);
          const labor = expenses.filter((e: any) => e.expense_type === "labor").reduce((s: number, e: any) => s + Number(e.amount), 0);
          const other = expenses.filter((e: any) => e.expense_type !== "material" && e.expense_type !== "labor").reduce((s: number, e: any) => s + Number(e.amount), 0);
          return (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded border p-3"><p className="text-xs text-muted-foreground">Material</p><p className="text-lg font-bold">{formatRWF(material)}</p></div>
              <div className="rounded border p-3"><p className="text-xs text-muted-foreground">Labor</p><p className="text-lg font-bold">{formatRWF(labor)}</p></div>
              <div className="rounded border p-3"><p className="text-xs text-muted-foreground">Other / uncategorized</p><p className="text-lg font-bold">{formatRWF(other)}</p></div>
            </div>
          );
        })()}
      </CardContent></Card>
    </div>
  );
}