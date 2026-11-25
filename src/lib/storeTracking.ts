import { canTrack, onConsentChange, readChoice } from '@/lib/consent';

export type StoreTrackingConfig = { enabled?:boolean; meta_pixel_id?:string; ga4_id?:string; google_ads_id?:string; google_ads_label?:string; tiktok_pixel_id?:string };
type QueuedPixel = ((...args:unknown[])=>void) & {callMethod?:(...args:unknown[])=>void;queue:unknown[][];push?:QueuedPixel;loaded:boolean;version:string};
type TrackingWindow = Window & {dataLayer?:unknown[];gtag?:(...args:unknown[])=>void;fbq?:QueuedPixel;_fbq?:QueuedPixel;ttq?:{load?:(id:string)=>void;track?:(name:string,data:unknown)=>void;page?:()=>void;[key:string]:unknown}};
const win = () => window as TrackingWindow;
const initialized = new Set<string>();
let active:StoreTrackingConfig = {};
let generation = 0;
const script = (id:string,url:string) => {if(document.getElementById(id))return;const el=document.createElement('script');el.id=id;el.src=url;el.async=true;document.head.appendChild(el);};
export function validTrackingConfig(c:StoreTrackingConfig):string | null {
  if(c.meta_pixel_id && !/^\d{5,25}$/.test(c.meta_pixel_id)) return 'Confira o ID do Pixel Meta (somente números).';
  if(c.ga4_id && !/^G-[A-Z0-9]{4,20}$/.test(c.ga4_id)) return 'Confira o ID do GA4 (G-...).';
  if(c.google_ads_id && !/^AW-\d{5,20}$/.test(c.google_ads_id)) return 'Confira o ID do Google Ads (AW-...).';
  if(c.google_ads_label && !/^[A-Za-z0-9_-]{1,100}$/.test(c.google_ads_label)) return 'Confira o rótulo de conversão do Google Ads.';
  if(c.tiktok_pixel_id && !/^[A-Z0-9]{10,30}$/.test(c.tiktok_pixel_id)) return 'Confira o ID do Pixel TikTok.';
  return null;
}
export const storeTrackingEnabled = (c:StoreTrackingConfig) => !!c.enabled && !validTrackingConfig(c) && !!(c.meta_pixel_id || c.ga4_id || c.google_ads_id || c.tiktok_pixel_id);
async function load(c:StoreTrackingConfig) {
  if(!storeTrackingEnabled(c) || !await canTrack('advertising')) return false;
  const w=win();
  if(c.meta_pixel_id) {
    if(!w.fbq) {const fn=((...args:unknown[])=>{if(fn.callMethod)fn.callMethod(...args);else fn.queue.push(args);}) as QueuedPixel;fn.queue=[];fn.push=fn;fn.loaded=true;fn.version='2.0';w.fbq=fn;w._fbq=fn;}
    const key=`meta:${c.meta_pixel_id}`;
    if(!initialized.has(key)){w.fbq('init',c.meta_pixel_id,{}, {agent:'lovable'});initialized.add(key);}
    w.fbq('consent','grant');script('store-meta-tag','https://connect.facebook.net/en_US/fbevents.js');
  }
  if(c.ga4_id || c.google_ads_id) {
    w.dataLayer=w.dataLayer || [];w.gtag=w.gtag || function(){w.dataLayer?.push(arguments);};
    w.gtag('set','developer_id.dZjgwMW',true);
    for(const id of [c.ga4_id,c.google_ads_id].filter(Boolean)) {if(!id)continue;const key=`google:${id}`;if(!initialized.has(key)){w.gtag('config',id,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:true});initialized.add(key);}}
    script('store-google-tag',`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(c.ga4_id || c.google_ads_id || '')}`);
  }
  if(c.tiktok_pixel_id) {
    // TikTok's standard queue stub, loaded only after advertising permission.
    const q=(w.ttq || []) as unknown as Record<string,unknown> & {load:(id:string)=>void;track:(...args:unknown[])=>void;push:(args:unknown[])=>void};
    if(!w.ttq){w.ttq=q;for(const method of ['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie','holdConsent','revokeConsent','grantConsent'])q[method]=(...args:unknown[])=>q.push([method,...args]);q.load=(id:string)=>{q._i=q._i || {};const instances=q._i as Record<string,unknown>;instances[id]=[];script('store-tiktok-tag',`https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(id)}&lib=ttq`);};}
    const key=`tiktok:${c.tiktok_pixel_id}`;if(!initialized.has(key)){q.load(c.tiktok_pixel_id);initialized.add(key);}const grant=q.grantConsent as (()=>void)|undefined;grant?.();
  }
  return true;
}
function revoke() {
  win().fbq?.('consent','revoke');
  const ttq=win().ttq;const deny=ttq?.revokeConsent as (()=>void)|undefined;deny?.();
}
export function startStoreTracking(config:StoreTrackingConfig) {
  active=config;const current=++generation;
  const init=async()=>{if(current!==generation)return;if(!await canTrack('advertising')){revoke();return;}await load(config);};
  void init();const unsub=onConsentChange(()=>{void init();});
  return ()=>{unsub();if(current===generation){active={};generation++;revoke();}};
}
type Item = {id:string;price?:number|null;qty?:number;quantity?:number};
type Event = 'page_view'|'view_item'|'add_to_cart'|'begin_checkout'|'purchase';
export async function storeEvent(event:Event, details:{value?:number;items?:Item[];transaction_id?:string}={}) {
  const config={...active};const current=generation;
  if(!storeTrackingEnabled(config) || !await canTrack('advertising') || current!==generation) return;
  if(!await load(config) || readChoice('advertising')==='denied')return;
  const w=win();const eventId=event==='purchase'?`store-purchase-${details.transaction_id}`:crypto.randomUUID();
  const items=(details.items || []).map(i=>({item_id:i.id,price:i.price,quantity:i.qty || i.quantity || 1}));
  const metaEvents={page_view:'PageView',view_item:'ViewContent',add_to_cart:'AddToCart',begin_checkout:'InitiateCheckout',purchase:'Purchase'};
  if(config.meta_pixel_id)w.fbq?.('trackSingle',config.meta_pixel_id,metaEvents[event],{content_ids:items.map(i=>i.item_id),content_type:'product',currency:'BRL',...(details.value==null?{}:{value:details.value})},{eventID:eventId});
  if(config.ga4_id)w.gtag?.('event',event,{send_to:config.ga4_id,currency:'BRL',...details,items});
  if(event==='purchase' && config.google_ads_id && config.google_ads_label)w.gtag?.('event','conversion',{send_to:`${config.google_ads_id}/${config.google_ads_label}`,currency:'BRL',value:details.value,transaction_id:details.transaction_id});
  const tikEvents={page_view:'PageView',view_item:'ViewContent',add_to_cart:'AddToCart',begin_checkout:'InitiateCheckout',purchase:'CompletePayment'};
  if(config.tiktok_pixel_id)w.ttq?.track?.(tikEvents[event],{content_type:'product',contents:items.map(i=>({content_id:i.item_id,price:i.price,quantity:i.quantity})),currency:'BRL',value:details.value,event_id:eventId});
}
export function reportPaidOrder(order:{id:string;payment_status:string;total:number;items?:{id:string;unit_price:number;qty:number}[]}) {
  if(!['pago','paid'].includes(order.payment_status))return;
  // Only confirmed readback calls this; observe once even if consent blocks it, never replay blocked purchases.
  const key=`store_purchase_observed_${order.id}`;
  try {if(localStorage.getItem(key))return;localStorage.setItem(key,'1');} catch {return;}
  void storeEvent('purchase',{transaction_id:order.id,value:Number(order.total),items:order.items?.map(i=>({id:i.id,price:i.unit_price,qty:i.qty}))});
}