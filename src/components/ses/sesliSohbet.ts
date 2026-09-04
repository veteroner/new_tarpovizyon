import { dinlemeyeBasla, dinlemeyiDurdur } from './dinleme';
import {
  konus, durdur as konusmayiDurdur, konusmaDinle, sesKilidiniAc, sonOkumaSesliMiydi,
} from './konusma';

/**
 * Eller serbest sesli sohbet — dinle, düşün, cevapla, yeniden dinle.
 *
 * ─── NEDEN KATI SIRA ────────────────────────────────────────────────────────
 * Asistan konuşurken mikrofon AÇIK KALAMAZ: hoparlörden çıkan sesi kendi
 * mikrofonundan duyup yazıya döker ve kendi cevabına cevap vermeye başlar.
 * Bu yüzden aşamalar örtüşmüyor — mikrofon kapanmadan konuşma başlamıyor,
 * konuşma bitmeden mikrofon açılmıyor.
 *
 * ─── NEDEN DURUM MAKİNESİ ───────────────────────────────────────────────────
 * Dört aşama var ve her birinin iptal davranışı farklı: dinlerken mikrofonu,
 * düşünürken bekleyen isteği, konuşurken sentezleyiciyi durdurmak gerekiyor.
 * Tek bir "açık mı" bayrağıyla yönetmek, yarıda kesilen bir sohbetin arkada
 * çalışmaya devam etmesi demekti.
 */

export type Asama =
  | 'kapali'
  /** Mikrofon açık, kullanıcı konuşuyor. */
  | 'dinliyor'
  /** Soru alındı, cevap hazırlanıyor. */
  | 'dusunuyor'
  /** Cevap okunuyor. */
  | 'konusuyor'
  /**
   * Bir şey ters gitti ve kullanıcının görmesi gerekiyor.
   *
   * Ayrı bir aşama olması şart: hatayı 'kapali' ile bildirmek ekranı
   * gizliyor ve mesaj hiç görünmüyordu.
   */
  | 'hata';

export type SohbetDurumu = {
  asama: Asama;
  /** Kullanıcının söylediği (ara sonuçlar dahil). */
  soru: string;
  /** Asistanın son cevabı. */
  cevap: string;
  /** Gösterilecek hata; boşsa yok. */
  hata: string;
};

type Dinleyici = (d: SohbetDurumu) => void;

let durum: SohbetDurumu = { asama: 'kapali', soru: '', cevap: '', hata: '' };
const dinleyiciler = new Set<Dinleyici>();

/**
 * Her oturum kendi numarasını alıyor. Kapatılmış bir oturumun geciken
 * cevabı, yeni oturumun üstüne yazamasın diye her adımda kontrol ediliyor.
 */
let oturum = 0;

/**
 * Tanıyıcı sustuktan sonra konuşmadan önce beklenen süre.
 *
 * ─── NEDEN ────────────────────────────────────────────────────────────────
 * iOS cihazda ölçüldü: tanıma bittikten hemen sonra sentezleyici çağrılınca
 * ses ÇIKMIYOR ama hata da vermiyor — konuşma anında "bitmiş" görünüyor ve
 * sohbet hiçbir şey duyulmadan yeniden dinlemeye dönüyordu. Sebebi ses
 * oturumunun hâlâ kayıt modunda olması; bırakması bir an sürüyor.
 */
const SES_OTURUMU_BEKLEME_MS = 500;

const bekle = (ms: number) => new Promise<void>((c) => setTimeout(c, ms));

/** Cevabı üretecek işlev; UI kurarken veriliyor (menü ve API'ye orası erişiyor). */
type Cevaplayici = (soru: string) => Promise<string>;
let cevaplayici: Cevaplayici | null = null;

export function cevaplayiciAyarla(f: Cevaplayici) { cevaplayici = f; }

export const sohbetDurumu = () => durum;

export function sohbetDinle(d: Dinleyici): () => void {
  dinleyiciler.add(d);
  return () => { dinleyiciler.delete(d); };
}

function guncelle(yeni: Partial<SohbetDurumu>) {
  durum = { ...durum, ...yeni };
  for (const d of dinleyiciler) d(durum);
}

