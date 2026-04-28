import { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, CheckCircle2, ListPlus, Snowflake, UserCheck, Layers, Users } from "lucide-react";

const FIELDS = [
  { key: "name", label: "Nome" },
  { key: "phone", label: "Telefone" },
  { key: "email", label: "E-mail" },
  { key: "company", label: "Empresa" },
  { key: "source", label: "Origem" },
  { key: "tags", label: "Tags (separadas por ;)" },
];

type ListType = "leads" | "clients" | "mixed";

const LIST_TYPES: { id: ListType; label: string; icon: any; description: string }[] = [
  { id: "leads", label: "Leads / Contatos Novos", icon: Snowflake, description: "Lista fria, prospecção. Contatos que ainda não são clientes." },
  { id: "clients", label: "Clientes Efetivados", icon: UserCheck, description: "Clientes que já compraram. Migração de carteira." },
  { id: "mixed", label: "Misto", icon: Layers, description: "O arquivo contém leads e clientes. Mapeie a coluna indicadora." },
];

const normalizePhone = (raw: string) => {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length >= 10 && digits.length <= 11) return "55" + digits;
  return digits;
};

interface Props {
  onShowImported?: () => void;
}

export default function LeadImporter({ onShowImported }: Props) {
  const { user } = useAuth();
  const [mode, setMode] = useState<"file" | "paste">("file");
  const [listType, setListType] = useState<ListType>("leads");
  const [campaignTag, setCampaignTag] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [pipelineId, setPipelineId] = useState<string>("");
  const [stageId, setStageId] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [manualText, setManualText] = useState("");
  const [importedCount, setImportedCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: pipes }, { data: sts }, { data: ic }] = await Promise.all([
        supabase.from("pipelines").select("*").eq("user_id", user.id),
        supabase.from("pipeline_stages").select("*").eq("user_id", user.id).order("position"),
        supabase.from("imported_contacts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setPipelines(pipes || []);
      setStages(sts || []);
      setImportedCount((ic as any)?.count || 0);
    })();
  }, [user]);

  const handleFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv" || ext === "txt") {
      Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: (res) => {
          const data = res.data as any[];
          setRows(data);
          setHeaders(res.meta.fields || []);
          autoMap(res.meta.fields || []);
        },
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      setRows(data);
      const hdrs = data[0] ? Object.keys(data[0] as any) : [];
      setHeaders(hdrs);
      autoMap(hdrs);
    } else {
      toast.error("Use arquivos CSV, TXT ou Excel (.xlsx, .xls)");
    }
  };

  const autoMap = (hdrs: string[]) => {
    const m: Record<string, string> = {};
    for (const h of hdrs) {
      const lower = h.toLowerCase();
      if (lower.includes("nome") || lower === "name") m.name = h;
      else if (lower.includes("tel") || lower.includes("phone") || lower.includes("whats")) m.phone = h;
      else if (lower.includes("mail")) m.email = h;
      else if (lower.includes("empresa") || lower.includes("company")) m.company = h;
      else if (lower.includes("origem") || lower.includes("source")) m.source = h;
      else if (lower.includes("tag")) m.tags = h;
    }
    setMapping(m);
  };

  const importNow = async () => {
    if (!user) return;
    setImporting(true);
    setImported(0); setSkipped(0);
    let ok = 0, skip = 0;

    const listName = campaignTag || `Importação ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    const { data: list } = await supabase.from("imported_lists").insert({
      user_id: user.id, name: listName, list_type: listType, tag: campaignTag || null,
    }).select().single();

    for (const row of rows) {
      const phone = normalizePhone(String(row[mapping.phone] || ""));
      const name = mapping.name ? String(row[mapping.name] || "") : "";
      const email = mapping.email ? String(row[mapping.email] || "") : "";
      if (!phone && !email && !name) { skip++; continue; }

      const { data: existing } = phone ? await supabase
        .from("imported_contacts").select("id").eq("user_id", user.id).eq("phone", phone).maybeSingle()
        : { data: null };

      if (existing) { skip++; continue; }

      if (list) {
        const { error } = await supabase.from("imported_contacts").insert({
          user_id: user.id, list_id: list.id, phone: phone || null, email: email || null,
          name: name || phone || email || "Sem nome", status: "pending",
          metadata: {
            company: mapping.company ? row[mapping.company] : null,
            source: mapping.source ? row[mapping.source] : "import",
            tags: [
              ...(mapping.tags ? String(row[mapping.tags] || "").split(/[;,]/).map(s => s.trim()).filter(Boolean) : []),
              ...(campaignTag ? [campaignTag] : []),
            ],
            list_type: listType,
            target_pipeline_id: pipelineId || null,
            target_stage_id: stageId || null,
          },
        });
        if (error) skip++; else ok++;
      }
    }

    if (list) {
      await supabase.from("imported_lists").update({ total_contacts: ok }).eq("id", list.id);
    }

    setImported(ok); setSkipped(skip);
    setImporting(false);
    setImportedCount(c => c + ok);
    toast.success(`${ok} contatos importados • ${skip} ignorados • Lista "${listName}" criada. Converta-os em "Importados".`);
    setRows([]); setHeaders([]); setMapping({}); setManualText("");
  };

  const loadManualNumbers = () => {
    const lines = manualText.split(/[\n,;]/).map(s => s.trim()).filter(Boolean);
    if (lines.length === 0) { toast.error("Cole ao menos um número"); return; }
    const data = lines.map(line => {
      const m = line.match(/^(.+?)\s*[-–|]\s*(.+)$/);
      const name = m ? m[1].trim() : "";
      const phone = m ? m[2].trim() : line;
      return { Nome: name, Telefone: phone };
    });
    setRows(data);
    setHeaders(["Nome", "Telefone"]);
    setMapping({ name: "Nome", phone: "Telefone" });
    toast.success(`${data.length} contatos carregados — clique Importar`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" /> Importar Contatos
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Importe via arquivo ou cole sua lista. Os contatos ficam em "Importados" para conversão.
          </p>
        </div>
        {onShowImported && (
          <Button variant="outline" size="sm" onClick={onShowImported}>
            <Users className="h-4 w-4 mr-1" />
            Ver {importedCount} contatos importados
          </Button>
        )}
      </div>

      {/* Tag de campanha */}
      <Card className="p-4">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tag de campanha (opcional)</Label>
        <Input
          className="mt-1"
          placeholder="ex: black-friday-2025, leads-instagram-jan"
          value={campaignTag}
          onChange={(e) => setCampaignTag(e.target.value)}
        />
      </Card>

      {/* Tipo de lista */}
      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Tipo de lista</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {LIST_TYPES.map(t => {
            const Icon = t.icon;
            const active = listType === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setListType(t.id)}
                className={`text-left p-4 rounded-lg border-2 transition ${active ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}
              >
                <Icon className={`h-5 w-5 mb-2 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <p className="font-semibold text-sm">{t.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => setMode("file")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${mode === "file" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <FileSpreadsheet className="h-4 w-4 inline mr-1" /> Importar Arquivo
        </button>
        <button
          onClick={() => setMode("paste")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${mode === "paste" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <ListPlus className="h-4 w-4 inline mr-1" /> Colar Contatos
        </button>
      </div>

      {/* Upload area */}
      {mode === "file" ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault(); setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition ${dragOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/40 bg-card"}`}
        >
          <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-60" />
          <p className="text-base font-semibold">Arraste seu arquivo aqui</p>
          <p className="text-sm text-muted-foreground mt-1">ou clique para selecionar</p>
          <Button variant="secondary" size="sm" className="mt-4" type="button">Selecionar arquivo</Button>
          <p className="text-xs text-muted-foreground mt-3">CSV, TXT, Excel (.xlsx, .xls) — aceita listas com apenas telefone, email ou nome</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
          />
        </div>
      ) : (
        <Card className="p-4 space-y-3">
          <Label className="text-xs">Cole sua lista (um contato por linha)</Label>
          <Textarea
            rows={6}
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder={"João Silva - 5511999999999\n5521988887777\nMaria - maria@email.com"}
          />
          <Button onClick={loadManualNumbers} variant="secondary">
            <ListPlus className="h-4 w-4 mr-1" /> Carregar lista
          </Button>
        </Card>
      )}

      {/* Mapping & preview */}
      {rows.length > 0 && (
        <>
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <Upload className="h-4 w-4" /> Mapeamento de Colunas
              <Badge variant="secondary" className="ml-auto">{rows.length} linhas</Badge>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <Label className="text-xs">{f.label}</Label>
                  <select
                    className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
                    value={mapping[f.key] || ""}
                    onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
                  >
                    <option value="">— Não mapear —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Destino sugerido (aplicado na conversão)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Pipeline</Label>
                <select className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
                  value={pipelineId} onChange={(e) => setPipelineId(e.target.value)}>
                  <option value="">Padrão</option>
                  {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Etapa</Label>
                <select className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
                  value={stageId} onChange={(e) => setStageId(e.target.value)}>
                  <option value="">Primeira</option>
                  {stages.filter(s => !pipelineId || s.pipeline_id === pipelineId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <Button onClick={importNow} disabled={importing || (!mapping.phone && !mapping.email && !mapping.name)} className="w-full">
              {importing ? "Importando..." : `Importar ${rows.length} contatos`}
            </Button>
            {imported > 0 && (
              <p className="text-sm flex items-center gap-2 text-primary">
                <CheckCircle2 className="h-4 w-4" />
                {imported} importados, {skipped} ignorados (duplicados ou inválidos)
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
