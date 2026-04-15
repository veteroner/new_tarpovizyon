#!/usr/bin/env python3
"""Sadece canlihayvan tablosu için Prophet çalıştır."""
import sys
sys.path.insert(0, '.')
from prophet_forecaster import create_results_table, process_table, log

log.info('Sadece canlihayvan tablosu çalıştırılıyor...')
create_results_table()
total = process_table('fao_uretim_hayvansal_canlihayvan', 'canlihayvan')
log.info(f'Canlihayvan tamamlandı: {total} model')
