#!/usr/bin/env python3
"""
FAO Hayvansal Üretim — Prophet Tahmin Sistemi
==============================================
Bu script, FAO hayvansal üretim verilerini Prophet ile modelleyip
tahminleri MySQL'e yazar. Yılda 1 kez çalıştırılması yeterlidir.

Kullanım:
  pip install prophet mysql-connector-python pandas numpy
  python3 scripts/prophet_forecaster.py

Parametreler (ortam değişkenleri):
  DB_HOST     (varsayılan: localhost)
  DB_USER     (varsayılan: ist_172505)
  DB_PASS     (varsayılan: ist_172505)
  DB_NAME     (varsayılan: ist)
  MIN_TON     (varsayılan: 1000)   — minimum toplam üretim filtresi
  HORIZON     (varsayılan: 3)      — kaç yıl ileri tahmin
"""

import os
import sys
import time
import logging
import warnings
from datetime import datetime

import numpy as np
import pandas as pd
import mysql.connector
from prophet import Prophet
from prophet.diagnostics import cross_validation, performance_metrics

warnings.filterwarnings("ignore")
logging.getLogger("cmdstanpy").setLevel(logging.WARNING)
logging.getLogger("prophet").setLevel(logging.WARNING)

# ─── Yapılandırma ─────────────────────────────────────────────────────────────
DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "localhost"),
    "user": os.environ.get("DB_USER", "ist_172505"),
    "password": os.environ.get("DB_PASS", "ist_172505"),
    "database": os.environ.get("DB_NAME", "ist"),
    "charset": "utf8",
}
MIN_TON = int(os.environ.get("MIN_TON", "1000"))
HORIZON = int(os.environ.get("HORIZON", "3"))

# Hariç tutulacak bölgeler (aggregate)
EXCLUDED_AREAS = (
    "World", "WORLD", "Dünya", "DÜNYA", "Dunya",
    "Total", "TOTAL", "Toplam", "TOPLAM",
    "Africa", "Americas", "Asia", "Europe", "Oceania",
    "Northern Africa", "Eastern Africa", "Middle Africa",
    "Southern Africa", "Western Africa", "Northern America",
    "Central America", "Caribbean", "South America",
    "Central Asia", "Eastern Asia", "South-eastern Asia",
    "Southern Asia", "Western Asia", "Eastern Europe",
    "Northern Europe", "Southern Europe", "Western Europe",
    "Australia and New Zealand", "Melanesia", "Micronesia", "Polynesia",
    "Least Developed Countries", "Land Locked Developing Countries",
    "Small Island Developing States", "Low Income Food Deficit Countries",
    "Net Food Importing Developing Countries", "European Union (27)",
    "China, mainland", "China, Taiwan Province of",
)

# ─── Logging ──────────────────────────────────────────────────────────────────
log = logging.getLogger("prophet_forecaster")
log.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S"))
log.addHandler(handler)


def get_connection():
    return mysql.connector.connect(**DB_CONFIG)


