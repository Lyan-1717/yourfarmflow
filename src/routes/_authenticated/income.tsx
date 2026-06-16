import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatRWF } from "@/lib/format";
import { useCurrentProjectId } from "@/lib/current-project";
import { NoProject } from "@/components/no-project";

export const Route = createFileRoute("/_authenticated/income")({
  head: () => ({ meta: [{ title: "Income — YourFarmFlow" }] }),
  component: IncomePage,
});

function IncomePage() {
  const qc = useQueryClient();
  const projectId = useCurrentProjectId();
  const { data: items = [] } = useQuery({
    enabled: !!projectId,
    queryKey: ["income", projectId],
    queryFn: async () => (await supabase.from("income").select("*").eq("project_id", projectId!).order("income_date", { ascending: false })).data ?? [],
  });

  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  if (!projectId) return <NoProject label="income" />;

  const total = items.reduce((s: number, r: any) => s + Number(r.amount), 0);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("income").insert({
      source, amount: amt, income_date: date, user_id: u.user!.id, project_id: projectId,
    });
    if (error) return toast.error(error.message);
    toast.success("Income added");
    setSource(""); setAmount("");
    qc.invalidateQueries({ queryKey: ["income"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  async function del(id: string) {
    await supabase.from("income").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["income"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Income</h2>
          <p className="text-muted-foreground text-sm">Record sales and other income.</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total earned</p>
          <p className="text-2xl font-bold text-emerald-600">{formatRWF(total)}</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Add income</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2"><Label>Source</Label><Input required value={source} onChange={(e) => setSource(e.target.value)} placeholder="Maize sale" /></div>
            <div className="space-y-2"><Label>Amount (RWF)</Label><Input type="number" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="sm:col-span-2 lg:col-span-3"><Button type="submit">Add income</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>History</CardTitle></CardHeader>
        <CardContent>
          {items.length === 0 ? <p className="text-sm text-muted-foreground">No income recorded yet.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Source</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {items.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.source}</TableCell>
                      <TableCell>{formatDate(r.income_date)}</TableCell>
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
