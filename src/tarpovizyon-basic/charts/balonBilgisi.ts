/* Balon tipi ve sıra/pay hesabı — bileşen dosyasından ayrıldı ki hızlı
   yenileme çalışsın. */
export type BalonBilgisi = {
  ad: string;
  deger: number;
  /** 1'den başlayan sıra. */
  sira: number;
  /** Sıralamaya giren toplam öğe sayısı. */
  toplamOge: number;
  /** Toplam içindeki pay, yüzde. */
  pay: number;
  x: number;
  y: number;
};

export function siraVePayHesapla(values: Record<string, number>) {
  const gecerli = Object.entries(values).filter(([, v]) => Number.isFinite(v) && v > 0);
  const toplam = gecerli.reduce((s, [, v]) => s + v, 0);
  const sirali = [...gecerli].sort((a, b) => b[1] - a[1]);
  const sira = new Map<string, number>();
  sirali.forEach(([ad], i) => sira.set(ad, i + 1));
  return { toplam, sira, toplamOge: sirali.length };
}
