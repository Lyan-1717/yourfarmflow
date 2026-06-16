import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/farm")({
  head: () => ({ meta: [{ title: "Farm Profile — YourFarmFlow" }] }),
  component: FarmPage,
});

function FarmPage() {
  const qc = useQueryClient();
  const { data: farm } = useQuery({
    queryKey: ["farm"],
    queryFn: async () => {
      const { data } = await supabase.from("farms").select("*").maybeSingle();
      return data;
    },
  });
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [size, setSize] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (farm) {
      setName(farm.name ?? "");
      setLocation(farm.location ?? "");
      setSize(farm.size ?? "");
    }
  }, [farm]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const payload = { name, location, size, user_id: u.user!.id };
    const { error } = farm
      ? await supabase.from("farms").update(payload).eq("id", farm.id)
      : await supabase.from("farms").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Farm saved");
    qc.invalidateQueries({ queryKey: ["farm"] });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Farm Profile</h2>
        <p className="text-muted-foreground text-sm">Tell us about your farm.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Farm name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Musanze, Rwanda" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="size">Farm size (optional)</Label>
              <Input id="size" value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. 2 hectares" />
            </div>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save farm"}</Button>
          </form>
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