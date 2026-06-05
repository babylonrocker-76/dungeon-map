import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from './auth';

const BRUSH_SIZES = [20, 40, 60, 100, 150];
const FOG_COLOR = '#08060c';

function isAllRevealed(fogState) {
  return fogState.revealed?.some((a) => a.type === 'all');
}

function cutRevealedArea(ctx, area) {
  ctx.beginPath();
  if (area.type === 'circle') {
    ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
  } else if (area.type === 'rect') {
    ctx.rect(area.x, area.y, area.width, area.height);
  } else return;
  ctx.fill();
}

function clipRevealedArea(ctx, area) {
  ctx.beginPath();
  if (area.type === 'circle') {
    ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
  } else if (area.type === 'rect') {
    ctx.rect(area.x, area.y, area.width, area.height);
  } else return;
  ctx.clip();
}

function drawHiddenArea(ctx, area, fogAlpha, fogEdge) {
  if (area.type === 'circle') {
    const grad = ctx.createRadialGradient(area.x, area.y, 0, area.x, area.y, area.radius);
    grad.addColorStop(0, `rgba(8, 6, 12, ${fogAlpha})`);
    grad.addColorStop(0.7, `rgba(8, 6, 12, ${fogEdge})`);
    grad.addColorStop(1, 'rgba(8, 6, 12, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
    ctx.fill();
  } else if (area.type === 'rect') {
    ctx.fillStyle = `rgba(8, 6, 12, ${fogAlpha})`;
    ctx.fillRect(area.x, area.y, area.width, area.height);
  }
}

function drawFogOverlay(ctx, width, height, fogState, preview = false) {
  ctx.clearRect(0, 0, width, height);
  if (isAllRevealed(fogState)) return;

  const fogAlpha = preview ? 0.42 : 0.94;
  const fogEdge = preview ? 0.32 : 0.85;

  ctx.fillStyle = `rgba(8, 6, 12, ${fogAlpha})`;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = 'destination-out';
  for (const area of fogState.revealed || []) cutRevealedArea(ctx, area);

  ctx.globalCompositeOperation = 'source-over';
  for (const area of fogState.hidden || []) drawHiddenArea(ctx, area, fogAlpha, fogEdge);
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
    if (area.type === 'circle' || area.type === 'rect') {
      ctx.save();
      clipRevealedArea(ctx, area);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    }
  }

  for (const area of fogState.hidden || []) drawHiddenArea(ctx, area, 0.94, 0.85);
}

