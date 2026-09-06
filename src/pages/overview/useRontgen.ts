import { useQuery } from '@tanstack/react-query';
import { fetchRows, num, type Row } from '../../services/d1';
import {
  MAKAS_PENCERE, bayatMi,
  aktarimSinyali, bitkiselUretimSinyali, bitkiselYeterlilikSinyali,
  gidaEnflasyonSinyali, girdiGrubuSinyali, karlilikSinyali,
  kisiBasiSinyali, makasSinyali, medyan, pariteSinyali, sirala, sonOrtalama,
  ticaretSinyali, uretimSinyali, varlikSinyali, yeterlilikSinyali, type Sinyal,
} from './rontgen';
import {
  UCTAN_UCA, YEM_BITKILERI, ayEkle, bilesikOrtalama, sonAy, tufeUzeriFazla,
  yillikDegisim, type AySerisi,
} from './zincir';

/**
 * Röntgen verisi — girdiden çıktıya bütün zinciri tarayan sinyaller.
 *
 * ─── TEK KAYNAK ─────────────────────────────────────────────────────────────
 * Her ölçü, Basic'in de okuduğu D1 uçlarından geliyor. Röntgene özel tablo ya
 * da elle yazılmış sayı YOK: bir tabloyu güncellemek her iki tarafı da aynı
 * anda tazeliyor.
 *
 * ─── NEDEN SON SATIR ────────────────────────────────────────────────────────
 * Çoğu kaynaktan yalnızca SON dönem alınıyor; sinyaller "şu an ne durumda"
 * sorusunu yanıtlıyor, trend grafikleri zaten sayfalarda var. İstisnalar:
 * parite (kendi geçmiş medyanına göre ölçülüyor), makas (oynaklık yüzünden
 * üç ay ortalaması) ve aktarım zinciri (gecikmeli ilişki).
 */

const SON = <T extends Row>(rows: T[], anahtar = 'tarih'): T | undefined =>
  [...rows].sort((a, b) => String(a[anahtar] ?? '').localeCompare(String(b[anahtar] ?? ''))).at(-1);

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/** Yıl+ay sütunlu tabloyu 'YYYY-MM' anahtarlı seriye çevirir. */
function aylikSeri(rows: Row[], alan: string): AySerisi {
  const s: AySerisi = {};
  for (const r of rows) {
    const yil = Number(r.yil); const ay = Number(r.ay);
    const v = num(r[alan]);
    if (Number.isFinite(yil) && ay >= 1 && ay <= 12 && v) {
      s[`${yil}-${String(ay).padStart(2, '0')}`] = v;
    }
  }
  return s;
}

/** Endeks tablosunun geniş düzenini (yıl satırı × 12 ay sütunu) seriye çevirir. */
function endekstenSeri(rows: Row[]): AySerisi {
  const s: AySerisi = {};
  for (const r of rows) {
    const yil = Number(r.yil);
    if (!Number.isFinite(yil)) continue;
    AYLAR.forEach((ad, i) => {
      const v = num(r[ad]);
      if (v > 0) s[`${yil}-${String(i + 1).padStart(2, '0')}`] = v;
    });
  }
  return s;
}

/** Tarih sütunlu tabloyu seriye çevirir. */
function tarihtenSeri(rows: Row[], alan: string): AySerisi {
  const s: AySerisi = {};
  for (const r of rows) {
    const ay = String(r.tarih ?? '').slice(0, 7);
    const v = num(r[alan]);
    if (ay.length === 7 && v) s[ay] = v;
  }
  return s;
}

/** Seriyi ay sırasına dizip değerlerini verir. */
const sirali = (s: AySerisi): number[] => Object.keys(s).sort().map((k) => s[k]);

/**
 * Girdi grubu sinyalleri için izlenen kalemler.
 *
 * 22 alt grubun HEPSİ değil: bir kısmı diğerlerinin toplamı ("Girdi 1",
 * "Tarımsal ilaçlar") ya da alt kırılımı ("Düz gübreler" ⊂ "Gübre ve toprak
 * geliştiriciler"). Hepsi konsaydı aynı sinyal üç kez görünürdü.
 */
