# Öner Verileri - SQL Dosyaları Yükleme Kılavuzu

## 📊 Hazırlanan Veriler

Toplam **39 tablo** için SQL dosyaları oluşturuldu. Her tablo "oner_" prefix'i ile başlıyor.

## 📁 SQL Dosyalarının Konumu

```
/Volumes/LaCie/dashboard-project/excel-import/sql-files/oner/
```

## 🔧 Plesk Panel Üzerinden Yükleme Adımları

### 1. Plesk'e Giriş Yapın
- Plesk panel adresinizi açın (siz zaten erişebiliyorsunuz).
- Giriş bilgilerinizi burada paylaşmadan kullanın.

### 2. Veritabanına Erişin
- Sol menüden "Databases" (Veritabanları) seçin
- "ist" veritabanını bulun ve phpMyAdmin'i açın

### 3. SQL Dosyalarını Yükleyin

**Yöntem 1: phpMyAdmin ile**
1. phpMyAdmin'de "Import" (İçe Aktar) sekmesine tıklayın
2. "Choose File" (Dosya Seç) butonuna tıklayın
3. SQL dosyalarını tek tek seçip yükleyin
4. Her dosya için "Go" (Git) butonuna tıklayın

**Yöntem 2: Terminal ile (SSH erişiminiz varsa)**
```bash
mysql -h 77.245.149.60 -P 3306 -u ist_172505 -p ist < dosya_adi.sql
```

## 📋 Oluşturulan Tablolar

1. **oner_veri_giris_ekrani** - 31 satır, 4 kolon
2. **oner_sut_maliyeti_hesaplama** - 29 satır, 4 kolon
3. **oner_karkas_maliyet_hesaplama** - 27 satır, 4 kolon
4. **oner_pilic_eti_maliyeti** - 22 satır, 4 kolon
5. **oner_yumurta_uretim_maliyeti** - 10 satır, 4 kolon
6. **oner_kirmizi_et_ekonomik_gostergeler** - 98 satır, 11 kolon
7. **oner_cig_sut_ekonomik_gostergeler** - 98 satır, 13 kolon
8. **oner_kanatli_eti_maliyeti_fiyati** - 134 satır, 8 kolon
9. **oner_yumurta_maliyeti_fiyati** - 134 satır, 47 kolon
10. **oner_sanayiye_giden_sut_ve_sut_urunu** - 191 satır, 13 kolon
11. **oner_i_llere_gore_arici_sayisi** - 81 satır, 12 kolon
12. **oner_kirmizi_et_uretim_miktari** - 51 satır, 17 kolon
13. **oner_dunya_hayvansal_uretim_miktarla** - 1324 satır, 3 kolon
14. **oner_dunya_hayvan_sayilari** - 194 satır, 9 kolon
15. **oner_dunya_hayvan_sayilari_2** - 1113 satır, 3 kolon
16. **oner_kitalarin_uretimi** - 3732 satır, 4 kolon
17. **oner_kitalarin_uretimi_2022** - 62 satır, 3 kolon
18. **oner_dunya_karkas_agirligi_verileri** - 193 satır, 2 kolon
19. **oner_cig_sut_uretim_miktari** - 39 satır, 9 kolon
20. **oner_hayvan_varliklari** - 97 satır, 7 kolon
21. **oner_yeterlilikler** - 1 satır, 6 kolon
22. **oner_kisi_basina_guncel_tuketimler** - 1 satır, 10 kolon
23. **oner_verimlilikler** - 23 satır, 5 kolon
24. **oner_verimlilik_karsilastirma** - 11 satır, 2 kolon
25. **oner_kisi_basi_uretim_tuketim** - 13 satır, 10 kolon
26. **oner_hayvansal_urun_uretimi** - 65 satır, 6 kolon
27. **oner_kirmizi_et_uretimi** - 15 satır, 8 kolon
28. **oner_dunya_karkas_fiyatlari** - 1 satır, 9 kolon
29. **oner_kirmizi_et_ve_hayvan_ithalati** - 23 satır, 16 kolon
30. **oner_karsilastirma_et_tuketimi** - 7 satır, 7 kolon
31. **oner_dunya_sut_fiyatlari** - 1 satır, 6 kolon
32. **oner_i_llerin_hayvan_sayisi** - 162 satır, 19 kolon
33. **oner_i_llerin_bal_cesitleri** - 81 satır, 9 kolon
34. **oner_i_hracat_onaylari** - 130 satır, 6 kolon
35. **oner_onayli_sut_ciftlikleri** - 212 satır, 4 kolon
36. **oner_turkiyenin_i_hracati** - 35252 satır, 10 kolon ⚠️ BÜYÜK DOSYA
37. **oner_turkiyenin_ithalati** - 5383 satır, 9 kolon
38. **oner_kanatli_uretimleri** - 196 satır, 3 kolon
39. **oner_canli_hayvan_ve_et_ithalati** - 17 satır, 13 kolon

## ⚠️ Önemli Notlar

1. **Büyük Dosyalar**: 
   - `36_oner_turkiyenin_i_hracati.sql` (7+ MB) - phpMyAdmin upload limiti nedeniyle sorun çıkarabilir
   - `37_oner_turkiyenin_ithalati.sql` (1+ MB)
   
   Bu dosyalar için SSH terminal kullanmanız önerilir.

2. **Sıralı Yükleme**: Dosyaları sırayla (01'den 39'a) yüklemeniz önerilir.

3. **Karakter Seti**: Tüm tablolar UTF8MB4 karakter seti ile oluşturulmuştur (Türkçe karakter desteği).

4. **ID Kolonları**: Her tabloda otomatik artan `id` kolonu ve `created_at` timestamp kolonu bulunmaktadır.

## 🔍 Hata Durumunda

Eğer bir dosya yüklenirken hata alırsanız:
1. Hata mesajını kontrol edin
2. Veritabanında tablo zaten var mı kontrol edin (varsa DROP TABLE yapın)
3. SQL dosyasını text editörde açıp syntax kontrolü yapın

## ✅ Yükleme Sonrası Kontrol

Tablol arın başarıyla oluşturulduğunu kontrol etmek için:
```sql
SHOW TABLES LIKE 'oner_%';
SELECT COUNT(*) FROM oner_kirmizi_et_ekonomik_gostergeler;
```

## 📞 Destek

Herhangi bir sorun yaşarsanız SQL dosyalarını manuel olarak düzenleyebilir veya bana ulaşabilirsiniz.
