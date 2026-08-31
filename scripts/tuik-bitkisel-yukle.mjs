#!/usr/bin/env node
/**
 * TÜİK Veri Portalı → D1 `bitkisel_tr_uretim_detay` ülke düzeyi bitkisel üretim yükleyici.
 *
 *   node scripts/tuik-bitkisel-yukle.mjs                  # indir → ayrıştır → doğrula → SQL üret (YAZMAZ)
 *   node scripts/tuik-bitkisel-yukle.mjs --yaz            # yukarıdakinin üstüne D1'e uygula
 *   node scripts/tuik-bitkisel-yukle.mjs --yil 2026       # başka bir hedef yıl
 *   node scripts/tuik-bitkisel-yukle.mjs --onbellek       # xls'leri yeniden indirme
 *   node scripts/tuik-bitkisel-yukle.mjs --sql /tmp/x.sql # SQL çıktı yolu
 *
 * ─── KAYNAK ─────────────────────────────────────────────────────────────────
 * Veri Portalı bir SPA; indirme bağlantıları sayfada değil, tema ağacı ucunda:
 *   GET /api/tr/data/statistical-themes      (X-Requested-With: XMLHttpRequest ŞART, yoksa 404)
 * Ağaçtaki `13.78.282` düğümü "Bitkisel Üretim ve Tarım Alanları"; altındaki
 * `istab-45_tN` yaprakları `url` alanında İMZALI ve SÜRESİ DOLAN bir indirme
 * bağlantısı taşıyor — bu yüzden her çalıştırmada ağaç yeniden çekiliyor.
 *
 * İki tuzak ölçülerek bulundu:
 *   1. `User-Agent` başlığı olmadan indirme 403.
 *   2. Ardışık indirmeler arasında ~5 sn hız sınırı var; ihlal edilirse XLS
 *      yerine "n saniye sonra tekrar indirebilirsiniz" HTML'i dönüyor. Sessizce
 *      bozuk dosya oluşmasın diye OLE2 imzası (d0cf11e0) kontrol ediliyor.
 *
 * ─── NEDEN OTOMATİK ALGILAMA YOK ────────────────────────────────────────────
 * 24 tablonun düzeni birbirini tutmuyor: kimi tabloda unsur (Ekilen alan /
 * Üretim / Verim) sayfada ALT ALTA bölümler halinde (45_t3), kiminde her ürün
 * için yan yana sütun üçlüsü (45_t17), kiminde tek sayfada iki ayrı ürün paneli
 * dikey diziliyor (45_t9). Genel bir başlık çözümleyicisi bu kadar farklılıkta
 * kırılgan olurdu; onun yerine her ürünün TAM YERİ (tablo, blok, sütun) aşağıda
 * açıkça yazılı ve her satırın yanında kaynak sütunun TÜİK başlığı duruyor.
 *
 * "Blok" = ardışık yıl satırlarından oluşan kesintisiz koşu. Ölçüldü, kararlı:
 * 45_t3 → #0 Ekilen alan, #1 Üretim, #2 Verim. 45_t9 → #0/#1 iki ürün paneli.
 *
 * ─── DOĞRULAMA: ASIL EMNİYET KEMERİ ─────────────────────────────────────────
 * Aşağıdaki konum haritası elle yazıldı; elle yazılan şey yanlış olabilir. Bu
 * yüzden hiçbir satır doğrulanmadan yazılmıyor: her ürün için ÖNCEKİ İKİ YILIN
 * TÜİK değeri D1'dekiyle karşılaştırılıyor ve en az biri birebir tutmazsa o
 * ürün ATLANIYOR, raporda gerekçesiyle listeleniyor. Sütun kayması, birim hatası
 * ve yanlış ad eşlemesi bu kapıdan geçemez.
 *
 * Tek yıl yetmiyor çünkü TÜİK yayınladığı yılı sonradan revize ediyor: D1'in
 * 2024'ü bültenin ilk (yuvarlak) rakamı, tablodaki ise kesinleşmiş hali olabilir
 * — Şeker Pancarı, Tütün ve Çay'da tam olarak bu oldu. Onlarda 2023 tutuyor.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import * as XLSX from 'xlsx';

const calistir = promisify(execFile);
const KOK = new URL('../workers/tarpovizyon-api/', import.meta.url).pathname;
const ONBELLEK_DIZIN = new URL('../.tuik-bitkisel-onbellek/', import.meta.url).pathname;
const TABLO = 'bitkisel_tr_uretim_detay';
const VERI_PORTALI = 'https://veriportali.tuik.gov.tr';
const TEMA_DUGUM = '13.78.282';                 // Tarım > Bitkisel Üretim İstatistikleri > Bitkisel Üretim ve Tarım Alanları
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const INDIRME_ARASI_MS = 6500;                  // ölçülen sınır 5 sn; pay bırakıldı
const TOLERANS = 0.0005;

const arg = process.argv.slice(2);
const deger = (a, v) => { const i = arg.indexOf(a); return i >= 0 ? arg[i + 1] : v; };
const HEDEF_YIL = Number(deger('--yil', 2025));
const YAZ = arg.includes('--yaz');
const ONBELLEK = arg.includes('--onbellek');
const SQL_YOL = deger('--sql', new URL(`../tuik-bitkisel-${HEDEF_YIL}.sql`, import.meta.url).pathname);

/* ══════════════════════════════════════════════════════════════════════════
   KONFİGÜRASYON — ürün → (tablo, blok, sütun)

   Yorumlar TÜİK dosyasındaki kaynak sütunun başlık metnidir: `satırCsütun:metin`.
   Bir eşleme değiştirilecekse yorumun gerçekten o ürünü tarif ettiği
   doğrulanmalı; sayısal doğrulama zaten çalışma anında yapılıyor.
   ══════════════════════════════════════════════════════════════════════════ */

