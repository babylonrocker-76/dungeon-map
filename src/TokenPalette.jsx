import { TOKEN_CATEGORIES } from './tokenPalette';
import TokenIcon from './tokenIcons';

export default function TokenPalette({ armedType, onSelect, onClose, modal = false }) {
  const handlePick = (type) => {
    const next = armedType === type ? null : type;
    onSelect(next);
    if (modal && next) onClose?.();
  };

  const content = (
    <>
      <div className="token-palette-header">
        <div>
          <h2 id="token-palette-title">Pedine</h2>
          <p className="token-palette-hint">Seleziona un&apos;icona, poi clicca sulla mappa</p>
        </div>
        {modal && (
          <button type="button" className="token-palette-close" onClick={onClose} aria-label="Chiudi">
            ×
          </button>
        )}
      </div>
      {TOKEN_CATEGORIES.map((cat) => (
        <div key={cat.id} className="token-palette-group">
          <h3>{cat.label}</h3>
          <div className={`token-palette-grid ${modal ? 'token-palette-grid--modal' : ''}`}>
            {cat.tokens.map((t) => (
              <button
                key={t.type}
                type="button"
                className={`token-palette-item ${armedType === t.type ? 'active' : ''}`}
                title={t.label}
                onClick={() => handlePick(t.type)}
              >
                <span className="token-palette-icon" style={{ background: t.color }}>
                  <TokenIcon type={t.type} className="token-palette-svg" />
                </span>
                <span className="token-palette-label">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  );

  if (modal) {
    return (
      <div className="token-palette-overlay" onClick={onClose} role="presentation">
        <div
          className="token-palette-modal"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="token-palette-title"
        >
          {content}
        </div>
      </div>
    );
  }

  return <aside className="token-palette">{content}</aside>;
}
