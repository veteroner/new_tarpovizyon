/**
 * D1 erişimi — wrangler CLI üzerinden.
 *
 * Cloudflare'in D1 HTTP API'si yerine wrangler kullanılıyor: kimlik bilgisi
 * zaten yerelde/CI'da tanımlı ve `--json` çıktısı yeterli. wrangler önüne
 * bilgilendirme satırları basıyor, bu yüzden JSON dizisinin başlangıcını
 * arıyoruz.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const calistir = promisify(execFile);

export const VT = 'tarpovizyon-basic';

const KOK = new URL('../../workers/tarpovizyon-api/', import.meta.url).pathname;

/** JSON dizisini wrangler gürültüsünden ayıklar. */
function ayikla(cikti) {
  const i = cikti.indexOf('[');
  if (i < 0) throw new Error(`wrangler JSON döndürmedi:\n${cikti.slice(0, 400)}`);
  const j = JSON.parse(cikti.slice(i));
  if (j?.error) throw new Error(`D1 hatası: ${JSON.stringify(j.error).slice(0, 300)}`);
  return j;
}

/** Tek SELECT çalıştırır, satırları döndürür. */
export async function sorgu(sql) {
  const { stdout } = await calistir(
    'npx',
    ['wrangler', 'd1', 'execute', VT, '--remote', '--json', '--command', sql],
    { cwd: KOK, maxBuffer: 256 * 1024 * 1024 },
  );
  return ayikla(stdout)[0].results ?? [];
}

/**
 * Çok sayıda ifadeyi dosyadan çalıştırır.
 * `--command` uzun SQL'de tıkanıyor; toplu yazımda dosya yolu şart.
 */
export async function dosyaCalistir(sqlMetni) {
  const yol = join(tmpdir(), `tuik-dt-${Date.now()}-${Math.random().toString(36).slice(2)}.sql`);
  writeFileSync(yol, sqlMetni);
  try {
    const { stdout } = await calistir(
      'npx',
      ['wrangler', 'd1', 'execute', VT, '--remote', '--json', '--file', yol],
      { cwd: KOK, maxBuffer: 256 * 1024 * 1024 },
    );
    return ayikla(stdout);
  } finally {
    try { unlinkSync(yol); } catch { /* geçici dosya */ }
  }
}

/** SQL metin değeri — tek tırnak kaçışlı. */
export const s = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
/** SQL sayı değeri. */
export const n = (v) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? 'NULL' : String(Number(v)));
