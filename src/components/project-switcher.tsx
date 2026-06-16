import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Home, Tractor } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCurrentProjectId, setCurrentProjectId, useProjects } from "@/lib/current-project";

export function ProjectSwitcher() {
  const qc = useQueryClient();
  const { data: projects = [] } = useProjects();
  const currentId = useCurrentProjectId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"farm" | "building">("farm");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Project name required");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("projects")
      .insert({ name, type, location: location || null, user_id: u.user!.id })
      .select()
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Project created");
    setCurrentProjectId(data.id);
    setName(""); setLocation(""); setType("farm"); setOpen(false);
    qc.invalidateQueries({ queryKey: ["projects"] });
  }

  function onChange(id: string) {
    if (id === "__new__") { setOpen(true); return; }
    setCurrentProjectId(id);
    qc.invalidateQueries();
  }

  const current = projects.find((p) => p.id === currentId);

  return (
    <div className="flex items-center gap-2 min-w-0">
      <Select value={currentId ?? ""} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-[180px] sm:w-[240px]">
          <SelectValue placeholder="Select project">
            {current ? (
              <span className="flex items-center gap-2 truncate">
                {current.type === "farm" ? <Tractor className="h-4 w-4 shrink-0" /> : <Home className="h-4 w-4 shrink-0" />}
                <span className="truncate">{current.name}</span>
              </span>
            ) : "Select project"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              <span className="flex items-center gap-2">
                {p.type === "farm" ? <Tractor className="h-4 w-4" /> : <Home className="h-4 w-4" />}
                {p.name}
              </span>
            </SelectItem>
          ))}
          <SelectItem value="__new__">
            <span className="flex items-center gap-2 text-primary"><Plus className="h-4 w-4" /> New project</span>
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" aria-label="New project">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>
          <form onSubmit={create} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Home farm" required />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setType("farm")} className={`flex items-center gap-2 rounded-md border p-3 text-sm ${type === "farm" ? "border-primary bg-primary/5" : ""}`}>
                  <Tractor className="h-4 w-4" /> Farm
                </button>
                <button type="button" onClick={() => setType("building")} className={`flex items-center gap-2 rounded-md border p-3 text-sm ${type === "building" ? "border-primary bg-primary/5" : ""}`}>
                  <Home className="h-4 w-4" /> Building / House
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location (optional)</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Musanze, Rwanda" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create project"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
