import React, { useState, useRef } from "react";
import { MessageSquarePlus, Send, Loader2, Paperclip, X, Image } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const POLOS = [
  "Campos",
  "Macaé",
  "Lagos",
  "Noroeste",
  "Magé",
  "Niterói",
  "São Gonçalo",
  "Serrana",
  "Sul",
  "COD",
  "Outro",
];

const CATEGORIES = [
  { value: "melhoria", label: "Sugestão de melhoria" },
  { value: "falha_sistemica", label: "Falha sistêmica" },
  { value: "falha_operacional", label: "Falha operacional" },
  { value: "informacao", label: "Informação / Dúvida" },
];

export function FeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [polo, setPolo] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<{ file: File; preview: string }[]>([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newAttachments = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setAttachments((prev) => [...prev, ...newAttachments].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    if (!polo || !category || !message.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    setSending(true);
    try {
      // Convert images to base64 data URIs for storage
      const attachmentUrls: string[] = [];
      for (const att of attachments) {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(att.file);
        });
        attachmentUrls.push(dataUrl);
      }

      const { error } = await supabase.from("user_feedback").insert({
        polo,
        category,
        message: message.trim(),
        attachments: attachmentUrls,
      } as any);

      if (error) throw error;

      toast.success("Feedback enviado com sucesso! Obrigado.");
      setPolo("");
      setCategory("");
      setMessage("");
      attachments.forEach((a) => URL.revokeObjectURL(a.preview));
      setAttachments([]);
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar feedback. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      attachments.forEach((a) => URL.revokeObjectURL(a.preview));
      setAttachments([]);
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
          title="Enviar feedback"
        >
          <MessageSquarePlus className="h-5 w-5" />
          <span className="text-sm font-medium hidden sm:inline">Feedback</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar Feedback</DialogTitle>
          <DialogDescription>
            Relate melhorias, falhas ou informações. Seus prints e comentários nos ajudam a melhorar o sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Polo *</label>
              <Select value={polo} onValueChange={setPolo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {POLOS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Categoria *</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Mensagem *</label>
            <Textarea
              placeholder="Descreva sua sugestão, problema ou informação..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={2000}
            />
            <p className="text-[11px] text-muted-foreground mt-1 text-right">{message.length}/2000</p>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Anexos (prints)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleAttach}
              className="hidden"
            />
            <div className="flex flex-wrap gap-2">
              {attachments.map((att, i) => (
                <div key={i} className="relative group w-16 h-16 rounded-md overflow-hidden border border-border">
                  <img src={att.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeAttachment(i)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              ))}
              {attachments.length < 5 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-md border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Image className="h-4 w-4" />
                  <span className="text-[9px] mt-0.5">Anexar</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Até 5 imagens</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={sending || !polo || !category || !message.trim()}>
            {sending ? (
              <>
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
