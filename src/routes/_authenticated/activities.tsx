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
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { useCurrentProjectId, useProjects } from "@/lib/current-project";
import { NoProject } from "@/components/no-project";

export const Route = createFileRoute("/_authenticated/activities")({
  head: () => ({ meta: [{ title: "Activities — YourFarmFlow" }] }),
  component: ActivitiesPage,
});

const FARM_TYPES = ["planting", "watering", "fertilizing", "spraying", "harvesting"];
const BUILDING_TYPES = ["maintenance", "repair", "cleaning", "inspection", "renovation"];

function ActivitiesPage() {
  const qc = useQueryClient();
  const projectId = useCurrentProjectId();
  const { data: projects = [] } = useProjects();
  const project = projects.find((p) => p.id === projectId);
  const isFarm = project?.type !== "building";
  const TYPES = isFarm ? FARM_TYPES : BUILDING_TYPES;

  const { data: crops = [] } = useQuery({
    enabled: !!projectId && isFarm,
    queryKey: ["crops", projectId],
    queryFn: async () => (await supabase.from("crops").select("id,name").eq("project_id", projectId!)).data ?? [],
  });
  const { data: activities = [] } = useQuery({
    enabled: !!projectId,
    queryKey: ["activities", projectId],
    queryFn: async () => (await supabase.from("activities").select("*").eq("project_id", projectId!).order("activity_date", { ascending: false })).data ?? [],
  });

  const [type, setType] = useState(TYPES[0]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [cropId, setCropId] = useState<string>("none");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("Planned");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  if (!projectId) return <NoProject label="activities" />;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("activities").insert({
      type, activity_date: date, crop_id: cropId === "none" ? null : cropId,
      notes: notes || null, user_id: u.user!.id, project_id: projectId,
      status: status || null, start_date: startDate || null, end_date: endDate || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Activity logged");
    setNotes(""); setCropId("none"); setStartDate(""); setEndDate("");
    qc.invalidateQueries({ queryKey: ["activities"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  async function del(id: string) {
    await supabase.from("activities").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["activities"] });
  }

  const cropName = (id: string | null) => crops.find((c: any) => c.id === id)?.name ?? "—";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Activities</h2>
        <p className="text-muted-foreground text-sm">Log everything you do on this project.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Log an activity</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
            {isFarm && (
              <div className="space-y-2">
                <Label>Crop</Label>
                <Select value={cropId} onValueChange={setCropId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {crops.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2"><Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Planned","In Progress","Completed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Start date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div className="space-y-2"><Label>End date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-4"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" /></div>
            <div className="sm:col-span-2 lg:col-span-4"><Button type="submit">Log activity</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>History ({activities.length})</CardTitle></CardHeader>
        <CardContent>
          {activities.length === 0 ? <p className="text-sm text-muted-foreground">No activities yet.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Type</TableHead><TableHead>Date</TableHead>
                  {isFarm && <TableHead>Crop</TableHead>}
                  <TableHead>Notes</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {activities.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="capitalize font-medium">{a.type}</TableCell>
                      <TableCell>{formatDate(a.activity_date)}</TableCell>
                      {isFarm && <TableCell>{cropName(a.crop_id)}</TableCell>}
                      <TableCell className="text-muted-foreground text-sm">{a.notes ?? "—"}</TableCell>
                      <TableCell><Button size="icon" variant="ghost" onClick={() => del(a.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
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
