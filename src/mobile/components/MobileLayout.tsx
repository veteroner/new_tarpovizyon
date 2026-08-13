import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import TabBar from './TabBar';
import { klavyeyiIzle } from '../utils/klavye';
import '../styles/ios.css';

/**
 * Mobil uygulama kabuğu.
 *
 * ─── NE DEĞİŞTİ ─────────────────────────────────────────────────────────────
 * Eskiden kabuk, detay sayfaları için SABİT bir "Geri" başlığı çiziyor ve
 * içeriği `pt-16` ile aşağı itiyordu. İki sorun vardı:
 *
 *  1. Başlık sayfanın kendi başlığını bilmiyordu; her detay sayfasında
 *     yalnızca "Geri" yazıyordu — kullanıcı nerede olduğunu göremiyordu.
 *  2. Sabit yükseklik (`pt-16`) çentikli cihazlarda güvenli alanı hesaba
 *     katmıyordu.
 *
 * Artık gezinme çubuğunu SAYFA çiziyor (`<NavBar>`): büyük başlık, alt
 * başlık ve geri düğmesi bir arada, iOS'taki gibi. Kabuk yalnızca zemini,
 * kaydırma alanını ve sekme çubuğunu sağlıyor.
 */
export default function MobileLayout() {
  // Klavye yüksekliğini CSS'e taşır; sohbet yazma alanı buna göre yükseliyor.
  useEffect(klavyeyiIzle, []);

  return (
    <div className="ios-app">
      <Outlet />
      <TabBar />
    </div>
  );
}
