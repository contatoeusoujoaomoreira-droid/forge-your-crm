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
  { key: "phone", label: "Telefone / Celular" },
  { key: "country_code", label: "Código do País (DDI)" },
  { key: "area_code", label: "DDD" },
  { key: "email", label: "E-mail" },
  { key: "company", label: "Empresa" },
  { key: "source", label: "Origem" },
  { key: "tags", label: "Tags (separadas por ;)" },
];

const COUNTRIES = [
  { code: "55", label: "Brasil (+55)" },
  { code: "1", label: "EUA / Canadá (+1)" },
  { code: "351", label: "Portugal (+351)" },
  { code: "34", label: "Espanha (+34)" },
  { code: "44", label: "Reino Unido (+44)" },
  { code: "54", label: "Argentina (+54)" },
  { code: "56", label: "Chile (+56)" },
  { code: "57", label: "Colômbia (+57)" },
  { code: "52", label: "México (+52)" },
  { code: "595", label: "Paraguai (+595)" },
  { code: "598", label: "Uruguai (+598)" },
  { code: "39", label: "Itália (+39)" },
  { code: "49", label: "Alemanha (+49)" },
  { code: "33", label: "França (+33)" },
];

const onlyDigits = (v: any) => String(v ?? "").replace(/\D/g, "");

type ListType = "leads" | "clients" | "mixed";

const LIST_TYPES: { id: ListType; label: string; icon: any; description: string }[] = [
  { id: "leads", label: "Leads / Contatos Novos", icon: Snowflake, description: "Lista fria, prospecção. Contatos que ainda não são clientes." },
  { id: "clients", label: "Clientes Efetivados", icon: UserCheck, description: "Clientes que já compraram. Migração de carteira." },
  { id: "mixed", label: "Misto", icon: Layers, description: "O arquivo contém leads e clientes. Mapeie a coluna indicadora." },
];

// Monta o E.164 a partir das colunas mapeadas (DDI, DDD e número podem vir separados)
export const buildPhoneE164 = (
  rawPhone: string,
  rawCountry: string,
  rawArea: string,
  defaultCountry: string,
): string => {
  let local = onlyDigits(rawPhone);
  if (!local) return "";

  let ddi = onlyDigits(rawCountry);
  const ddd = onlyDigits(rawArea);

  // Se o número já vem com "+" ou "00", o DDI está embutido
  const hadPlus = /^\s*(\+|00)/.test(String(rawPhone ?? ""));
  if (hadPlus && local.startsWith("00")) local = local.slice(2);

  if (ddd && !local.startsWith(ddd)) local = ddd + local;

  if (!ddi) {
    if (hadPlus) {
      // DDI já embutido no número
      return local;
    }
    // Brasil: número já com 55 + DDD + 8/9 dígitos
    if (local.length >= 12 && local.startsWith("55")) return local;
    ddi = onlyDigits(defaultCountry) || "55";
  }

  if (local.startsWith(ddi) && local.length > (ddi === "55" ? 11 : 9)) return local;
  return ddi + local;
};

