import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, FileCode, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { CATALOG_FIELDS, CATALOG_LABELS, parseCatalogXml, mapCatalogRows, catalogRowError, type CatalogField } from '@/lib/catalogImport';
import { STORE_IMAGE_ACCEPT, validateStoreImage } from '@/lib/storeAppearance';

export default function CatalogImporter({ open, onOpenChange, onImported }: {open:boolean;onOpenChange:(open:boolean)=>void;onImported:()=>void}) {
  const { user } = useAuth();
  const [url,setUrl] = useState(''); const [busy,setBusy] = useState(false); const [error,setError] = useState('');
  const [feed,setFeed] = useState<ReturnType<typeof parseCatalogXml> | null>(null);
  const [mapping,setMapping] = useState<Record<CatalogField,string> | null>(null);
  const [excluded,setExcluded] = useState<Set<number>>(new Set());
  const [photos,setPhotos] = useState<File[]>([]);
  const [result,setResult] = useState<{created:number;updated:number;failed:string[]} | null>(null);
  const [updateExisting,setUpdateExisting] = useState(false);
  const rows = useMemo(()=>feed && mapping ? mapCatalogRows(feed.records,mapping) : [],[feed,mapping]);
  const valid = rows.map((row,i)=>({row,i,error:catalogRowError(row,rows)}));
  const chosen = valid.filter(v=>!v.error && !excluded.has(v.i));
  const read = (xml:string) => { const parsed=parseCatalogXml(xml);setFeed(parsed);setMapping(parsed.mapping);setExcluded(new Set());setResult(null); };
  const file = async (f?:File) => { if (!f) return;setError('');try { if(f.size>8*1024*1024) throw new Error('O feed deve ter até 8 MB.');read(await f.text()); } catch(e) {setError(e instanceof Error?e.message:'Arquivo inválido.');} };
  const fetchFeed = async () => {
    setBusy(true);setError('');
    try { const {data,error}=await supabase.functions.invoke('catalog-import',{body:{url:url.trim()}});if(error || !data?.xml) throw new Error(data?.error || 'Não foi possível ler esse endereço. Confira se é um feed público.');read(data.xml); }
    catch(e) {setError(e instanceof Error?e.message:'Falha ao ler feed.');} finally {setBusy(false);}
  };
  const importRows = async () => {
    if (!user || busy || !chosen.length) return;
    setBusy(true);setError('');setResult(null);
    let created=0,updated=0; const failed:string[]=[];
    try {
      const skus=chosen.map(v=>v.row.sku);
      const {data:existing,error}=await supabase.from('products_services').select('id,sku,images,item_type').eq('user_id',user.id).in('sku',skus);
      if(error) throw error;
      const bySku=new Map((existing || []).map(p=>[p.sku,p]));
      for(const {row} of chosen) {
        const old=bySku.get(row.sku);
        if(old && !updateExisting) continue;
        if(old?.item_type==='service') {failed.push(`${row.sku}: código pertence a um serviço.`);continue;}
        const uploaded:string[]=[];
        const paths:string[]=[];
        try {
          // File names deliberately map uploaded media by SKU. Never adopt image URLs from a feed.
          const matches=photos.filter(f=>f.name.replace(/\.[^.]+$/,'').split('__')[0]===row.sku);
          for(const f of matches) {
            const invalid=validateStoreImage(f);if(invalid) throw new Error(invalid);
            const path=`${user.id}/products/${crypto.randomUUID()}-${f.name.replace(/[^a-zA-Z0-9.]/g,'_')}`;
            const {error}=await supabase.storage.from('chat-media').upload(path,f);if(error) throw error;
            paths.push(path);uploaded.push(supabase.storage.from('chat-media').getPublicUrl(path).data.publicUrl);
          }
          const payload={...row, ...(uploaded.length ? {images:[...(old?.images || []),...uploaded]} : {}), user_id:user.id};
          const response=old ? await supabase.from('products_services').update(payload).eq('id',old.id).eq('user_id',user.id) : await supabase.from('products_services').insert({...payload,is_active:true,show_in_catalog:false,item_type:'product',stock_qty:row.stock_qty ?? 0});
          if(response.error) throw response.error;
          if(old) updated++; else created++;
        } catch(e) {if(paths.length) await supabase.storage.from('chat-media').remove(paths);failed.push(`${row.sku}: ${e instanceof Error?e.message:'não foi salvo'}`);}
      }
      setResult({created,updated,failed});
      if(created+updated) {toast.success(`${created} criados e ${updated} atualizados.`);onImported();}
    } catch {setError('Não foi possível importar. Sua lista não foi confirmada; confira sua conexão.');} finally {setBusy(false);}
  };
  return <Dialog open={open} onOpenChange={v=>!busy && onOpenChange(v)}><DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Importar catálogo XML</DialogTitle></DialogHeader>
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2"><Input aria-label="Endereço do feed XML" type="url" className="flex-1 min-w-0" placeholder="https://fornecedor.com/catalogo.xml" value={url} onChange={e=>setUrl(e.target.value)} maxLength={2048}/><Button variant="outline" disabled={busy || !url.trim()} onClick={fetchFeed}><FileCode className="h-4 w-4 mr-2"/>{busy?'Aguarde...':'Ler feed'}</Button></div>
      <div><Label htmlFor="catalog-xml">Arquivo XML (até 8 MB)</Label><Input id="catalog-xml" type="file" accept=".xml,text/xml,application/xml" disabled={busy} onChange={e=>{file(e.target.files?.[0]);e.target.value='';}}/></div>
      <p className="text-xs text-muted-foreground">RSS / Google Shopping, Atom ou XML de produtos · até 1.000 itens por lote. Não importa layout, clientes ou pedidos. Mercado Livre e lojas sem feed público precisam de integração própria.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {feed && mapping && <>
        <div className="grid gap-3 sm:grid-cols-3">{CATALOG_FIELDS.map(k=><div key={k}><Label htmlFor={`map-${k}`}>{CATALOG_LABELS[k]}</Label><select id={`map-${k}`} className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm" value={mapping[k]} disabled={busy} onChange={e=>{setMapping({...mapping,[k]:e.target.value});setResult(null);}}><option value="">Não importar</option>{feed.fields.map(f=><option key={f}>{f}</option>)}</select></div>)}</div>
        <div className="flex items-center gap-2"><Checkbox id="feed-update" checked={updateExisting} disabled={busy} onCheckedChange={v=>setUpdateExisting(v===true)}/><Label htmlFor="feed-update">Atualizar produtos com o mesmo SKU (preço, estoque e descrição)</Label></div>
        <div className="border-t border-border pt-4 space-y-2"><Label htmlFor="catalog-photos" className="flex items-center gap-2"><Upload className="h-4 w-4"/>Fotos por upload</Label><Input id="catalog-photos" type="file" accept={STORE_IMAGE_ACCEPT} multiple disabled={busy} onChange={e=>{const files=Array.from(e.target.files || []);const invalid=files.map(validateStoreImage).find(Boolean);if(invalid){setError(invalid);return;}setPhotos(files);}}/><p className="text-xs text-muted-foreground">Fotos do feed não são usadas como links. Envie arquivos com o SKU no nome: ABC123.webp; para mais fotos: ABC123__2.webp. JPG, PNG ou WEBP · até 5 MB cada · recomendado 1200 × 1200 px.</p><p className="text-xs text-muted-foreground">{photos.length} foto(s) selecionada(s). Novos produtos ficam fora da vitrine até sua revisão. Sem estoque no feed, o estoque atual é preservado.</p></div>
        <div className="max-h-64 overflow-auto rounded-md border border-border"><table className="w-full text-sm"><thead className="bg-muted"><tr><th className="p-2 text-left">Importar</th><th className="p-2 text-left">Produto / SKU</th><th className="p-2 text-right">Preço</th><th className="p-2 text-right">Estoque</th><th className="p-2 text-left">Situação</th></tr></thead><tbody>{valid.map(({row,i,error})=><tr key={i} className="border-t border-border"><td className="p-2"><Checkbox aria-label={`Importar ${row.sku || i+1}`} disabled={!!error || busy} checked={!error && !excluded.has(i)} onCheckedChange={v=>setExcluded(prev=>{const next=new Set(prev);if(v)next.delete(i);else next.add(i);return next;})}/></td><td className="p-2"><p className="max-w-72 break-words">{row.name || 'Sem nome'}</p><span className="text-xs text-muted-foreground">{row.sku || 'Sem código'}</span></td><td className="p-2 text-right whitespace-nowrap">{row.price?.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) || '—'}</td><td className="p-2 text-right">{row.stock_qty ?? 'Não informado'}</td><td className={`p-2 ${error?'text-destructive':'text-muted-foreground'}`}>{error || 'Pronto'}</td></tr>)}</tbody></table></div>
        {result ? <div role="status" className="space-y-2"><p>{result.created} criados · {result.updated} atualizados · {result.failed.length} falhas</p>{result.failed.map((f,i)=><p className="text-xs text-destructive" key={i}><AlertTriangle className="inline h-3 w-3 mr-1"/>{f}</p>)}<Button variant="outline" onClick={()=>onOpenChange(false)}>Concluir</Button></div> : <Button disabled={busy || !chosen.length} onClick={importRows}>{busy?'Importando...':`Importar ${chosen.length} item(ns)`}</Button>}
      </>}
    </div>
  </DialogContent></Dialog>;
}