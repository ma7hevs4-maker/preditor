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

// Generate a simple hash string from key fields of a row
function generateRowHash(row: any, type: "inc" | "m300"): string {
  if (type === "inc") {
    const numero = String(row["Número"] || row["Numero"] || "").trim();
    const equipe = String(row["Equipe Desl."] || row["Equipe"] || "").trim();
    const status = String(row["Status"] || "").trim();
    return `inc:${numero}:${equipe}:${status}`;
  } else {
    // m300: use equipe + incident + date ref
    const equipe = String(row["Equipe"] || "").trim();
    const incidente = String(
      row["Incidente"] || row["Número"] || row["Numero"] || row["Nr_Ordem"] || row["Nr Ordem"] || ""
    ).trim();
    const dataRef = String(
      row["Data Referência"] || row["Data Referencia"] || 
      Object.entries(row).find(([k]) => k.toLowerCase().includes("data referencia"))?.[1] || ""
    ).trim();
    return `m300:${equipe}:${incidente}:${dataRef}`;
  }
}

// Strip non-essential columns from raw data before persisting
const INC_ESSENTIAL_KEYS = [
  "Número", "Numero", "Status", "Causa", "Equipe Desl.", "Equipe Atribuída",
  "Data Fim", "Data Início", "Data Inicio", "Hora da ação equipe",
  "Data ação equipe", "Data Ação Equipe", "Grupo Processos DESLOC",
  "Enel / Parceira DESLOC", "Polo", "Nº Cliente", "N Cliente",
  "TMD", "TME", "ORD 2", "Observação", "Obs", "OBSERVAÇÃO",
];

const M300_ESSENTIAL_KEYS_LOWER = [
  "equipe", "data referencia", "inicio calendario", "fim calendario",
  "inicio intervalo", "fim intervalo", "a caminho", "no local", "liberada",
  "incidente", "número", "numero", "nr_ordem", "nr ordem", "nr. ordem",
  "nº incidente", "nº do incidente", "1o login corrigido", "1º login corrigido",
  "log in", "1o login", "1º login", "1o despacho", "1º despacho",
  "1º desloc", "1o desloc", "tempo de plataforma",
  "retorno a base", "retorno à base", "log off corrigido", "log off", "log-off",
];

function stripRow(row: any, type: "inc" | "m300"): any {
  if (!row || typeof row !== "object") return row;
  if (type === "inc") {
    const stripped: any = {};
    const keys = Object.keys(row);
    for (const key of keys) {
      const trimmed = key.trim();
      if (INC_ESSENTIAL_KEYS.some(ek => trimmed === ek || trimmed.toLowerCase() === ek.toLowerCase())) {
        stripped[trimmed] = row[key];
      }
    }
    return stripped;
  } else {
    const stripped: any = {};
    const keys = Object.keys(row);
    for (const key of keys) {
      const lower = key.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[ºª]/g, (ch) => ch === 'º' ? 'o' : 'a');
      if (M300_ESSENTIAL_KEYS_LOWER.some(ek => lower.includes(ek) || lower === ek)) {
        stripped[key.trim()] = row[key];
      }
    }
    return stripped;
  }
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
  await Promise.all([
    supabase.from("saved_inc_rows").delete().gte("id", 0),
    supabase.from("saved_m300_rows").delete().gte("id", 0),
    supabase.from("saved_upload_meta").delete().gte("saved_at", "1970-01-01"),
    supabase.from("saved_processed_cache").delete().gte("created_at", "1970-01-01"),
  ]);
}

async function batchUpsert(
  table: "saved_inc_rows" | "saved_m300_rows",
  rows: any[],
  type: "inc" | "m300",
  onProgress?: (done: number, total: number) => void
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  // Deduplicate all rows by hash first — keep last occurrence
  const deduped = new Map<string, any>();
  for (const row of rows) {
    const hash = generateRowHash(row, type);
    // Skip rows with empty key fields (would all collide on same hash)
    const parts = hash.split(":");
    const meaningful = parts.slice(1).filter(p => p.length > 0);
    if (meaningful.length < 2) continue;
    deduped.set(hash, row);
  }
  const uniqueRows = Array.from(deduped.entries());
  const total = uniqueRows.length;

  for (let i = 0; i < uniqueRows.length; i += BATCH_SIZE) {
    const batch = uniqueRows.slice(i, i + BATCH_SIZE).map(([hash, row]) => ({
      row_data: stripRow(row, type),
      row_hash: hash,
    }));
    
    const { error } = await supabase
      .from(table)
      .upsert(batch as never[], { onConflict: "row_hash" });
    if (error) throw error;
    
    inserted += batch.length;
    onProgress?.(Math.min(i + BATCH_SIZE, total), total);
  }
  
  return { inserted, updated };
}