const GIRDI_GRUPLARI = [
  'Gübre ve toprak geliştiriciler',
  'Hayvan yemi',
  'Enerji ve yağlayıcılar',
  'Tohum ve dikim materyali',
  'Veteriner harcamaları',
  'Tarımsal ilaçlar',
] as const;

const GIRDI_GENEL = 'Tarımsal Girdi Fiyat Endeksi';

/**
 * Röntgende izlenen bitkisel ürünler.
 *
 * ─── NEDEN SEÇİLMİŞ LİSTE, NEDEN BÜYÜKTEN KÜÇÜĞE DEĞİL ──────────────────────
 * Tabloda 226 ürün var ve hepsini basmak röntgeni tek başına doldururdu.
 * "En büyük N ürünü al" da işe yaramıyor: `deger` sütunu ton, adet ve dekarı
 * AYNI yerde tutuyor, o yüzden ham büyüklüğe göre sıralayınca listenin
 * tepesine kesme çiçekler çıkıyor (karanfil 889 milyon ADET, buğdayın 16
 * milyon TONUNDAN büyük görünüyor). Birim karışıklığı sıralamayı anlamsız
 * kılıyor.
 *
 * Bu yüzden liste ADA göre ve gıda güvenliği önemine göre seçildi. Her sinyal
 * ürünü YALNIZCA KENDİSİYLE, yıldan yıla yüzde olarak karşılaştırdığı için
 * birim sorunu sinyallerin içine sızmıyor.
 *
 * `ad` ekranda görünen kısa isim; `tablo` D1'deki tam ad.
 */
const BITKISEL_URUNLER = [
  { ad: 'Buğday', tablo: 'Buğday, Durum Buğdayı Hariç' },
  { ad: 'Durum buğdayı', tablo: 'Durum Buğdayı' },
  { ad: 'Arpa', tablo: 'Arpa (Diğer)' },
  { ad: 'Mısır', tablo: 'Mısır' },
  { ad: 'Çeltik', tablo: 'Çeltik' },
  { ad: 'Ayçiçeği', tablo: 'Ayçiçeği Tohumu (Yağlık)' },
  { ad: 'Şeker pancarı', tablo: 'Şeker Pancarı' },
  { ad: 'Patates', tablo: 'Patates (Tatlı Patates Hariç)' },
  { ad: 'Kuru soğan', tablo: 'Soğan (Kuru)' },
  { ad: 'Salçalık domates', tablo: 'Domates (Salçalık)' },
  { ad: 'Sofralık domates', tablo: 'Domates (Sofralık)' },
  { ad: 'Nohut', tablo: 'Nohut, Kuru' },
  { ad: 'Kırmızı mercimek', tablo: 'Mercimek, Kuru (Kırmızı)' },
  { ad: 'Pamuk', tablo: 'Pamuk, Çırçırlanmamış (Kütlü)' },
  { ad: 'Fındık', tablo: 'Fındık' },
  { ad: 'Yağlık zeytin', tablo: 'Yağlık Zeytinler (Zeytinyağı Üretimi İçin)' },
] as const;

/** Ürün dengesinden yeterliliği izlenen bitkisel ürünler. */
const DENGE_URUNLERI = [
  { ad: 'Buğday', tablo: 'Buğday (toplam)' },
  { ad: 'Arpa', tablo: 'Arpa' },
  { ad: 'Mısır', tablo: 'Mısır' },
  { ad: 'Ayçiçeği', tablo: 'Ayçiçeği' },
  { ad: 'Pirinç', tablo: 'Pirinç' },
  { ad: 'Nohut', tablo: 'Nohut' },
  { ad: 'Mercimek', tablo: 'Mercimek' },
  { ad: 'Patates', tablo: 'Patates' },
] as const;

const BITKISEL_YOL = '/tarpovizyon/turkey/plant-production';
const DENGE_YOL = '/tarpovizyon/turkey/product-balance';

