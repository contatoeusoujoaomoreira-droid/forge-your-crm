import { useState, useEffect } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileSpreadsheet, CheckCircle2, ListPlus } from "lucide-react";

const FIELDS = [
  { key: "name", label: "Nome" },
  { key: "phone", label: "Telefone" },
  { key: "email", label: "E-mail" },
  { key: "company", label: "Empresa" },
  { key: "source", label: "Origem" },
  { key: "tags", label: "Tags (separadas por ;)" },
];

const normalizePhone = (raw: string) => {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length >= 10 && digits.length <= 11) return "55" + digits;
  return digits;
};

export default function LeadImporter() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [pipelineId, setPipelineId] = useState<string>("");
  const [stageId, setStageId] = useState<string>("");
  const [tagInicial, setTagInicial] = useState("");
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [manualText, setManualText] = useState("");

  // Load pipelines on mount
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: pipes } = await supabase.from("pipelines").select("*").eq("user_id", user.id);
      setPipelines(pipes || []);
      const { data: sts } = await supabase.from("pipeline_stages").select("*").eq("user_id", user.id).order("position");
      setStages(sts || []);
    })();
  }, [user]);

  const handleFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv") {
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
      toast.error("Use arquivos CSV ou XLSX");
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
    setImported(0);
    setSkipped(0);
    let ok = 0, skip = 0;

    for (const row of rows) {
      const phone = normalizePhone(String(row[mapping.phone] || ""));
      if (!phone) { skip++; continue; }
      const name = String(row[mapping.name] || phone);
      const email = mapping.email ? String(row[mapping.email] || "") : null;
      const company = mapping.company ? String(row[mapping.company] || "") : null;
      const source = mapping.source ? String(row[mapping.source] || "import") : "import";
      const tagsRaw = mapping.tags ? String(row[mapping.tags] || "") : "";
      const tags = [
        ...(tagsRaw ? tagsRaw.split(/[;,]/).map((s) => s.trim()).filter(Boolean) : []),
        ...(tagInicial ? [tagInicial] : []),
      ];

      // Dedup: by phone for this user
      const { data: existing } = await supabase
        .from("leads").select("id").eq("user_id", user.id).eq("phone", phone).maybeSingle();
      if (existing) { skip++; continue; }

      const { error } = await supabase.from("leads").insert({
        user_id: user.id, name, email, phone, company, source,
        tags, status: "new",
        pipeline_id: pipelineId || null, stage_id: stageId || null,
      });
      if (error) skip++; else ok++;
    }

    setImported(ok);
    setSkipped(skip);
    setImporting(false);
    toast.success(`${ok} importados • ${skip} ignorados`);
  };

  const loadManualNumbers = () => {
    const lines = manualText.split(/[\n,;]/).map(s => s.trim()).filter(Boolean);
    if (lines.length === 0) { toast.error("Cole ao menos um número"); return; }
    const data = lines.map(line => {
      // Allow "Nome - 5511999999999" or just number
      const m = line.match(/^(.+?)\s*[-–|]\s*(.+)$/);
      const name = m ? m[1].trim() : "";
      const phone = m ? m[2].trim() : line;
      return { Nome: name, Telefone: phone };
    });
    setRows(data);
    setHeaders(["Nome", "Telefone"]);
    setMapping({ name: "Nome", phone: "Telefone" });
    toast.success(`${data.length} números carregados — confira o destino e clique Importar`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Importar arquivo (CSV / XLSX)</h3>
          </div>
          <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => e.target.files && handleFile(e.target.files[0])}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:cursor-pointer" />
          <p className="text-xs text-muted-foreground mt-2">Formatos suportados: .csv, .xlsx, .xls. Cabeçalhos serão mapeados automaticamente.</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <ListPlus className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Digitar números manualmente</h3>
          </div>
          <Textarea
            rows={5}
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder={"Um por linha. Ex:\nJoão Silva - 5511999999999\n5521988887777"}
          />
          <Button className="mt-2 w-full" variant="secondary" onClick={loadManualNumbers}>
            <ListPlus className="h-4 w-4 mr-1" />Carregar lista
          </Button>
        </Card>
      </div>

      {rows.length > 0 && (
        <>
          <Card className="p-6 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><Upload className="h-4 w-4" />Mapeamento de Colunas</h3>
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <Label className="text-xs">{f.label}</Label>
                  <select className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
                    value={mapping[f.key] || ""} onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}>
                    <option value="">— Não mapear —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <Badge variant="secondary">{rows.length} linhas detectadas</Badge>
          </Card>

          <Card className="p-6 space-y-3">
            <h3 className="font-semibold">Destino CRM</h3>
            <div className="grid grid-cols-3 gap-3">
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
                  {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Tag inicial</Label>
                <Input value={tagInicial} onChange={(e) => setTagInicial(e.target.value)} placeholder="ex: importacao-jan" />
              </div>
            </div>
            <Button onClick={importNow} disabled={importing || !mapping.phone}>
              {importing ? "Importando..." : `Importar ${rows.length} leads`}
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
