import { TrendingDown, TrendingUp, Scale } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import { useMakroOlcek } from './useMakroOlcek';
import { oruntuVar } from './makroOlcek';
import './makroOlcek.css';

/**
 * "Geçen yıl düştü — sonrasında ne olmuş?"
 *
 * Bu bölüm TAHMİN YAPMIYOR ve yapmadığını söylüyor. Bir model kurup
 * "2026'da %8 artar" demek kolaydı; dayanağı gösterilemeyen bir sayı
 * olurdu. Yerine ölçülebilir olan yazılıyor: bu üründe geçmişte düşüş yılını
 * ne izlemiş, kaç kez, ortalama ne kadar.
 *
 * Örüntüsü zayıf olan ürünler LİSTEDEN ÇIKARILMIYOR, "örüntü yok" diye
 * yazılıyor. Zayıfları elemek, kalanların seçilmiş olduğunu saklardı.
 */
export function MakroOlcekSection() {
  const { data: satirlar = [], isLoading, isError } = useMakroOlcek();

  if (isLoading) {
    return (
      <Card className="mo" aralik="normal">
        <div className="loading"><div className="loading-spinner" /></div>
      </Card>
    );
  }
  if (isError || !satirlar.length) return null;

  const yil = satirlar.find((s) => s.yil)?.yil;
  const yuzde = (v: number | null) =>
    (v == null ? '—' : `${v >= 0 ? '+' : '−'}%${Math.abs(v).toFixed(1)}`);

  return (
    <Card className="mo" aralik="normal">
      <div className="mo-bas">
        <h2 className="ui-card-title">
          <Scale size={18} aria-hidden="true" /> Geçen yıl düştü — sonrasında ne olmuş?
        </h2>
        <ChartInsightButton
          title="Ürün üretiminde tekrarlama örüntüsü"
          description="Düşüş yılını tarihsel olarak ne izlemiş — Türkiye ve dünya toplamı"
          data={satirlar}
          context={{
            ölçü: 'yıllık % değişim, FAO 2000-2024',
            r: 'bir yıl gecikmeli otokorelasyon; eksi = düşüşü artış izliyor',
            uyarı: 'Bu bir tahmin değil, geçmiş tekrarlama örüntüsü.',
          }}
        />
      </div>

      <p className="mo-not">
        Aşağıdaki sayılar <strong>tahmin değil</strong>. Her ürün için geçmişte
        düşüş yılını ne izlediği ölçüldü — kaç kez ve ortalama ne kadar.
        Örüntüsü zayıf olanlar da listede, öyle yazıyor.
      </p>

      <div className="mo-tablo-sar">
        <table className="mo-tablo">
          <thead>
            <tr>
              <th>Ürün</th>
              <th>Türkiye {yil ?? ''}</th>
              <th>Dünya {yil ?? ''}</th>
              <th>Türkiye’de düşüşü ne izlemiş</th>
            </tr>
          </thead>
          <tbody>
            {satirlar.map((s) => {
              const dustu = (s.trDegisim ?? 0) < 0;
              const o = s.tr;
              return (
                <tr key={s.urun}>
                  <td className="mo-ad">{s.urun}</td>
                  <td className={dustu ? 'mo-eksi' : 'mo-arti'}>
                    {dustu ? <TrendingDown size={14} aria-hidden="true" />
                      : <TrendingUp size={14} aria-hidden="true" />}
                    {yuzde(s.trDegisim)}
                  </td>
                  <td className={(s.dunyaDegisim ?? 0) < 0 ? 'mo-eksi' : 'mo-arti'}>
                    {yuzde(s.dunyaDegisim)}
                  </td>
                  <td className="mo-oruntu">
                    {oruntuVar(o) && o
                      ? (
                        <>
                          <strong>ortalama +%{o.dususSonrasi.toFixed(1)}</strong>
                          <span> · {o.dususSayisi} düşüşün ardından, {o.n} yıllık ölçüm</span>
                        </>
                      )
                      : <span className="mo-yok">belirgin bir örüntü yok</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/*
        * Dört satırlık açıklama tek cümleye indi. Ölçüm duruyor: dünya toplamı
        * ülke üretimlerinden çok daha durgun oynuyor (buğdayda tipik yıllık
        * değişim %2, mısırda %2,3) çünkü bir ülkedeki kötü hasadı başka
        * ülkedeki iyi hasat kapatıyor — bu yüzden dünya sütunundaki bir hareket
        * tek ülkeninkinden çok daha anlamlı. Okuyucunun tabloyu doğru okuması
        * için gereken bu sonuç; ona götüren muhakeme makroOlcek.ts'te.
        */}
      <p className="mo-not mo-kucuk">
        Dünya toplamı tek tek ülkelerden çok daha durgun oynar; oradaki bir
        hareket küresel arzın olayıdır.
      </p>
    </Card>
  );
}
