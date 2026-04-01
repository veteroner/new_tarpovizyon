#!/usr/bin/env python3
"""
FAO Hayvansal Üretim — Prophet Tahmin Sistemi (API Modu)
========================================================
Bu script, FAO hayvansal üretim verilerini uzak API üzerinden çekip
Prophet ile modelleyip sonuçları yine API üzerinden veritabanına yazar.
Yılda 1 kez çalıştırılması yeterlidir.

Kullanım:
  pip install prophet pandas numpy requests
  python3 scripts/prophet_forecaster.py

Parametreler (ortam değişkenleri):
  API_URL     (varsayılan: https://dersbende.com/api.php)
  API_KEY     (varsayılan: dashboard_secret_key_2024)
  MIN_TON     (varsayılan: 1000)   — minimum toplam üretim filtresi
  HORIZON     (varsayılan: 3)      — kaç yıl ileri tahmin
"""

import os
import sys
import time
import json
import logging
import warnings
from datetime import datetime

import numpy as np
import pandas as pd
import requests
from prophet import Prophet
from prophet.diagnostics import cross_validation, performance_metrics

warnings.filterwarnings("ignore")
logging.getLogger("cmdstanpy").setLevel(logging.WARNING)
logging.getLogger("prophet").setLevel(logging.WARNING)

# ─── Yapılandırma ─────────────────────────────────────────────────────────────
API_URL = os.environ.get("API_URL", "https://dersbende.com/api.php")
API_KEY = os.environ.get("API_KEY", "dashboard_secret_key_2024")
MIN_TON = int(os.environ.get("MIN_TON", "1000"))
HORIZON = int(os.environ.get("HORIZON", "3"))
BATCH_SIZE = 500  # API batch insert limiti

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


# ─── API Yardımcıları ─────────────────────────────────────────────────────────
def api_query(sql: str) -> list:
    """API üzerinden SELECT sorgusu çalıştır."""
    r = requests.get(API_URL, params={"action": "query", "sql": sql, "api_key": API_KEY}, timeout=120)
    r.raise_for_status()
    data = r.json()
    if "error" in data:
        raise RuntimeError(f"API query hatası: {data['error']}")
    return data.get("data", [])


def api_execute(sql: str):
    """API üzerinden DDL/DML çalıştır (CREATE, DELETE, vb.)."""
    r = requests.post(
        f"{API_URL}?action=execute&api_key={API_KEY}",
        data={"sql": sql},
        timeout=60,
    )
    r.raise_for_status()
    data = r.json()
    if "error" in data:
        raise RuntimeError(f"API execute hatası: {data['error']}")
    return data


def api_batch_insert(table: str, rows: list):
    """API üzerinden batch insert."""
    r = requests.post(
        f"{API_URL}?action=batch_insert&api_key={API_KEY}",
        data={"table": table, "data": json.dumps(rows)},
        timeout=120,
    )
    r.raise_for_status()
    data = r.json()
    if "error" in data:
        raise RuntimeError(f"API batch_insert hatası: {data['error']}")
    return data


def create_results_table():
    """fao_tahmin_sonuclari tablosunu oluştur (yoksa)."""
    api_execute("""
        CREATE TABLE IF NOT EXISTS fao_tahmin_sonuclari (
            id INT AUTO_INCREMENT PRIMARY KEY,
            urunad VARCHAR(255) NOT NULL,
            ulkead VARCHAR(255) NOT NULL,
            veri_tipi VARCHAR(50) NOT NULL COMMENT 'birincil / islenmis / canlihayvan',
            tahmin_yil INT NOT NULL,
            tahmin_deger DOUBLE NOT NULL,
            alt_sinir DOUBLE NOT NULL COMMENT '80% CI lower',
            ust_sinir DOUBLE NOT NULL COMMENT '80% CI upper',
            trend VARCHAR(30) NOT NULL COMMENT 'UP / DOWN / STABLE / ACCELERATING',
            r2_cv FLOAT DEFAULT NULL COMMENT 'Cross-validated R2',
            mae_cv FLOAT DEFAULT NULL COMMENT 'Cross-validated MAE',
            mape_cv FLOAT DEFAULT NULL COMMENT 'Cross-validated MAPE',
            model_tarihi DATETIME NOT NULL,
            INDEX idx_ulke_urun (ulkead, urunad),
            INDEX idx_veri_tipi (veri_tipi),
            INDEX idx_tahmin_yil (tahmin_yil)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci
    """)


def clear_old_results(veri_tipi: str):
    """Eski sonuçları temizle (yeni batch öncesi)."""
    api_execute(f"DELETE FROM fao_tahmin_sonuclari WHERE veri_tipi = '{veri_tipi}'")


