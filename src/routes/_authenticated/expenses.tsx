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

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({ meta: [{ title: "Expenses — YourFarmFlow" }] }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => (await supabase.from("expenses").select("*").order("expense_date", { ascending: false })).data ?? [],
  });

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const total = items.reduce((s: number, r: any) => s + Number(r.amount), 0);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("expenses").insert({
      title, amount: amt, category: category || null, expense_date: date, user_id: u.user!.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Expense added");
    setTitle(""); setAmount(""); setCategory("");
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
            <div className="space-y-2"><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Inputs, Labor…" /></div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></div>
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