/** Kesitli tablolarda hangi bloğun hangi unsur olduğu — ayrıştırıcı bunu doğruluyor. */
const BLOK_ETIKET = {
  '45_t3': [null, /^Üretim \(Ton\)/, null],                        // Tahıllar
  '45_t4': [null, /^Üretim \(Ton\)/, null],                        // Yağlı tohumlar
  '45_t5': [null, /^Üretim \(Ton\)/, null],                        // Kuru baklagiller
  '45_t6': [null, /^Üretim \(Ton\)/, null],                        // Tekstilde kullanılan bitkiler
  '45_t7': [null, /^Üretim \(Ton\)/, null],                        // Parfümeri/eczacılık bitkileri, yem bitkisi tohumu
  '45_t8': [null, /^Üretim \(Ton\)/, null],                        // Diğer bitkisel ürünler; kök ve yumrular
  '45_t33': [null, /^Üretim \(Adet\)/],                            // Süs bitkileri
  // Aşağıdakilerde unsur bölüm başlığında değil, sütun başlığında — etiket aranmıyor.
  '45_t9': [null, null], '45_t10': [null], '45_t12': [null],
  '45_t13': [null], '45_t20': [null], '45_t21': [null], '45_t22': [null],
};

/** 2025'te Üretim'i eksik olup TÜİK tablolarında ürün düzeyinde bulunan 59 ürün. */
const URUNLER = [
  { d1: 'Arpa (Biralık)', tablo: '45_t3', blok: 1, sutun: 7 },                       // 2c6:Arpa - Barley / 3c7:Biralık / 4c7:For beer (1)
  { d1: 'Arpa (Diğer)', tablo: '45_t3', blok: 1, sutun: 8 },                         // 2c6:Arpa - Barley / 3c8:Diğer / 4c8:Other (1)
  { d1: 'Arpa (Yeşilot)', tablo: '45_t9', blok: 0, sutun: 31 },                      // 2c29:Arpa(yeşilot)- Barley (Green) / 5c31:Yeşil ot
  { d1: 'Ayçiçeği Tohumu (Çerezlik)', tablo: '45_t4', blok: 1, sutun: 6 },           // 2c4:Ayçiçeği - Sunflower / 3c6:Çerezlik
  { d1: 'Ayçiçeği Tohumu (Yağlık)', tablo: '45_t4', blok: 1, sutun: 5 },             // 2c4:Ayçiçeği - Sunflower / 3c5:Yağlık
  { d1: 'Barbunya, Taze', tablo: '45_t10', blok: 0, sutun: 32 },                     // 3c32:Barbunya / 4c32:fasulye (Taze)
  { d1: 'Başka Yerde Sınıflandırılmamış Diğer Yem Bitkileri (Tahıl Samanı Ve Kabuklar Hariç)', tablo: '45_t9', blok: 1, sutun: 43 }, // 44c41:Diğer yem bitkileri / 47c43:Yeşil ot
  { d1: 'Bezelye (Yemlik)', tablo: '45_t9', blok: 0, sutun: 39 },                    // 2c37:Bezelye(yemlik) (yeşilot) / 5c39:Yeşil ot
  { d1: 'Biber, Kuru, İşlenmemiş', tablo: '45_t20', blok: 0, sutun: 2 },             // 2c1:Kırmızı biber - Red pepper / 3c2:Üretim
  { d1: 'Buğday (Hasıl/Yeşilot)', tablo: '45_t9', blok: 0, sutun: 27 },              // 2c25:Buğday(yeşilot) - Wheat (Green) / 5c27:Yeşil ot
  { d1: 'Buğday, Durum Buğdayı Hariç', tablo: '45_t3', blok: 1, sutun: 4 },          // 2c2:Buğday - Wheat / 3c4:Diğer / 4c4:Other (1)
  { d1: 'Burçak (Yeşilot)', tablo: '45_t9', blok: 0, sutun: 8 },                     // 2c6:Burçak - Wild vetches / 5c8:Yeşil ot
  { d1: 'Çavdar (Yeşilot)', tablo: '45_t9', blok: 0, sutun: 35 },                    // 2c33:Çavdar(yeşilot) - Rye (Green) / 5c35:Yeşil ot
  { d1: 'Çay Yaprakları', tablo: '45_t22', blok: 0, sutun: 3 },                      // 2c3:Yaş çay / 3c3:yaprağı / 4c3:üretimi / 5c3:(Ton)
  { d1: 'Çayır Otu (Yeşilot)', tablo: '45_t9', blok: 1, sutun: 17 },                 // 44c16:Çayır otu - Meadow grass / 47c17:Yeşil ot
  { d1: 'Çiçek Soğanları', tablo: '45_t33', blok: 1, sutun: 27 },                    // 2c26:Çiçek soğanları ve diğer süs bitkileri / 4c27:Çiçek soğanları
  { d1: 'Çim Tohumu', tablo: '45_t7', blok: 1, sutun: 16 },                          // 4c16:Çim tohumu / 5c16:Grass seed (4)
  { d1: 'Dış Mekan Süs Bitkileri', tablo: '45_t33', blok: 1, sutun: 28 },            // 4c28:Dış mekan / 5c28:süs bitkileri
  { d1: 'Diğer Kesme Çiçek Ve Çiçek Koncaları', tablo: '45_t33', blok: 1, sutun: 24 },// 4c24:Diğer kesme / 5c24:çiçekler
  { d1: 'Domates (Salçalık)', tablo: '45_t10', blok: 0, sutun: 3 },                  // 2c1:Domates - Tomatoes / 4c3:Salçalık
  { d1: 'Domates (Sofralık)', tablo: '45_t10', blok: 0, sutun: 2 },                  // 2c1:Domates - Tomatoes / 4c2:Sofralık
  { d1: 'Durum Buğdayı', tablo: '45_t3', blok: 1, sutun: 3 },                        // 2c2:Buğday - Wheat / 3c3:Durum / 4c3:Durum (1)
  { d1: 'Glayöl, Kesme', tablo: '45_t33', blok: 1, sutun: 6 },                       // 3c3:Kesme çiçekler / 4c6:Glayöl / 5c6:(Gladiol)
  { d1: 'Gypsohilla, Kesme', tablo: '45_t33', blok: 1, sutun: 8 },                   // 6c8:Gypsohilla / 7c8:Gypsophilla
  { d1: 'Hayvan Pancarı', tablo: '45_t9', blok: 0, sutun: 17 },                      // 2c16:Hayvan Pancarı - Beets for fodder / 4c17:Üretim
  { d1: 'Hıyar (Sofralık)', tablo: '45_t10', blok: 0, sutun: 6 },                    // 2c5:Hıyar - Cucumbers / 4c6:Sofralık
  { d1: 'Hıyar (Turşuluk)', tablo: '45_t10', blok: 0, sutun: 7 },                    // 2c5:Hıyar - Cucumbers / 4c7:Turşuluk
  { d1: 'İç Mekan Süs Bitkileri (Oda Bitkileri)', tablo: '45_t33', blok: 1, sutun: 26 }, // 4c26:İç mekan / 5c26:süs bitkileri
  { d1: 'İtalyan Çimi (Yemlik)', tablo: '45_t9', blok: 1, sutun: 39 },               // 44c37:İtalyan çimi - İtalian ryegrass / 47c39:Yeşil ot
  { d1: 'Kapari, İşlenmemiş', tablo: '45_t20', blok: 0, sutun: 26 },                 // 2c25:Kapari (Gebere Otu) Capers / 3c26:Üretim
  { d1: 'Kara Buğday', tablo: '45_t3', blok: 1, sutun: 19 },                         // 3c19:Kara buğday / 4c19:Buckwheat (2)
  { d1: 'Korunga (Yeşilot)', tablo: '45_t9', blok: 0, sutun: 3 },                    // 2c1:Korunga - Sainfoin / 5c3:Yeşil ot
  { d1: 'Korunga Tohumu', tablo: '45_t7', blok: 1, sutun: 9 },                       // 3c9:Korunga / 4c9:(tohum) / 5c9:Sainfoin (seed)
  { d1: 'Marul (İceberg)', tablo: '45_t12', blok: 0, sutun: 8 },                     // 3c6:Marul - Lettuce / 5c8:Aysberg / 6c8:Iceberg (1)
  { d1: 'Mısır', tablo: '45_t3', blok: 1, sutun: 9 },                                // 3c9:Mısır / 4c9:Maize
  { d1: 'Mısır (Hasıl)', tablo: '45_t9', blok: 0, sutun: 13 },                       // 2c11:Mısır - Maize / 5c13:Hasıl / 6c13:Silage maize
  { d1: 'Mısır (Slaj)', tablo: '45_t9', blok: 0, sutun: 14 },                        // 2c11:Mısır - Maize / 5c14:Silajlık / 6c14:For silage
  { d1: 'Mürdümük', tablo: '45_t5', blok: 1, sutun: 12 },                            // 2c12:Mürdümük / 3c12:(culbant) / 4c12:Grass pea
  { d1: 'Mürdümük (Yeşilot)', tablo: '45_t9', blok: 1, sutun: 35 },                  // 44c33:Mürdümük(yeşilot) - Grass pea (Green) / 47c35:Yeşil ot
  { d1: 'Nergis, Kesme', tablo: '45_t33', blok: 1, sutun: 16 },                      // 3c16:Kesme çiçekler / 6c16:Nergiz / 7c16:Daffodil
  { d1: 'Oğul Otu (Melisa)', tablo: '45_t7', blok: 1, sutun: 10 },                   // 3c10:Oğulotu / 4c10:(melissa) / 5c10:Melissa (3)
  { d1: 'Pamuk Çekirdeği (Çiğit)', tablo: '45_t4', blok: 1, sutun: 10 },             // 3c10:Çiğit / 4c10:Cotton seed (2)
  { d1: 'Pamuk, Çırçırlanmış (Lifli)', tablo: '45_t6', blok: 1, sutun: 3 },          // 2c3:Pamuk (lif) / 3c3:Cotton (lint)
  { d1: 'Salep', tablo: '45_t8', blok: 1, sutun: 9 },                                // 2c9:Salep bitkisi / 3c9:Salep plant (4)
  { d1: 'Sofralık Zeytinler', tablo: '45_t21', blok: 0, sutun: 6 },                  // 3c5:Üretim (Ton) / 5c6:Sofralık / 7c6:(Tables)
  { d1: 'Sorgum (Yeşilot)', tablo: '45_t9', blok: 1, sutun: 27 },                    // 44c25:Sorgum(yeşilot) - Sorghum (Green) / 47c27:Yeşil ot
  { d1: 'Sudan Otu (Yemlik)', tablo: '45_t9', blok: 0, sutun: 43 },                  // 2c41:Sudan Otu - Sudan grass / 5c43:Yeşil ot
  { d1: 'Şaraplık Üzümler', tablo: '45_t13', blok: 0, sutun: 6 },                    // 2c3:Üretim (Ton) / 5c6:Şaraplık / 6c6:For wine use (1)
  { d1: 'Şeker Pancarı', tablo: '45_t8', blok: 1, sutun: 3 },                        // 2c3:Şeker pancarı / 3c3:Sugar beets
  { d1: 'Şeker Pancarı Tohumları', tablo: '45_t7', blok: 1, sutun: 15 },             // 3c15:Elit (şeker / 4c15:pancarı tohumu) / 5c15:Sugar Beet Seed
  { d1: 'Triticale', tablo: '45_t3', blok: 1, sutun: 17 },                           // 3c17:Tritikale / 4c17:Triticale (1)
  { d1: 'Triticale (Yeşilot)', tablo: '45_t9', blok: 1, sutun: 31 },                 // 44c29:Tritikale(yeşilot) - Triticale (Green) / 47c31:Yeşil ot
  { d1: 'Tütün, İşlenmemiş', tablo: '45_t8', blok: 1, sutun: 1 },                    // 2c1:Tütün / 3c1:Tobacco
  { d1: 'Üçgül (Yeşilot)', tablo: '45_t9', blok: 1, sutun: 8 },                      // 44c6:Üçgül - Clover / 47c8:Yeşil ot
  { d1: 'Yağlık Zeytinler (Zeytinyağı Üretimi İçin)', tablo: '45_t21', blok: 0, sutun: 7 }, // 3c5:Üretim (Ton) / 5c7:Yağlık / 7c7:(For oil)
  { d1: 'Yem Şalgamı', tablo: '45_t9', blok: 0, sutun: 23 },                         // 2c21:Yem şalgamı - Turnip (for fodder) / 4c23:Üretim
  { d1: 'Yerfıstığı, Kabuklu', tablo: '45_t4', blok: 1, sutun: 3 },                  // 3c3:Yerfıstığı / 4c3:Groundnut
  { d1: 'Yonca (Yeşilot)', tablo: '45_t9', blok: 1, sutun: 13 },                     // 44c11:Yonca - Alfalfa / 47c13:Yeşil ot
  { d1: 'Yulaf (Yeşilot)', tablo: '45_t9', blok: 1, sutun: 23 },                     // 44c21:Yulaf(yeşilot) - Oats (Green) / 47c23:Yeşil ot
];