def fetch_series(table: str, veri_tipi: str) -> pd.DataFrame:
    """Belirtilen tablodan anlamlı serileri API üzerinden çek."""

    # Uygun kolon adını belirle
    if veri_tipi == "canlihayvan":
        # Kolon adlarını kontrol et
        cols_data = api_query(f"SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '{table}' AND TABLE_SCHEMA = DATABASE()")
        cols = [r["COLUMN_NAME"] for r in cols_data]
        if "miktar_birim" in cols:
            unit_col = "miktar_birim"
            value_col = "miktar_deger"
            unit_values = "'An','1000 An','No','Head','1000 Head','head'"
        elif "stok_birim" in cols:
            unit_col = "stok_birim"
            value_col = "stok_deger"
            unit_values = "'t','Head','1000 Head','1000 No','No','head','tonnes'"
        else:
            unit_col = "uretim_birim"
            value_col = "uretim_deger"
            unit_values = "'t','Head','1000 Head','1000 No','No','head','tonnes'"
    else:
        unit_col = "uretim_birim"
        value_col = "uretim_deger"
        unit_values = "'t','Head','1000 Head','1000 No','No','head','tonnes'"

    # Excluded areas SQL
    excluded_sql = ", ".join(f"'{a}'" for a in EXCLUDED_AREAS)

    query = f"""
        SELECT ulkead, urunad, year,
               SUM(CAST({value_col} AS DECIMAL(20,2))) as total
        FROM `{table}`
        WHERE {unit_col} IN ({unit_values})
          AND ulkead NOT IN ({excluded_sql})
        GROUP BY ulkead, urunad, year
        ORDER BY ulkead, urunad, year
    """
    rows = api_query(query)

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows)
    df["total"] = pd.to_numeric(df["total"], errors="coerce").fillna(0)

    # Minimum üretim filtresi
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


def process_table(table: str, veri_tipi: str):
    """Bir tabloyu işle: verileri çek, Prophet çalıştır, sonuçları yaz."""
    log.info(f"━━━ {table} ({veri_tipi}) işleniyor ━━━")

    df = fetch_series(table, veri_tipi)
    if df.empty:
        log.warning(f"  {table}: veri bulunamadı")
        return 0

    groups = df.groupby(["ulkead", "urunad"])
    total = len(groups)
    log.info(f"  {total} ülke-ürün kombinasyonu bulundu")

    clear_old_results(veri_tipi)

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
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
                batch.append({
                    "urunad": urun,
                    "ulkead": ulke,
                    "veri_tipi": veri_tipi,
                    "tahmin_yil": fc["year"],
                    "tahmin_deger": round(fc["yhat"], 2),
                    "alt_sinir": round(fc["yhat_lower"], 2),
                    "ust_sinir": round(fc["yhat_upper"], 2),
                    "trend": result["trend"],
                    "r2_cv": round(result["r2_cv"], 4) if result["r2_cv"] is not None else None,
                    "mae_cv": round(result["mae_cv"], 2) if result["mae_cv"] is not None else None,
                    "mape_cv": round(result["mape_cv"], 4) if result["mape_cv"] is not None else None,
                    "model_tarihi": now,
                })
            success += 1

            # Her BATCH_SIZE satırda API'ye gönder
            if len(batch) >= BATCH_SIZE:
                _insert_batch(batch)
                batch = []

        except Exception as e:
            failed += 1
            if failed <= 5:
                log.error(f"  Hata: {ulke} / {urun}: {e}")

    # Kalan batch
    if batch:
        _insert_batch(batch)

    log.info(f"  ✓ {veri_tipi}: {success} model, {skipped} atlanan, {failed} hata")
    return success


def _insert_batch(batch):
    """API batch insert ile sonuçları yaz."""
    result = api_batch_insert("fao_tahmin_sonuclari", batch)
    log.info(f"    → {result.get('inserted', 0)} satır yazıldı")


def main():
    log.info("=" * 60)
    log.info("FAO Prophet Tahmin Sistemi başlatılıyor (API Modu)")
    log.info(f"  API: {API_URL}")
    log.info(f"  Horizon: {HORIZON} yıl, Min üretim: {MIN_TON}")
    log.info("=" * 60)

    start = time.time()

    # Tablo oluştur
    create_results_table()

    tables = [
        ("fao_uretim_hayvansal_birincil", "birincil"),
        ("fao_uretim_hayvansal_islenmis", "islenmis"),
        ("fao_uretim_hayvansal_canlihayvan", "canlihayvan"),
    ]

    total_models = 0
    for table, veri_tipi in tables:
        try:
            total_models += process_table(table, veri_tipi)
        except Exception as e:
            log.error(f"Tablo hatası {table}: {e}")

    elapsed = time.time() - start

    log.info("=" * 60)
    log.info(f"Toplam: {total_models} model, Süre: {elapsed / 60:.1f} dakika")
    log.info("=" * 60)


if __name__ == "__main__":
    main()
