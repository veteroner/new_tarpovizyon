import { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { fetchRows } from '../../services/d1';

const API_BASE = (import.meta.env.VITE_TARPOVIZYON_BASIC_API as string | undefined)
  ?? 'https://tarpovizyon-api.veteroner.workers.dev';

/** Yönetici anahtarı tarayıcıda kalır; koda YAZILMAZ. */
const ANAHTAR_DEPO = 'tarpovizyon_admin_key';

export type Hedef = {
  id: string;
  label: string;
  /** Satırı tekilleştiren iş anahtarı. */
  keys: string[];
  /** Yazılabilir sütunlar. */
  cols: string[];
};

export type Eslesme = Record<string, string>; // dosya sütunu -> tablo sütunu

export type Onizleme = {
  toplam: number;
  eslesen: number;   // mevcut kayıtla eşleşip GÜNCELLENECEK satır
  yeni: number;      // EKLENECEK satır
  ornekAnahtar: string[];
  mevcutOrnek: string[];
};

const norm = (s: string) => s.toLowerCase()
  .replace(/ı/g, 'i').replace(/İ/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
  .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
  .replace(/[^a-z0-9]/g, '');

/**
 * Elle veri yükleme.
 *
 * TÜİK'in bir kısım serisi SDMX API'sinde yayımlanmıyor (il bazlı hayvan
 * sayıları, verimlilikler, arıcı sayısı, TÜFE…) ve yalnızca MEDAS/portaldan
 * elle indirilebiliyor. Bu ekran o dosyaları SQL yazmadan D1'e aktarıyor.
 *
 * En kritik nokta ANAHTAR EŞLEŞMESİ: tablodaki `yil` bazen '2023', bazen
 * '2023-01-01 00:00:00' biçiminde duruyor. Eşleşmezse satır güncellenmek
 * yerine YENİ kayıt olarak eklenir ve tabloda ikizler oluşur. Bu yüzden
 * yüklemeden önce kaç satırın mevcut kayıtla eşleştiği hesaplanıp
 * gösteriliyor; kullanıcı "0 eşleşti" görüyorsa biçim tutmuyor demektir.
 */
export function useVeriYukle() {
  const [hedefler, setHedefler] = useState<Hedef[]>([]);
  const [hedefId, setHedefId] = useState('');
  const [anahtar, setAnahtar] = useState(() => localStorage.getItem(ANAHTAR_DEPO) ?? '');
  const [dosyaAdi, setDosyaAdi] = useState('');
  const [basliklar, setBasliklar] = useState<string[]>([]);
  const [satirlar, setSatirlar] = useState<Record<string, unknown>[]>([]);
  const [eslesme, setEslesme] = useState<Eslesme>({});
  const [onizleme, setOnizleme] = useState<Onizleme | null>(null);
  const [durum, setDurum] = useState<{ tip: 'bos' | 'calisiyor' | 'ok' | 'hata'; mesaj: string }>(
    { tip: 'bos', mesaj: '' });
  const [ilerleme, setIlerleme] = useState(0);

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/upload-tables`)
      .then((r) => r.json())
      .then((d) => setHedefler(d.hedefler ?? []))
      .catch(() => setDurum({ tip: 'hata', mesaj: 'Hedef listesi alınamadı.' }));
  }, []);

  const hedef = useMemo(() => hedefler.find((h) => h.id === hedefId), [hedefler, hedefId]);

  const anahtarKaydet = useCallback((v: string) => {
    setAnahtar(v);
    if (v) localStorage.setItem(ANAHTAR_DEPO, v);
    else localStorage.removeItem(ANAHTAR_DEPO);
  }, []);

  /** Excel/CSV oku. Başlık satırı ilk satır kabul ediliyor. */
  const dosyaSec = useCallback(async (f: File) => {
    setDurum({ tip: 'calisiyor', mesaj: 'Dosya okunuyor…' });
    setOnizleme(null);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sh = wb.Sheets[wb.SheetNames[0]];
      const veri = XLSX.utils.sheet_to_json<Record<string, unknown>>(sh, { defval: '' });
      if (!veri.length) throw new Error('Dosyada satır bulunamadı.');
      const bas = Object.keys(veri[0]);
      setDosyaAdi(f.name);
      setBasliklar(bas);
      setSatirlar(veri);
      setDurum({ tip: 'ok', mesaj: `${veri.length} satır okundu.` });
    } catch (e) {
      setSatirlar([]); setBasliklar([]);
      setDurum({ tip: 'hata', mesaj: `Dosya okunamadı: ${(e as Error).message}` });
    }
  }, []);

  // Dosya başlıklarını tablo sütunlarına otomatik eşle (Türkçe karakter ve
  // boşluk farklarını yok sayarak). Kullanıcı sonra elle düzeltebiliyor.
  useEffect(() => {
    if (!hedef || !basliklar.length) return;
    const otomatik: Eslesme = {};
    for (const b of basliklar) {
      const bulunan = hedef.cols.find((c) => norm(c) === norm(b));
      if (bulunan) otomatik[b] = bulunan;
    }
    setEslesme(otomatik);
  }, [hedef, basliklar]);

  const esleseninSutunlari = useMemo(
    () => Object.values(eslesme).filter(Boolean), [eslesme]);

  const anahtarEksik = useMemo(
    () => (hedef ? hedef.keys.filter((k) => !esleseninSutunlari.includes(k)) : []),
    [hedef, esleseninSutunlari]);

  /** Gönderilecek satırlar: yalnızca eşlenmiş sütunlar. */
  const gonderilecek = useMemo(() => {
    if (!hedef) return [];
    return satirlar.map((r) => {
      const o: Record<string, unknown> = {};
      for (const [dosyaSut, tabloSut] of Object.entries(eslesme)) {
        if (tabloSut) o[tabloSut] = r[dosyaSut];
      }
      return o;
    }).filter((o) => hedef.keys.every((k) => o[k] !== undefined && o[k] !== ''));
  }, [satirlar, eslesme, hedef]);

  /**
   * Yüklemeden ÖNCE kaç satırın mevcut kayıtla eşleştiğini hesaplar.
   * Mevcut anahtarları tek okumada çekip istemcide karşılaştırıyoruz.
   */
  const onizlemeHesapla = useCallback(async () => {
    if (!hedef || !gonderilecek.length) return;
    setDurum({ tip: 'calisiyor', mesaj: 'Mevcut kayıtlarla karşılaştırılıyor…' });
    try {
      const rota = HEDEF_OKUMA_ROTA[hedef.id];
      const mevcut = rota ? await fetchRows(rota, { limit: 5000 }) : [];
      const anahtarla = (o: Record<string, unknown>) =>
        hedef.keys.map((k) => String(o[k] ?? '').trim()).join('||');
      const mevcutKume = new Set(mevcut.map((m) => anahtarla(m as Record<string, unknown>)));
      let eslesen = 0;
      for (const g of gonderilecek) if (mevcutKume.has(anahtarla(g))) eslesen++;
      setOnizleme({
        toplam: gonderilecek.length,
        eslesen,
        yeni: gonderilecek.length - eslesen,
        ornekAnahtar: gonderilecek.slice(0, 3).map(anahtarla),
        mevcutOrnek: [...mevcutKume].slice(0, 3),
      });
      setDurum({ tip: 'ok', mesaj: '' });
    } catch (e) {
      setDurum({ tip: 'hata', mesaj: `Karşılaştırma başarısız: ${(e as Error).message}` });
    }
  }, [hedef, gonderilecek]);

  const yukle = useCallback(async () => {
    if (!hedef || !anahtar || !gonderilecek.length) return;
    setDurum({ tip: 'calisiyor', mesaj: 'Yükleniyor…' });
    setIlerleme(0);
    const PARCA = 400; // Worker istek başına 500 satır kabul ediyor
    let eklenen = 0; let guncellenen = 0;
    try {
      for (let i = 0; i < gonderilecek.length; i += PARCA) {
        const dilim = gonderilecek.slice(i, i + PARCA);
        const r = await fetch(`${API_BASE}/api/admin/upsert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': anahtar },
          body: JSON.stringify({ hedef: hedef.id, rows: dilim }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error + (d.sutunlar ? `: ${d.sutunlar.join(', ')}` : ''));
        eklenen += d.eklenen ?? 0;
        guncellenen += d.guncellenen ?? 0;
        setIlerleme(Math.min(100, Math.round(((i + dilim.length) / gonderilecek.length) * 100)));
      }
      setDurum({ tip: 'ok', mesaj: `Bitti — ${eklenen} yeni satır eklendi, ${guncellenen} satır güncellendi.` });
      setOnizleme(null);
    } catch (e) {
      setDurum({ tip: 'hata', mesaj: `Yükleme durdu: ${(e as Error).message}` });
    }
  }, [hedef, anahtar, gonderilecek]);

  return {
    hedefler, hedefId, setHedefId, hedef,
    anahtar, anahtarKaydet,
    dosyaAdi, basliklar, satirlar, dosyaSec,
    eslesme, setEslesme, anahtarEksik,
    gonderilecek, onizleme, onizlemeHesapla,
    yukle, durum, ilerleme,
  };
}

/** Önizlemede mevcut kayıtları okumak için kullanılan salt-okunur rotalar. */
const HEDEF_OKUMA_ROTA: Record<string, string> = {
  'il-hayvan-sayilari': 'oner/illerin-hayvan-sayisi',
  'verimlilikler': 'oner/verimlilikler',
  'arici-sayisi': 'il/arici-sayisi-yillik',
  'kisi-basi-uretim-tuketim': 'tr/kisi-basi-uretim-tuketim',
  'fiyat-endeks': 'tuik/fiyatendex',
};
