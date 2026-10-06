#!/usr/bin/env node
/**
 * Yazmanın ETKİSİNİ ölçer: yükleyicinin kaynaktan çıkardığı değerleri D1'e
 * geri sorar ve karşılaştırır.
 *
 * ─── NEDEN AYRI BİR ADIM ────────────────────────────────────────────────────
 * `wrangler d1 execute --file` bir dosyayı başarıyla çalıştırıp hiçbir satırı
 * değiştirmemiş olabilir: UPDATE'in WHERE'i tutmazsa 0 satır etkilenir, hata
 * dönmez. Bu depoda tam olarak bu yaşandı — günlük senkron aylarca
 * "güncellendi" yazıp hiçbir şey yazmıyordu, çünkü sayaç niyeti sayıyordu.
 *
 * Beklenti dosyası: [{ aciklama, sorgu, deger }]. `sorgu` tek satır, tek
 * sütun (`v`) döndürmeli. Bir tanesi bile tutmazsa 1 ile çıkılır ve iş
 * akışı kırmızıya döner.
 *
 * Kullanım:  node scripts/d1-beklenti-dogrula.mjs beklenti.json [...]
 */

import { readFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const calistir = promisify(execFile);
const KOK = new URL('../workers/tarpovizyon-api/', import.meta.url).pathname;
/* Sürüm sabit — package.json devDependency ve tuik-disticaret/d1.mjs ile aynı. */
const WRANGLER = 'wrangler@4.131.2';

const dosyalar = process.argv.slice(2);
if (!dosyalar.length) {
  console.error('Beklenti dosyası verin.');
  process.exit(2);
}

/** wrangler önüne bilgi satırları basıyor; JSON dizisini dengeleyerek ayıklıyoruz. */
function ayikla(cikti) {
  const i = cikti.indexOf('[');
  if (i < 0) throw new Error(`wrangler JSON döndürmedi:\n${cikti.slice(0, 300)}`);
  let d = 0;
  for (let j = i; j < cikti.length; j++) {
    const c = cikti[j];
    if (c === '[' || c === '{') d++;
    else if (c === ']' || c === '}') {
      d--;
      if (d === 0) return JSON.parse(cikti.slice(i, j + 1));
    }
  }
  throw new Error('wrangler çıktısı yarım');
}

async function sor(sql) {
  const { stdout } = await calistir('npx',
    ['--yes', WRANGLER, 'd1', 'execute', 'tarpovizyon-basic', '--remote', '--json', '--command', sql],
    { cwd: KOK, maxBuffer: 16 * 1024 * 1024 });
  return ayikla(stdout)[0]?.results ?? [];
}

let toplam = 0;
let hata = 0;

for (const dosya of dosyalar) {
  const beklentiler = JSON.parse(readFileSync(dosya, 'utf8'));
  /*
   * Boş beklenti listesi BAŞARI DEĞİL. Yükleyici hiçbir değer üretemediyse
   * (akış değişti, süzgeç boş döndü) bu adım "0/0 tuttu" deyip yeşil
   * geçerdi — ölçmediği şeyi doğrulamış gibi görünürdü.
   */
  if (!beklentiler.length) {
    console.error(`✗ ${dosya}: beklenti listesi BOŞ — ölçülecek bir şey yok, doğrulama sayılmaz.`);
    hata++;
    continue;
  }
  for (const b of beklentiler) {
    toplam++;
    const satir = await sor(b.sorgu);
    if (satir.length !== 1) {
      console.error(`✗ ${b.aciklama}: ${satir.length} satır döndü (1 bekleniyordu)`);
      hata++;
      continue;
    }
    const v = Number(satir[0].v);
    const tuttu = Number.isFinite(v) && Math.abs(v - Number(b.deger)) < 1e-6;
    console.log(`${tuttu ? '✓' : '✗'} ${b.aciklama}: D1=${satir[0].v} kaynak=${b.deger}`);
    if (!tuttu) hata++;
  }
}

console.log(`\n${toplam - hata}/${toplam} beklenti tuttu.`);
if (hata) process.exit(1);
