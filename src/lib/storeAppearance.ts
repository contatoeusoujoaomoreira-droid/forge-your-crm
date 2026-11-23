export const STORE_IMAGE_SPECS = {
  logo_url: { width: 400, height: 400, label: 'Logo' },
  banner_url: { width: 1920, height: 740, label: 'Banner principal' },
  mobile_banner: { width: 800, height: 640, label: 'Banner para celular' },
  product: { width: 1200, height: 1200, label: 'Produto ou serviço' },
};
export const STORE_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
export function validateStoreImage(file: { type: string; size: number }) {
  if (!STORE_IMAGE_ACCEPT.split(',').includes(file.type)) return 'Escolha uma imagem JPG, PNG ou WEBP.';
  if (file.size > 5 * 1024 * 1024) return 'A imagem deve ter até 5 MB.';
  return null;
}
export function storeThemeStyle(store: any) {
  const color = /^#[0-9a-f]{6}$/i.test(store.primary_color || '') ? store.primary_color : null;
  const custom = store.store_theme === 'custom' && /^#[0-9a-f]{6}$/i.test(store.store_bg_color || '') ? store.store_bg_color : null;
  const lightColor = (hex: string) => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) > 150; };
  const hsl = (hex: string) => {
    const [r,g,b] = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255);
    const max=Math.max(r,g,b), min=Math.min(r,g,b), l=(max+min)/2, d=max-min;
    const s=d===0?0:d/(1-Math.abs(2*l-1));
    let h=d===0?0:max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;
    h=(h*60+360)%360;
    return `${h} ${s*100}% ${l*100}%`;
  };
  return { className: (custom ? lightColor(custom) : store.store_theme === 'light') ? 'light' : 'store-dark', style: {
    ...(color ? { '--primary': hsl(color), '--primary-foreground': lightColor(color) ? '0 0% 5%' : '0 0% 100%', '--ring': hsl(color) } : {}),
    ...(custom ? { '--background': hsl(custom) } : {}),
  } };
}