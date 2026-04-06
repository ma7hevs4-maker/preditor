import React, { useState } from "react";
import { Upload, FileSpreadsheet, Loader2, Database } from "lucide-react";
import { processFiles } from "@/utils/meuDataProcessing";
import { Dashboard } from "@/components/meu/Dashboard";
import { useSavedDashboard } from "@/hooks/useSavedDashboard";

export default function Meu() {
  const [incFile, setIncFile] = useState<File | null>(null);
  const [m300File, setM300File] = useState<File | null>(null);
  const [data, setData] = useState<any[] | null>(null);
  const [sourceFiles, setSourceFiles] = useState<{ incFileName?: string; m300FileName?: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { latest, isLoading: loadingSaved } = useSavedDashboard();

  const handleProcess = async () => {
    if (!incFile) return;
    setLoading(true);
    setError(null);
    try {
      const processedData = await processFiles(incFile, m300File);
      setSourceFiles({ incFileName: incFile.name, m300FileName: m300File?.name });
      setData(processedData);
    } catch (err) {
      console.error(err);
      setError(
        "Erro ao processar as bases. Verifique se os arquivos estão no formato correto.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSaved = () => {
    if (latest?.data) {
      setSourceFiles(latest.source_files || {});
      setData(latest.data);
    }
  };

  if (data) {
    return <Dashboard data={data} onBack={() => setData(null)} sourceFiles={sourceFiles} />;
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-xl p-8 border border-border">
        <div className="text-center mb-8">
          <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Dashboard Operacional
          </h1>
          <p className="text-muted-foreground mt-2">
            Faça o upload das bases para visualizar o dashboard
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Base de Incidentes
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setIncFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Base M300 (Opcional)
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setM300File(e.target.files?.[0] || null)}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
              {error}
            </div>
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

          {/* Load saved dashboard button */}
          {loadingSaved ? (
            <div className="flex items-center justify-center py-3 text-muted-foreground text-sm">
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              Verificando dados salvos...
            </div>
          ) : latest ? (
            <button
              onClick={handleLoadSaved}
              className="w-full flex flex-col items-center justify-center py-3 px-4 border border-border rounded-lg text-sm font-medium text-foreground bg-secondary/50 hover:bg-secondary/80 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                Acessar última atualização
              </span>
              <span className="text-[11px] text-muted-foreground mt-1">
                Salvo em {new Date(latest.saved_at).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
