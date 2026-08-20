import { askAI } from './ai';
import { sayfalarBul, type ModelSonucu } from '../../components/nav/modelArama';
import { sayfalarVerisi } from '../../components/nav/sayfaVerisi';
import type { MenuItem } from '../../components/nav/menu';

/**
 * Asistana soru sorma boru hattı — yazılı sohbet ve sesli sohbet ortak kullanır.
 *
 * ─── NEDEN AYRI DOSYA ───────────────────────────────────────────────────────
 * Bu akış (ilgili sayfayı bul → verisini çek → modele ver) sohbet ekranının
 * içinde duruyordu. Sesli sohbet aynı akışa ihtiyaç duyunca kopyalamak
 * gerekecekti; iki kopya, bir gün birinin beslenip diğerinin beslenmemesi
 * demekti.
 */

/** Besleme için üst sınırlar; aşılırsa besleme atlanır, cevap yine üretilir. */
const SAYFA_BULMA_MS = 3500;
const VERI_CEKME_MS = 3000;

/**
 * SESLİ modda süreler kısa.
 *
 * Yazılı sohbette kullanıcı ekrana bakıyor ve birkaç saniye beklemek normal.
 * Sesli sohbette aynı bekleme ÖLÜ SESSİZLİK — karşısındakinin donduğunu
 * sanıyor. Besleme yetişmezse cevap beslemesiz veriliyor: geç gelen doğru
 * rakam, zamanında gelen cevaptan iyi değil.
 */
const SESLI_SAYFA_MS = 2000;
const SESLI_VERI_MS = 1500;

/** Beslemede kaç sayfaya bakılıyor. */
const EN_FAZLA_SAYFA = 3;

export type AsistanCevabi = {
  cevap: string;
  /** Cevabın altında gösterilecek sayfalar. */
  sayfalar: ModelSonucu[];
  /** Cevap uygulamanın kendi verisiyle mi üretildi? */
  beslendi: boolean;
};

/** Söz verilen sürede bitmezse null; işi iptal etmiyor, beklemeyi bırakıyor. */
function sinirliSure<T>(is: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    is.catch(() => null),
    new Promise<null>((coz) => setTimeout(() => coz(null), ms)),
  ]);
}

export async function asistanaSor(
  soru: string,
  tumOgeler: MenuItem[],
  { sesli = false }: { sesli?: boolean } = {},
): Promise<AsistanCevabi> {
  /*
   * ─── BESLEME CEVAPTAN ÖNCE ────────────────────────────────────────────
   * Model rakamı uydurmasın diye gerçek veriyi cevap ÜRETİLMEDEN önce
   * görmesi gerekiyor.
   */
  const sayfalar = await sinirliSure(
    sayfalarBul(soru, tumOgeler, EN_FAZLA_SAYFA),
    sesli ? SESLI_SAYFA_MS : SAYFA_BULMA_MS,
  ) ?? [];

  const ogeler = sayfalar
    .map((s) => tumOgeler.find((o) => o.any === s.yol))
    .filter((o): o is MenuItem => Boolean(o));

  const veri = ogeler.length
    ? await sinirliSure(sayfalarVerisi(ogeler), sesli ? SESLI_VERI_MS : VERI_CEKME_MS)
    : null;

  const cevap = await askAI(soru, veri, sesli);
  return { cevap, sayfalar, beslendi: Boolean(veri) };
}
