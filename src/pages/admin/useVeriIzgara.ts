import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { fetchRows } from '../../services/d1';

const API_BASE = (import.meta.env.VITE_TARPOVIZYON_BASIC_API as string | undefined)
  ?? 'https://tarpovizyon-api.veteroner.workers.dev';

const ANAHTAR_DEPO = 'tarpovizyon_admin_key';

/** Izgaraya bir seferde çekilen satır sayısı. */
export const PENCERE = 300;

export type Tablo = { tablo: string; rota: string; sayfalar: string[] };
export type Sutun = { ad: string; tur: string; yazilabilir: boolean };

export type IzgaraSatir = {
  /** Veritabanındaki id — yoksa satır YENİ demektir. */
  id?: number;
  /** Izgara içi kimlik (yeni satırların id'si olmadığı için gerekli). */
  _k: string;
  _yeni?: boolean;
  [sutun: string]: unknown;
};

/**
 * Veri ızgarası — panelden tablo düzenleme.
 *
 * Akış: tablo seç → mevcut satırlar ızgaraya gelir → elle düzenle, satır ekle
 * veya dosyadan içe aktar (yeni satırlar ALTA eklenir) → değişiklikleri gör →
 * kaydet.
 *
 * Satır kimliği `id`. Böylece "hangi satır güncellenecek" tahmin edilmiyor:
 * id'li satır UPDATE, id'siz satır INSERT. (İş anahtarıyla eşleştirme
 * denenmişti; tabloda '2023-01-01 00:00:00', dosyada '2023' olunca satırlar
 * sessizce ikizleniyordu.)
 */
