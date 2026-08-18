/**
 * Zip içindeki FAO CSV'sini AKIŞ olarak okur.
 *
 * ─── NEDEN AKIŞ ─────────────────────────────────────────────────────────────
 * Üretim dosyası açıldığında ~1,5 GB metin; tek parça okumak
 * `RangeError: Invalid string length` veriyor. Bu yüzden `unzip -p` çıktısı
 * parça parça tüketiliyor ve satırlar tek tek veriliyor.
 *
 * FAO dosyaları UTF-8. latin1 okumak 'Türkiye'yi 'TÃ¼rkiye' yapıyor ve hata
 * vermeden veritabanına bozuk yazıyor — bir kez yaşandı.
 */

import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createInterface } from 'node:readline';

const calistir = promisify(execFile);

/** Zip içindeki tek CSV'nin adı. */
export async function csvAdi(zipYolu) {
  const { stdout } = await calistir('unzip', ['-Z1', zipYolu], { maxBuffer: 4 * 1024 * 1024 });
  const ad = stdout.split('\n').find((x) => /\.csv$/i.test(x.trim()));
  if (!ad) throw new Error(`zip içinde CSV yok: ${zipYolu}`);
  return ad.trim();
}

/** Tek CSV satırını alanlara ayırır (tırnak içinde virgül olabiliyor). */
export function satiriAyir(satir) {
  const alanlar = [];
  let alan = ''; let tirnak = false;
  for (let i = 0; i < satir.length; i++) {
    const c = satir[i];
    if (tirnak) {
      if (c === '"') { if (satir[i + 1] === '"') { alan += '"'; i++; } else tirnak = false; }
      else alan += c;
    } else if (c === '"') tirnak = true;
    else if (c === ',') { alanlar.push(alan); alan = ''; }
    else alan += c;
  }
  alanlar.push(alan);
  return alanlar;
}

/**
 * Satırları tek tek verir. İlk çıktı BAŞLIK dizisi, sonrakiler veri satırları.
 * Not: FAO dosyalarında alan içinde satır sonu yok, bu yüzden satır bazlı
 * okumak güvenli.
 */
export async function* csvSatirlari(zipYolu) {
  const ad = await csvAdi(zipYolu);
  const p = spawn('unzip', ['-p', zipYolu, ad]);
  p.stderr.resume();
  const okuyucu = createInterface({ input: p.stdout, crlfDelay: Infinity });
  try {
    for await (const satir of okuyucu) {
      if (satir) yield satiriAyir(satir);
    }
  } finally {
    okuyucu.close();
    p.kill();
  }
}
