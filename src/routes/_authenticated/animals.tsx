import { createFileRoute, Link } from "@tanstack/react-router";
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
import { Trash2, Plus, Baby, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { formatRWF, formatDate } from "@/lib/format";
import { useCurrentProjectId, useProjects } from "@/lib/current-project";
import { NoProject } from "@/components/no-project";

export const Route = createFileRoute("/_authenticated/animals")({
  head: () => ({ meta: [{ title: "Animal Registry — YourFarmFlow" }] }),
  component: AnimalsPage,
});

const STATUSES = ["Healthy", "Pregnant", "Milking", "Nursing", "Growing", "Ready for Sale", "Sold", "Deceased"];

function AnimalsPage() {
  const qc = useQueryClient();
  const projectId = useCurrentProjectId();
  const { data: projects = [] } = useProjects();
  const project = projects.find((p) => p.id === projectId);

  const { data: groups = [] } = useQuery({
    enabled: !!projectId,
    queryKey: ["livestock", projectId],
    queryFn: async () => (await supabase.from("livestock").select("*").eq("project_id", projectId!).order("created_at")).data ?? [],
  });
  const { data: animals = [] } = useQuery({
    enabled: !!projectId,
    queryKey: ["animals", projectId],
    queryFn: async () => (await supabase.from("animals").select("*").eq("project_id", projectId!).order("created_at", { ascending: false })).data ?? [],
  });

  const [groupId, setGroupId] = useState<string>("");
  const [tag, setTag] = useState("");
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [gender, setGender] = useState("Female");
  const [dob, setDob] = useState("");
  const [status, setStatus] = useState("Healthy");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");

  // Birth form
  const [bMother, setBMother] = useState<string>("");
  const [bGroup, setBGroup] = useState<string>("");
  const [bDate, setBDate] = useState(new Date().toISOString().slice(0, 10));
  const [bMales, setBMales] = useState("0");
  const [bFemales, setBFemales] = useState("1");
  const [bNotes, setBNotes] = useState("");

  if (!projectId) return <NoProject label="animals" />;
  if (project && project.type !== "livestock") {
    return <div className="max-w-3xl mx-auto"><Card><CardHeader><CardTitle>Livestock only</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Switch to a Livestock project to access the animal registry.</CardContent></Card></div>;
  }

  async function addAnimal(e: React.FormEvent) {
    e.preventDefault();
    if (!groupId) return toast.error("Pick a group");
    const grp = groups.find((g: any) => g.id === groupId);
    if (!grp) return toast.error("Group not found");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("animals").insert({
      user_id: u.user!.id, project_id: projectId!, group_id: groupId,
      animal_type: grp.animal_type, tag_number: tag || null, name: name || null,
      breed: breed || null, gender: gender || null,
      date_of_birth: dob || null, status, estimated_value: value ? Number(value) : 0, notes: notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Animal added");
    setTag(""); setName(""); setBreed(""); setDob(""); setValue(""); setNotes("");
    qc.invalidateQueries({ queryKey: ["animals"] });
  }

  async function del(id: string) {
    if (!confirm("Delete this animal?")) return;
    await supabase.from("animals").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["animals"] });
  }

  async function recordBirth(e: React.FormEvent) {
    e.preventDefault();
    const grpId = bGroup || (bMother ? animals.find((a: any) => a.id === bMother)?.group_id : "");
    if (!grpId) return toast.error("Pick a group or mother");
    const males = Number(bMales) || 0;
    const females = Number(bFemales) || 0;
    if (males + females <= 0) return toast.error("Enter at least one offspring");
    const { error } = await supabase.rpc("record_birth", {
      _project_id: projectId!, _group_id: grpId as string,
      _mother_id: bMother || (undefined as any), _birth_date: bDate,
      _num_males: males, _num_females: females, _notes: bNotes || (undefined as any),
    });
    if (error) return toast.error(error.message);
    toast.success(`Recorded ${males + females} offspring`);
    setBMother(""); setBGroup(""); setBMales("0"); setBFemales("1"); setBNotes("");
    qc.invalidateQueries({ queryKey: ["animals"] });
    qc.invalidateQueries({ queryKey: ["livestock"] });
    qc.invalidateQueries({ queryKey: ["births"] });
  }

  const groupName = (id: string) => groups.find((g: any) => g.id === id)?.name ?? "—";
  const totalValue = animals.reduce((s: number, a: any) => s + Number(a.estimated_value || 0), 0);
  const females = animals.filter((a: any) => a.gender === "Female" && a.status !== "Sold" && a.status !== "Deceased");

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Animal Registry</h2>
          <p className="text-muted-foreground text-sm">Individual animals across all your herds.</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Registry value</p>
          <p className="text-2xl font-bold">{formatRWF(totalValue)}</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add individual animal</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={addAnimal} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Group</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger><SelectValue placeholder="Pick a herd" /></SelectTrigger>
                <SelectContent>{groups.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name} ({g.animal_type})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Tag / Earring #</Label><Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="A001" /></div>
            <div className="space-y-2"><Label>Name (optional)</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Breed</Label><Input value={breed} onChange={(e) => setBreed(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Female","Male","Unknown"].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Estimated Value (RWF)</Label><Input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} /></div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-3"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            <div className="sm:col-span-2 lg:col-span-3"><Button type="submit">Add animal</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Baby className="h-4 w-4" /> Record a birth</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">Newborns are automatically created and linked to the mother. Herd quantity updates automatically.</p>
          <form onSubmit={recordBirth} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Mother (optional)</Label>
              <Select value={bMother || "none"} onValueChange={(v) => setBMother(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None / Herd-level —</SelectItem>
                  {females.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.tag_number || a.name || a.id.slice(0,6)} ({groupName(a.group_id)})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Group</Label>
              <Select value={bGroup || "auto"} onValueChange={(v) => setBGroup(v === "auto" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">— Auto from mother —</SelectItem>
                  {groups.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Birth date</Label><Input type="date" required value={bDate} onChange={(e) => setBDate(e.target.value)} /></div>
            <div /><div className="space-y-2"><Label>Males</Label><Input type="number" min="0" value={bMales} onChange={(e) => setBMales(e.target.value)} /></div>
            <div className="space-y-2"><Label>Females</Label><Input type="number" min="0" value={bFemales} onChange={(e) => setBFemales(e.target.value)} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Notes</Label><Input value={bNotes} onChange={(e) => setBNotes(e.target.value)} /></div>
            <div className="sm:col-span-2 lg:col-span-4"><Button type="submit">Record birth</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Animals ({animals.length})</CardTitle></CardHeader>
        <CardContent>
          {animals.length === 0 ? <p className="text-sm text-muted-foreground">No individual animals yet.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Tag/Name</TableHead><TableHead>Group</TableHead><TableHead>Type</TableHead>
                  <TableHead>Gender</TableHead><TableHead>Status</TableHead><TableHead>DOB</TableHead>
                  <TableHead className="text-right">Value</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {animals.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        <Link to="/animals/$id" params={{ id: a.id }} className="hover:underline flex items-center gap-1">
                          {a.tag_number || a.name || a.id.slice(0,6)}<ChevronRight className="h-3 w-3" />
                        </Link>
                      </TableCell>
                      <TableCell>{groupName(a.group_id)}</TableCell>
                      <TableCell>{a.animal_type}</TableCell>
                      <TableCell>{a.gender ?? "—"}</TableCell>
                      <TableCell><span className="px-2 py-0.5 rounded bg-muted text-xs">{a.status}</span></TableCell>
                      <TableCell>{a.date_of_birth ? formatDate(a.date_of_birth) : "—"}</TableCell>
                      <TableCell className="text-right">{formatRWF(a.estimated_value)}</TableCell>
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