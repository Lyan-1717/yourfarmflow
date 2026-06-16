import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Home, Tractor, Plus, Beef } from "lucide-react";
import { toast } from "sonner";
import { useProjects, useCurrentProjectId, setCurrentProjectId } from "@/lib/current-project";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({ meta: [{ title: "Projects — YourFarmFlow" }] }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const qc = useQueryClient();
  const { data: projects = [] } = useProjects();
  const currentId = useCurrentProjectId();
  const [name, setName] = useState("");
  const [type, setType] = useState<"farm" | "livestock" | "building">("farm");
  const [location, setLocation] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name required");
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("projects")
      .insert({ name, type, location: location || null, user_id: u.user!.id })
      .select().single();
    if (error) return toast.error(error.message);
    toast.success("Project created");
    setCurrentProjectId(data.id);
    setName(""); setLocation(""); setType("farm");
    qc.invalidateQueries({ queryKey: ["projects"] });
  }

  async function del(id: string) {
    if (!confirm("Delete this project and ALL its data?")) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Project deleted");
    qc.invalidateQueries({ queryKey: ["projects"] });
    qc.invalidateQueries();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Projects</h2>
        <p className="text-muted-foreground text-sm">Manage your farms and buildings.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-4 w-4" /> New project</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={add} className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Home farm" required /></div>
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button type="button" onClick={() => setType("farm")} className={`flex items-center gap-2 rounded-md border p-3 text-sm ${type === "farm" ? "border-primary bg-primary/5" : ""}`}>
                  <Tractor className="h-4 w-4" /> Crop Farm
                </button>
                <button type="button" onClick={() => setType("livestock")} className={`flex items-center gap-2 rounded-md border p-3 text-sm ${type === "livestock" ? "border-primary bg-primary/5" : ""}`}>
                  <Beef className="h-4 w-4" /> Livestock Farm
                </button>
                <button type="button" onClick={() => setType("building")} className={`flex items-center gap-2 rounded-md border p-3 text-sm ${type === "building" ? "border-primary bg-primary/5" : ""}`}>
                  <Home className="h-4 w-4" /> Building / Construction
                </button>
              </div>
            </div>
            <div className="space-y-2"><Label>Location (optional)</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Musanze, Rwanda" /></div>
            <Button type="submit">Create project</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Your projects ({projects.length})</CardTitle></CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects yet. Create your first one above.</p>
          ) : (
            <ul className="divide-y">
              {projects.map((p) => (
                <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                  <button onClick={() => setCurrentProjectId(p.id)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                    <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                      {p.type === "farm" ? <Tractor className="h-4 w-4" /> : p.type === "livestock" ? <Beef className="h-4 w-4" /> : <Home className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.type === "farm" ? "Crop Farm" : p.type === "livestock" ? "Livestock Farm" : "Building / Construction"}{p.location ? ` · ${p.location}` : ""}
                      </p>
                    </div>
                  </button>
                  {currentId === p.id && <Badge>Active</Badge>}
                  <Button size="icon" variant="ghost" onClick={() => del(p.id)} aria-label="Delete project"><Trash2 className="h-4 w-4" /></Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>About</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1 text-muted-foreground">
          <p><strong className="text-foreground">Founder:</strong> MURARA Lyan</p>
          <p><strong className="text-foreground">Contact:</strong> +250 795 818 338</p>
          <p><strong className="text-foreground">Email:</strong> <a href="mailto:lyanmucyo11@gmail.com" className="underline">lyanmucyo11@gmail.com</a></p>
        </CardContent>
      </Card>
    </div>
  );
}
