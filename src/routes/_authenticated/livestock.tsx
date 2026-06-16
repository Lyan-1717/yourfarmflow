import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Beef } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatRWF } from "@/lib/format";
import { useCurrentProjectId, useProjects } from "@/lib/current-project";
import { NoProject } from "@/components/no-project";

export const Route = createFileRoute("/_authenticated/livestock")({
  head: () => ({ meta: [{ title: "Livestock — YourFarmFlow" }] }),
  component: LivestockPage,
});

const ANIMAL_TYPES = ["Dairy Cows", "Beef Cattle", "Goats", "Sheep", "Chickens", "Pigs", "Rabbits", "Fish", "Other"];
const ACTIVITY_TYPES = ["feeding", "vaccination", "deworming", "breeding", "birth", "sale", "medical treatment", "death/loss"];

function LivestockPage() {
  const qc = useQueryClient();
  const projectId = useCurrentProjectId();
  const { data: projects = [] } = useProjects();
  const project = projects.find((p) => p.id === projectId);

  const { data: groups = [] } = useQuery({
    enabled: !!projectId,
    queryKey: ["livestock", projectId],
    queryFn: async () => (await supabase.from("livestock").select("*").eq("project_id", projectId!).order("created_at", { ascending: false })).data ?? [],
  });
  const { data: activities = [] } = useQuery({
    enabled: !!projectId,
    queryKey: ["livestock_activities", projectId],
    queryFn: async () => (await supabase.from("livestock_activities").select("*").eq("project_id", projectId!).order("activity_date", { ascending: false })).data ?? [],
  });

  const [name, setName] = useState("");
  const [animalType, setAnimalType] = useState(ANIMAL_TYPES[0]);
  const [breed, setBreed] = useState("");
  const [quantity, setQuantity] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [notes, setNotes] = useState("");

  const [aType, setAType] = useState(ACTIVITY_TYPES[0]);
  const [aDate, setADate] = useState(new Date().toISOString().slice(0, 10));
  const [aGroup, setAGroup] = useState<string>("none");
  const [aNotes, setANotes] = useState("");

  if (!projectId) return <NoProject label="livestock" />;
  if (project && project.type !== "livestock") {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader><CardTitle>Livestock not available</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Livestock features are only shown for Livestock projects. Switch to or create a Livestock project from the Projects page.
          </CardContent>
        </Card>
      </div>
    );
  }

  async function addGroup(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(quantity);
    if (!name.trim()) return toast.error("Name required");
    if (!qty || qty < 0) return toast.error("Enter a valid quantity");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("livestock").insert({
      user_id: u.user!.id,
      project_id: projectId!,
      name,
      animal_type: animalType,
      breed: breed || null,
      quantity: qty,
      purchase_date: purchaseDate || null,
      purchase_cost: purchaseCost ? Number(purchaseCost) : null,
      notes: notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Livestock added");
    setName(""); setBreed(""); setQuantity(""); setPurchaseDate(""); setPurchaseCost(""); setNotes("");
    qc.invalidateQueries({ queryKey: ["livestock"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  async function delGroup(id: string) {
    if (!confirm("Delete this livestock group?")) return;
    await supabase.from("livestock").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["livestock"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  async function addActivity(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("livestock_activities").insert({
      user_id: u.user!.id,
      project_id: projectId!,
      livestock_id: aGroup === "none" ? null : aGroup,
      type: aType,
      activity_date: aDate,
      notes: aNotes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Activity logged");
    setANotes(""); setAGroup("none");
    qc.invalidateQueries({ queryKey: ["livestock_activities"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  async function delActivity(id: string) {
    await supabase.from("livestock_activities").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["livestock_activities"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  const groupName = (id: string | null) => groups.find((g: any) => g.id === id)?.name ?? "—";
  const totalAnimals = groups.reduce((s: number, r: any) => s + Number(r.quantity || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Beef className="h-6 w-6" /> Livestock</h2>
          <p className="text-muted-foreground text-sm">Manage animal groups and livestock activities.</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total animals</p>
          <p className="text-2xl font-bold">{totalAnimals}</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Add livestock group</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={addGroup} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2"><Label>Name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Main herd" /></div>
            <div className="space-y-2">
              <Label>Animal Type</Label>
              <Select value={animalType} onValueChange={setAnimalType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ANIMAL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Breed (optional)</Label><Input value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Friesian" /></div>
            <div className="space-y-2"><Label>Quantity</Label><Input type="number" min="0" required value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
            <div className="space-y-2"><Label>Purchase Date (optional)</Label><Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} /></div>
            <div className="space-y-2"><Label>Purchase Cost (RWF, optional)</Label><Input type="number" min="0" value={purchaseCost} onChange={(e) => setPurchaseCost(e.target.value)} /></div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-3"><Label>Notes (optional)</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            <div className="sm:col-span-2 lg:col-span-3"><Button type="submit">Add livestock</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Livestock groups ({groups.length})</CardTitle></CardHeader>
        <CardContent>
          {groups.length === 0 ? <p className="text-sm text-muted-foreground">No livestock yet.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Breed</TableHead>
                  <TableHead className="text-right">Qty</TableHead><TableHead>Purchased</TableHead>
                  <TableHead className="text-right">Cost</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {groups.map((g: any) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">{g.name}</TableCell>
                      <TableCell>{g.animal_type}</TableCell>
                      <TableCell className="text-muted-foreground">{g.breed ?? "—"}</TableCell>
                      <TableCell className="text-right">{g.quantity}</TableCell>
                      <TableCell>{g.purchase_date ? formatDate(g.purchase_date) : "—"}</TableCell>
                      <TableCell className="text-right">{g.purchase_cost ? formatRWF(g.purchase_cost) : "—"}</TableCell>
                      <TableCell><Button size="icon" variant="ghost" onClick={() => delGroup(g.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Log livestock activity</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={addActivity} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={aType} onValueChange={setAType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ACTIVITY_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" required value={aDate} onChange={(e) => setADate(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Livestock group</Label>
              <Select value={aGroup} onValueChange={setAGroup}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {groups.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-4"><Label>Notes</Label><Textarea value={aNotes} onChange={(e) => setANotes(e.target.value)} placeholder="Optional" /></div>
            <div className="sm:col-span-2 lg:col-span-4"><Button type="submit">Log activity</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Activity history ({activities.length})</CardTitle></CardHeader>
        <CardContent>
          {activities.length === 0 ? <p className="text-sm text-muted-foreground">No activities yet.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead>Group</TableHead>
                  <TableHead>Notes</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {activities.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="capitalize font-medium">{a.type}</TableCell>
                      <TableCell>{formatDate(a.activity_date)}</TableCell>
                      <TableCell>{groupName(a.livestock_id)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{a.notes ?? "—"}</TableCell>
                      <TableCell><Button size="icon" variant="ghost" onClick={() => delActivity(a.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
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