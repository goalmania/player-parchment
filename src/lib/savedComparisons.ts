import { supabase } from "@/integrations/supabase/client";

export interface SavedComparison {
  id: string;
  owner_id: string;
  name: string;
  player_ids: string[];
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export async function listSavedComparisons(): Promise<SavedComparison[]> {
  const { data, error } = await supabase
    .from("saved_comparisons")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((r: any) => ({
    ...r,
    player_ids: Array.isArray(r.player_ids) ? r.player_ids : [],
  }));
}

export async function saveComparison(
  name: string,
  player_ids: string[],
  notes?: string,
  id?: string
): Promise<SavedComparison> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Devi essere autenticato.");
  const payload = {
    owner_id: u.user.id,
    name: name.trim() || "Confronto senza titolo",
    player_ids,
    notes: notes ?? null,
  };
  if (id) {
    const { data, error } = await supabase
      .from("saved_comparisons")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as SavedComparison;
  }
  const { data, error } = await supabase
    .from("saved_comparisons")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as SavedComparison;
}

export async function deleteSavedComparison(id: string): Promise<void> {
  const { error } = await supabase.from("saved_comparisons").delete().eq("id", id);
  if (error) throw error;
}
