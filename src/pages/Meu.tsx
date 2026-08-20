import React, { useState, useEffect } from "react";
import { Upload, FileSpreadsheet, Loader2, Database, Trash2 } from "lucide-react";
import { readExcelToJson, processRawData } from "@/utils/meuDataProcessing";
import { Dashboard } from "@/components/meu/Dashboard";
import { useSavedDashboard } from "@/hooks/useSavedDashboard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSettingValue } from "@/hooks/useSystemSettings";
import { FeedbackDialog } from "@/components/meu/FeedbackDialog";

export default function Meu() {
  const [incFile, setIncFile] = useState<File | null>(null);
  const [m300File, setM300File] = useState<File | null>(null);
  const [data, setData] = useState<any[] | null>(null);
  const [rawInc, setRawInc] = useState<any[]>([]);
  const [rawM300, setRawM300] = useState<any[]>([]);
  const [sourceFiles, setSourceFiles] = useState<{ incFileName?: string; m300FileName?: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearPassword, setClearPassword] = useState("");
  const [clearPasswordError, setClearPasswordError] = useState(false);
  const savingEnabled = useSettingValue("dashboard_saving_enabled", "true") !== "false";
  const { meta, isLoadingMeta, loadMeta, saveRawData, isSaving, saveProgress, loadSavedData, clearAllData } = useSavedDashboard();

  useEffect(() => { loadMeta(); }, []);

  const handleProcess = async () => {
    if (!incFile) return;
    setLoading(true);
    setError(null);
    try {
      const [incRaw, m300Raw] = await Promise.all([
        readExcelToJson(incFile),
        m300File ? readExcelToJson(m300File) : Promise.resolve([]),
      ]);
      setRawInc(incRaw);
      setRawM300(m300Raw);
      setSourceFiles({ incFileName: incFile.name, m300FileName: m300File?.name });
      const processedData = processRawData(incRaw, m300Raw);
      setData(processedData);
    } catch (err) {
      console.error(err);
      setError("Erro ao processar as bases. Verifique se os arquivos estão no formato correto.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSaved = async () => {
    setLoading(true);
    setError(null);
    try {
      const { incRaw, m300Raw, cachedProcessed } = await loadSavedData();
      
      if (cachedProcessed) {
        // Fast path: use cached processed data
        setRawInc([]);
        setRawM300([]);
        setSourceFiles({
          incFileName: meta?.inc_file_name || undefined,
          m300FileName: meta?.m300_file_name || undefined,
        });
        setData(cachedProcessed);
      } else {
        // Fallback: process from raw
        setRawInc(incRaw);
        setRawM300(m300Raw);
        setSourceFiles({
          incFileName: meta?.inc_file_name || undefined,
          m300FileName: meta?.m300_file_name || undefined,
        });
        const processedData = processRawData(incRaw, m300Raw);
        setData(processedData);
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar dados salvos.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    if (clearPassword !== "dys") {
      setClearPasswordError(true);
      return;
    }
    setLoading(true);
    setShowClearDialog(false);
    setClearPassword("");
    setClearPasswordError(false);
    try {
      await clearAllData();
    } catch (err) {
      console.error(err);
      setError("Erro ao limpar dados.");
    } finally {
      setLoading(false);
    }
  };

  if (data) {
    return (
      <Dashboard
        data={data}
        onBack={() => setData(null)}
        sourceFiles={sourceFiles}
        rawInc={rawInc}
        rawM300={rawM300}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-xl p-8 border border-border">
        <div className="text-center mb-8">
          <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Operacional</h1>
          <p className="text-muted-foreground mt-2">Faça o upload das bases para visualizar o dashboard</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Base de Incidentes</label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setIncFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Base M300 (Opcional)</label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setM300File(e.target.files?.[0] || null)}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>
          )}

          <button
            onClick={handleProcess}
            disabled={!incFile || loading}
            className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                Processando...
              </>
            ) : (
              <>
                <Upload className="-ml-1 mr-2 h-5 w-5" />
                Gerar Dashboard
              </>
            )}
          </button>

          {isLoadingMeta ? (
            <div className="flex items-center justify-center py-3 text-muted-foreground text-sm">
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              Verificando dados salvos...
            </div>
          ) : meta && savingEnabled ? (
            <div className="space-y-2">
              <button
                onClick={handleLoadSaved}
                disabled={loading}
                className="w-full flex flex-col items-center justify-center py-3 px-4 border border-border rounded-lg text-sm font-medium text-foreground bg-secondary/50 hover:bg-secondary/80 transition-colors disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  Acessar última atualização
                </span>
                <span className="text-[11px] text-muted-foreground mt-1">
                  Salvo em {new Date(meta.saved_at).toLocaleString("pt-BR", {
                    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                  })} • {meta.row_count_inc} incidentes{meta.row_count_m300 > 0 ? ` + ${meta.row_count_m300} M300` : ""}
                </span>
              </button>

              <button
                onClick={() => { setShowClearDialog(true); setClearPassword(""); setClearPasswordError(false); }}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-destructive/30 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Limpar base mensal
              </button>

              <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Limpar base mensal?</DialogTitle>
                    <DialogDescription>
                      Isso vai apagar todos os dados salvos (incidentes, M300 e cache processado). 
                      Essa ação não pode ser desfeita. Digite a senha para confirmar.
                    </DialogDescription>
                  </DialogHeader>
                  <Input
                    type="password"
                    placeholder="Senha"
                    value={clearPassword}
                    onChange={(e) => { setClearPassword(e.target.value); setClearPasswordError(false); }}
                  />
                  {clearPasswordError && (
                    <p className="text-destructive text-sm">Senha incorreta.</p>
                  )}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowClearDialog(false)}>Cancelar</Button>
                    <Button variant="destructive" onClick={handleClearData}>Sim, limpar tudo</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          ) : null}

          {isSaving && saveProgress && (
            <div className="flex items-center justify-center py-2 text-muted-foreground text-xs">
              <Loader2 className="animate-spin mr-2 h-3 w-3" />
              {saveProgress}
            </div>
          )}
        </div>
      </div>
      <FeedbackDialog />
    </div>
  );
}