async function saveProcessedCache(processedData: any[], incFileName?: string, m300FileName?: string, rowCountInc = 0, rowCountM300 = 0) {
  // Delete old cache
  await supabase.from("saved_processed_cache").delete().gte("created_at", "1970-01-01");
  
  const { error } = await supabase.from("saved_processed_cache").insert({
    processed_data: processedData,
    inc_file_name: incFileName || null,
    m300_file_name: m300FileName || null,
    row_count_inc: rowCountInc,
    row_count_m300: rowCountM300,
  } as never);
  if (error) {
    console.error("Error saving processed cache:", error);
    // Non-fatal: cache is optional optimization
  }
}

async function loadProcessedCache(): Promise<any[] | null> {
  const { data, error } = await supabase
    .from("saved_processed_cache")
    .select("processed_data")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return (data as any).processed_data as any[];
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

  // Save raw rows using upsert (accumulates, no delete)
  const saveRawData = async (params: {
    incRaw: any[];
    m300Raw: any[];
    incFileName?: string;
    m300FileName?: string;
    processedData?: any[];
  }) => {
    setIsSaving(true);
    try {
      setSaveProgress(`Salvando incidentes (0/${params.incRaw.length})...`);
      await batchUpsert("saved_inc_rows", params.incRaw, "inc", (done, total) => {
        setSaveProgress(`Salvando incidentes (${done}/${total})...`);
      });

      if (params.m300Raw.length > 0) {
        setSaveProgress(`Salvando M300 (0/${params.m300Raw.length})...`);
        await batchUpsert("saved_m300_rows", params.m300Raw, "m300", (done, total) => {
          setSaveProgress(`Salvando M300 (${done}/${total})...`);
        });
      }

      // Count total rows in DB after upsert
      const [{ count: totalInc }, { count: totalM300 }] = await Promise.all([
        supabase.from("saved_inc_rows").select("id", { count: "exact", head: true }),
        supabase.from("saved_m300_rows").select("id", { count: "exact", head: true }),
      ]);

      setSaveProgress("Salvando metadados...");
      // Delete old meta and insert new
      await supabase.from("saved_upload_meta").delete().gte("saved_at", "1970-01-01");
      const { error } = await supabase.from("saved_upload_meta").insert({
        inc_file_name: params.incFileName || null,
        m300_file_name: params.m300FileName || null,
        row_count_inc: totalInc || params.incRaw.length,
        row_count_m300: totalM300 || params.m300Raw.length,
      } as never);
      if (error) throw error;

      // Save processed cache if provided
      if (params.processedData) {
        setSaveProgress("Salvando cache processado...");
        await saveProcessedCache(
          params.processedData,
          params.incFileName,
          params.m300FileName,
          totalInc || params.incRaw.length,
          totalM300 || params.m300Raw.length
        );
      }

      await loadMeta();
      setSaveProgress("");
    } finally {
      setIsSaving(false);
      setSaveProgress("");
    }
  };

  // Load saved data - try cache first, fallback to raw rows
  const loadSavedData = async (): Promise<{ incRaw: any[]; m300Raw: any[]; cachedProcessed: any[] | null }> => {
    // Try loading from processed cache first
    const cached = await loadProcessedCache();
    if (cached && cached.length > 0) {
      return { incRaw: [], m300Raw: [], cachedProcessed: cached };
    }
    
    // Fallback: load raw rows
    const [incRaw, m300Raw] = await Promise.all([
      fetchRows("saved_inc_rows"),
      fetchRows("saved_m300_rows"),
    ]);
    return { incRaw, m300Raw, cachedProcessed: null };
  };

  // Clear all monthly data
  const clearAllData = async () => {
    await deleteAll();
    setMeta(null);
  };

  return { meta, isLoadingMeta, loadMeta, saveRawData, isSaving, saveProgress, loadSavedData, clearAllData };
};