export function useRontgen() {
  return useQuery({
    queryKey: ['tarim-rontgeni'],
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<Sinyal[]> => {
      /* Kanatlı ve yumurta maliyet-fiyat uçları ARTIK ÇEKİLMİYOR: beslenmeyen
         seriden sinyal üretilmiyor, boşuna istek de atılmıyor. */
      const [
        sut, kirmiziEt, yeterlilik, uretim, tufe,
        gfe, tarimUfe, varliklar, kisiBasi, disTicaret,
        bitkiselUretim, bitkiselAlan, urunDenge, ...bitkiler
      ] = await Promise.all([
        fetchRows('cig-sut/ekonomik-gostergeler', { limit: 400 }),
        fetchRows('kirmizi-et/ekonomik-gostergeler', { limit: 400 }),
        fetchRows('tr/yeterlilikler', { limit: 5 }),
        fetchRows('tr/hayvansal-urun-uretimi', { limit: 200 }),
        fetchRows('makro/tufe-aylik', { limit: 600 }),
        fetchRows('makro/gfe-alt-grup-aylik', { limit: 2000 }),
        fetchRows('makro/ufe-aylik', { limit: 400 }),
        fetchRows('tr/hayvan-varliklari', { limit: 200 }),
        fetchRows('tr/kisi-basi-uretim-tuketim', { limit: 60 }),
        fetchRows('makro/tarim-disticaret', { limit: 60 }),
        /* Bitkisel üretim ve ekilen alan — ürün × yıl. Filtre `unsur`da,
           çünkü tablo verim ve ağaç sayısını da aynı yerde tutuyor. */
        fetchRows('bitkisel/uretim-detay', { unsur: 'Üretim', limit: 20000 }),
        fetchRows('bitkisel/uretim-detay', { unsur: 'Ekilen Alan', limit: 20000 }),
        fetchRows('tuik/urundenge', { limit: 2000 }),
        ...YEM_BITKILERI.map((b) =>
          fetchRows('tuik/fiyatendex', { endeks: 'T-UFE', maddekod: b.maddekod, limit: 60 })),
      ]);

      const sinyaller: Sinyal[] = [];
      const ay = (r?: Row) => String(r?.tarih ?? '').slice(0, 7);
      const ekle = (s: Sinyal | null) => { if (s) sinyaller.push(s); };

      /* ── EKONOMİ: kârlılık ──────────────────────────────────────────────
       *
       * BEYAZ ET ve YUMURTA BURADA YOK. Bu iki sektörün maliyet-fiyat verisi
       * elle besleniyordu ve kaynağa erişim kalmadı; yeni fiyat/maliyet/parite
       * girilmeyecek. Beslenmeyen bir seriden kârlılık sinyali üretmek,
       * donmuş sayıyı bugünün durumu diye sunmak olurdu.
       *
       * Tablolar duruyor (sayfalar geçmişi gösteriyor); röntgen onlardan
       * "şu an şöyle" cümlesi kurmuyor. */
      const sektorler = [
        { ad: 'Çiğ süt', rows: sut, yol: '/tarpovizyon/turkey/milk' },
        { ad: 'Kırmızı et', rows: kirmiziEt, yol: '/tarpovizyon/turkey/red-meat' },
      ];
      for (const s of sektorler) {
        const son = SON(s.rows);
        ekle(karlilikSinyali(s.ad, son ? num(son.karlilik) : null, ay(son), s.yol));
      }

      /* ── EKONOMİ: maliyet makası ──────────────────────────────────────────
         Girdi Fiyat Endeksi ile Tarım ÜFE'nin yıllık değişimleri. İkisi de
         zaten ORAN; yıllık değişim uygulanmıyor. Üç ay ortalaması alınıyor —
         tarım ÜFE ardışık aylarda %43 → %10 → %19 gibi zıplıyor. */
      const gfeGenel = aylikSeri(gfe.filter((r) => r.alt_grup === GIRDI_GENEL), 'yillik_degisim');
      const ufeSeri = aylikSeri(tarimUfe, 'tarim_ufe');
      /* AYNI aylar karşılaştırılmalı. İki seri farklı aylarda bitiyor (GFE
         2026-06'da, tarım ÜFE 2026-07'de); her birinin kendi son üç ayını
         almak Nisan–Haziran ile Mayıs–Temmuz'u karşılaştırırdı ve makas
         bambaşka çıkardı. Önce ortak aylar bulunuyor. */
      const ortakAylar = Object.keys(gfeGenel).filter((k) => k in ufeSeri).sort();
      const girdiOrt = sonOrtalama(ortakAylar.map((k) => gfeGenel[k]), MAKAS_PENCERE);
      const ciktiOrt = sonOrtalama(ortakAylar.map((k) => ufeSeri[k]), MAKAS_PENCERE);
      const makasDonem = ortakAylar.at(-1) ?? '';
      ekle(makasSinyali(girdiOrt, ciktiOrt, `${makasDonem} · ${MAKAS_PENCERE} ay ort.`,
        '/tarpovizyon/turkey/price-index'));

      /* ── EKONOMİ: süt yem paritesi ────────────────────────────────────────
         Kanatlı paritesi D1'de aylardır aynı değerde donmuş; donmuş seriden
         sinyal üretmek "değişmedi" demek değil, "bilmiyoruz" demek olurdu. */
      const pariteSeri = tarihtenSeri(sut, 'sut_yem_paritesi');
      const pariteDeger = sirali(pariteSeri);
      ekle(pariteSinyali('Çiğ süt–yem', sonAy(pariteSeri)?.deger ?? null,
        medyan(pariteDeger), sonAy(pariteSeri)?.ay ?? '', '/tarpovizyon/turkey/milk'));

      /* ── GİRDİ: hangi kalem ortalamayı aşıyor ─────────────────────────── */
      const gfeSonAy = sonAy(gfeGenel)?.ay ?? '';
      const genelSon = gfeGenel[gfeSonAy];
      const gfeAylar = Object.keys(gfeGenel).sort();
      for (const grupAd of GIRDI_GRUPLARI) {
        const seri = aylikSeri(gfe.filter((r) => r.alt_grup === grupAd), 'yillik_degisim');
        const v = seri[gfeSonAy];
        if (v == null || genelSon == null) continue;
        /* Süreklilik penceresi: kalemin genel girdiden farkının son aylardaki
           seyri. Kural tek ayın sıçramasına değil, farkın SÜRMESİNE bakıyor. */
        const farklar = gfeAylar
          .filter((a) => seri[a] != null)
          .map((a) => seri[a] - gfeGenel[a]);
        ekle(girdiGrubuSinyali(grupAd, farklar, v, genelSon, gfeSonAy,
          '/tarpovizyon/turkey/price-index'));
      }

      /* ── ARZ: yeterlilik, tek satırlık tablo, oran olarak tutuluyor ────── */
      const y = yeterlilik[0];
      if (y) {
        const kalemler = [
          { ad: 'Kırmızı et', alan: 'kirmizi_et_ton', yol: '/tarpovizyon/turkey/red-meat' },
          { ad: 'Çiğ süt', alan: 'sut_ton', yol: '/tarpovizyon/turkey/milk' },
          { ad: 'Beyaz et', alan: 'beyaz_et_ton', yol: '/tarpovizyon/turkey/white-meat' },
          { ad: 'Yumurta', alan: 'yumurta_milyon_adet', yol: '/tarpovizyon/turkey/eggs' },
          { ad: 'Bal', alan: 'bal_ton', yol: '/tarpovizyon/turkey/beekeeping' },
        ];
        for (const kk of kalemler) ekle(yeterlilikSinyali(kk.ad, num(y[kk.alan]) || null, kk.yol));
      }

      /* ── ARZ: kişi başı üretim–tüketim ────────────────────────────────── */
      const kbYillar = [...kisiBasi]
        .map((r) => ({ yil: Number(r.yil), r }))
        .filter((x) => Number.isFinite(x.yil))
        .sort((a, b) => a.yil - b.yil);
      const kbSon = kbYillar.at(-1);
      if (kbSon) {
        const cift = [
          { ad: 'Çiğ süt', u: 'sut_uretimi_kg_kisi', t: 'sut_tuketimi_kg_kisi', yol: '/tarpovizyon/turkey/milk' },
          { ad: 'Yumurta', u: 'yumurta_uretimi_adet_kisi', t: 'yumurta_tuketimi_adet_kisi', yol: '/tarpovizyon/turkey/eggs' },
          { ad: 'Tavuk eti', u: 'tavuk_eti_uretim_kg_kisi', t: 'tavuk_eti_tuketim_kg_kisi', yol: '/tarpovizyon/turkey/white-meat' },
        ];
        for (const c of cift) {
          ekle(kisiBasiSinyali(c.ad, num(kbSon.r[c.u]) || null, num(kbSon.r[c.t]) || null,
            String(kbSon.yil), c.yol));
        }
      }

      /* ── ÜRETİM: özet tablonun son iki yılı ───────────────────────────── */
      const yillik = [...uretim]
        .map((r) => ({ yil: Number(r.yil), r }))
        .filter((x) => Number.isFinite(x.yil))
        .sort((a, b) => a.yil - b.yil);
      const sonY = yillik.at(-1);
      const oncekiY = yillik.at(-2);
      if (sonY && oncekiY) {
        const olcum = [
          { ad: 'Kırmızı et', alan: 'kirmizi_et_uretimi', yol: '/tarpovizyon/turkey/red-meat' },
          { ad: 'Çiğ süt', alan: 'cig_sut_uretimi', yol: '/tarpovizyon/turkey/milk' },
          { ad: 'Yumurta', alan: 'yumurta_milyon_adet', yol: '/tarpovizyon/turkey/eggs' },
          { ad: 'Kanatlı eti', alan: 'kanatli_eti_ton', yol: '/tarpovizyon/turkey/white-meat' },
          { ad: 'Bal', alan: 'bal_uretimi', yol: '/tarpovizyon/turkey/beekeeping' },
        ];
        for (const o of olcum) {
          ekle(uretimSinyali(o.ad, num(oncekiY.r[o.alan]) || null, num(sonY.r[o.alan]) || null,
            String(sonY.yil), o.yol));
        }
      }

      /* ── ÜRETİM: bitkisel ürünler ─────────────────────────────────────────
       *
       * Ürün × yıl haritası kurulup son iki dolu yıl karşılaştırılıyor. Her
       * ürün YALNIZCA KENDİSİYLE kıyaslandığı için tablodaki birim karışıklığı
       * (ton/adet/dekar aynı sütunda) sinyale sızmıyor. */
      const urunYilHaritasi = (rows: Row[]) => {
        const m = new Map<string, Map<number, number>>();
        for (const r of rows) {
          const ad = String(r.urun ?? '');
          const yil = Number(r.yil);
          const deger = num(r.deger);
          if (!ad || !Number.isFinite(yil) || !deger) continue;
          if (!m.has(ad)) m.set(ad, new Map());
          m.get(ad)!.set(yil, deger);
        }
        return m;
      };
      const uretimHaritasi = urunYilHaritasi(bitkiselUretim);
      const alanHaritasi = urunYilHaritasi(bitkiselAlan);

      /* Kural ürünün TÜM geçmişini istiyor: eşiği o ürünün kendi olağan
         oynamasından hesaplıyor (bkz. rontgen.ts → bitkiselUretimSinyali). */
      const seriye = (m: Map<number, number> | undefined): [number, number][] =>
        (m ? [...m.entries()].sort((a, b) => a[0] - b[0]) : []);

      for (const u of BITKISEL_URUNLER) {
        ekle(bitkiselUretimSinyali(u.ad, seriye(uretimHaritasi.get(u.tablo)), BITKISEL_YOL));
        ekle(bitkiselUretimSinyali(u.ad, seriye(alanHaritasi.get(u.tablo)), BITKISEL_YOL, true));
      }

      /* ── ARZ: bitkisel yeterlilik (ürün dengesi) ───────────────────────────
       *
       * Tablo geniş düzende ve sütun adları ÜRÜN YILI: 'y2023/24'. Son dolu
       * sezon sütunu çalışma anında bulunuyor — elle yazılsaydı tablo
       * ilerlediğinde sessizce eski sezonu göstermeye devam ederdi. */
      const dengeSatirlari = urunDenge.filter((r) => String(r['fasıl'] ?? '') === 'Yeterlilik derecesi');
      const sezonSutunlari = Object.keys(dengeSatirlari[0] ?? {})
        .filter((k) => /^y\d{4}\/\d{2}$/.test(k))
        .sort();
      const sonSezon = [...sezonSutunlari].reverse()
        .find((k) => dengeSatirlari.some((r) => num(r[k]) > 0));
      if (sonSezon) {
        const sezonEtiket = sonSezon.slice(1);          // 'y2023/24' → '2023/24'
        for (const d of DENGE_URUNLERI) {
          const satir = dengeSatirlari.find((r) => String(r.urun ?? '').trim() === d.tablo);
          if (satir) {
            ekle(bitkiselYeterlilikSinyali(d.ad, num(satir[sonSezon]) || null, sezonEtiket, DENGE_YOL));
          }
        }
      }

      /* ── ÜRETİM: hayvan varlığı ───────────────────────────────────────── */
      const varlikSirali = [...varliklar]
        .filter((r) => r.tarih)
        .sort((a, b) => String(a.tarih).localeCompare(String(b.tarih)));
      const vSon = varlikSirali.at(-1);
      const vOnceki = varlikSirali.at(-2);
      if (vSon && vOnceki) {
        const donem = ay(vSon).slice(0, 4);
        ekle(varlikSinyali('Büyükbaş hayvan', num(vOnceki.buyukbas_toplam_bas) || null,
          num(vSon.buyukbas_toplam_bas) || null, donem, '/tarpovizyon/turkey/animal-production'));
        ekle(varlikSinyali('Küçükbaş hayvan', num(vOnceki.kucukbas_toplam_bas) || null,
          num(vSon.kucukbas_toplam_bas) || null, donem, '/tarpovizyon/turkey/animal-production'));
      }

      /* ── TİCARET: tarımsal dış ticaret dengesi ────────────────────────── */
      const dtSirali = [...disTicaret]
        .map((r) => ({ yil: Number(r.yil), r }))
        .filter((x) => Number.isFinite(x.yil))
        .sort((a, b) => a.yil - b.yil);
      const dtSon = dtSirali.at(-1);
      const dtOnceki = dtSirali.at(-2);
      if (dtSon) {
        const oncekiDenge = dtOnceki
          ? num(dtOnceki.r.ihracat_milyar_usd) - num(dtOnceki.r.ithalat_milyar_usd)
          : null;
        ekle(ticaretSinyali(num(dtSon.r.ihracat_milyar_usd) || null,
          num(dtSon.r.ithalat_milyar_usd) || null, oncekiDenge,
          String(dtSon.yil), '/tarpovizyon/turkey/trade'));
      }

      /* ── FİYAT: gıda enflasyonu ───────────────────────────────────────── */
      const tufeSirali = [...tufe]
        .map((r) => ({ satir: r, anahtar: `${r.yil}-${String(r.ay).padStart(2, '0')}` }))
        .sort((a, b) => a.anahtar.localeCompare(b.anahtar));
      const sonTufe = tufeSirali.at(-1);
      if (sonTufe) {
        ekle(gidaEnflasyonSinyali(
          num(sonTufe.satir.gida_alkolsuz) || null, num(sonTufe.satir.tufe) || null,
          sonTufe.anahtar, '/tarpovizyon/turkey/price-index'));
      }

      /* ── FİYAT: aktarım zinciri projeksiyonu ──────────────────────────────
         Zincirin ölçüsü `zincir.ts`te; burada yalnızca sinyale çevriliyor.
         Aynı hesap iki yerde yapılmasın diye seri kurulumu paylaşılıyor. */
      const tufeDegisim: AySerisi = {};
      for (const r of tufe) {
        const anahtar = `${r.yil}-${String(r.ay).padStart(2, '0')}`;
        const v = num(r.tufe);
        if (v) tufeDegisim[anahtar] = v;
      }
      const bilesik = bilesikOrtalama(
        bitkiler
          .map((rows) => tufeUzeriFazla(yillikDegisim(endekstenSeri(rows)), tufeDegisim))
          .filter((s) => Object.keys(s).length),
      );
      const bilesikSon = sonAy(bilesik);
      if (bilesikSon) {
        ekle(aktarimSinyali(bilesikSon.deger * UCTAN_UCA.beta,
          ayEkle(bilesikSon.ay, UCTAN_UCA.gecikmeAy), '/tarpovizyon/turkey/overview'));
      }

      /* Tazelik damgası. Sinyal silinmiyor, İŞARETLENİYOR — ekran gizliyor ama
         kaç tanesinin kaynağı bayat olduğunu da söyleyebiliyor. Kararı burada
         verip orada saklamak, "sinyal yok" ile "kaynak eski" ayrımını
         koruyor. */
      return sirala(sinyaller.map((s) => ({ ...s, bayat: bayatMi(s.donem) })));
    },
  });
}
