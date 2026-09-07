import { useEffect, useMemo, useRef, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import type { GeoPermissibleObjects } from 'd3-geo';
import { normalizeProvinceKey } from '../../utils/productionCategories';
import { HaritaBalonu } from './HaritaBalonu';

import { siraVePayHesapla, type BalonBilgisi } from './balonBilgisi';

/** İl poligonu dosyasının şekli — ad `Name` alanında (KML kökenli). */
type ProvinceFeature = {
  type: 'Feature';
  properties?: { Name?: string; name?: string };
  geometry: unknown;
};
type GeoFeatureCollection = { type: 'FeatureCollection'; features: ProvinceFeature[] };

const COLOR_STEPS = ['#c7e9c0', '#78c679', '#f9d371', '#f4895f', '#de425b'];

function quantileBreaks(sortedValues: number[]): number[] {
  if (sortedValues.length === 0) return [];
  const breaks: number[] = [];
  for (let i = 1; i < COLOR_STEPS.length; i++) {
    const idx = Math.min(sortedValues.length - 1, Math.floor((i / COLOR_STEPS.length) * sortedValues.length));
    breaks.push(sortedValues[idx]);
  }
  return breaks;
}

function colorFor(value: number, breaks: number[]) {
  if (!Number.isFinite(value)) return '#e5e7eb';
  let idx = 0;
  while (idx < breaks.length && value > breaks[idx]) idx++;
  return COLOR_STEPS[Math.min(idx, COLOR_STEPS.length - 1)];
}

/**
 * İl bazlı choropleth.
 *
 * ─── NEDEN İL POLİGONU, NEDEN İLÇE DOSYASI DEĞİL ────────────────────────────
 * Bu harita önce İLÇE sınırlı geojson'u çiziyor, her ilçeyi kendi ilinin
 * değeriyle boyuyordu. Sonuç iki türlü yanlıştı:
 *   • İl tek parça okunmuyordu — aynı renkteki ilçeler arasına beyaz sınır
 *     çizildiği için il, içi bölünmüş bir yama gibi görünüyordu. Oysa veri
 *     il düzeyinde; gösterilen ayrım verinin taşımadığı bir ayrımdı.
 *   • Dosya 25 MB. 81 il için ilçe geometrisi indirmek, kullanılmayan
 *     ayrıntı için sayfa başına 25 MB demekti.
 *
 * Artık il poligonu kullanılıyor (`public/turkey_provinces.json`, 81 il).
 * Koordinat hassasiyeti 4 basamağa (~11 m) kırpılıp dosya 11,3 MB'tan
 * 4,7 MB'a indi; il sınırı çiziminde bu fark görünmüyor.
 *
 * İLÇE VERİSİ OLAN sayfalar bu bileşeni kullanmıyor: havza sayfaları
 * `HavzaDistrictMap` ile ilçeyi KENDİ değeriyle boyuyor. Ayrım şu: sınır
 * ancak veri o düzeyde varsa çizilir.
 *
 * ─── PROJEKSİYON ────────────────────────────────────────────────────────────
 * d3-geo kullanılıyor — Pro'daki `TurkeyHeatMap` ile aynı. İlçe dosyasında
 * elle yazılmış doğrusal dönüşüm gerekiyordu çünkü o dosyanın poligonlarının
 * yarısında sarım yönü tutarsız ve d3'ün kırpma algoritması arkalarına dolu
 * dikdörtgen boyuyordu. İl dosyasında o sorun yok.
 */
export function TurkeyProvinceMap({ values, birim }: { values: Record<string, number>; birim?: string }) {
  const [geoData, setGeoData] = useState<GeoFeatureCollection | null>(null);
  const [hover, setHover] = useState<BalonBilgisi | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}turkey_provinces.json`)
      .then((r) => r.json())
      .then((json) => { if (!cancelled) setGeoData(json); })
      .catch(() => { if (!cancelled) setGeoData(null); });
    return () => { cancelled = true; };
  }, []);

  /* Ad eşlemesi Pro ile ORTAK: geojson "Afyon", "Çankiri", "Adiyaman" gibi
     eksik/ASCII yazımlar taşıyor. `normalizeProvinceKey` bunları takma ad
     tablosundan geçiriyor; düz küçük harfe çevirmek Afyonkarahisar'ı
     eşleştiremezdi. */
  const byProvinceKey = useMemo(() => {
    const map: Record<string, number> = {};
    for (const [name, value] of Object.entries(values)) map[normalizeProvinceKey(name)] = value;
    return map;
  }, [values]);

  const sortedValues = useMemo(
    () => Object.values(values).filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b),
    [values]
  );
  const max = sortedValues.length > 0 ? sortedValues[sortedValues.length - 1] : 0;
  const breaks = useMemo(() => quantileBreaks(sortedValues), [sortedValues]);
  // Sıra ve pay bir kez hesaplanıyor; her hover'da 81 ili yeniden sıralamak gereksiz.
  const { toplam, sira, toplamOge } = useMemo(() => siraVePayHesapla(values), [values]);

  const withPaths = useMemo(() => {
    const features = geoData?.features ?? [];
    if (!features.length) return [];
    const projection = geoMercator();
    try {
      projection.fitSize([1200, 700], geoData as unknown as GeoPermissibleObjects);
    } catch {
      projection.center([35, 39]).scale(3400).translate([600, 350]);
    }
    const yol = geoPath(projection);
    return features
      .map((feat) => ({ feat, d: yol(feat as unknown as GeoPermissibleObjects) }))
      .filter((f) => f.d);
  }, [geoData]);

  return (
    <div ref={containerRef} className="tvb-map" onMouseLeave={() => setHover(null)}>
      <svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid meet" shapeRendering="geometricPrecision" style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/*
          * TEK GEÇİŞ. İlçe dosyasında iki geçiş gerekiyordu: komşu ilçe
          * poligonları arasında koordinat boşlukları vardı ve altına kalın,
          * aynı renkte bir kontur çizilmeseydi aralarında beyaz çizgiler
          * kalıyordu. İl poligonları bitişik, o hileye gerek yok.
          */}
        {withPaths.map(({ feat, d }, idx) => {
          const provinceName = String(feat.properties?.Name || feat.properties?.name || '');
          const value = byProvinceKey[normalizeProvinceKey(provinceName)];
          const color = value !== undefined ? colorFor(value, breaks) : '#eef0f2';
          return (
            <path
              key={`border-${idx}`}
              d={d as string}
              fill={color}
              stroke="rgba(255,255,255,0.7)"
              strokeWidth={0.6}
              strokeLinejoin="round"
              style={{ cursor: value !== undefined ? 'pointer' : 'default' }}
              onMouseEnter={(e) => {
                if (value === undefined) return;
                const rect = containerRef.current?.getBoundingClientRect();
                setHover({
                  ad: provinceName,
                  deger: value,
                  sira: sira.get(provinceName) ?? 0,
                  toplamOge,
                  pay: toplam > 0 ? (value / toplam) * 100 : 0,
                  x: e.clientX - (rect?.left ?? 0),
                  y: e.clientY - (rect?.top ?? 0),
                });
              }}
            />
          );
        })}
      </svg>
      {hover && <HaritaBalonu bilgi={hover} birim={birim} />}
      <div className="tvb-map__legend">
        <span>0</span>
        <div className="tvb-map__legend-bar">
          {COLOR_STEPS.map((c) => <span key={c} style={{ background: c }} />)}
        </div>
        <span>{new Intl.NumberFormat('tr-TR').format(max)}</span>
      </div>
    </div>
  );
}