def create_results_table(conn):
    """fao_tahmin_sonuclari tablosunu oluştur (yoksa)."""
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS fao_tahmin_sonuclari (
            id INT AUTO_INCREMENT PRIMARY KEY,
            urunad VARCHAR(255) NOT NULL,
            ulkead VARCHAR(255) NOT NULL,
            veri_tipi VARCHAR(50) NOT NULL COMMENT 'birincil / islenmis / canlihayvan',
            tahmin_yil INT NOT NULL,
            tahmin_deger DOUBLE NOT NULL,
            alt_sinir DOUBLE NOT NULL COMMENT '80%% CI lower',
            ust_sinir DOUBLE NOT NULL COMMENT '80%% CI upper',
            trend VARCHAR(30) NOT NULL COMMENT 'UP / DOWN / STABLE / ACCELERATING',
            r2_cv FLOAT DEFAULT NULL COMMENT 'Cross-validated R²',
            mae_cv FLOAT DEFAULT NULL COMMENT 'Cross-validated MAE',
            mape_cv FLOAT DEFAULT NULL COMMENT 'Cross-validated MAPE',
            model_tarihi DATETIME NOT NULL,
            INDEX idx_ulke_urun (ulkead, urunad),
            INDEX idx_veri_tipi (veri_tipi),
            INDEX idx_tahmin_yil (tahmin_yil)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci
    """)
    conn.commit()
    cursor.close()


def clear_old_results(conn, veri_tipi: str):
    """Eski sonuçları temizle (yeni batch öncesi)."""
    cursor = conn.cursor()
    cursor.execute("DELETE FROM fao_tahmin_sonuclari WHERE veri_tipi = %s", (veri_tipi,))
    conn.commit()
    cursor.close()


def fetch_series(conn, table: str, veri_tipi: str) -> pd.DataFrame:
    """Belirtilen tablodan anlamlı serileri çek."""
    placeholders = ",".join(["%s"] * len(EXCLUDED_AREAS))

    # Uygun kolon adını belirle
    unit_col = "uretim_birim"
    value_col = "uretim_deger"

    if veri_tipi == "canlihayvan":
        # canlihayvan tablosunda kolon adları farklı olabilir
        cursor = conn.cursor()
        cursor.execute(f"SHOW COLUMNS FROM `{table}`")
        cols = [row[0] for row in cursor.fetchall()]
        cursor.close()
        if "stok_birim" in cols:
            unit_col = "stok_birim"
            value_col = "stok_deger"

    query = f"""
        SELECT ulkead, urunad, year,
               SUM(CAST({value_col} AS DECIMAL(20,2))) as total
        FROM `{table}`
        WHERE {unit_col} IN ('t','Head','1000 Head','1000 No','No','head','tonnes')
          AND ulkead NOT IN ({placeholders})
        GROUP BY ulkead, urunad, year
        ORDER BY ulkead, urunad, year
    """
    cursor = conn.cursor(dictionary=True)
    cursor.execute(query, EXCLUDED_AREAS)
    rows = cursor.fetchall()
    cursor.close()

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows)
    df["total"] = pd.to_numeric(df["total"], errors="coerce").fillna(0)

    # Minimum üretim filtresi: toplam üretim > MIN_TON
    group_totals = df.groupby(["ulkead", "urunad"])["total"].sum().reset_index()
    valid = group_totals[group_totals["total"] > MIN_TON][["ulkead", "urunad"]]
    df = df.merge(valid, on=["ulkead", "urunad"], how="inner")

    return df


def classify_trend(forecast_values: list) -> str:
    """Tahmin değerlerinden trend sınıflandırması."""
    if len(forecast_values) < 2:
        return "STABLE"

    diffs = [forecast_values[i] - forecast_values[i - 1] for i in range(1, len(forecast_values))]
    avg_diff = np.mean(diffs)
    last_val = forecast_values[-1]

    if last_val == 0:
        return "STABLE"

    pct_change = (avg_diff / abs(last_val)) * 100

    # İvmelenme kontrolü
    if len(diffs) >= 2 and all(d > 0 for d in diffs):
        if diffs[-1] > diffs[0] * 1.5:
            return "ACCELERATING"

    if pct_change > 2:
        return "UP"
    elif pct_change < -2:
        return "DOWN"
    return "STABLE"


def run_prophet(series_df: pd.DataFrame, horizon: int = 3):
    """
    Tek bir seri için Prophet çalıştır.
    Returns: (forecasts_list, r2_cv, mae_cv, mape_cv, trend)
    """
    # Prophet formatına çevir
    pdf = series_df[["year", "total"]].copy()
    pdf = pdf.groupby("year")["total"].sum().reset_index()
    pdf.columns = ["ds", "y"]
    pdf["ds"] = pd.to_datetime(pdf["ds"].astype(str) + "-01-01")
    pdf = pdf.sort_values("ds").reset_index(drop=True)

    if len(pdf) < 5:
        return None

    # Prophet model
    model = Prophet(
        yearly_seasonality=False,
        weekly_seasonality=False,
        daily_seasonality=False,
        seasonality_mode="multiplicative",
        interval_width=0.80,
        changepoint_prior_scale=0.05,
    )
    model.fit(pdf)

    # Tahmin
    future = model.make_future_dataframe(periods=horizon, freq="YS")
    fc = model.predict(future)

    # Tahmin sonuçları
    last_hist_year = pdf["ds"].max().year
    forecasts = []
    for _, row in fc[fc["ds"].dt.year > last_hist_year].iterrows():
        forecasts.append({
            "year": row["ds"].year,
            "yhat": float(row["yhat"]),
            "yhat_lower": float(row["yhat_lower"]),
            "yhat_upper": float(row["yhat_upper"]),
        })

    # Cross-validation (en az 8 veri noktası gerekli)
    r2_cv, mae_cv, mape_cv = None, None, None
    if len(pdf) >= 8:
        try:
            initial_days = max(int(len(pdf) * 0.6), 4) * 365
            horizon_days = min(horizon, max(1, len(pdf) - int(len(pdf) * 0.6) - 1)) * 365
            period_days = 365

            cv_results = cross_validation(
                model,
                initial=f"{initial_days} days",
                period=f"{period_days} days",
                horizon=f"{horizon_days} days",
            )
            if len(cv_results) > 0:
                pm = performance_metrics(cv_results)
                mae_cv = float(pm["mae"].mean()) if "mae" in pm.columns else None
                mape_cv = float(pm["mape"].mean()) if "mape" in pm.columns else None

                # R² hesapla: 1 - SS_res / SS_tot
                y_true = cv_results["y"].values
                y_pred = cv_results["yhat"].values
                ss_res = np.sum((y_true - y_pred) ** 2)
                ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
                if ss_tot > 0:
                    r2_cv = float(1 - ss_res / ss_tot)
        except Exception:
            pass  # CV başarısız — sorun değil, None kalır

    # Trend
    all_values = list(pdf["y"].values) + [f["yhat"] for f in forecasts]
    trend = classify_trend(all_values[-min(6, len(all_values)):])

    return {
        "forecasts": forecasts,
        "r2_cv": r2_cv,
        "mae_cv": mae_cv,
        "mape_cv": mape_cv,
        "trend": trend,
    }


def process_table(conn, table: str, veri_tipi: str):
    """Bir tabloyu işle: verileri çek, Prophet çalıştır, sonuçları yaz."""
    log.info(f"━━━ {table} ({veri_tipi}) işleniyor ━━━")

    df = fetch_series(conn, table, veri_tipi)
    if df.empty:
        log.warning(f"  {table}: veri bulunamadı")
        return 0

    groups = df.groupby(["ulkead", "urunad"])
    total = len(groups)
    log.info(f"  {total} ülke-ürün kombinasyonu bulundu")

    clear_old_results(conn, veri_tipi)

    now = datetime.now()
    batch = []
    success = 0
    failed = 0
    skipped = 0

    for i, ((ulke, urun), group_df) in enumerate(groups, 1):
        if i % 100 == 0 or i == total:
            log.info(f"  İlerleme: {i}/{total} (başarılı: {success}, atlanan: {skipped}, hata: {failed})")

        try:
            result = run_prophet(group_df, HORIZON)
            if result is None:
                skipped += 1
                continue

            for fc in result["forecasts"]:
                batch.append((
                    urun, ulke, veri_tipi,
                    fc["year"], fc["yhat"], fc["yhat_lower"], fc["yhat_upper"],
                    result["trend"],
                    result["r2_cv"], result["mae_cv"], result["mape_cv"],
                    now,
                ))
            success += 1

            # Her 200 seride batch insert
            if len(batch) >= 600:
                _insert_batch(conn, batch)
                batch = []

        except Exception as e:
            failed += 1
            if failed <= 5:
                log.error(f"  Hata: {ulke} / {urun}: {e}")

    # Kalan batch
    if batch:
        _insert_batch(conn, batch)

    log.info(f"  ✓ {veri_tipi}: {success} model, {skipped} atlanan, {failed} hata")
    return success


def _insert_batch(conn, batch):
    """Batch insert ile sonuçları yaz."""
    cursor = conn.cursor()
    cursor.executemany("""
        INSERT INTO fao_tahmin_sonuclari
        (urunad, ulkead, veri_tipi, tahmin_yil, tahmin_deger, alt_sinir, ust_sinir,
         trend, r2_cv, mae_cv, mape_cv, model_tarihi)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, batch)
    conn.commit()
    cursor.close()


def main():
    log.info("=" * 60)
    log.info("FAO Prophet Tahmin Sistemi başlatılıyor")
    log.info(f"  Horizon: {HORIZON} yıl, Min üretim: {MIN_TON}")
    log.info("=" * 60)

    start = time.time()
    conn = get_connection()

    # Tablo oluştur
    create_results_table(conn)

    tables = [
        ("fao_uretim_hayvansal_birincil", "birincil"),
        ("fao_uretim_hayvansal_islenmis", "islenmis"),
        ("fao_uretim_hayvansal_canlihayvan", "canlihayvan"),
    ]

    total_models = 0
    for table, veri_tipi in tables:
        try:
            total_models += process_table(conn, table, veri_tipi)
        except Exception as e:
            log.error(f"Tablo hatası {table}: {e}")

    conn.close()
    elapsed = time.time() - start

    log.info("=" * 60)
    log.info(f"Toplam: {total_models} model, Süre: {elapsed / 60:.1f} dakika")
    log.info("=" * 60)


if __name__ == "__main__":
    main()
