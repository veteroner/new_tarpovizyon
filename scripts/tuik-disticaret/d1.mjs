/**
 * D1 erişimi — wrangler CLI üzerinden.
 *
 * Cloudflare'in D1 HTTP API'si yerine wrangler kullanılıyor: kimlik bilgisi
 * zaten yerelde/CI'da tanımlı ve `--json` çıktısı yeterli. wrangler önüne
 * bilgilendirme satırları basıyor, bu yüzden JSON dizisinin başlangıcını
 * arıyoruz.
 *
 * ─── SÜRÜM NEDEN SABİT ──────────────────────────────────────────────────────
 * Çağrı `npx wrangler` idi, yani her CI turunda "latest" çözülüyordu. Bir gün
 * iş şu hatayla düştü:
 *
 *     npm error notarget No matching version found for wrangler@4.131.2
 *
 * Sürüm aslında VARDI — npm kayıt defterindeki yayılma yarışıydı: dist-tag
 * `latest` yeni sürümü gösteriyor ama paket her aynada henüz yok. Yeniden
 * çalıştırınca geçti. Yani bu bir talihsizlik değil yapısal açık: sabitlenmemiş
 * bir CLI, kendi deposunda hiçbir şey değişmese de boru hattını kırabiliyor —
 * üstelik yeni bir wrangler sürümünün davranış değişikliği de habersiz gelir.
 *
 * Sürüm ayrıca `package.json`'da devDependency: `npm install` yapılmış bir
 * ağaçta npx kurulu olanı kullanıyor, indirme hiç olmuyor. İKİSİ AYNI DEĞERDE
 * TUTULMALI.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const calistir = promisify(execFile);

/** Sabit sürüm — `package.json` devDependencies ile aynı olmalı. */
export const WRANGLER = 'wrangler@4.131.2';

/** `npx` argümanları: `--yes` sorusuz, sürüm sabit. */
const NPX = ['--yes', WRANGLER];

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
    [...NPX, 'd1', 'execute', VT, '--remote', '--json', '--command', sql],
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
      [...NPX, 'd1', 'execute', VT, '--remote', '--json', '--file', yol],
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