/**
 * D1'de var olup TÜİK tablolarında AYRI SÜTUNU OLMAYAN ürünler.
 * Bunlar eksik değil, "bu kaynakta yok": tablo sadece toplamı yayımlıyor.
 * Her satırın yanında toplamın hangi sütunda olduğu ve toplamın D1 kırılımının
 * toplamına eşit olduğu ölçümü var. Kırılım yalnızca MEDAS'ta.
 */
const TOPLU_ATLANAN = [
  // 45_t16 c3 "Elma" toplamı = 5 çeşidin D1 toplamı (2024: 4.420.185)
  'Elma (Amasya)', 'Elma (Golden)', 'Elma (Granny Smith)', 'Elma (Starking)', 'Diğer Elmalar',
  // 45_t15 c7 "Portakal" toplamı (2024: 1.610.000)
  'Portakal (Washington)', 'Portakal (Yafa)', 'Diğer Portakallar',
  // 45_t15 c11 "Mandalina" toplamı (2024: 1.988.000)
  'Mandalina (Satsuma)', 'Mandalina (King)', 'Mandalina (Klemantin)', 'Mandalina (Diğer)',
  // 45_t13 c4 "Sofralık" (2024: 1.825.915) ve c5 "Kurutmalık" (2024: 1.261.347) toplamları
  'Sofralık Üzüm, Çekirdekli', 'Sofralık Üzüm, Çekirdeksiz',
  'Kurutmalık Üzüm, Çekirdekli', 'Kurutmalık Üzüm, Çekirdeksiz',
  // 45_t5 c2 "Bakla (toplam)" (2024: 6.580)
  'Bakla, Kuru (Yemlik)', 'Bakla, Kuru (İnsan Tüketimi İçin)',
  // 45_t9 blok1 c3 "Fiğ" yeşil ot toplamı (2024: 3.262.338)
  'Fiğ (Adi) (Yeşil Ot)', 'Fiğ (Macar) (Yeşil Ot)', 'Fiğ (Diğer) (Yeşil Ot)',
  // 45_t7 blok1 c6 "Fiğ (dane)" toplamı (2024: 31.000)
  'Fiğ (Adi) Tohumu', 'Fiğ (Macar) Tohumu', 'Fiğ (Diğer) Tohumu',
];

