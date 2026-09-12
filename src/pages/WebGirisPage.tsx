import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { VitrinHeader } from '../components/vitrin/VitrinHeader';
import { VitrinFooter } from '../components/vitrin/VitrinFooter';
import { OturumGirisi } from '../auth/OturumGirisi';
import { useOturum } from '../auth/useOturum';

/**
 * Web giriş ekranı — `/giris`
 *
 * ─── NEDEN AYRI ROTA GEREKTİ ────────────────────────────────────────────────
 * Basic başlığındaki "Giriş" düğmesi `/m/giris`e gidiyordu; o rota MOBİL
 * kabuğun içinde. Masaüstünde giriş kartı düzgün çiziliyordu (ölçüldü, 380px)
 * ama altında telefon sekme çubuğu duruyordu — işlevsel, görsel olarak yersiz.
 *
 * ─── NEDEN `/tarpovizyon/` ALTINDA DEĞİL ────────────────────────────────────
 * Para duvarı `/tarpovizyon/*` yollarını kapatıyor. Giriş sayfasını oraya
 * koymak, duvar açıldığında KAPI DÖNGÜSÜ riski demek: kapı giriş ekranını
 * göstermek ister, giriş sayfası da kapının arkasında kalır. `VITRIN_YOLLARI`
 * ile muaf tutulabilirdi ama o liste bir istisna listesi — kimliğin kendisini
 * istisnaya bağlamak kırılgan olurdu. Üst düzey yol bu soruyu tümüyle
 * ortadan kaldırıyor.
 *
 * ─── DÖNÜŞ YOLU ─────────────────────────────────────────────────────────────
 * `?donus=` ile geldiği sayfaya geri gönderiliyor. Parametre YOKSA Basic ana
 * sayfasına düşüyor; kullanıcıyı giriş ekranında bırakmak, girişin işe
 * yaradığını göstermemek olurdu.
 *
 * Dönüş hedefi YALNIZCA uygulama içi yollara açık: `//baska-site` gibi bir
 * değer açık yönlendirmeye (open redirect) dönüşürdü.
 */

const GUVENLI_DONUS = (ham: string | null): string => {
  if (!ham) return '/tarpovizyon-basic';
  /* Tek eğik çizgiyle başlamalı ve `//` ile devam etmemeli — ikincisi
     protokolsüz mutlak adres, yani başka bir siteye çıkar. */
  if (!ham.startsWith('/') || ham.startsWith('//')) return '/tarpovizyon-basic';
  return ham;
};

export default function WebGirisPage() {
  const { durum } = useOturum();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const donus = GUVENLI_DONUS(params.get('donus'));

  useEffect(() => {
    /* `replace`: geri tuşu girişe dönmemeli — kullanıcı zaten geçtiği bir
       adıma geri atılırdı. */
    if (durum === 'girisli') navigate(donus, { replace: true });
  }, [durum, donus, navigate]);

  return (
    <div className="min-h-screen bg-[var(--tv-zemin,#f7f8f6)]">
      <VitrinHeader />
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-12 md:px-6">
        {/*
          * Bağlam yüklenirken kart çizilmiyor: girişli kullanıcıya bir an
          * giriş formu göstermek, çıkmış olduğunu düşündürürdü.
          */}
        {durum === 'girissiz' && <OturumGirisi baslik="TarpoVizyon hesabı" />}
      </div>
      <VitrinFooter />
    </div>
  );
}
