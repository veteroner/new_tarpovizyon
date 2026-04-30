import { useMemo, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { fetchAIChat } from '../services/api';

type ChartInsightButtonProps = {
  title: string;
  description?: string;
  data: unknown[];
  context?: Record<string, unknown>;
  compact?: boolean;
};

function cleanReply(reply: string): string {
  return reply
    .replace(/```chart-json[\s\S]*?```/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/__(.*?)__/g, '$1')
    .replace(/^[-•]\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}


function buildPrompt(title: string, description: string | undefined, data: unknown[], context: Record<string, unknown> | undefined): string {
  const sample = data.slice(0, 80);
  return [
    'TarpoVizyon dashboard icindeki bir grafiği yorumla.',
    'Yanıtı Türkçe ver. Çok kısa, net ve yönetici özeti gibi yaz. Verilen veri dışına çıkma, uydurma sayı kullanma.',
    'Markdown kullanma. Yıldız, kalın yazı, ### başlık, tablo veya uzun madde listesi kullanma.',
    'Sadece şu 3 kısa başlığı kullan ve her başlık altında en fazla 2 kısa cümle yaz: Veriler ne söylüyor? Grafiğin önemi. Ne takip edilmeli?',
    'Sayıları veri içinden okuyarak yaz; ana trend, liderler, denge ve riskleri belirt.',
    '',
    `Grafik: ${title}`,
    description ? `Açıklama: ${description}` : '',
    `Bağlam: ${JSON.stringify(context || {}, null, 2)}`,
    `Veri (${sample.length}/${data.length} satır): ${JSON.stringify(sample, null, 2)}`,
  ].filter(Boolean).join('\n');
}

export function ChartInsightButton({ title, description, data, context, compact = false }: ChartInsightButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');

  const disabled = !data.length || loading;
  const parsedReply = useMemo(() => cleanReply(reply), [reply]);

  const runInsight = async () => {
    if (!data.length) return;
    setOpen(true);
    setLoading(true);
    setError('');
    setReply('');
    const res = await fetchAIChat(buildPrompt(title, description, data, context), false);
    if (res.success && res.reply) {
      setReply(res.reply);
    } else {
      setError(res.error || 'AI yorumu alınamadı.');
    }
    setLoading(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={runInsight}
        disabled={disabled}
        title={disabled ? 'Yorumlanacak veri yok' : 'Grafiği AI ile yorumla'}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: compact ? 0 : 6,
          padding: compact ? 7 : '7px 10px', borderRadius: 8,
          border: '1px solid rgba(99,102,241,0.28)', background: disabled ? 'var(--bg)' : 'rgba(99,102,241,0.08)',
          color: disabled ? 'var(--text-muted)' : 'var(--primary-dark)', cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: 12, fontWeight: 700, lineHeight: 1,
        }}
      >
        <Sparkles size={14} />
        {!compact && <span>AI yorumla</span>}
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15,23,42,0.46)' }}
          />
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed', zIndex: 10001, top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: 'min(720px, calc(100vw - 32px))', maxHeight: 'min(760px, calc(100vh - 32px))',
              background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 14,
              boxShadow: '0 24px 80px rgba(15,23,42,0.26)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={14} /> AI Grafik Yorumu
                </div>
                <div style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 800, marginTop: 4 }}>{title}</div>
                {description && <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>{description}</div>}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', cursor: 'pointer' }}
                aria-label="Kapat"
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 18, overflowY: 'auto' }}>
              {loading && (
                <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                  Grafik verileri LLM'e gönderiliyor ve yorum hazırlanıyor...
                </div>
              )}
              {error && <div style={{ color: 'var(--error)', fontSize: 14 }}>{error}</div>}
              {parsedReply && (
                <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.7 }}>
                  {parsedReply}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}