/**
 * Verim tabanı — D1'in tamamında ölçülen öncelik sırası.
 * Verim = Üretim × 1000 / taban.  (2025'teki mevcut 65 Verim satırının 65'i de
 * bu kuralı birebir doğruluyor; sapma yok.)
 */
const VERIM_TABANI = ['Hasat Edilen Alan', 'Meyve Veren Yaşta Ağaç Sayısı', 'Toplu Meyveliklerin Alanı'];

/* ══════════════════════════════════════════════════════════════════════════
   İNDİRME
   ══════════════════════════════════════════════════════════════════════════ */

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

function getir(url, baslikEk = []) {
  return execFileSync('curl', ['-sL', '--max-time', '120', '-H', `User-Agent: ${UA}`,
    '-H', `Referer: ${VERI_PORTALI}/tr/statistical-themes`, ...baslikEk, url], { maxBuffer: 4e8 });
}

/** Tema ağacından `13.78.282` altındaki tüm istab yapraklarını (taze imzalı url ile) çıkarır. */
function tabloListesi() {
  const ham = getir(`${VERI_PORTALI}/api/tr/data/statistical-themes`,
    ['-H', 'X-Requested-With: XMLHttpRequest', '-H', 'Accept: application/json']).toString('utf8');
  let veri;
  try { veri = JSON.parse(ham).data; } catch { throw new Error('tema ağacı JSON değil — uç değişmiş olabilir'); }
  let kok = null;
  (function ara(ns) { for (const n of ns || []) { if (n.id === TEMA_DUGUM) { kok = n; return; } ara(n.children); } })(veri);
  if (!kok) throw new Error(`tema ağacında ${TEMA_DUGUM} düğümü yok`);
  const out = new Map();
  (function ara(ns) {
    for (const n of ns || []) {
      if (/istab-/.test(n.id || '') && n.url) out.set(n.id.split('istab-')[1], { ad: n.name, url: n.url });
      ara(n.children);
    }
  })([kok]);
  return out;
}

