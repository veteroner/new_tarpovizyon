import './RasyonEmbedPage.css';

export function RasyonEmbedPage() {
  return (
    <div className="rasyon-embed">
      <iframe
        className="rasyon-embed__frame"
        src="/rasyon/index.html"
        title="TARPOL Rasyon"
      />
    </div>
  );
}
