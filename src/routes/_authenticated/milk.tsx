import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { useCurrentProjectId, useProjects } from "@/lib/current-project";
import { NoProject } from "@/components/no-project";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/milk")({
  head: () => ({ meta: [{ title: "Milk Production — YourFarmFlow" }] }),
  component: MilkPage,
});

function MilkPage() {
  const qc = useQueryClient();
  const projectId = useCurrentProjectId();
  const { data: projects = [] } = useProjects();
  const project = projects.find((p) => p.id === projectId);

  const { data: groups = [] } = useQuery({
    enabled: !!projectId, queryKey: ["livestock", projectId],
    queryFn: async () => (await supabase.from("livestock").select("*").eq("project_id", projectId!)).data ?? [],
  });
  const { data: animals = [] } = useQuery({
    enabled: !!projectId, queryKey: ["animals", projectId],
    queryFn: async () => (await supabase.from("animals").select("id,tag_number,name,group_id").eq("project_id", projectId!)).data ?? [],
  });
  const { data: milk = [] } = useQuery({
    enabled: !!projectId, queryKey: ["milk", projectId],
    queryFn: async () => (await supabase.from("milk_records").select("*").eq("project_id", projectId!).order("record_date", { ascending: false })).data ?? [],
  });

  const [groupId, setGroupId] = useState<string>("");
  const [animalId, setAnimalId] = useState<string>("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [liters, setLiters] = useState("");

  if (!projectId) return <NoProject label="milk records" />;
  if (project && project.type !== "livestock") {
    return <div className="max-w-3xl mx-auto"><Card><CardHeader><CardTitle>Livestock only</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Switch to a Livestock project.</CardContent></Card></div>;
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!groupId) return toast.error("Pick a group");
    const L = Number(liters);
    if (!L || L <= 0) return toast.error("Enter liters");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("milk_records").insert({
      user_id: u.user!.id, project_id: projectId!, group_id: groupId,
      animal_id: animalId || null, record_date: date, liters: L,
    });
    if (error) return toast.error(error.message);
    toast.success("Milk recorded");
    setLiters(""); setAnimalId("");
    qc.invalidateQueries({ queryKey: ["milk"] });
  }

  // Aggregations
  const byDate: Record<string, number> = {};
  milk.forEach((m: any) => { byDate[m.record_date] = (byDate[m.record_date] || 0) + Number(m.liters); });
  const chartData = Object.entries(byDate).map(([d, v]) => ({ date: d, liters: v })).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  const total = milk.reduce((s: number, m: any) => s + Number(m.liters), 0);
  const days = Object.keys(byDate).length;
  const dailyAvg = days ? total / days : 0;
  const animalCount = Math.max(1, animals.length);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Milk Production</h2>
        <p className="text-muted-foreground text-sm">Daily milk records for your herds.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total liters</CardTitle></CardHeader><CardContent className="text-xl font-bold">{total.toFixed(1)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Daily avg</CardTitle></CardHeader><CardContent className="text-xl font-bold">{dailyAvg.toFixed(1)} L</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Avg / animal / day</CardTitle></CardHeader><CardContent className="text-xl font-bold">{(dailyAvg / animalCount).toFixed(2)} L</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Records</CardTitle></CardHeader><CardContent className="text-xl font-bold">{milk.length}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Log production</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2"><Label>Group</Label>
              <Select value={groupId} onValueChange={(v) => { setGroupId(v); setAnimalId(""); }}>
                <SelectTrigger><SelectValue placeholder="Pick group" /></SelectTrigger>
                <SelectContent>{groups.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Animal (optional)</Label>
              <Select value={animalId || "herd"} onValueChange={(v) => setAnimalId(v === "herd" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="herd">— Whole herd —</SelectItem>
                  {animals.filter((a: any) => !groupId || a.group_id === groupId).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.tag_number || a.name || a.id.slice(0,6)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Liters</Label><Input type="number" step="0.1" min="0" value={liters} onChange={(e) => setLiters(e.target.value)} required /></div>
            <div className="sm:col-span-2 lg:col-span-4"><Button type="submit">Log milk</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Daily production (last 30 days)</CardTitle></CardHeader>
        <CardContent>
          {chartData.length === 0 ? <p className="text-sm text-muted-foreground">No data yet.</p> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} /><YAxis /><Tooltip />
                  <Line type="monotone" dataKey="liters" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent entries</CardTitle></CardHeader>
        <CardContent>
          {milk.length === 0 ? <p className="text-sm text-muted-foreground">No records yet.</p> :
            <ul className="divide-y">{milk.slice(0, 20).map((m: any) => (
              <li key={m.id} className="py-2 text-sm flex justify-between">
                <span><b>{Number(m.liters).toFixed(1)} L</b> · {groups.find((g: any) => g.id === m.group_id)?.name ?? "—"}</span>
                <span className="text-muted-foreground">{formatDate(m.record_date)}</span>
              </li>
            ))}</ul>}
        </CardContent>
      </Card>
    </div>
  );
}