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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Package, Plus, MinusCircle, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCurrentProjectId, useProjects } from "@/lib/current-project";
import { NoProject } from "@/components/no-project";
import { formatRWF, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({ meta: [{ title: "Inventory — YourFarmFlow" }] }),
  component: InventoryPage,
});

const CATEGORIES_BY_TYPE: Record<string, string[]> = {
  farm: ["Seeds", "Fertilizer", "Pesticide", "Tools", "Other"],
  livestock: ["Feed", "Medicine", "Vaccine", "Supplies", "Other"],
  building: ["Cement", "Bricks", "Steel", "Wood", "Hardware", "Other"],
};

function InventoryPage() {
  const qc = useQueryClient();
  const projectId = useCurrentProjectId();
  const { data: projects = [] } = useProjects();
  const project = projects.find((p) => p.id === projectId);
  const categories = (project && CATEGORIES_BY_TYPE[project.type]) || ["General", "Other"];

  const { data: items = [] } = useQuery({
    queryKey: ["inventory_items", projectId],
    enabled: !!projectId,
    queryFn: async () => (await supabase.from("inventory_items").select("*").eq("project_id", projectId!).order("created_at", { ascending: false })).data ?? [],
  });
  const { data: usage = [] } = useQuery({
    queryKey: ["inventory_usage", projectId, items.map((i: any) => i.id).join(",")],
    enabled: items.length > 0,
    queryFn: async () => (await supabase.from("inventory_usage").select("*").in("item_id", items.map((i: any) => i.id))).data ?? [],
  });

  const [addOpen, setAddOpen] = useState(false);
  const [useOpen, setUseOpen] = useState<string | null>(null);

  if (!projectId) return <NoProject />;

  const usedByItem = usage.reduce<Record<string, number>>((acc, u: any) => {
    acc[u.item_id] = (acc[u.item_id] || 0) + Number(u.quantity_used || 0);
    return acc;
  }, {});

  const totalValue = items.reduce((s: number, i: any) => s + Number(i.cost || 0), 0);
  const lowStock = items.filter((i: any) => {
    const remaining = Number(i.quantity_purchased) - (usedByItem[i.id] || 0);
    return remaining <= Number(i.low_stock_threshold || 0);
  });

  async function addItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("inventory_items").insert({
      user_id: u.user!.id,
      project_id: projectId!,
      name: fd.get("name") as string,
      category: fd.get("category") as string,
      unit: (fd.get("unit") as string) || "unit",
      quantity_purchased: Number(fd.get("quantity_purchased") || 0),
      cost: Number(fd.get("cost") || 0),
      purchase_date: (fd.get("purchase_date") as string) || null,
      low_stock_threshold: Number(fd.get("low_stock_threshold") || 0),
      notes: (fd.get("notes") as string) || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Item added");
    setAddOpen(false);
    qc.invalidateQueries({ queryKey: ["inventory_items", projectId] });
  }

  async function logUsage(itemId: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const qty = Number(fd.get("quantity_used") || 0);
    if (qty <= 0) return toast.error("Enter quantity");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("inventory_usage").insert({
      user_id: u.user!.id,
      item_id: itemId,
      quantity_used: qty,
      used_at: (fd.get("used_at") as string) || new Date().toISOString().slice(0, 10),
      notes: (fd.get("notes") as string) || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Usage logged");
    setUseOpen(null);
    qc.invalidateQueries({ queryKey: ["inventory_usage", projectId] });
  }

  async function removeItem(id: string) {
    if (!confirm("Delete this item and all its usage logs?")) return;
    await supabase.from("inventory_usage").delete().eq("item_id", id);
    const { error } = await supabase.from("inventory_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["inventory_items", projectId] });
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Package className="h-5 w-5" /> Inventory</h2>
          <p className="text-sm text-muted-foreground">{project?.name} · {project?.type}</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Add item</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add inventory item</DialogTitle></DialogHeader>
            <form onSubmit={addItem} className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Name</Label><Input name="name" required placeholder="e.g. Maize seed" /></div>
                <div><Label>Category</Label>
                  <select name="category" required defaultValue={categories[0]} className="w-full h-9 border rounded px-2 bg-background">
                    {categories.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><Label>Unit</Label><Input name="unit" placeholder="kg, bag, L…" defaultValue="unit" /></div>
                <div><Label>Quantity purchased</Label><Input type="number" step="0.01" name="quantity_purchased" required /></div>
                <div><Label>Total cost (RWF)</Label><Input type="number" name="cost" defaultValue="0" /></div>
                <div><Label>Purchase date</Label><Input type="date" name="purchase_date" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
                <div><Label>Low-stock alert at</Label><Input type="number" step="0.01" name="low_stock_threshold" defaultValue="0" /></div>
              </div>
              <div><Label>Notes</Label><Textarea name="notes" rows={2} /></div>
              <DialogFooter><Button type="submit">Save</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total items</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{items.length}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Inventory value</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatRWF(totalValue)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Low stock</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{lowStock.length}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Items</CardTitle></CardHeader>
        <CardContent>
          {items.length === 0 ? <p className="text-sm text-muted-foreground">No inventory yet.</p> :
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead><TableHead>Category</TableHead>
                  <TableHead className="text-right">Purchased</TableHead>
                  <TableHead className="text-right">Used</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Purchased on</TableHead>
                  <TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {items.map((i: any) => {
                    const used = usedByItem[i.id] || 0;
                    const remaining = Number(i.quantity_purchased) - used;
                    const low = remaining <= Number(i.low_stock_threshold || 0);
                    return (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">{i.name}{low && <span className="ml-2 text-xs text-destructive">Low</span>}</TableCell>
                        <TableCell>{i.category}</TableCell>
                        <TableCell className="text-right">{Number(i.quantity_purchased).toLocaleString()} {i.unit}</TableCell>
                        <TableCell className="text-right">{used.toLocaleString()} {i.unit}</TableCell>
                        <TableCell className={`text-right font-medium ${low ? "text-destructive" : ""}`}>{remaining.toLocaleString()} {i.unit}</TableCell>
                        <TableCell className="text-right">{formatRWF(i.cost)}</TableCell>
                        <TableCell>{i.purchase_date ? formatDate(i.purchase_date) : "—"}</TableCell>
                        <TableCell className="text-right">
                          <Dialog open={useOpen === i.id} onOpenChange={(o) => setUseOpen(o ? i.id : null)}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline"><MinusCircle className="h-3 w-3 mr-1" /> Use</Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader><DialogTitle>Log usage — {i.name}</DialogTitle></DialogHeader>
                              <form onSubmit={(e) => logUsage(i.id, e)} className="grid gap-3">
                                <div><Label>Quantity used ({i.unit})</Label><Input type="number" step="0.01" name="quantity_used" required /></div>
                                <div><Label>Date</Label><Input type="date" name="used_at" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
                                <div><Label>Notes</Label><Textarea name="notes" rows={2} /></div>
                                <DialogFooter><Button type="submit">Log</Button></DialogFooter>
                              </form>
                            </DialogContent>
                          </Dialog>
                          <Button size="sm" variant="ghost" className="ml-1 text-destructive" onClick={() => removeItem(i.id)}><Trash2 className="h-3 w-3" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>}
        </CardContent>
      </Card>

      {usage.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent usage</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y">
              {[...usage].sort((a: any, b: any) => b.used_at.localeCompare(a.used_at)).slice(0, 10).map((u: any) => {
                const item = items.find((i: any) => i.id === u.item_id);
                return (
                  <li key={u.id} className="py-2 text-sm flex justify-between">
                    <span><b>{item?.name ?? "Item"}</b> — {Number(u.quantity_used)} {item?.unit ?? ""}{u.notes && <span className="text-muted-foreground"> · {u.notes}</span>}</span>
                    <span className="text-muted-foreground">{formatDate(u.used_at)}</span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}