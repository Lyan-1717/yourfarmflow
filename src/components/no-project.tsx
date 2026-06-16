import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderKanban } from "lucide-react";

export function NoProject({ label = "this section" }: { label?: string }) {
  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardContent className="pt-6 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <FolderKanban className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">No project selected</h3>
            <p className="text-sm text-muted-foreground">Create or select a project to use {label}.</p>
          </div>
          <Button asChild><Link to="/projects">Go to Projects</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