const isValidPhone = (e164: string) => e164.length >= 10 && e164.length <= 15;


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
  const [defaultCountry, setDefaultCountry] = useState("55");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const phoneOf = (row: any) => buildPhoneE164(
    mapping.phone ? row[mapping.phone] : "",
    mapping.country_code ? row[mapping.country_code] : "",
    mapping.area_code ? row[mapping.area_code] : "",
    defaultCountry,
  );


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

  // Converte uma matriz (linhas x colunas) em objetos, detectando a linha real de cabeçalho
  const matrixToRows = (matrix: any[][]) => {
    const clean = matrix.filter((r) => Array.isArray(r) && r.some((c) => String(c ?? "").trim() !== ""));
    if (clean.length === 0) return { headers: [] as string[], rows: [] as any[] };

    const looksLikeHeader = (row: any[]) => {
      const cells = row.map((c) => String(c ?? "").trim()).filter(Boolean);
      if (cells.length < 2) return false;
      const numeric = cells.filter((c) => /^[\d\s+().-]+$/.test(c)).length;
      return numeric / cells.length < 0.5;
    };

    let headerIdx = clean.findIndex(looksLikeHeader);
    if (headerIdx === -1) headerIdx = -1; // sem cabeçalho: gera nomes genéricos

    const width = Math.max(...clean.map((r) => r.length));
    const raw = headerIdx >= 0 ? clean[headerIdx] : [];
    const seen = new Map<string, number>();
    const headers: string[] = [];
    for (let i = 0; i < width; i++) {
      let name = String(raw[i] ?? "").trim() || `Coluna ${i + 1}`;
      const n = (seen.get(name) || 0) + 1;
      seen.set(name, n);
      if (n > 1) name = `${name} (${n})`;
      headers.push(name);
    }

    const body = clean.slice(headerIdx + 1);
    const rows = body
      .map((r) => {
        const obj: any = {};
        headers.forEach((h, i) => { obj[h] = r[i] ?? ""; });
        return obj;
      })
      .filter((o) => Object.values(o).some((v) => String(v ?? "").trim() !== ""));

    return { headers, rows };
  };

  const applyParsed = (headers: string[], rows: any[]) => {
    if (rows.length === 0) { toast.error("Nenhuma linha de dados encontrada no arquivo"); return; }
    setRows(rows);
    setHeaders(headers);
    autoMap(headers, rows);
    toast.success(`${rows.length} linhas lidas • ${headers.length} colunas detectadas`);
  };

  const handleFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv" || ext === "txt") {
      Papa.parse(file, {
        header: false, skipEmptyLines: true,
        complete: (res) => {
          const { headers, rows } = matrixToRows(res.data as any[][]);
          applyParsed(headers, rows);
        },
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "", blankrows: false }) as any[][];
      const { headers, rows } = matrixToRows(matrix);
      applyParsed(headers, rows);
    } else {
      toast.error("Use arquivos CSV, TXT ou Excel (.xlsx, .xls)");
    }
  };

  // Mapeamento por pontuação: cabeçalho + análise do conteúdo das colunas
  const autoMap = (hdrs: string[], data: any[]) => {
    const sample = data.slice(0, 40);
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const vals = (h: string) => sample.map((r) => String(r[h] ?? "").trim()).filter(Boolean);

    const isIdCol = (h: string) => /^(id|ids|codigo|cod|cod\.|numero de registro|registro|#)$/.test(norm(h));

    const scores: Record<string, { h: string; score: number }[]> = {
      phone: [], name: [], email: [], country_code: [], area_code: [], company: [], source: [], tags: [],
    };

    for (const h of hdrs) {
      const n = norm(h);
      const v = vals(h);
      const digitsOnly = v.filter((x) => /^[\d\s+().-]+$/.test(x));
      const digitLens = digitsOnly.map((x) => x.replace(/\D/g, "").length);
      const avgLen = digitLens.length ? digitLens.reduce((a, b) => a + b, 0) / digitLens.length : 0;
      const mostlyDigits = v.length > 0 && digitsOnly.length / v.length > 0.7;
      const hasEmail = v.length > 0 && v.filter((x) => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(x)).length / v.length > 0.5;

      // E-mail
      let s = 0;
      if (/mail/.test(n)) s += 60;
      if (hasEmail) s += 50;
      if (s) scores.email.push({ h, score: s });

      // Telefone
      s = 0;
      if (/(telefone|celular|whats|fone|phone|mobile|tel\b|contato)/.test(n)) s += 60;
      if (mostlyDigits && avgLen >= 8 && avgLen <= 15) s += 40;
      if (isIdCol(h)) s -= 100;
      if (hasEmail) s -= 100;
      if (s > 0) scores.phone.push({ h, score: s });

      // DDI / País
      s = 0;
      if (/^(ddi|pais|country|country code|codigo do pais|cod pais)$/.test(n) || /\bddi\b/.test(n)) s += 60;
      if (mostlyDigits && avgLen >= 1 && avgLen <= 3) s += 20;
      if (s >= 60) scores.country_code.push({ h, score: s });

      // DDD / Área
      s = 0;
      if (/^(ddd|area|area code|cod area|prefixo)$/.test(n) || /\bddd\b/.test(n)) s += 60;
      if (mostlyDigits && avgLen >= 2 && avgLen <= 3) s += 20;
      if (s >= 60) scores.area_code.push({ h, score: s });

      // Nome
      s = 0;
      if (/^(nome|name|nome completo|cliente|nome do cliente|razao social|contato|full name|first name)$/.test(n)) s += 80;
      else if (/(nome|name|cliente)/.test(n)) s += 60;
      if (v.length && !mostlyDigits && !hasEmail) s += 30;
      if (isIdCol(h)) s -= 200;
      if (mostlyDigits) s -= 120;
      if (s > 0) scores.name.push({ h, score: s });

      // Empresa
      s = 0;
      if (/(empresa|company|organizacao|negocio)/.test(n)) s += 60;
      if (s) scores.company.push({ h, score: s });

      // Origem
      s = 0;
      if (/(origem|source|canal|utm)/.test(n)) s += 60;
      if (s) scores.source.push({ h, score: s });

      // Tags
      s = 0;
      if (/(tag|etiqueta|segmento)/.test(n)) s += 60;
      if (s) scores.tags.push({ h, score: s });
    }

    const m: Record<string, string> = {};
    const used = new Set<string>();
    // ordem de prioridade: campos mais críticos primeiro
    for (const key of ["phone", "email", "name", "country_code", "area_code", "company", "source", "tags"]) {
      const best = scores[key].filter((c) => !used.has(c.h)).sort((a, b) => b.score - a.score)[0];
      if (best) { m[key] = best.h; used.add(best.h); }
    }

    // Fallback: se não achou nome, usa a primeira coluna textual não usada
    if (!m.name) {
      const cand = hdrs.find((h) => {
        if (used.has(h) || isIdCol(h)) return false;
        const v = vals(h);
        return v.length > 0 && v.filter((x) => /^[\d\s+().-]+$/.test(x)).length / v.length < 0.4;
      });
      if (cand) { m.name = cand; used.add(cand); }
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
      const built = phoneOf(row);
      const phone = isValidPhone(built) ? built : "";
      const name = mapping.name ? String(row[mapping.name] || "") : "";
      const email = mapping.email ? String(row[mapping.email] || "") : "";
      if (!phone && !email && !name) { skip++; continue; }
      if (!phone && mapping.phone) { skip++; continue; }


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

            {/* Prévia da planilha lida */}
            <div className="pt-2 border-t border-border">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Prévia da planilha (3 primeiras linhas)</Label>
              <div className="mt-1 overflow-x-auto rounded-md border border-border">
                <table className="w-full text-[11px]">
                  <thead className="bg-secondary/50">
                    <tr>{headers.map((h) => <th key={h} className="px-2 py-1 text-left font-semibold whitespace-nowrap">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 3).map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        {headers.map((h) => <td key={h} className="px-2 py-1 whitespace-nowrap text-muted-foreground">{String(r[h] ?? "")}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>



            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-border">
              <div>
                <Label className="text-xs">País padrão (quando não houver DDI na planilha)</Label>
                <select
                  className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
                  value={defaultCountry}
                  onChange={(e) => setDefaultCountry(e.target.value)}
                >
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Prévia dos números (formato internacional)</Label>
                <div className="mt-1 rounded-md border border-border bg-secondary/30 p-2 space-y-1 max-h-32 overflow-y-auto">
                  {rows.slice(0, 5).map((r, i) => {
                    const p = phoneOf(r);
                    const valid = isValidPhone(p);
                    return (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground truncate max-w-[50%]">
                          {mapping.name ? String(r[mapping.name] || "—") : "—"}
                        </span>
                        <span className={valid ? "text-primary font-mono" : "text-destructive font-mono"}>
                          {p ? `+${p}` : "sem telefone"}{!valid && p ? " (inválido)" : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Válidos: {rows.filter(r => isValidPhone(phoneOf(r))).length} de {rows.length}
                </p>
              </div>
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
