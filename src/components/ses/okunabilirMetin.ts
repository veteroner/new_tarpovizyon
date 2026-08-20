/**
 * Ekrandaki metni SESLİ OKUNABİLİR hâle getirir.
 *
 * ─── NEDEN GEREKLİ ──────────────────────────────────────────────────────────
 * Asistanın cevabı rakam dolu ve ham hâliyle okunamıyor. "21.379.088 ton"
 * doğrudan sentezleyiciye verilirse nokta çoğu motorda ONDALIK ayırıcı sayılır
 * ve "yirmi bir nokta üç yüz yetmiş dokuz…" diye okunur. Markdown yıldızları
 * da sesli okunuyor.
 *
 * ─── NEDEN RAKAM DEĞİL KELİME ───────────────────────────────────────────────
 * Rakamı olduğu gibi bırakıp motorun doğru okumasına güvenmek cazip ama
 * cihazdan cihaza değişiyor: bazı sesler "379"u "üç yedi dokuz" diye
 * hecelıyor. Kelimeye çevirince belirsizlik kalmıyor ve çıktı hangi cihazda
 * olursak olalım aynı.
 */

const BIRLER = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const ONLAR = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
/** Üçlü grupların adı; index = kaçıncı grup (sondan). */
const BASAMAK = ['', 'bin', 'milyon', 'milyar', 'trilyon', 'katrilyon'];

/** 0–999 arası bir grubu okur. */
function grupOku(n: number): string {
  const parcalar: string[] = [];
  const yuz = Math.floor(n / 100);
  const kalan = n % 100;
  if (yuz) parcalar.push(yuz === 1 ? 'yüz' : `${BIRLER[yuz]} yüz`);
  if (ONLAR[Math.floor(kalan / 10)]) parcalar.push(ONLAR[Math.floor(kalan / 10)]);
  if (BIRLER[kalan % 10]) parcalar.push(BIRLER[kalan % 10]);
  return parcalar.join(' ');
}

/** Tam sayıyı Türkçe kelimelere çevirir. */
export function sayiyiOku(sayi: number): string {
  if (!Number.isFinite(sayi)) return '';
  if (sayi === 0) return 'sıfır';
  const eksi = sayi < 0;
  let kalan = Math.abs(Math.trunc(sayi));

  const gruplar: number[] = [];
  while (kalan > 0) { gruplar.push(kalan % 1000); kalan = Math.floor(kalan / 1000); }
  if (gruplar.length > BASAMAK.length) return String(sayi);

  const parcalar: string[] = [];
  for (let i = gruplar.length - 1; i >= 0; i--) {
    const g = gruplar[i];
    if (!g) continue;
    /*
     * "bir bin" denmez, "bin" denir — ama "bir milyon" denir.
     * Türkçede yalnızca binde bu istisna var.
     */
    const govde = (g === 1 && i === 1) ? '' : grupOku(g);
    parcalar.push([govde, BASAMAK[i]].filter(Boolean).join(' '));
  }
  return (eksi ? 'eksi ' : '') + parcalar.join(' ');
}

/** Ondalıklı sayıyı okur: 2,2 → "iki virgül iki". */
function ondalikOku(tam: string, kesir: string): string {
  const tamKisim = sayiyiOku(Number(tam));
  /*
   * Kesir basamakları TEK TEK okunuyor: "2,25" → "iki virgül iki beş".
   * Yirmi beş demek yanlış olurdu — 2,25 ile 2,025 aynı sese düşerdi.
   */
  const kesirKisim = kesir.split('').map((d) => BIRLER[Number(d)] || 'sıfır').join(' ');
  return `${tamKisim} virgül ${kesirKisim}`;
}

/**
 * Kısaltmalar. Sesli okunanlar olduğu gibi bırakılıyor (TÜİK "tüik" diye
 * okunuyor zaten); harflenmesi ya da açılması gerekenler burada.
 */
const KISALTMA: Record<string, string> = {
  GSYH: 'gayrisafi yurt içi hasıla',
  TÜFE: 'tüfe',
  ÜFE: 'üfe',
  'TÜİK': 'tüik',
  FAO: 'fao',
  AB: 'Avrupa Birliği',
  ABD: 'Amerika Birleşik Devletleri',
  TL: 'lira',
  USD: 'dolar',
  EUR: 'euro',
};

/** Birim kısaltmaları — bölü işaretli olanlar okunamıyor. */
const BIRIM: [RegExp, string][] = [
  [/\bkg\s*\/\s*da\b/gi, 'kilogram bölü dekar'],
  [/\bton\s*\/\s*da\b/gi, 'ton bölü dekar'],
  [/\bkg\b/g, 'kilogram'],
  [/\bda\b(?=\s|$|\.)/g, 'dekar'],
  [/\bha\b/g, 'hektar'],
  [/\bm²/g, 'metrekare'],
];

/**
 * Metni sesli okumaya hazırlar.
 *
 * Sıra önemli: önce markdown temizleniyor, sonra semboller, en son sayılar.
 * Sayılar önce çevrilseydi ürettiğimiz kelimelerin içinde markdown aramış
 * olurduk.
 */
export function okunabilirMetin(ham: string): string {
  let m = ham;

  /* ── Markdown ── */
  m = m
    .replace(/```[\s\S]*?```/g, ' ')          // kod blokları hiç okunmasın
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')     // görseller
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')   // bağlantı metni kalsın, adres gitsin
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/\*\*|__|\*|_|~~/g, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\|.*\|\s*$/gm, ' ')          // tablo satırları
    .replace(/^\s*>\s?/gm, '');

  /*
   * ── Semboller ──
   * ▲/▼ "artış"/"azalış" diye okunuyor, AMA cümlede zaten o kelime varsa
   * atılıyor. Ölçülen örnek: "▲ %2,2 artış var" → "artış yüzde iki virgül
   * iki artış var". Kulakta kekeleme gibi duruyordu.
   */
  m = m
    .replace(/▲(?=[^.!?\n]*\bartış)/g, ' ')
    .replace(/▼(?=[^.!?\n]*\b(azalış|düşüş))/g, ' ')
    .replace(/▲/g, ' artış ')
    .replace(/▼/g, ' azalış ')
    .replace(/[–—]/g, ' ')
    .replace(/&nbsp;/g, ' ');

  /* ── Kısaltmalar (sayılardan ÖNCE: içlerinde rakam yok) ── */
  for (const [k, v] of Object.entries(KISALTMA)) {
    m = m.replace(new RegExp(`\\b${k}\\b`, 'g'), v);
  }
  for (const [re, v] of BIRIM) m = m.replace(re, v);

  /*
   * ── Sayılar ──
   * Binlik ayırıcı NOKTA, ondalık ayırıcı VİRGÜL (Türkçe biçim).
   * Önce ondalıklılar, sonra tam sayılar; ters sırada yapılsaydı "2,2"nin
   * tam kısmı ayrı çevrilip virgül ortada kalırdı.
   */
  m = m.replace(/(\d{1,3}(?:\.\d{3})+|\d+),(\d+)/g,
    (_, tam: string, kesir: string) => ondalikOku(tam.replace(/\./g, ''), kesir));
  m = m.replace(/\d{1,3}(?:\.\d{3})+|\d+/g,
    (s) => sayiyiOku(Number(s.replace(/\./g, ''))));

  /* Yüzde işareti sayıdan sonra geliyor ama okunuşta ÖNCE söyleniyor. */
  m = m.replace(/%\s*/g, 'yüzde ');

  return m.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}