/** Gerekli tabloları indirir; hız sınırına takılan indirmeyi yeniden dener. */
async function tablolariIndir(gerekli) {
  mkdirSync(ONBELLEK_DIZIN, { recursive: true });
  const yollar = {};
  let liste = null;
  for (const id of gerekli) {
    const yol = join(ONBELLEK_DIZIN, `${id}.xls`);
    yollar[id] = yol;
    if (ONBELLEK && existsSync(yol) && statSync(yol).size > 5000) continue;
    liste ??= tabloListesi();
    const t = liste.get(id);
    if (!t) throw new Error(`tema ağacında ${id} tablosu bulunamadı`);
    let tamam = false;
    for (let deneme = 1; deneme <= 4 && !tamam; deneme++) {
      const b = getir(VERI_PORTALI + t.url);
      // OLE2 imzası: hız sınırına takılınca XLS değil HTML dönüyor, sessizce yutulmasın.
      if (b.slice(0, 4).toString('hex') === 'd0cf11e0') { writeFileSync(yol, b); tamam = true; break; }
      process.stdout.write(`   ${id}: hız sınırı, ${deneme}. deneme\n`);
      await bekle(INDIRME_ARASI_MS + 2000);
    }
    if (!tamam) throw new Error(`${id} indirilemedi (hız sınırı aşılamadı)`);
    process.stdout.write(`   ${id.padEnd(9)} ${t.ad.slice(0, 60)}\n`);
    await bekle(INDIRME_ARASI_MS);
  }
  return yollar;
}

