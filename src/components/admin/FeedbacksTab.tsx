import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Image, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

const CATEGORY_LABELS: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  melhoria: { label: "Melhoria", variant: "default" },
  falha_sistemica: { label: "Falha Sistêmica", variant: "destructive" },
  falha_operacional: { label: "Falha Operacional", variant: "destructive" },
  informacao: { label: "Informação", variant: "secondary" },
};

export function FeedbacksTab() {
  const [filterPolo, setFilterPolo] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: feedbacks, isLoading } = useQuery({
    queryKey: ["user_feedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    },
  });

  const filtered = feedbacks?.filter((f) => {
    if (filterPolo !== "all" && f.polo !== filterPolo) return false;
    if (filterCategory !== "all" && f.category !== filterCategory) return false;
    return true;
  }) ?? [];

  const uniquePolos = [...new Set(feedbacks?.map((f) => f.polo) ?? [])].sort();

  return (
    <TabsContent value="feedbacks" className="space-y-4 mt-4">
      <div className="flex gap-3 items-end">
        <div className="space-y-1 flex-1">
          <label className="text-xs font-medium text-muted-foreground">Polo</label>
          <Select value={filterPolo} onValueChange={setFilterPolo}>
            <SelectTrigger className="bg-secondary border-border h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {uniquePolos.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 flex-1">
          <label className="text-xs font-medium text-muted-foreground">Categoria</label>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="bg-secondary border-border h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="melhoria">Melhoria</SelectItem>
              <SelectItem value="falha_sistemica">Falha Sistêmica</SelectItem>
              <SelectItem value="falha_operacional">Falha Operacional</SelectItem>
              <SelectItem value="informacao">Informação</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs text-muted-foreground pb-1.5">
          {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="animate-spin mr-2 h-4 w-4" />
          Carregando feedbacks...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Nenhum feedback encontrado.
        </div>
      ) : (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {filtered.map((fb) => {
            const catInfo = CATEGORY_LABELS[fb.category] ?? { label: fb.category, variant: "outline" as const };
            const isExpanded = expandedId === fb.id;
            const hasAttachments = fb.attachments && fb.attachments.length > 0;

            return (
              <div
                key={fb.id}
                className="border border-border rounded-lg p-3 bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div
                  className="flex items-start justify-between gap-2 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : fb.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={catInfo.variant} className="text-[10px] h-5">
                        {catInfo.label}
                      </Badge>
                      <span className="text-xs font-medium text-foreground">{fb.polo}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(fb.created_at), "dd/MM/yyyy HH:mm")}
                      </span>
                      {hasAttachments && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Image className="h-3 w-3" />
                          {fb.attachments.length}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs text-foreground/80 mt-1 ${isExpanded ? "" : "line-clamp-2"}`}>
                      {fb.message}
                    </p>
                  </div>
                  <div className="shrink-0 mt-0.5">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {isExpanded && hasAttachments && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {fb.attachments.map((att: string, i: number) => (
                      <a
                        key={i}
                        href={att}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-24 h-24 rounded-md overflow-hidden border border-border hover:ring-2 ring-primary transition-all"
                      >
                        <img src={att} alt={`Anexo ${i + 1}`} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </TabsContent>
  );
}
