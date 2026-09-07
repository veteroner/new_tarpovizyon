import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { eksenTick, ipucuBicim, sayiBicimle } from '../sayiBicim';

/**
 * ─── NEDEN BU TEST VAR ──────────────────────────────────────────────────────
 * "Ekranda 154.3380999999999 yazıyor" hatası bu projede üç kez ayrı ayrı
 * düzeltildi, çünkü her seferinde TEK grafik onarıldı. Kalıcı çözüm, yeni
 * biçimlendiricisiz grafiğin eklenmesini engellemek.
 *
 * Test kaynak dosyaları tarıyor: sayısal bir eksen `tickFormatter` almadan,
 * bir ipucu `formatter` almadan eklendiğinde kırılıyor. Yani bir daha
 * "sayfadaki hepsini tek tek bulacak mıyız" sorusu sorulmuyor — derleme
 * söylüyor.
 */

const KOK = new URL('../../', import.meta.url).pathname;

function* dosyalar(dizin: string): Generator<string> {
  for (const ad of readdirSync(dizin)) {
    const yol = join(dizin, ad);
    if (statSync(yol).isDirectory()) {
      if (ad === '__tests__' || ad === 'graphify-out') continue;
      yield* dosyalar(yol);
    } else if (ad.endsWith('.tsx')) yield yol;
  }
}

/**
 * Bir JSX etiketinin tamamını (çok satırlı olabilir) yakalar.
 *
 * Etiket adından sonra SINIR şartı var: düz `<Tooltip` araması
 * `<TooltipState<...>>` tip parametresini de yakalıyordu. İlk sürümde bu hata
 * hem testte hem toplu dönüşüm betiğinde vardı; betik tip parametresine
 * `formatter={...}` sokup dosyayı bozdu, test de bozuk hâli "geçti" saydı.
 * Aynı hatayı iki yerde yapmak, testin doğrulama değeri olmadığı anlamına
 * geliyordu.
 */
function etiketler(kaynak: string, ad: string): string[] {
  const bulunan: string[] = [];
  const desen = new RegExp(`<${ad}(?=[\\s/>])`, 'g');
  let e = desen.exec(kaynak);
  let i = e ? e.index : -1;
  while (i !== -1) {
    let derinlik = 0;
    let j = i;
    for (; j < kaynak.length; j += 1) {
      const c = kaynak[j];
      if (c === '{') derinlik += 1;
      else if (c === '}') derinlik -= 1;
      else if (c === '>' && derinlik === 0) break;
    }
    bulunan.push(kaynak.slice(i, j + 1));
    desen.lastIndex = j;
    e = desen.exec(kaynak);
    i = e ? e.index : -1;
  }
  return bulunan;
}

describe('sayı biçimlendirme', () => {
  it('kayan nokta kuyruğu basmıyor', () => {
    expect(sayiBicimle(1074.4916666666666)).toBe('1.074');
    expect(sayiBicimle(129.29875)).toBe('129,3');
    expect(sayiBicimle(154.3380999999999)).toBe('154,3');
  });

  it('eksen kısaltması eşikleri tutuyor', () => {
    expect(eksenTick(1_500_000)).toBe('1,5M');
    expect(eksenTick(12_345)).toBe('12K');
    expect(eksenTick(131.73)).toBe('131,7');
  });

  it('ipucu adı değiştirmiyor', () => {
    expect(ipucuBicim(1074.4916666666666, 'GFE')).toEqual(['1.074', 'GFE']);
  });
});

describe('grafiklerde biçimlendirici zorunlu', () => {
  it('her sayısal eksende tickFormatter var', () => {
    const eksik: string[] = [];
    for (const yol of dosyalar(KOK)) {
      const kaynak = readFileSync(yol, 'utf8');
      for (const ad of ['YAxis', 'XAxis']) {
        for (const e of etiketler(kaynak, ad)) {
          /* Kategori ekseni sayı basmıyor; biçimlendirici gerekmez. */
          if (e.includes('type="category"')) continue;
          if (e.includes('tickFormatter')) continue;
          /* dataKey'i olmayan XAxis kategori eksenidir (varsayılan). */
          if (ad === 'XAxis' && !e.includes('type="number"')) continue;
          eksik.push(`${yol.replace(KOK, '')} → <${ad}`);
        }
      }
    }
    expect(eksik, `biçimlendiricisiz eksen:\n${eksik.join('\n')}`).toEqual([]);
  });

  it('her ipucunda formatter var', () => {
    const eksik: string[] = [];
    for (const yol of dosyalar(KOK)) {
      const kaynak = readFileSync(yol, 'utf8');
      for (const e of etiketler(kaynak, 'Tooltip')) {
        if (e.includes('formatter') || e.includes('content=')) continue;
        eksik.push(yol.replace(KOK, ''));
      }
    }
    expect(eksik, `formatter'sız ipucu:\n${eksik.join('\n')}`).toEqual([]);
  });
});