/* ══════════════════════════════════════════════════════════════════════════
   AYRIŞTIRMA
   ══════════════════════════════════════════════════════════════════════════ */

const yilMi = (v) => /^(19|20)\d{2}\s*(\(?\*?\)?)?$/.test(String(v ?? '').replace(/\s+/g, ' ').trim());
const yilNo = (v) => Number(String(v).replace(/\D/g, '').slice(0, 4));

/** TÜİK hücresi → sayı. "-" yok demek; "(r)"/"*" revizyon/geçicilik işareti. */
function sayi(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/[\s ]/g, '').replace(/\(r\)|\(\*\)|\*/g, '');
  if (!s || s === '-' || s === '..' || s === ':') return null;
  const n = Number(s.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * Dosyayı bloklara ayırır. Blok = kesintisiz yıl satırı koşusu; araya giren
 * bölüm başlığı ("Üretim (Ton)") veya dipnot bloğu bitirir.
 */
function tabloOku(yol) {
  const wb = XLSX.read(readFileSync(yol), { type: 'buffer' });
  const satirlar = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, blankrows: true, defval: null });
  const bloklar = []; let cur = null;
  for (let i = 0; i < satirlar.length; i++) {
    if (yilMi(satirlar[i]?.[0])) {
      if (!cur) { cur = { bas: i, son: i, yil: {}, etiket: '' }; bloklar.push(cur); }
      cur.son = i; cur.yil[yilNo(satirlar[i][0])] = i;
    } else if (cur && String(satirlar[i]?.[0] ?? '').trim()) {
      cur = null;
    }
  }
  // Blok etiketi = bloğun hemen üstündeki, 0. sütunda metin taşıyan son satır.
  bloklar.forEach((b, k) => {
    const ust = k === 0 ? 0 : bloklar[k - 1].son + 1;
    for (let i = b.bas - 1; i >= ust; i--) {
      const v = String(satirlar[i]?.[0] ?? '').replace(/\s+/g, ' ').trim();
      if (v && !/^(Yıl|Year)$/i.test(v)) { b.etiket = v; break; }
    }
  });
  return { satirlar, bloklar };
}

