import { Link, useLocation } from 'react-router-dom';

/**
 * Bilinmeyen adresler için karşılama.
 *
 * Önceden hiçbir rota eşleşmediğinde ekran TAMAMEN boş kalıyordu — ne hata
 * ne de geri dönüş bağlantısı. Eski/yanlış bir bağlantıya tıklayan kullanıcı
 * uygulamanın çöktüğünü sanıyordu.
 */
export default function NotFoundPage() {
  const { pathname } = useLocation();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        minHeight: '60vh',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ color: 'var(--text-secondary)' }}
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
        <path d="M11 8v3" />
        <path d="M11 14h.01" />
      </svg>

      <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>Sayfa bulunamadı</h1>

      <p style={{ color: 'var(--text-secondary)', margin: 0, maxWidth: 420, lineHeight: 1.5 }}>
        <code style={{ wordBreak: 'break-all' }}>{pathname}</code> adresinde bir sayfa yok.
        Bağlantı eski olabilir.
      </p>

      <Link
        to="/tarpovizyon/overview"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          minHeight: 44,
          padding: '0 20px',
          borderRadius: 999,
          background: 'var(--accent, #16a34a)',
          color: '#fff',
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Genel Bakış'a dön
      </Link>
    </div>
  );
}
