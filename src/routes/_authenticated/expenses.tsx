import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatRWF } from "@/lib/format";
import { useCurrentProjectId, useProjects } from "@/lib/current-project";
import { NoProject } from "@/components/no-project";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({ meta: [{ title: "Expenses — YourFarmFlow" }] }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const qc = useQueryClient();
  const projectId = useCurrentProjectId();
  const { data: projects = [] } = useProjects();
  const project = projects.find((p) => p.id === projectId);
  const ptype = project?.type;
  const { data: items = [] } = useQuery({
    enabled: !!projectId,
    queryKey: ["expenses", projectId],
    queryFn: async () => (await supabase.from("expenses").select("*").eq("project_id", projectId!).order("expense_date", { ascending: false })).data ?? [],
  });
  const { data: cropActs = [] } = useQuery({
    enabled: !!projectId && ptype === "farm",
    queryKey: ["activities", projectId],
    queryFn: async () => (await supabase.from("activities").select("id,type,activity_date").eq("project_id", projectId!).order("activity_date", { ascending: false })).data ?? [],
  });
  const { data: cActs = [] } = useQuery({
    enabled: !!projectId && ptype === "building",
    queryKey: ["construction_activities", projectId],
    queryFn: async () => (await supabase.from("construction_activities").select("id,name").eq("project_id", projectId!)).data ?? [],
  });

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [expenseType, setExpenseType] = useState<string>("material");
  const [activityId, setActivityId] = useState<string>("");

  if (!projectId) return <NoProject label="expenses" />;

  const total = items.reduce((s: number, r: any) => s + Number(r.amount), 0);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    const { data: u } = await supabase.auth.getUser();
    const payload: any = {
      title, amount: amt, category: category || null, expense_date: date,
      user_id: u.user!.id, project_id: projectId,
      expense_type: expenseType || null,
    };
    if (activityId) {
      if (ptype === "building") payload.construction_activity_id = activityId;
      else payload.activity_id = activityId;
    }
    const { error } = await supabase.from("expenses").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Expense added");
    setTitle(""); setAmount(""); setCategory(""); setActivityId("");
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  async function del(id: string) {
    await supabase.from("expenses").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Expenses</h2>
          <p className="text-muted-foreground text-sm">Track every shilling spent.</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total spent</p>
          <p className="text-2xl font-bold text-rose-600">{formatRWF(total)}</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Add expense</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2"><Label>Title</Label><Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Fertilizer" /></div>
            <div className="space-y-2"><Label>Amount (RWF)</Label><Input type="number" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div className="space-y-2"><Label>Type</Label>
              <Select value={expenseType} onValueChange={setExpenseType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="material">Material</SelectItem><SelectItem value="labor">Labor</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="space-y-2"><Label>Category (optional)</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Inputs…" /></div>
            {(ptype === "farm" || ptype === "building") && (
              <div className="space-y-2 sm:col-span-2"><Label>{ptype === "building" ? "Construction activity" : "Crop activity"} (optional)</Label>
                <Select value={activityId || "none"} onValueChange={(v) => setActivityId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {(ptype === "building" ? cActs : cropActs).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name ?? a.type}{a.activity_date ? ` · ${formatDate(a.activity_date)}` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="sm:col-span-2 lg:col-span-4"><Button type="submit">Add expense</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>History</CardTitle></CardHeader>
        <CardContent>
          {items.length === 0 ? <p className="text-sm text-muted-foreground">No expenses yet.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {items.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.title}</TableCell>
                      <TableCell className="text-muted-foreground">{r.category ?? "—"}</TableCell>
                      <TableCell>{formatDate(r.expense_date)}</TableCell>
                      <TableCell className="text-right">{formatRWF(r.amount)}</TableCell>
                      <TableCell><Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