/** Bir ürün konfigürasyonundan istenen yılın ham değerini okur. */
function hucre(T, k, yil) {
  const b = T.bloklar[k.blok];
  if (!b) return null;
  const s = b.yil[yil];
  if (s === undefined) return null;
  return sayi((T.satirlar[s] || [])[k.sutun]);
}

/* ══════════════════════════════════════════════════════════════════════════
   D1
   ══════════════════════════════════════════════════════════════════════════ */

async function d1(sql) {
  const { stdout } = await calistir('npx',
    ['wrangler', 'd1', 'execute', 'tarpovizyon-basic', '--remote', '--json', '--command', sql],
    { cwd: KOK, maxBuffer: 4e8 });
  return JSON.parse(stdout.slice(stdout.indexOf('[')))[0].results ?? [];
}

/* ══════════════════════════════════════════════════════════════════════════
   ANA AKIŞ
   ══════════════════════════════════════════════════════════════════════════ */

const ONCEKI = [HEDEF_YIL - 1, HEDEF_YIL - 2];
console.log(`TÜİK Veri Portalı → ${TABLO}  |  hedef yıl: ${HEDEF_YIL}\n`);

console.log('1) tablolar indiriliyor');
const gerekli = [...new Set(URUNLER.map((u) => u.tablo))].sort();
const yollar = await tablolariIndir(gerekli);

console.log('\n2) ayrıştırılıyor');
const T = {};
for (const id of gerekli) {
  T[id] = tabloOku(yollar[id]);
  const bekleniyor = BLOK_ETIKET[id];
  if (bekleniyor && bekleniyor.length !== T[id].bloklar.length) {
    throw new Error(`${id}: ${bekleniyor.length} blok bekleniyordu, ${T[id].bloklar.length} bulundu — tablo düzeni değişmiş, konfigürasyon gözden geçirilmeli`);
  }
  (bekleniyor ?? []).forEach((re, k) => {
    if (re && !re.test(T[id].bloklar[k].etiket)) {
      throw new Error(`${id} blok#${k}: "${re}" bekleniyordu, etiket "${T[id].bloklar[k].etiket}" — konfigürasyon gözden geçirilmeli`);
    }
  });
  console.log(`   ${id.padEnd(9)} ${T[id].bloklar.length} blok  [${T[id].bloklar.map((b) => b.etiket.slice(0, 22) || '—').join(' | ')}]`);
}

console.log('\n3) D1 okunuyor');
const d1Satir = await d1(`SELECT urun, unsur, yil, deger FROM ${TABLO}
  WHERE yil IN (${HEDEF_YIL}, ${ONCEKI.join(', ')})`);
const V = new Map();
for (const r of d1Satir) V.set(`${r.urun}|${r.unsur}|${r.yil}`, Number(r.deger));
console.log(`   ${d1Satir.length} satır (${[HEDEF_YIL, ...ONCEKI].join(', ')})`);

console.log(`\n4) ${ONCEKI.join(' / ')} ile doğrulanıyor`);
const kabul = [], redDogrulama = [], zatenVar = [], degerYok = [];
for (const k of URUNLER) {
  if (V.has(`${k.d1}|Üretim|${HEDEF_YIL}`)) { zatenVar.push(k.d1); continue; }

  const hedef = hucre(T[k.tablo], k, HEDEF_YIL);
  if (hedef === null || hedef <= 0) { degerYok.push(k.d1); continue; }

  // Konumun doğruluğu geçmiş yıllarla kanıtlanır. En az biri birebir tutmalı.
  const kanit = [];
  for (const y of ONCEKI) {
    const tuik = hucre(T[k.tablo], k, y);
    const bizim = V.get(`${k.d1}|Üretim|${y}`);
    if (tuik === null || !Number.isFinite(bizim)) { kanit.push({ y, durum: 'yok' }); continue; }
    const fark = Math.abs(tuik - bizim) / Math.max(Math.abs(bizim), 1);
    kanit.push({ y, durum: fark <= TOLERANS ? 'tutuyor' : 'tutmuyor', tuik, bizim, fark });
  }
  const gecti = kanit.filter((x) => x.durum === 'tutuyor');
  if (!gecti.length) {
    redDogrulama.push({ ...k, kanit });
    continue;
  }
  kabul.push({ ...k, deger: hedef, kanitYil: gecti.map((x) => x.y) });
}

