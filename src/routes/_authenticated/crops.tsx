import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { useCurrentProjectId, useProjects } from "@/lib/current-project";
import { NoProject } from "@/components/no-project";
import { Card as InfoCard, CardContent as InfoCC } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/crops")({
  head: () => ({ meta: [{ title: "Crops — YourFarmFlow" }] }),
  component: CropsPage,
});

function CropsPage() {
  const qc = useQueryClient();
  const projectId = useCurrentProjectId();
  const { data: projects = [] } = useProjects();
  const project = projects.find((p) => p.id === projectId);

  const { data: crops = [] } = useQuery({
    enabled: !!projectId,
    queryKey: ["crops", projectId],
    queryFn: async () => (await supabase.from("crops").select("*").eq("project_id", projectId!).order("created_at", { ascending: false })).data ?? [],
  });
  const [name, setName] = useState("");
  const [planting, setPlanting] = useState("");
  const [harvest, setHarvest] = useState("");
  const [status, setStatus] = useState("growing");

  if (!projectId) return <NoProject label="crops" />;

  if (project && project.type === "building") {
    return (
      <div className="max-w-md mx-auto">
        <InfoCard>
          <InfoCC className="pt-6 text-center text-sm text-muted-foreground">
            Crops are only available for farm projects. Switch to a farm project to manage crops.
          </InfoCC>
        </InfoCard>
      </div>
    );
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("crops").insert({
      name, planting_date: planting || null, expected_harvest_date: harvest || null,
      status, user_id: u.user!.id, project_id: projectId,
    });
    if (error) return toast.error(error.message);
    toast.success("Crop added");
    setName(""); setPlanting(""); setHarvest(""); setStatus("growing");
    qc.invalidateQueries({ queryKey: ["crops"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  async function del(id: string) {
    const { error } = await supabase.from("crops").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["crops"] });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Crops</h2>
        <p className="text-muted-foreground text-sm">Track what you're growing.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Add a crop</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2"><Label>Name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Maize" /></div>
            <div className="space-y-2"><Label>Planting date</Label><Input type="date" value={planting} onChange={(e) => setPlanting(e.target.value)} /></div>
            <div className="space-y-2"><Label>Expected harvest</Label><Input type="date" value={harvest} onChange={(e) => setHarvest(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="growing">Growing</SelectItem>
                  <SelectItem value="harvested">Harvested</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 lg:col-span-4"><Button type="submit">Add crop</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Your crops ({crops.length})</CardTitle></CardHeader>
        <CardContent>
          {crops.length === 0 ? <p className="text-sm text-muted-foreground">No crops yet.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead><TableHead>Planted</TableHead>
                  <TableHead>Harvest</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {crops.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{formatDate(c.planting_date)}</TableCell>
                      <TableCell>{formatDate(c.expected_harvest_date)}</TableCell>
                      <TableCell><Badge variant={c.status === "harvested" ? "secondary" : "default"}>{c.status}</Badge></TableCell>
                      <TableCell><Button size="icon" variant="ghost" onClick={() => del(c.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
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
