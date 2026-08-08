// Configuração do Pixel do Meta Ads por funil (pipeline)
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save, ShieldCheck } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pipelineId: string | null;
  pipelineName?: string;
  onSaved?: () => void;
}

const PipelineMetaDialog = ({ open, onOpenChange, pipelineId, pipelineName, onSaved }: Props) => {
  const { toast } = useToast();
  const [pixelId, setPixelId] = useState("");
  const [token, setToken] = useState("");
  const [testCode, setTestCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !pipelineId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("pipelines")
        .select("meta_pixel_id,meta_access_token,meta_test_event_code")
        .eq("id", pipelineId)
        .maybeSingle();
      setPixelId((data as any)?.meta_pixel_id || "");
      setToken((data as any)?.meta_access_token || "");
      setTestCode((data as any)?.meta_test_event_code || "");
      setLoading(false);
    })();
  }, [open, pipelineId]);

  const save = async () => {
    if (!pipelineId) return;
    setSaving(true);
    const { error } = await supabase
      .from("pipelines")
      .update({
        meta_pixel_id: pixelId.trim() || null,
        meta_access_token: token.trim() || null,
        meta_test_event_code: testCode.trim() || null,
      } as any)
      .eq("id", pipelineId);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Integração salva", description: "Credenciais do Pixel atualizadas para este funil." });
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Integração Meta Ads {pipelineName ? `— ${pipelineName}` : ""}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="meta" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="meta" className="flex-1 text-xs">Integração Meta Ads</TabsTrigger>
          </TabsList>
          <TabsContent value="meta" className="space-y-4 pt-4">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Pixel ID</Label>
                  <Input value={pixelId} onChange={(e) => setPixelId(e.target.value)} placeholder="Ex: 123456789012345" className="bg-secondary/30 border-border h-10 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Access Token (CAPI)</Label>
                  <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="EAAB..." className="bg-secondary/30 border-border h-10 text-sm" />
                  <p className="text-[11px] text-muted-foreground">Gerado no Gerenciador de Eventos da Meta → Configurações → Conversions API.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Código de Teste (opcional)</Label>
                  <Input value={testCode} onChange={(e) => setTestCode(e.target.value)} placeholder="TEST12345" className="bg-secondary/30 border-border h-10 text-sm" />
                </div>
                <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                  Estas credenciais valem apenas para este funil. Se vazias, o sistema usa a configuração global de Meta Ads.
                </p>
                <div className="flex gap-2 pt-1">
                  <Button variant="ghost" className="flex-1 h-10 font-bold" onClick={() => onOpenChange(false)}>Cancelar</Button>
                  <Button className="flex-1 h-10 font-bold gap-2" onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default PipelineMetaDialog;
