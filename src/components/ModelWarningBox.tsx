
interface ModelWarningBoxProps {
  /** Model tipi metni, örn: "Lineer Regresyon (trend bazlı)" */
  modelType: string;
  /** Regresyon R² değeri (0-1 arası) */
  r2?: number;
  /** Verinin geldiği seviye: ilçe / il / Türkiye */
  dataLevel?: string;
  /** Ekstra özel mesaj */
  message?: string;
}

/**
 * Modelin ne olduğunu, güvenilirliğini ve veri seviyesini
 * kullanıcıya şeffaf biçimde gösteren uyarı kutusu.
 */
export function ModelWarningBox({ modelType, r2, dataLevel, message }: ModelWarningBoxProps) {
  const r2Label =
    r2 === undefined ? null :
    r2 >= 0.7 ? { text: `R² ${r2.toFixed(2)} — güçlü uyum`, color: '#166534' } :
    r2 >= 0.4 ? { text: `R² ${r2.toFixed(2)} — orta uyum`,  color: '#92400e' } :
                { text: `R² ${r2.toFixed(2)} — zayıf uyum`,  color: '#991b1b' };

  return (
    <div style={{
      padding: '12px 16px', borderRadius: '10px',
      background: 'rgba(245,158,11,0.08)', border: '1px solid #f59e0b',
      fontSize: '0.82rem', color: '#78350f', lineHeight: 1.6,
      display: 'flex', flexDirection: 'column', gap: '4px',
    }}>
      <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
        🔬 Model: {modelType}
      </div>
      {r2Label && (
        <div style={{ color: r2Label.color, fontWeight: 600 }}>{r2Label.text}</div>
      )}
      {dataLevel && (
        <div>📍 Veri seviyesi: <strong>{dataLevel}</strong></div>
      )}
      <div style={{ marginTop: '4px', color: '#92400e' }}>
        {message ?? 'Bu sonuç bir ön karar destek çıktısıdır. Kesin kararlar için uzman ile teyit edin.'}
      </div>
    </div>
  );
}

export default ModelWarningBox;
