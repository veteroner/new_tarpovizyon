/**
 * Abonelik sayfası → ödeme uçları.
 *
 * Oturum jetonu ZORUNLU: aboneliğin kime yazılacağı sunucuda jetondan
 * çözülüyor, gövdeden değil. Bu yüzden buradaki çağrılar jetonsuz anlamsız —
 * sunucu 401 döner.
 */

import { jetonOku } from '../../auth/oturum';

const API_TABAN = (import.meta.env.VITE_TARPOVIZYON_BASIC_API as string | undefined)
  ?? 'https://tarpovizyon-api.veteroner.workers.dev';

async function cagir<T>(yol: string, govde: unknown): Promise<T> {
  const jeton = jetonOku();
  const y = await fetch(`${API_TABAN}/api/${yol}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
    },
    body: JSON.stringify(govde),
  });
  const g = await y.json().catch(() => ({}));
  if (!y.ok) throw Object.assign(new Error(g?.hata ?? 'hata'), { kod: g?.hata, http: y.status, ek: g });
  return g as T;
}

export type OdemeBaslatSonuc = {
  token: string;
  checkoutFormContent: string | null;
  sandbox: boolean;
};

export const odemeBaslat = (g: Record<string, unknown>) =>
  cagir<OdemeBaslatSonuc>('odeme/baslat', g);

export const odemeDogrula = (token: string) =>
  cagir<{ basarili: boolean; durum: string; plan: string }>('odeme/dogrula', { token });

export const odemeHatasi = (e: unknown): string => {
  const x = e as { kod?: string; http?: number; ek?: { alanlar?: string[]; mesaj?: string } };
  if (x?.kod === 'giris_gerekli' || x?.http === 401) return 'Oturumunuz sona ermiş. Tekrar giriş yapın.';
  if (x?.kod === 'plan_tanimsiz') return 'Bu plan henüz tanımlanmamış. Lütfen daha sonra deneyin.';
  if (x?.kod === 'eksik_alan') return `Şu alanlar zorunlu: ${(x.ek?.alanlar ?? []).join(', ')}`;
  if (x?.kod === 'token_size_ait_degil') return 'Bu ödeme kaydı hesabınıza ait değil.';
  if (x?.kod === 'yapilandirma_eksik') return 'Ödeme altyapısı henüz kurulmadı.';
  /* iyzico'nun kendi mesajı varsa gösteriliyor: "kart limiti yetersiz" gibi
     bilgiler kullanıcının yapabileceği bir şeye işaret ediyor. */
  if (x?.ek?.mesaj) return x.ek.mesaj;
  return 'Ödeme başlatılamadı. Lütfen tekrar deneyin.';
};
