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
  // Use RPC (TRUNCATE) so the wipe is atomic and not subject to PostgREST
  // row-cap quirks that previously left old rows behind and caused duplicates
  // when re-saving.
  const { error } = await (supabase as any).rpc("clear_saved_dashboard_data");
  if (error) {
    console.error("clear_saved_dashboard_data RPC failed:", error);
    throw error;
  }
}

async function batchInsert(
  table: "saved_inc_rows" | "saved_m300_rows",
  rows: any[],
  onProgress?: (done: number, total: number) => void
) {
  const total = rows.length;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map((row) => ({
      row_data: row,
    }));
    const { error } = await supabase.from(table).insert(batch as never[]);
    if (error) throw error;
    onProgress?.(Math.min(i + BATCH_SIZE, total), total);
  }
}

export const useSavedDashboard = () => {
  const [meta, setMeta] = useState<SavedMeta | null>(null);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState("");

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

  const saveRawData = async (params: {
    incRaw: any[];
    m300Raw: any[];
    incFileName?: string;
    m300FileName?: string;
    processedData?: any[];
  }) => {
    setIsSaving(true);
    try {
      // Delete everything first
      setSaveProgress("Limpando dados anteriores...");
      await deleteAll();

      // Insert incidents
      setSaveProgress(`Salvando incidentes (0/${params.incRaw.length})...`);
      await batchInsert("saved_inc_rows", params.incRaw, (done, total) => {
        setSaveProgress(`Salvando incidentes (${done}/${total})...`);
      });

      // Insert M300
      if (params.m300Raw.length > 0) {
        setSaveProgress(`Salvando M300 (0/${params.m300Raw.length})...`);
        await batchInsert("saved_m300_rows", params.m300Raw, (done, total) => {
          setSaveProgress(`Salvando M300 (${done}/${total})...`);
        });
      }

      // Save meta
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

  const loadSavedData = async (): Promise<{ incRaw: any[]; m300Raw: any[]; cachedProcessed: any[] | null }> => {
    const [incRaw, m300Raw] = await Promise.all([
      fetchRows("saved_inc_rows"),
      fetchRows("saved_m300_rows"),
    ]);
    return { incRaw, m300Raw, cachedProcessed: null };
  };

  const clearAllData = async () => {
    await deleteAll();
    setMeta(null);
  };

  return { meta, isLoadingMeta, loadMeta, saveRawData, isSaving, saveProgress, loadSavedData, clearAllData };
};
