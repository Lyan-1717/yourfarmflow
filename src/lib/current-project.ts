import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const KEY = "yff_current_project_id";
const listeners = new Set<() => void>();
let current: string | null =
  typeof window !== "undefined" ? localStorage.getItem(KEY) : null;

function emit() {
  listeners.forEach((l) => l());
}

export function getCurrentProjectId() {
  return current;
}

export function setCurrentProjectId(id: string | null) {
  current = id;
  if (typeof window !== "undefined") {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  }
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useCurrentProjectId() {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}

export type Project = {
  id: string;
  name: string;
  type: "farm" | "building";
  location: string | null;
  user_id: string;
  created_at: string;
};

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: true });
      const list = (data ?? []) as Project[];
      // Auto-select first project if none selected or selected missing
      if (list.length > 0) {
        const sel = getCurrentProjectId();
        if (!sel || !list.some((p) => p.id === sel)) {
          setCurrentProjectId(list[0].id);
        }
      } else if (getCurrentProjectId()) {
        setCurrentProjectId(null);
      }
      return list;
    },
  });
}
