import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, HardHat } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatRWF } from "@/lib/format";
import { useCurrentProjectId, useProjects } from "@/lib/current-project";
import { NoProject } from "@/components/no-project";

export const Route = createFileRoute("/_authenticated/construction")({
  head: () => ({ meta: [{ title: "Construction Activities — YourFarmFlow" }] }),
  component: ConstructionPage,
});

const STATUSES = ["Planned", "In Progress", "Completed"];

function ConstructionPage() {
  const qc = useQueryClient();
  const projectId = useCurrentProjectId();
  const { data: projects = [] } = useProjects();
  const project = projects.find((p) => p.id === projectId);

  const { data: acts = [] } = useQuery({
    enabled: !!projectId, queryKey: ["construction_activities", projectId],
    queryFn: async () => (await supabase.from("construction_activities").select("*").eq("project_id", projectId!).order("created_at", { ascending: false })).data ?? [],
  });
  const { data: expenses = [] } = useQuery({
    enabled: !!projectId, queryKey: ["expenses", projectId],
    queryFn: async () => (await supabase.from("expenses").select("*").eq("project_id", projectId!)).data ?? [],
  });

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [status, setStatus] = useState("Planned");

  // Inline expense form per activity
  const [eActivity, setEActivity] = useState<string>("");
  const [eTitle, setETitle] = useState("");
  const [eAmount, setEAmount] = useState("");
  const [eType, setEType] = useState("material");
  const [eDate, setEDate] = useState(new Date().toISOString().slice(0, 10));

  if (!projectId) return <NoProject label="construction activities" />;
  if (project && project.type !== "building") {
    return <div className="max-w-3xl mx-auto"><Card><CardHeader><CardTitle>Construction projects only</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Switch to a Building / Construction project.</CardContent></Card></div>;
  }

  async function addAct(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name required");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("construction_activities").insert({
      user_id: u.user!.id, project_id: projectId!, name, description: desc || null,
      start_date: start || null, end_date: end || null, status,
    });
    if (error) return toast.error(error.message);
    toast.success("Activity added");
    setName(""); setDesc(""); setStart(""); setEnd("");
    qc.invalidateQueries({ queryKey: ["construction_activities"] });
  }

  async function delAct(id: string) {
    if (!confirm("Delete this activity? Its expenses will be unlinked.")) return;
    await supabase.from("construction_activities").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["construction_activities"] });
  }

  async function updStatus(id: string, s: string) {
    await supabase.from("construction_activities").update({ status: s }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["construction_activities"] });
  }

  async function addExp(e: React.FormEvent) {
    e.preventDefault();
    if (!eActivity) return toast.error("Pick an activity");
    const amt = Number(eAmount);
    if (!amt || amt <= 0) return toast.error("Enter amount");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("expenses").insert({
      user_id: u.user!.id, project_id: projectId!, construction_activity_id: eActivity,
      title: eTitle, amount: amt, category: eType === "material" ? "Material" : "Labor",
      expense_type: eType, expense_date: eDate,
    });
    if (error) return toast.error(error.message);
    toast.success("Expense added");
    setETitle(""); setEAmount("");
    qc.invalidateQueries({ queryKey: ["expenses"] });
  }

  const costOf = (activityId: string) => {
    const rows = expenses.filter((x: any) => x.construction_activity_id === activityId);
    const material = rows.filter((x: any) => x.expense_type === "material").reduce((s: number, x: any) => s + Number(x.amount), 0);
    const labor = rows.filter((x: any) => x.expense_type === "labor").reduce((s: number, x: any) => s + Number(x.amount), 0);
    const other = rows.filter((x: any) => x.expense_type !== "material" && x.expense_type !== "labor").reduce((s: number, x: any) => s + Number(x.amount), 0);
    return { material, labor, other, total: material + labor + other };
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><HardHat className="h-6 w-6" /> Construction Activities</h2>
        <p className="text-muted-foreground text-sm">Custom activities with linked material & labor expenses.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Add activity</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={addAct} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2"><Label>Name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Foundation, Roofing, Plumbing…" /></div>
            <div className="space-y-2"><Label>Status</Label>
              <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </div>
            <div /><div className="space-y-2"><Label>Start date</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div className="space-y-2"><Label>End date</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
            <div /><div className="space-y-2 sm:col-span-2 lg:col-span-3"><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
            <div className="sm:col-span-2 lg:col-span-3"><Button type="submit">Add activity</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Add expense to an activity</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={addExp} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2"><Label>Activity</Label>
              <Select value={eActivity} onValueChange={setEActivity}><SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger><SelectContent>{acts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Type</Label>
              <Select value={eType} onValueChange={setEType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="material">Material</SelectItem><SelectItem value="labor">Labor</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Title</Label><Input required value={eTitle} onChange={(e) => setETitle(e.target.value)} placeholder="Cement, Mason…" /></div>
            <div className="space-y-2"><Label>Amount (RWF)</Label><Input type="number" min="0" required value={eAmount} onChange={(e) => setEAmount(e.target.value)} /></div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" required value={eDate} onChange={(e) => setEDate(e.target.value)} /></div>
            <div className="sm:col-span-2 lg:col-span-5"><Button type="submit">Add expense</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Activities ({acts.length})</CardTitle></CardHeader>
        <CardContent>
          {acts.length === 0 ? <p className="text-sm text-muted-foreground">No activities yet.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Dates</TableHead>
                  <TableHead className="text-right">Material</TableHead><TableHead className="text-right">Labor</TableHead>
                  <TableHead className="text-right">Total</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {acts.map((a: any) => {
                    const c = costOf(a.id);
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.name}{a.description && <div className="text-xs text-muted-foreground">{a.description}</div>}</TableCell>
                        <TableCell>
                          <Select value={a.status} onValueChange={(v) => updStatus(a.id, v)}>
                            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{a.start_date ? formatDate(a.start_date) : "—"} → {a.end_date ? formatDate(a.end_date) : "—"}</TableCell>
                        <TableCell className="text-right">{formatRWF(c.material)}</TableCell>
                        <TableCell className="text-right">{formatRWF(c.labor)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatRWF(c.total)}</TableCell>
                        <TableCell><Button size="icon" variant="ghost" onClick={() => delAct(a.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}