export function useVeriIzgara() {
  const [tablolar, setTablolar] = useState<Tablo[]>([]);
  const [seciliTablo, setSeciliTablo] = useState('');
  const [sutunlar, setSutunlar] = useState<Sutun[]>([]);
  const [satirlar, setSatirlar] = useState<IzgaraSatir[]>([]);
  const [ilkHal, setIlkHal] = useState<Map<number, Record<string, unknown>>>(new Map());
  /*
   * Tek seferlik kod: SAKLANMIYOR. Sabit anahtar (localStorage'daki) Worker'da
   * `ADMIN_KEY` silinene kadar yedek olarak duruyor; ikisinden biri yeterli.
   */
  const [otp, setOtp] = useState('');
  const [anahtar, setAnahtar] = useState(() => localStorage.getItem(ANAHTAR_DEPO) ?? '');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [durum, setDurum] = useState<{ tip: 'bos' | 'ok' | 'hata'; mesaj: string }>(
    { tip: 'bos', mesaj: '' });
  const sayac = useRef(0);

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/catalog`)
      .then((r) => r.json())
      .then((d) => setTablolar(d.tablolar ?? []))
      .catch(() => setDurum({ tip: 'hata', mesaj: 'Tablo listesi alınamadı.' }));
  }, []);

  const anahtarKaydet = useCallback((v: string) => {
    setAnahtar(v);
    if (v) localStorage.setItem(ANAHTAR_DEPO, v);
    else localStorage.removeItem(ANAHTAR_DEPO);
  }, []);

  const tabloSec = useCallback(async (tablo: string) => {
    setSeciliTablo(tablo);
    setSatirlar([]); setSutunlar([]); setIlkHal(new Map());
    if (!tablo) return;
    setYukleniyor(true);
    setDurum({ tip: 'bos', mesaj: '' });
    try {
      const semaRes = await fetch(`${API_BASE}/api/admin/schema/${tablo}`);
      const sema = await semaRes.json();
      if (!semaRes.ok) throw new Error(sema.error ?? 'Şema alınamadı');
      setSutunlar(sema.sutunlar ?? []);

      const rota = tablolar.find((t) => t.tablo === tablo)?.rota;
      const ham = rota ? await fetchRows(rota, { limit: PENCERE }) : [];
      const ilk = new Map<number, Record<string, unknown>>();
      const izg: IzgaraSatir[] = ham.map((r) => {
        const o = r as Record<string, unknown>;
        const id = Number(o.id);
        if (Number.isInteger(id)) ilk.set(id, { ...o });
        return { ...o, id: Number.isInteger(id) ? id : undefined, _k: `d${id}` };
      });
      setIlkHal(ilk);
      setSatirlar(izg);
      setDurum({ tip: 'ok', mesaj: `${izg.length} satır yüklendi.` });
    } catch (e) {
      setDurum({ tip: 'hata', mesaj: `Tablo açılamadı: ${(e as Error).message}` });
    } finally {
      setYukleniyor(false);
    }
  }, [tablolar]);

  const yazilabilirSutunlar = useMemo(
    () => sutunlar.filter((s) => s.yazilabilir), [sutunlar]);

  const hucreDegistir = useCallback((k: string, sutun: string, deger: string) => {
    setSatirlar((prev) => prev.map((r) => (r._k === k ? { ...r, [sutun]: deger } : r)));
  }, []);

  const satirEkle = useCallback(() => {
    sayac.current += 1;
    const bos: IzgaraSatir = { _k: `y${sayac.current}`, _yeni: true };
    yazilabilirSutunlar.forEach((s) => { bos[s.ad] = ''; });
    setSatirlar((prev) => [...prev, bos]);
  }, [yazilabilirSutunlar]);

  const satirSil = useCallback((k: string) => {
    // Yalnızca HENÜZ KAYDEDİLMEMİŞ satırlar ızgaradan çıkarılabilir.
    // Veritabanından silme bilinçli olarak yok — geri alınamaz bir işlem.
    setSatirlar((prev) => prev.filter((r) => !(r._k === k && r._yeni)));
  }, []);

  const norm = (s: string) => s.toLowerCase()
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');

  /** Dosyadan içe aktar — satırlar mevcutların ALTINA eklenir. */
  const dosyaAktar = useCallback(async (f: File) => {
    if (!yazilabilirSutunlar.length) return;
    try {
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
      const veri = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        wb.Sheets[wb.SheetNames[0]], { defval: '' });
      if (!veri.length) throw new Error('Dosyada satır yok.');

      // Başlıkları tablo sütunlarına ada göre eşle.
      const bas = Object.keys(veri[0]);
      const esle = new Map<string, string>();
      bas.forEach((b) => {
        const bul = yazilabilirSutunlar.find((s) => norm(s.ad) === norm(b));
        if (bul) esle.set(b, bul.ad);
      });
      if (!esle.size) {
        throw new Error(`Hiçbir sütun eşleşmedi. Beklenen başlıklar: ${yazilabilirSutunlar.map((s) => s.ad).join(', ')}`);
      }

      const yeniler: IzgaraSatir[] = veri.map((r) => {
        sayac.current += 1;
        const o: IzgaraSatir = { _k: `y${sayac.current}`, _yeni: true };
        yazilabilirSutunlar.forEach((s) => { o[s.ad] = ''; });
        esle.forEach((tabloSut, dosyaSut) => { o[tabloSut] = r[dosyaSut]; });
        return o;
      });
      setSatirlar((prev) => [...prev, ...yeniler]);
      const eslesmeyen = bas.filter((b) => !esle.has(b));
      setDurum({
        tip: 'ok',
        mesaj: `${yeniler.length} satır eklendi (henüz kaydedilmedi).`
          + (eslesmeyen.length ? ` Eşleşmeyen sütunlar atlandı: ${eslesmeyen.join(', ')}` : ''),
      });
    } catch (e) {
      setDurum({ tip: 'hata', mesaj: `İçe aktarılamadı: ${(e as Error).message}` });
    }
  }, [yazilabilirSutunlar]);

  /** Kaydedilecekler: değişmiş mevcut satırlar + yeni satırlar. */
  const degisiklikler = useMemo(() => {
    const guncellenecek: Record<string, unknown>[] = [];
    const eklenecek: Record<string, unknown>[] = [];
    for (const r of satirlar) {
      if (r._yeni) {
        const o: Record<string, unknown> = {};
        let doluMu = false;
        yazilabilirSutunlar.forEach((s) => {
          const v = r[s.ad];
          if (v !== '' && v !== undefined && v !== null) doluMu = true;
          o[s.ad] = v;
        });
        if (doluMu) eklenecek.push(o);
        continue;
      }
      if (r.id === undefined) continue;
      const onceki = ilkHal.get(r.id);
      if (!onceki) continue;
      const fark: Record<string, unknown> = {};
      yazilabilirSutunlar.forEach((s) => {
        const yeni = r[s.ad];
        const eski = onceki[s.ad];
        const a = eski === null || eski === undefined ? '' : String(eski);
        const b = yeni === null || yeni === undefined ? '' : String(yeni);
        if (a !== b) fark[s.ad] = yeni;
      });
      if (Object.keys(fark).length) guncellenecek.push({ id: r.id, ...fark });
    }
    return { guncellenecek, eklenecek };
  }, [satirlar, ilkHal, yazilabilirSutunlar]);

  const hucreDegisti = useCallback((r: IzgaraSatir, sutun: string) => {
    if (r._yeni || r.id === undefined) return false;
    const onceki = ilkHal.get(r.id);
    if (!onceki) return false;
    const a = onceki[sutun] === null || onceki[sutun] === undefined ? '' : String(onceki[sutun]);
    const b = r[sutun] === null || r[sutun] === undefined ? '' : String(r[sutun]);
    return a !== b;
  }, [ilkHal]);

  const kaydet = useCallback(async () => {
    const { guncellenecek, eklenecek } = degisiklikler;
    if ((!otp && !anahtar) || (!guncellenecek.length && !eklenecek.length)) return;
    setYukleniyor(true);
    setDurum({ tip: 'bos', mesaj: 'Kaydediliyor…' });
    try {
      const PARCA = 400;
      let g = 0; let e = 0;
      const partiler: { guncellenecek: unknown[]; eklenecek: unknown[] }[] = [];
      for (let i = 0; i < Math.max(guncellenecek.length, eklenecek.length); i += PARCA) {
        partiler.push({
          guncellenecek: guncellenecek.slice(i, i + PARCA),
          eklenecek: eklenecek.slice(i, i + PARCA),
        });
      }
      for (const p of partiler) {
        if (!p.guncellenecek.length && !p.eklenecek.length) continue;
        const r = await fetch(`${API_BASE}/api/admin/rows`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(otp ? { 'x-admin-otp': otp } : {}),
            ...(anahtar ? { 'x-admin-key': anahtar } : {}),
          },
          body: JSON.stringify({ tablo: seciliTablo, ...p }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error + (d.sutunlar ? `: ${d.sutunlar.join(', ')}` : ''));
        g += d.guncellenen ?? 0; e += d.eklenen ?? 0;
      }
      setDurum({ tip: 'ok', mesaj: `Kaydedildi — ${g} satır güncellendi, ${e} satır eklendi.` });
      await tabloSec(seciliTablo); // ızgarayı tazele
    } catch (err) {
      setDurum({ tip: 'hata', mesaj: `Kaydedilemedi: ${(err as Error).message}` });
    } finally {
      setYukleniyor(false);
    }
  }, [degisiklikler, otp, anahtar, seciliTablo, tabloSec]);

  return {
    tablolar, seciliTablo, tabloSec,
    sutunlar, yazilabilirSutunlar, satirlar,
    otp, setOtp,
    anahtar, anahtarKaydet,
    hucreDegistir, hucreDegisti, satirEkle, satirSil, dosyaAktar,
    degisiklikler, kaydet, yukleniyor, durum,
  };
}
