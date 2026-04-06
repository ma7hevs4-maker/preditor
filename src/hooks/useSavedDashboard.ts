import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BATCH_SIZE = 500;

export interface SavedMeta {
  id: string;
  inc_file_name: string | null;
  m300_file_name: string | null;
  row_count_inc: number;
  row_count_m300: number;
  saved_at: string;
}

async function fetchMeta(): Promise<SavedMeta | null> {
  const { data, error } = await supabase
    .from("saved_upload_meta")
    .select("*")
    .order("saved_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as SavedMeta | null;
}

async function fetchRows(table: "saved_inc_rows" | "saved_m300_rows"): Promise<any[]> {
  const allRows: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("row_data")
      .range(from, from + 999)
      .order("id", { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows.push(...data.map((r: any) => r.row_data));
    if (data.length < 1000) break;
    from += 1000;
  }
  return allRows;
}

async function deleteAll() {
  // Delete in parallel
  await Promise.all([
    supabase.from("saved_inc_rows").delete().gte("id", 0),
    supabase.from("saved_m300_rows").delete().gte("id", 0),
    supabase.from("saved_upload_meta").delete().gte("saved_at", "1970-01-01"),
  ]);
}

async function batchInsert(table: "saved_inc_rows" | "saved_m300_rows", rows: any[]) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map((row_data: any) => ({ row_data }));
    const { error } = await supabase.from(table).insert(batch as never[]);
    if (error) throw error;
  }
}

export const useSavedDashboard = () => {
  const [meta, setMeta] = useState<SavedMeta | null>(null);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState("");

  // Load meta on mount
  const loadMeta = async () => {
    setIsLoadingMeta(true);
    try {
      const m = await fetchMeta();
      setMeta(m);
    } catch (e) {
      console.error("Error loading meta:", e);
    } finally {
      setIsLoadingMeta(false);
    }
  };

  // Save raw rows: delete all existing, then batch insert
  const saveRawData = async (params: {
    incRaw: any[];
    m300Raw: any[];
    incFileName?: string;
    m300FileName?: string;
  }) => {
    setIsSaving(true);
    try {
      setSaveProgress("Limpando dados anteriores...");
      await deleteAll();

      setSaveProgress(`Salvando ${params.incRaw.length} linhas de incidentes...`);
      await batchInsert("saved_inc_rows", params.incRaw);

      if (params.m300Raw.length > 0) {
        setSaveProgress(`Salvando ${params.m300Raw.length} linhas do M300...`);
        await batchInsert("saved_m300_rows", params.m300Raw);
      }

      setSaveProgress("Salvando metadados...");
      const { error } = await supabase.from("saved_upload_meta").insert({
        inc_file_name: params.incFileName || null,
        m300_file_name: params.m300FileName || null,
        row_count_inc: params.incRaw.length,
        row_count_m300: params.m300Raw.length,
      } as never);
      if (error) throw error;

      await loadMeta();
      setSaveProgress("");
    } finally {
      setIsSaving(false);
      setSaveProgress("");
    }
  };

  // Load saved raw data
  const loadSavedData = async (): Promise<{ incRaw: any[]; m300Raw: any[] }> => {
    const [incRaw, m300Raw] = await Promise.all([
      fetchRows("saved_inc_rows"),
      fetchRows("saved_m300_rows"),
    ]);
    return { incRaw, m300Raw };
  };

  return { meta, isLoadingMeta, loadMeta, saveRawData, isSaving, saveProgress, loadSavedData };
};