function normalizeRect(start, end) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
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

  const viewerRef = useRef(null);
  const canvasRef = useRef(null);
  const fogCanvasRef = useRef(null);
  const socketRef = useRef(null);
  const imageRef = useRef(null);
  const isDrawingRef = useRef(false);
  const isRectDraggingRef = useRef(false);
  const rectStartRef = useRef(null);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const modeRef = useRef('reveal');
  const shapeRef = useRef('circle');
  const brushSizeRef = useRef(60);
  const isPanningRef = useRef(false);
  const lastPanRef = useRef({ x: 0, y: 0 });
  const spaceHeldRef = useRef(false);
  const containerRef = useRef(null);

  const [fogState, setFogState] = useState({ revealed: [], hidden: [] });
  const [brushSize, setBrushSize] = useState(60);
  const [mode, setMode] = useState('reveal');
  const [shape, setShape] = useState('circle');
  const [rectPreview, setRectPreview] = useState(null);
  const [fogPreviewEnabled, setFogPreviewEnabled] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isPanning, setIsPanning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    modeRef.current = mode;
    shapeRef.current = shape;
    brushSizeRef.current = brushSize;
  }, [mode, brushSize, shape]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Space') {
        spaceHeldRef.current = true;
        e.preventDefault();
      }
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space') spaceHeldRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!isPanning) return undefined;

    const onMove = (e) => {
      if (!isPanningRef.current) return;
      const dx = e.clientX - lastPanRef.current.x;
      const dy = e.clientY - lastPanRef.current.y;
      lastPanRef.current = { x: e.clientX, y: e.clientY };
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    };

    const onUp = () => {
      isPanningRef.current = false;
      setIsPanning(false);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [isPanning]);

  const renderScene = useCallback(() => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img?.naturalWidth || !canvas) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');

    if (isMaster) {
      ctx.drawImage(img, 0, 0);
      if (rectPreview) {
        ctx.strokeStyle = modeRef.current === 'hide' ? '#cc6666' : '#c9a227';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(rectPreview.x, rectPreview.y, rectPreview.width, rectPreview.height);
        ctx.setLineDash([]);
      }
    } else {
      drawPlayerView(ctx, img, canvas.width, canvas.height, fogState);
    }

    const fogCanvas = fogCanvasRef.current;
    if (isMaster && fogPreviewEnabled && fogCanvas && !isAllRevealed(fogState)) {
      fogCanvas.width = img.naturalWidth;
      fogCanvas.height = img.naturalHeight;
      drawFogOverlay(fogCanvas.getContext('2d'), fogCanvas.width, fogCanvas.height, fogState, true);
    }
  }, [fogState, isMaster, fogPreviewEnabled, rectPreview]);

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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const getMapCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const emitArea = (area) => {
    const event = modeRef.current === 'reveal' ? 'reveal-area' : 'hide-area';
    socketRef.current?.emit(event, { mapId: map.id, area });
  };

  const emitCircle = (coords) => {
    emitArea({ type: 'circle', x: coords.x, y: coords.y, radius: brushSizeRef.current });
  };

  const emitRect = (rect) => {
    if (rect.width < 4 || rect.height < 4) return;
    emitArea({ type: 'rect', x: rect.x, y: rect.y, width: rect.width, height: rect.height });
  };

  const shouldPan = (e) => {
    if (e.button === 1 || e.button === 2) return true;
    if (e.button === 0 && (e.altKey || spaceHeldRef.current)) return true;
    if (!isMaster) return e.button === 0;
    if (modeRef.current === 'pan' && e.button === 0) return true;
    return false;
  };

  const startPan = (e) => {
    e.preventDefault();
    isPanningRef.current = true;
    setIsPanning(true);
    lastPanRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerDown = (e) => {
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    if (shouldPan(e)) {
      startPan(e);
      return;
    }
    if (!isMaster || modeRef.current === 'pan') return;

    if (shapeRef.current === 'rect') {
      isRectDraggingRef.current = true;
      rectStartRef.current = getMapCoords(e);
      setRectPreview({ x: rectStartRef.current.x, y: rectStartRef.current.y, width: 0, height: 0 });
      return;
    }

    isDrawingRef.current = true;
    emitCircle(getMapCoords(e));
  };

  const handlePointerMove = (e) => {
    lastPointerRef.current = { x: e.clientX, y: e.clientY };

    if (isRectDraggingRef.current && rectStartRef.current) {
      setRectPreview(normalizeRect(rectStartRef.current, getMapCoords(e)));
      return;
    }
    if (isDrawingRef.current && isMaster && shapeRef.current === 'circle') {
      emitCircle(getMapCoords(e));
    }
  };

  const finishRectDrag = () => {
    if (isRectDraggingRef.current && rectStartRef.current) {
      const end = getMapCoords({ clientX: lastPointerRef.current.x, clientY: lastPointerRef.current.y });
      emitRect(normalizeRect(rectStartRef.current, end));
    }
    isRectDraggingRef.current = false;
    rectStartRef.current = null;
    setRectPreview(null);
  };

  const handlePointerUp = () => {
    if (isRectDraggingRef.current) finishRectDrag();
    isDrawingRef.current = false;
  };

  return (
    <div className="map-viewer" ref={viewerRef}>
      <header className="viewer-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Progetti</button>
        <h1>{map.name}</h1>
        <div className="viewer-status">
          <span className={`conn-dot ${connected ? 'online' : 'offline'}`} />
          <span>{isMaster ? 'Vista Master' : 'Vista Giocatore'}</span>
          <button type="button" className="btn-fullscreen" onClick={toggleFullscreen}>
            {isFullscreen ? 'Esci schermo intero' : 'Schermo intero'}
          </button>
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
            <button className={shape === 'circle' ? 'active' : ''} onClick={() => setShape('circle')}>Cerchio</button>
            <button className={shape === 'rect' ? 'active' : ''} onClick={() => setShape('rect')}>Rettangolo</button>
          </div>
          {shape === 'circle' && (
            <div className="tool-group">
              {BRUSH_SIZES.map((s) => (
                <button key={s} className={brushSize === s ? 'active' : ''} onClick={() => setBrushSize(s)}>{s}</button>
              ))}
            </div>
          )}
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
            ? 'Trascina per spostare la mappa. Vedi solo le aree rivelate dal Master.'
            : 'Connessione in corso...'}
        </div>
      )}
      {isMaster && mode !== 'pan' && shape === 'rect' && (
        <div className="player-hint">Trascina sulla mappa per selezionare un&apos;area rettangolare da rivelare o oscurare.</div>
      )}
      {isMaster && mode !== 'pan' && shape === 'circle' && (
        <div className="player-hint">Barra spaziatrice, tasto destro o Alt + trascina per spostare la mappa.</div>
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
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          className="map-viewport"
          style={{ transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})` }}
        >
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
