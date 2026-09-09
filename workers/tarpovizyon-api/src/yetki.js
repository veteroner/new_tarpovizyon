/**
 * Veri uçlarında yetki — asıl koruma burası.
 *
 * ─── NEDEN İSTEMCİ KAPISI YETMİYOR ──────────────────────────────────────────
 * `src/auth/ProKapisi.tsx` ödemeyen kullanıcıya doğru ekranı gösteriyor ama
 * hiçbir şeyi korumuyor: paketi okuyan biri bileşeni atlayabilir, ya da API'yi
 * doğrudan çağırabilir. Uçlar açık kaldığı sürece Pro içeriği herkese açık.
 *
 * ─── LİSTE NEDEN ÖLÇÜMLE ÜRETİLMEDİ ─────────────────────────────────────────
 * "Yalnız Pro sayfalarının okuduğu uçlar" diye bir tarama yapıldı ve
 * GÜVENİLMEZ çıktı: `piyasa` ve `ai` uçları şablon dizgiyle çağrıldığı için
 * (`${API_BASE}/api/piyasa`) taramaya takılmadı ve "kullanılmıyor" göründü.
 * Aynı kör nokta bir Basic ucunu "Pro" diye sınıflandırsaydı, Basic sessizce
 * bozulurdu.
 *
 * Bu yüzden liste ELLE ve gerekçeli. Güvenlik ağı ise bir test:
 * `scripts/yetki-denetimi.mjs` Basic ve mobil kaynağını tarayıp korumalı bir
 * uç kullanılıyor mu diye bakıyor; çakışırsa çıkış kodu 1.
 *
 * ─── RÖNTGEN NEDEN LİSTEDE YOK ──────────────────────────────────────────────
 * Pro'nun en ayırt edici parçası Röntgen ama girdilerinin bir bölümünü
 * (`makro/tufe-aylik`, `makro/gfe-alt-grup-aylik`) Basic de okuyor. Yani
 * Röntgen'in değeri VERİDE değil HESAPTA; uç kapatarak korunamaz. Korumak
 * için hesabın sunucuya taşınıp sonucun tek bir Pro ucundan verilmesi gerek —
 * ayrı ve büyük bir iş, bu commit'in kapsamı değil. Olduğundan fazlasını
 * koruduğumuzu sanmamak için yazılı.
 */

import { oturumCoz, proMu } from './auth.js';

/**
 * Pro aboneliği gerektiren uçlar.
 *
 * Ortak ilke: Basic'in ya da mobil uygulamanın okuduğu HİÇBİR uç burada
 * olamaz — o sürümler ücretsiz kalıyor ve bir ucu kapatmak onları bozar.
 */
export const KORUMALI_UCLAR = new Set([
  /* Dünya verileri — Basic'te karşılığı yok, dünya sayfalarının tamamı bunlara
     dayanıyor (27 rota). */
  'fao/balans',
  'fao/input-gubre-ticari',
  'fao/input-pestisit-use',
  'fao/land-cover',
  'fao/land-use',
  'fao/livestock-primary',
  'fao/me-indicator',
  'fao/nufus',
  'fao/nufus-istihdam-tarim',
  'fao/tahmin-sonuclari',
  'fao/uretim-bitkisel-birincil',
  'fao/uretim-bitkisel-islenmis',
  'fao/uretim-hayvansal-birincil',
  'fao/uretim-hayvansal-canlihayvan',
  'fao/uretim-hayvansal-islenmis',
  'dunya-bankasi/makro',

  /* Ürün dengesi ve çapraz analiz — Pro'ya özel sayfalar. */
  'tuik/urundenge',

  /* TÜİK ayrıntı serileri: Basic özet tablolardan okuyor, bunlar kırılımlı. */
  'tuik/bitkisel-uretim',
  'tuik/fiyatendex',
  'tuik/gsyh-a21',
  'tuik/hayvancilik-canlihayvan',
  'tuik/hayvancilik-hayvansaluretim',
  'tuik/hayvancilik-kumeshayvanciligi',
  'tuik/kisibasigelir',
  'tuik/sutvesuturunleri',
  'tuik/ticaret-bitkisel',
  'tuik/ticaret-hayvansal',
  /* `bitkisel/bulten-grup` BİLEREK LİSTEDE DEĞİL: denetim betiği onu Basic'in
     bitkisel kartlarında kullanırken buldu (useBitkiselKartlar.ts). Kapatmak
     ücretsiz sürümü bozardı. */
  'bitkisel/uretim-detay',
  'dis-ticaret/kirmizi-et-hayvan-ithalati',
  'kirmizi-et/hayvan-sayilari-yillik',
  'il/arici-sayisi-yillik',
  'tr/kisi-basi-uretim-tuketim',

  /* Maliyet–fiyat serileri: üreticinin kâr hesabı, ürünün en ticari parçası. */
  'kanatli/maliyet-fiyat',
  'yumurta/maliyet-fiyat',
  'oner/canli-hayvan-et-ithalati',
  'oner/dunya-karkas-fiyatlari',
  'oner/dunya-sut-fiyatlari',
]);

/**
 * Sunucu tarafı para duvarı anahtarı.
 *
 * İstemcideki `PARA_DUVARI_AKTIF` ile AYRI tutuluyor ve ayrı açılıyor. Sebep:
 * ikisi tek anahtara bağlansaydı, istemci derlemesi yayınlanana kadar geçen
 * sürede sunucu Pro verisini kesip yayındaki sayfaları boş bırakırdı. Doğru
 * sıra sunucuyu ÖNCE hazırlayıp SONRA açmak.
 *
 * `wrangler secret put PARA_DUVARI` ile "1" verilene kadar kapalı.
 */
export const duvarAcik = (env) => String(env.PARA_DUVARI ?? '') === '1';

/**
 * İstek bu uca girebilir mi.
 *
 * `null` → izin var. Aksi halde döndürülecek yanıt gövdesi ve durum kodu.
 *
 * 402 (Payment Required) kullanılıyor, 401/403 değil: kullanıcı kimliğini
 * doğrulamış olabilir ve yine de giremez — eksik olan kimlik değil abonelik.
 * İstemci bu ayrımı görüp doğru ekranı (giriş mi, yükseltme mi) gösterebiliyor.
 */
export async function yetkiDenetimi(request, env, slug) {
  if (!duvarAcik(env)) return null;
  if (!KORUMALI_UCLAR.has(slug)) return null;

  const oturum = await oturumCoz(request, env);
  if (!oturum) {
    return { status: 401, body: { hata: 'giris_gerekli', uc: slug } };
  }
  if (!await proMu(env, oturum.kullaniciId)) {
    return { status: 402, body: { hata: 'abonelik_gerekli', uc: slug } };
  }
  return null;
}
