import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Activity } from "lucide-react";
import { toast } from "sonner";
import { formatRWF, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/animals/$id")({
  head: () => ({ meta: [{ title: "Animal Profile — YourFarmFlow" }] }),
  component: AnimalProfile,
});

const STATUSES = ["Healthy", "Pregnant", "Milking", "Nursing", "Growing", "Ready for Sale", "Sold", "Deceased"];

function AnimalProfile() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: animal } = useQuery({
    queryKey: ["animal", id],
    queryFn: async () => (await supabase.from("animals").select("*").eq("id", id).maybeSingle()).data,
  });
  const { data: statusHist = [] } = useQuery({
    queryKey: ["status_history", id],
    queryFn: async () => (await supabase.from("animal_status_history").select("*").eq("animal_id", id).order("changed_at", { ascending: false })).data ?? [],
  });
  const { data: health = [] } = useQuery({
    queryKey: ["health", id],
    queryFn: async () => (await supabase.from("animal_health_records").select("*").eq("animal_id", id).order("record_date", { ascending: false })).data ?? [],
  });
  const { data: breeding = [] } = useQuery({
    queryKey: ["breeding", id],
    queryFn: async () => (await supabase.from("breeding_records").select("*").eq("animal_id", id).order("bred_on", { ascending: false })).data ?? [],
  });
  const { data: offspring = [] } = useQuery({
    queryKey: ["offspring", id],
    queryFn: async () => (await supabase.from("animals").select("*").eq("mother_id", id).order("date_of_birth", { ascending: false })).data ?? [],
  });
  const { data: milk = [] } = useQuery({
    queryKey: ["animal_milk", id],
    queryFn: async () => (await supabase.from("milk_records").select("*").eq("animal_id", id).order("record_date", { ascending: false })).data ?? [],
  });

  // status change
  const [newStatus, setNewStatus] = useState("Healthy");
  const [statusNote, setStatusNote] = useState("");
  // health
  const [hType, setHType] = useState("vaccination");
  const [hDesc, setHDesc] = useState("");
  const [hDate, setHDate] = useState(new Date().toISOString().slice(0, 10));
  const [hCost, setHCost] = useState("");
  // breeding
  const [bMate, setBMate] = useState("");
  const [bBredOn, setBBredOn] = useState(new Date().toISOString().slice(0, 10));
  const [bDue, setBDue] = useState("");
  // milk
  const [mDate, setMDate] = useState(new Date().toISOString().slice(0, 10));
  const [mLiters, setMLiters] = useState("");

  if (!animal) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  async function changeStatus(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("animals").update({ status: newStatus }).eq("id", id);
    await supabase.from("animal_status_history").insert({
      user_id: u.user!.id, animal_id: id, status: newStatus, notes: statusNote || null,
    });
    toast.success("Status updated");
    setStatusNote("");
    qc.invalidateQueries({ queryKey: ["animal", id] });
    qc.invalidateQueries({ queryKey: ["status_history", id] });
    qc.invalidateQueries({ queryKey: ["animals"] });
  }

  async function addHealth(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("animal_health_records").insert({
      user_id: u.user!.id, animal_id: id, record_type: hType,
      description: hDesc || null, record_date: hDate, cost: hCost ? Number(hCost) : 0,
    });
    if (error) return toast.error(error.message);
    toast.success("Health record added");
    setHDesc(""); setHCost("");
    qc.invalidateQueries({ queryKey: ["health", id] });
  }

  async function addBreeding(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("breeding_records").insert({
      user_id: u.user!.id, animal_id: id, mate_tag: bMate || null,
      bred_on: bBredOn, expected_due: bDue || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Breeding recorded");
    setBMate(""); setBDue("");
    qc.invalidateQueries({ queryKey: ["breeding", id] });
  }

  async function addMilk(e: React.FormEvent) {
    e.preventDefault();
    if (!animal) return;
    const liters = Number(mLiters);
    if (!liters || liters <= 0) return toast.error("Enter liters");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("milk_records").insert({
      user_id: u.user!.id, project_id: animal.project_id, group_id: animal.group_id,
      animal_id: id, record_date: mDate, liters,
    });
    if (error) return toast.error(error.message);
    toast.success("Milk recorded");
    setMLiters("");
    qc.invalidateQueries({ queryKey: ["animal_milk", id] });
    qc.invalidateQueries({ queryKey: ["milk"] });
  }

  const totalMilk = milk.reduce((s: number, m: any) => s + Number(m.liters || 0), 0);
  const dailyAvg = milk.length ? totalMilk / new Set(milk.map((m: any) => m.record_date)).size : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/animals" className="text-sm text-muted-foreground hover:underline flex items-center gap-1"><ArrowLeft className="h-3 w-3" /> Back to animals</Link>
          <h2 className="text-2xl font-bold mt-2">{animal.tag_number || animal.name || animal.id.slice(0,8)}</h2>
          <p className="text-muted-foreground text-sm">{animal.animal_type} · {animal.gender ?? "—"} · {animal.breed ?? "—"}</p>
        </div>
        <span className="px-3 py-1 rounded bg-primary/10 text-primary text-sm font-medium">{animal.status}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Estimated value</CardTitle></CardHeader><CardContent className="text-lg font-bold">{formatRWF(animal.estimated_value)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Offspring</CardTitle></CardHeader><CardContent className="text-lg font-bold">{offspring.length}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total milk (L)</CardTitle></CardHeader><CardContent className="text-lg font-bold">{totalMilk.toFixed(1)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Daily avg (L)</CardTitle></CardHeader><CardContent className="text-lg font-bold">{dailyAvg.toFixed(1)}</CardContent></Card>
      </div>

      <Tabs defaultValue="status">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="breeding">Breeding</TabsTrigger>
          <TabsTrigger value="offspring">Offspring</TabsTrigger>
          <TabsTrigger value="milk">Milk</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Change status</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={changeStatus} className="grid gap-3 sm:grid-cols-3">
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Notes" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
                <Button type="submit">Update</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4" /> Status history</CardTitle></CardHeader>
            <CardContent>
              {statusHist.length === 0 ? <p className="text-sm text-muted-foreground">No history yet.</p> :
                <ul className="divide-y">{statusHist.map((s: any) => (
                  <li key={s.id} className="py-2 flex justify-between text-sm">
                    <span><b>{s.status}</b> {s.notes && <span className="text-muted-foreground">— {s.notes}</span>}</span>
                    <span className="text-muted-foreground">{formatDate(s.changed_at)}</span>
                  </li>
                ))}</ul>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card><CardHeader><CardTitle>Add health record</CardTitle></CardHeader><CardContent>
            <form onSubmit={addHealth} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select value={hType} onValueChange={setHType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["vaccination","deworming","treatment","checkup"].map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="date" value={hDate} onChange={(e) => setHDate(e.target.value)} required />
              <Input placeholder="Description" value={hDesc} onChange={(e) => setHDesc(e.target.value)} />
              <Input type="number" placeholder="Cost (RWF)" value={hCost} onChange={(e) => setHCost(e.target.value)} />
              <div className="sm:col-span-2 lg:col-span-4"><Button type="submit">Add</Button></div>
            </form>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            {health.length === 0 ? <p className="text-sm text-muted-foreground">No records.</p> :
              <Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Cost</TableHead></TableRow></TableHeader>
                <TableBody>{health.map((h: any) => (
                  <TableRow key={h.id}><TableCell className="capitalize">{h.record_type}</TableCell><TableCell>{formatDate(h.record_date)}</TableCell><TableCell>{h.description ?? "—"}</TableCell><TableCell className="text-right">{formatRWF(h.cost)}</TableCell></TableRow>
                ))}</TableBody></Table>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="breeding" className="space-y-4">
          <Card><CardHeader><CardTitle>Record breeding</CardTitle></CardHeader><CardContent>
            <form onSubmit={addBreeding} className="grid gap-3 sm:grid-cols-3">
              <Input placeholder="Mate tag" value={bMate} onChange={(e) => setBMate(e.target.value)} />
              <div><Label className="text-xs">Bred on</Label><Input type="date" value={bBredOn} onChange={(e) => setBBredOn(e.target.value)} required /></div>
              <div><Label className="text-xs">Expected due</Label><Input type="date" value={bDue} onChange={(e) => setBDue(e.target.value)} /></div>
              <div className="sm:col-span-3"><Button type="submit">Add</Button></div>
            </form>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            {breeding.length === 0 ? <p className="text-sm text-muted-foreground">No breeding records.</p> :
              <ul className="divide-y">{breeding.map((b: any) => (
                <li key={b.id} className="py-2 text-sm flex justify-between"><span>Mate: <b>{b.mate_tag ?? "—"}</b>{b.expected_due && <span className="text-muted-foreground"> · due {formatDate(b.expected_due)}</span>}</span><span className="text-muted-foreground">{formatDate(b.bred_on)}</span></li>
              ))}</ul>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="offspring">
          <Card><CardContent className="pt-6">
            {offspring.length === 0 ? <p className="text-sm text-muted-foreground">No offspring recorded.</p> :
              <Table><TableHeader><TableRow><TableHead>Tag</TableHead><TableHead>Gender</TableHead><TableHead>DOB</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>{offspring.map((o: any) => (
                  <TableRow key={o.id}><TableCell><Link to="/animals/$id" params={{ id: o.id }} className="hover:underline">{o.tag_number || o.name || o.id.slice(0,6)}</Link></TableCell><TableCell>{o.gender ?? "—"}</TableCell><TableCell>{o.date_of_birth ? formatDate(o.date_of_birth) : "—"}</TableCell><TableCell>{o.status}</TableCell></TableRow>
                ))}</TableBody></Table>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="milk" className="space-y-4">
          <Card><CardHeader><CardTitle>Log milk production</CardTitle></CardHeader><CardContent>
            <form onSubmit={addMilk} className="grid gap-3 sm:grid-cols-3">
              <div><Label className="text-xs">Date</Label><Input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} required /></div>
              <div><Label className="text-xs">Liters</Label><Input type="number" step="0.1" min="0" value={mLiters} onChange={(e) => setMLiters(e.target.value)} required /></div>
              <div className="flex items-end"><Button type="submit">Log</Button></div>
            </form>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            {milk.length === 0 ? <p className="text-sm text-muted-foreground">No milk records.</p> :
              <ul className="divide-y">{milk.map((m: any) => (
                <li key={m.id} className="py-2 text-sm flex justify-between"><span><b>{Number(m.liters).toFixed(1)} L</b></span><span className="text-muted-foreground">{formatDate(m.record_date)}</span></li>
              ))}</ul>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}