console.log(`   ✓ doğrulandı              : ${kabul.length}`);
console.log(`   • ${HEDEF_YIL} zaten dolu         : ${zatenVar.length}`);
console.log(`   ✗ doğrulama başarısız     : ${redDogrulama.length}`);
console.log(`   ✗ ${HEDEF_YIL} değeri boş        : ${degerYok.length}`);
if (redDogrulama.length) {
  console.log('\n   DOĞRULANAMADIĞI İÇİN ATLANANLAR:');
  for (const r of redDogrulama) {
    const a = r.kanit.map((x) => x.durum === 'tutmuyor'
      ? `${x.y}: TÜİK ${Math.round(x.tuik).toLocaleString('tr-TR')} ≠ D1 ${Math.round(x.bizim).toLocaleString('tr-TR')}`
      : `${x.y}: karşılaştırılamadı`).join(' | ');
    console.log(`     ${r.d1.slice(0, 42).padEnd(44)} ${r.tablo}#${r.blok}c${r.sutun}  ${a}`);
  }
}

console.log('\n5) Verim hesaplanıyor');
const verim = [], verimTabanYok = [];
for (const k of kabul) {
  if (V.has(`${k.d1}|Verim|${HEDEF_YIL}`)) continue;
  let taban = null;
  for (const u of VERIM_TABANI) {
    const v = V.get(`${k.d1}|${u}|${HEDEF_YIL}`);
    if (Number.isFinite(v) && v > 0) { taban = { unsur: u, deger: v }; break; }
  }
  if (!taban) { verimTabanYok.push(k.d1); continue; }
  verim.push({ d1: k.d1, deger: k.deger * 1000 / taban.deger, taban: taban.unsur });
}
console.log(`   ✓ hesaplanan Verim satırı : ${verim.length}`);
console.log(`   • ${HEDEF_YIL} tabanı olmayan     : ${verimTabanYok.length}${verimTabanYok.length ? ' → ' + verimTabanYok.join(', ') : ''}`);

console.log('\n6) SQL üretiliyor');
const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
const ins = (urun, unsur, d) => `INSERT INTO ${TABLO} (urun, unsur, yil, deger) VALUES (${q(urun)}, ${q(unsur)}, ${HEDEF_YIL}, ${d});`;
const sql = [
  `-- TÜİK Veri Portalı → ${TABLO}, ${HEDEF_YIL}`,
  `-- üretim: ${new Date().toISOString()}  |  kaynak: ${VERI_PORTALI} tema ${TEMA_DUGUM}`,
  `-- ${kabul.length} Üretim + ${verim.length} Verim satırı.`,
  `-- Her satırın konumu ${ONCEKI.join('/')} değerleri D1 ile birebir tutularak doğrulandı.`,
  '',
  ...kabul.map((k) => `${ins(k.d1, 'Üretim', k.deger)}  -- ${k.tablo}#${k.blok}c${k.sutun}, kanıt: ${k.kanitYil.join('+')}`),
  '',
  ...verim.map((v) => `${ins(v.d1, 'Verim', Number(v.deger.toFixed(6)))}  -- Üretim×1000/${v.taban}`),
  '',
  '-- Önbellek damgası: bunu atlarsan sayfalar ~1 saat eski veriyi gösterir.',
  `INSERT INTO veri_damga (tablo, damga) VALUES ('${TABLO}', strftime('%s','now')*1000)`,
  '  ON CONFLICT(tablo) DO UPDATE SET damga=excluded.damga;',
  '',
].join('\n');
writeFileSync(SQL_YOL, sql);
console.log(`   ${SQL_YOL}  (${kabul.length} Üretim + ${verim.length} Verim + damga)`);

console.log('\n7) bu kaynakta ürün kırılımı olmayanlar (TÜİK sadece toplamı yayımlıyor)');
for (const u of TOPLU_ATLANAN) console.log('   ·', u);
console.log(`   toplam ${TOPLU_ATLANAN.length} ürün — kırılım yalnızca MEDAS'ta.`);

if (!YAZ) {
  console.log('\n(--yaz verilmedi; D1\'e YAZILMADI. SQL dosyasını inceleyip --yaz ile tekrar çalıştır.)');
  process.exit(0);
}
if (!kabul.length && !verim.length) { console.log('\nYazılacak satır yok.'); process.exit(0); }

console.log('\n8) D1\'e uygulanıyor');
await calistir('npx', ['wrangler', 'd1', 'execute', 'tarpovizyon-basic', '--remote', '--json', '--file', SQL_YOL],
  { cwd: KOK, maxBuffer: 4e8 });
const [sonra] = await d1(`SELECT COUNT(DISTINCT urun) n FROM ${TABLO} WHERE unsur='Üretim' AND yil=${HEDEF_YIL}`);
console.log(`   ✓ uygulandı — ${HEDEF_YIL} artık ${sonra.n} üründe Üretim taşıyor`);
