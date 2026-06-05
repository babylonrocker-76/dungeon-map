import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from './auth';

const BRUSH_SIZES = [20, 40, 60, 100, 150];
const FOG_COLOR = '#08060c';

function isAllRevealed(fogState) {
  return fogState.revealed?.some((a) => a.type === 'all');
}

function drawFogOverlay(ctx, width, height, fogState, preview = false) {
  ctx.clearRect(0, 0, width, height);
  if (isAllRevealed(fogState)) return;

  const fogAlpha = preview ? 0.42 : 0.94;
  const fogEdge = preview ? 0.32 : 0.85;

  ctx.fillStyle = `rgba(8, 6, 12, ${fogAlpha})`;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = 'destination-out';
  for (const area of fogState.revealed || []) {
    if (area.type === 'circle') {
      ctx.beginPath();
      ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalCompositeOperation = 'source-over';
  for (const area of fogState.hidden || []) {
    if (area.type === 'circle') {
      const grad = ctx.createRadialGradient(area.x, area.y, 0, area.x, area.y, area.radius);
      grad.addColorStop(0, `rgba(8, 6, 12, ${fogAlpha})`);
      grad.addColorStop(0.7, `rgba(8, 6, 12, ${fogEdge})`);
      grad.addColorStop(1, 'rgba(8, 6, 12, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPlayerView(ctx, img, width, height, fogState) {
  ctx.clearRect(0, 0, width, height);

  if (isAllRevealed(fogState)) {
    ctx.drawImage(img, 0, 0);
    return;
  }

  const revealed = fogState.revealed || [];
  if (revealed.length === 0) {
    ctx.fillStyle = FOG_COLOR;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  ctx.fillStyle = FOG_COLOR;
  ctx.fillRect(0, 0, width, height);

  for (const area of revealed) {
    if (area.type === 'circle') {
      ctx.save();
      ctx.beginPath();
      ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    }
  }

  for (const area of fogState.hidden || []) {
    if (area.type === 'circle') {
      const grad = ctx.createRadialGradient(area.x, area.y, 0, area.x, area.y, area.radius);
      grad.addColorStop(0, 'rgba(8, 6, 12, 0.94)');
      grad.addColorStop(0.7, 'rgba(8, 6, 12, 0.85)');
      grad.addColorStop(1, 'rgba(8, 6, 12, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export default function MapViewer() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMaster = user.role === 'master';

  const rawId = params['*'] || '';
  const decodedId = decodeURIComponent(rawId);
  const map = location.state?.map || {
    id: decodedId,
    name: decodedId.split('/').pop(),
    url: `/api/maps/${decodedId.split('/').map(encodeURIComponent).join('/')}`,
  };

  const canvasRef = useRef(null);
  const fogCanvasRef = useRef(null);
  const socketRef = useRef(null);
  const imageRef = useRef(null);
  const isDrawingRef = useRef(false);
  const modeRef = useRef('reveal');
  const brushSizeRef = useRef(60);
  const isPanningRef = useRef(false);
  const lastPanRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const [fogState, setFogState] = useState({ revealed: [], hidden: [] });
  const [brushSize, setBrushSize] = useState(60);
  const [mode, setMode] = useState('reveal');
  const [fogPreviewEnabled, setFogPreviewEnabled] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isPanning, setIsPanning] = useState(false);

  useEffect(() => { modeRef.current = mode; brushSizeRef.current = brushSize; }, [mode, brushSize]);

  const renderScene = useCallback(() => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img?.naturalWidth || !canvas) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');

    if (isMaster) {
      ctx.drawImage(img, 0, 0);
    } else {
      drawPlayerView(ctx, img, canvas.width, canvas.height, fogState);
    }

    const fogCanvas = fogCanvasRef.current;
    if (isMaster && fogPreviewEnabled && fogCanvas && !isAllRevealed(fogState)) {
      fogCanvas.width = img.naturalWidth;
      fogCanvas.height = img.naturalHeight;
      drawFogOverlay(fogCanvas.getContext('2d'), fogCanvas.width, fogCanvas.height, fogState, true);
    }
  }, [fogState, isMaster, fogPreviewEnabled]);

  const showFogOverlay = isMaster && fogPreviewEnabled && !isAllRevealed(fogState);

  useLayoutEffect(() => {
    if (imageLoaded) renderScene();
  }, [imageLoaded, renderScene, showFogOverlay]);

  useEffect(() => {
    const socket = io({
      path: '/socket.io',
      auth: { token: localStorage.getItem('token') },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-map', { mapId: map.id });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));
    socket.on('fog-state', setFogState);
    socket.on('fog-updated', setFogState);

    return () => {
      socket.emit('leave-map', { mapId: map.id });
      socket.disconnect();
    };
  }, [map.id]);

  useEffect(() => {
    setLoadError('');
    setImageLoaded(false);
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.onerror = () => setLoadError('Impossibile caricare la mappa. Verifica che il file esista.');
    img.src = map.url;
  }, [map.url]);

  const getMapCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const emitArea = (coords) => {
    const area = { type: 'circle', x: coords.x, y: coords.y, radius: brushSizeRef.current };
    const event = modeRef.current === 'reveal' ? 'reveal-area' : 'hide-area';
    socketRef.current?.emit(event, { mapId: map.id, area });
  };

  const shouldPan = (e) => {
    if (e.button === 1 || e.button === 2) return true;
    if (e.button === 0 && e.altKey) return true;
    if (!isMaster) return e.button === 0;
    if (modeRef.current === 'pan' && e.button === 0) return true;
    return false;
  };

  const handlePointerDown = (e) => {
    if (shouldPan(e)) {
      e.preventDefault();
      isPanningRef.current = true;
      setIsPanning(true);
      lastPanRef.current = { x: e.clientX, y: e.clientY };
      containerRef.current?.setPointerCapture(e.pointerId);
      return;
    }
    if (!isMaster || modeRef.current === 'pan') return;
    isDrawingRef.current = true;
    emitArea(getMapCoords(e));
  };

  const handlePointerMove = (e) => {
    if (isPanningRef.current) {
      const dx = e.clientX - lastPanRef.current.x;
      const dy = e.clientY - lastPanRef.current.y;
      lastPanRef.current = { x: e.clientX, y: e.clientY };
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      return;
    }
    if (isDrawingRef.current && isMaster && modeRef.current !== 'pan') {
      emitArea(getMapCoords(e));
    }
  };

  const handlePointerUp = (e) => {
    isDrawingRef.current = false;
    isPanningRef.current = false;
    setIsPanning(false);
    if (containerRef.current?.hasPointerCapture(e.pointerId)) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const handleContextMenu = (e) => {
    if (isMaster && modeRef.current !== 'pan') e.preventDefault();
  };

  return (
    <div className="map-viewer">
      <header className="viewer-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Progetti</button>
        <h1>{map.name}</h1>
        <div className="viewer-status">
          <span className={`conn-dot ${connected ? 'online' : 'offline'}`} />
          <span>{isMaster ? 'Vista Master' : 'Vista Giocatore'}</span>
        </div>
      </header>

      {isMaster && (
        <div className="master-toolbar">
          <div className="tool-group">
            <button className={mode === 'pan' ? 'active' : ''} onClick={() => setMode('pan')}>Sposta</button>
            <button className={mode === 'reveal' ? 'active' : ''} onClick={() => setMode('reveal')}>Rivela</button>
            <button className={mode === 'hide' ? 'active' : ''} onClick={() => setMode('hide')}>Oscura</button>
          </div>
          <div className="tool-group">
            {BRUSH_SIZES.map((s) => (
              <button key={s} className={brushSize === s ? 'active' : ''} onClick={() => setBrushSize(s)}>{s}</button>
            ))}
          </div>
          <div className="tool-group">
            <button onClick={() => socketRef.current?.emit('reset-fog', { mapId: map.id })}>Reset nebbia</button>
            <button onClick={() => socketRef.current?.emit('reveal-all', { mapId: map.id })}>Rivela tutto</button>
            <label className="fog-preview-toggle">
              <input type="checkbox" checked={fogPreviewEnabled} onChange={(e) => setFogPreviewEnabled(e.target.checked)} />
              Anteprima nebbia
            </label>
          </div>
        </div>
      )}

      {!isMaster && (
        <div className="player-hint">
          {connected
            ? 'Trascina con il mouse per spostare la mappa. Vedi solo le aree rivelate dal Master.'
            : 'Connessione in corso...'}
        </div>
      )}
      {isMaster && mode !== 'pan' && (
        <div className="player-hint">Tasto destro o Alt+trascina per spostare la mappa senza cambiare strumento.</div>
      )}
      {loadError && <div className="player-hint" style={{ color: '#e8a0a0' }}>{loadError}</div>}

      <div
        ref={containerRef}
        className={`map-container ${isPanning ? 'is-panning' : ''} ${!isMaster || mode === 'pan' ? 'pan-mode' : 'draw-mode'}`}
        onWheel={(e) => { e.preventDefault(); setZoom((z) => Math.min(4, Math.max(0.25, z + (e.deltaY > 0 ? -0.1 : 0.1)))); }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={handleContextMenu}
      >
        <div className="map-transform" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
          <div className="map-canvas-wrap">
            <canvas ref={canvasRef} className="map-canvas" />
            {showFogOverlay && <canvas ref={fogCanvasRef} className="fog-canvas" />}
          </div>
        </div>
      </div>

      <div className="zoom-controls">
        <button onClick={() => setZoom((z) => Math.min(4, z + 0.25))}>+</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}>−</button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Reset</button>
      </div>
    </div>
  );
}
