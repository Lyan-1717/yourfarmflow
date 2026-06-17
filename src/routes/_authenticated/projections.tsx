import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentProjectId, useProjects } from "@/lib/current-project";
import { NoProject } from "@/components/no-project";
import { formatRWF } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/projections")({
  head: () => ({ meta: [{ title: "Future Projections — YourFarmFlow" }] }),
  component: ProjectionsPage,
});

function ProjectionsPage() {
  const projectId = useCurrentProjectId();
  const { data: projects = [] } = useProjects();
  const project = projects.find((p) => p.id === projectId);

  const { data: groups = [] } = useQuery({
    enabled: !!projectId, queryKey: ["livestock", projectId],
    queryFn: async () => (await supabase.from("livestock").select("*").eq("project_id", projectId!)).data ?? [],
  });
  const { data: animals = [] } = useQuery({
    enabled: !!projectId, queryKey: ["animals", projectId],
    queryFn: async () => (await supabase.from("animals").select("*").eq("project_id", projectId!)).data ?? [],
  });

  const [offspringPerBirth, setOPB] = useState("1");
  const [birthsPerYear, setBPY] = useState("1");
  const [survivalRate, setSR] = useState("90");
  const [annualSalesRate, setASR] = useState("20");
  const [pricePerAnimal, setPPA] = useState("100000");

  if (!projectId) return <NoProject label="projections" />;
  if (project && project.type !== "livestock") {
    return <div className="max-w-3xl mx-auto"><Card><CardHeader><CardTitle>Livestock only</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Switch to a Livestock project.</CardContent></Card></div>;
  }

  const opb = Number(offspringPerBirth) || 1;
  const bpy = Number(birthsPerYear) || 1;
  const sr = (Number(survivalRate) || 0) / 100;
  const asr = (Number(annualSalesRate) || 0) / 100;
  const price = Number(pricePerAnimal) || 0;

  function projectGroup(currentSize: number, females: number, years: number) {
    let size = currentSize;
    let totalOffspring = 0;
    let totalSales = 0;
    let f = females;
    for (let y = 0; y < years; y++) {
      const births = f * bpy;
      const offspring = births * opb * sr;
      const sales = size * asr;
      size = size + offspring - sales;
      f = Math.floor(size * (females / Math.max(currentSize, 1)));
      totalOffspring += offspring;
      totalSales += sales;
    }
    return { size: Math.round(size), offspring: Math.round(totalOffspring), sales: Math.round(totalSales), value: Math.round(size * price) };
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Future Projections</h2>
        <p className="text-muted-foreground text-sm">Estimate herd growth, value, and sales under your assumptions.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Assumptions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2"><Label>Offspring per birth</Label><Input type="number" min="1" value={offspringPerBirth} onChange={(e) => setOPB(e.target.value)} /></div>
            <div className="space-y-2"><Label>Births / female / year</Label><Input type="number" min="0" step="0.1" value={birthsPerYear} onChange={(e) => setBPY(e.target.value)} /></div>
            <div className="space-y-2"><Label>Survival rate (%)</Label><Input type="number" min="0" max="100" value={survivalRate} onChange={(e) => setSR(e.target.value)} /></div>
            <div className="space-y-2"><Label>Annual sales rate (%)</Label><Input type="number" min="0" max="100" value={annualSalesRate} onChange={(e) => setASR(e.target.value)} /></div>
            <div className="space-y-2"><Label>Price per animal (RWF)</Label><Input type="number" min="0" value={pricePerAnimal} onChange={(e) => setPPA(e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {groups.length === 0 && <p className="text-sm text-muted-foreground">Add livestock groups first.</p>}
        {groups.map((g: any) => {
          const inGroup = animals.filter((a: any) => a.group_id === g.id);
          const size = inGroup.length || Number(g.quantity) || 0;
          const females = inGroup.filter((a: any) => a.gender === "Female").length || Math.floor(size / 2);
          const p1 = projectGroup(size, females, 1);
          const p3 = projectGroup(size, females, 3);
          const p5 = projectGroup(size, females, 5);
          return (
            <Card key={g.id}>
              <CardHeader><CardTitle>{g.name} <span className="text-sm font-normal text-muted-foreground">· {g.animal_type} · current {size}</span></CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[{ label: "1 year", p: p1 }, { label: "3 years", p: p3 }, { label: "5 years", p: p5 }].map((row) => (
                    <div key={row.label} className="rounded-lg border p-4">
                      <p className="text-xs uppercase text-muted-foreground">{row.label}</p>
                      <p className="text-2xl font-bold mt-1">{row.p.size} animals</p>
                      <p className="text-xs text-muted-foreground mt-2">Offspring: {row.p.offspring} · Sales: {row.p.sales}</p>
                      <p className="text-sm font-semibold mt-1">{formatRWF(row.p.value)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}