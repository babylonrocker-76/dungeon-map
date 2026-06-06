import { useRef } from 'react';
import { getTokenMeta, getTokenDisplaySize, TOKEN_PLAYER_SCALE } from './tokenPalette';
import TokenIcon from './tokenIcons';

export default function TokenLayer({
  tokens,
  mapWidth,
  mapHeight,
  isMaster,
  mode,
  selectedId,
  labelDraft,
  onSelect,
  onMove,
  onRemove,
  onLabelDraftChange,
  onLabelCommit,
}) {
  const draggingRef = useRef(null);
  const labelInputRef = useRef(null);

  if (!mapWidth || !mapHeight) return null;

  const canEdit = isMaster && mode === 'tokens';

  const toPercent = (val, total) => `${(val / total) * 100}%`;

  const handleTokenPointerDown = (e, token) => {
    if (!canEdit || e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect(token.id);
    draggingRef.current = { id: token.id, pointerId: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleTokenPointerMove = (e, token) => {
    if (draggingRef.current?.id !== token.id) return;
    e.stopPropagation();
    const canvas = e.currentTarget.closest('.map-canvas-wrap')?.querySelector('.map-canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (mapWidth / rect.width);
    const y = (e.clientY - rect.top) * (mapHeight / rect.height);
    onMove(token.id, x, y);
  };

  const handleTokenPointerUp = (e, token) => {
    if (draggingRef.current?.id !== token.id) return;
    e.stopPropagation();
    draggingRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleTokenContextMenu = (e, token) => {
    if (!canEdit) return;
    e.preventDefault();
    e.stopPropagation();
    onRemove(token.id);
  };

  const handleDoubleClick = (e, token) => {
    if (!canEdit) return;
    e.stopPropagation();
    onSelect(token.id);
    requestAnimationFrame(() => labelInputRef.current?.focus());
  };

  return (
    <div className={`tokens-layer ${isMaster ? 'tokens-layer--master' : 'tokens-layer--player'}`}>
      {tokens.map((token) => {
        const meta = getTokenMeta(token.type);
        const selected = selectedId === token.id;
        const showNameEditor = canEdit && selected;
        const name = (token.label || '').trim();
        const size = getTokenDisplaySize(token, mapWidth);
        const sizePercent = toPercent(size, mapWidth);
        const playerScale = isMaster ? 1 : TOKEN_PLAYER_SCALE;

        return (
          <div
            key={token.id}
            className={`map-token ${selected ? 'selected' : ''} ${canEdit ? 'editable' : ''} map-token--${meta.category}`}
            style={{
              left: toPercent(token.x, mapWidth),
              top: toPercent(token.y, mapHeight),
              width: sizePercent,
              height: sizePercent,
              '--token-scale': playerScale,
              '--token-color': meta.color,
              '--token-ring': meta.ringColor,
            }}
          >
            <div
              className="map-token-disc"
              style={{ transform: `scale(${playerScale})` }}
              onPointerDown={(e) => handleTokenPointerDown(e, token)}
              onPointerMove={(e) => handleTokenPointerMove(e, token)}
              onPointerUp={(e) => handleTokenPointerUp(e, token)}
              onPointerCancel={(e) => handleTokenPointerUp(e, token)}
              onContextMenu={(e) => handleTokenContextMenu(e, token)}
              onDoubleClick={(e) => handleDoubleClick(e, token)}
            >
              <div className={`map-token-body ${meta.isMarker ? 'map-token-body--marker' : ''}`}>
                <span className="map-token-aura" aria-hidden />
                <span className="map-token-ring" aria-hidden />
                <span className="map-token-face">
                  <span className="map-token-shine" aria-hidden />
                  <TokenIcon type={token.type} className="map-token-icon" />
                </span>
              </div>
            </div>

            {showNameEditor ? (
              <input
                ref={labelInputRef}
                type="text"
                className="map-token-name-input"
                value={labelDraft}
                placeholder="Nome pedina..."
                maxLength={32}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onLabelDraftChange(e.target.value)}
                onBlur={onLabelCommit}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
              />
            ) : name ? (
              <span className="map-token-label">{name}</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