/** Kullanıcının söylediğini bekler; sessizlikle biterse boş döner. */
function soruyuDinle(benimOturum: number): Promise<string> {
  return new Promise((coz) => {
    let sonuc = '';
    void dinlemeyeBasla(
      (metin, kesin) => {
        if (benimOturum !== oturum) return;
        sonuc = metin;
        /* Ara sonuç da gösteriliyor: kullanıcı duyulduğunu görmeli. */
        guncelle({ soru: metin });
        if (kesin) sonuc = metin;
      },
      () => coz(benimOturum === oturum ? sonuc : ''),
    ).then((basladi) => {
      if (!basladi) coz('');
    });
  });
}

/** Cevabın okunmasını bekler. */
function cevabiOku(metin: string): Promise<void> {
  return new Promise((coz) => {
    const birak = konusmaDinle((konusuyor) => {
      if (!konusuyor) { birak(); coz(); }
    });
    if (!konus(metin)) { birak(); coz(); }
  });
}

/** Bir tur: dinle → düşün → konuş. Sohbet kapanmadıysa kendini tekrarlar. */
async function tur(benimOturum: number): Promise<void> {
  if (benimOturum !== oturum) return;

  guncelle({ asama: 'dinliyor', soru: '', cevap: '', hata: '' });
  const soru = (await soruyuDinle(benimOturum)).trim();
  if (benimOturum !== oturum) return;

  /*
   * Hiçbir şey duyulmadıysa sohbet KAPANIYOR, yeniden dinlemeye dönmüyor.
   * Sonsuz döngü, telefonu cebe koyan kullanıcının mikrofonunu açık
   * bırakırdı.
   */
  if (!soru) { sohbetiKapat(); return; }

  guncelle({ asama: 'dusunuyor', soru });

  /* Başlangıç değeri gereksizdi: try içinde her yolda atanıyor. */
  let cevap: string;
  try {
    cevap = cevaplayici ? await cevaplayici(soru) : '';
  } catch {
    cevap = '';
  }
  if (benimOturum !== oturum) return;

  if (!cevap) {
    guncelle({ asama: 'konusuyor', hata: 'Cevap alınamadı.' });
    await cevabiOku('Cevap alınamadı, lütfen tekrar deneyin.');
    if (benimOturum !== oturum) return;
    sohbetiKapat();
    return;
  }

  guncelle({ asama: 'konusuyor', cevap });
  /* Ses oturumu kayıttan çıkana kadar bekle; gerekçe yukarıda. */
  await bekle(SES_OTURUMU_BEKLEME_MS);
  if (benimOturum !== oturum) return;

  await cevabiOku(cevap);
  if (benimOturum !== oturum) return;

  /*
   * Ses gerçekten çıktı mı? Çıkmadıysa DÖNGÜYE DEVAM EDİLMİYOR.
   * Aksi hâlde sohbet sessizce dinle–düşün–dinle diye dönüyor, kullanıcı
   * hiçbir şey duymuyor ve neyin bozuk olduğunu anlayamıyor.
   */
  if (!sonOkumaSesliMiydi()) {
    sesKapaliBildir('Ses çıkışı çalışmadı. Cihazın sesi açık mı, Türkçe ses yüklü mü?');
    return;
  }

  /* Cevap bitti — sıra yine kullanıcıda. */
  void tur(benimOturum);
}

/** Sesli sohbeti başlatır. */
export function sohbetiBaslat(): void {
  if (durum.asama !== 'kapali') return;
  /*
   * Ses kilidi BAŞLARKEN açılıyor: bu işlev kullanıcı dokunuşundan
   * çağrılıyor ve mobil tarayıcılar kilidi ancak o an açtırıyor. İlk cevabı
   * okumaya çalıştığımızda dokunuş çoktan geçmiş olurdu.
   */
  sesKilidiniAc();
  oturum += 1;
  void tur(oturum);
}

/**
 * Ses çıkmadığı için kapatma — hata mesajı EKRANDA KALSIN diye normal
 * kapatmadan ayrı. `sohbetiKapat()` durumu tamamen sıfırlıyor ve hata da
 * silinip kullanıcı sebebi göremiyordu.
 */
function sesKapaliBildir(mesaj: string): void {
  oturum += 1;
  void dinlemeyiDurdur();
  konusmayiDurdur();
  guncelle({ asama: 'hata', hata: mesaj });
}

/** Sohbeti kapatır: mikrofon, sentezleyici ve bekleyen cevap iptal. */
export function sohbetiKapat(): void {
  oturum += 1;                 // bekleyen her şey artık geçersiz
  void dinlemeyiDurdur();
  konusmayiDurdur();
  guncelle({ asama: 'kapali', soru: '', cevap: '', hata: '' });
}
