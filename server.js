import express from 'express';
import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { Server } from 'socket.io';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'dungeon-secret-change-me';
const DATA_DIR = path.join(__dirname, 'data');
const PROJECTS_DIR = path.join(DATA_DIR, 'projects');
const FOG_DIR = path.join(DATA_DIR, 'fog');
const TOKENS_DIR = path.join(DATA_DIR, 'tokens');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const DIST_DIR = path.join(__dirname, 'dist');
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);
const SUPPORTED_FORMATS = 'PNG, JPG, JPEG, WEBP, GIF, SVG';
const MAX_UPLOAD_MB = 50;
const PASSWORD_SALT = 'dungeon-viewer';

function sanitizeRelativePath(relPath = '') {
  const cleaned = String(relPath)
    .replace(/\\/g, '/')
    .split('/')
    .filter((part) => part && part !== '.' && part !== '..')
    .join('/');
  return cleaned;
}

function mapUrl(relPath) {
  return `/api/maps/${relPath.split('/').map(encodeURIComponent).join('/')}`;
}

function masterMiddleware(req, res, next) {
  if (req.user?.role !== 'master') {
    return res.status(403).json({ error: 'Solo il Master può eseguire questa operazione' });
  }
  next();
}

function safeFilename(originalname) {
  const ext = path.extname(originalname).toLowerCase();
  const base = path.basename(originalname, ext)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80) || 'mappa';
  return `${base}${ext}`;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (IMAGE_EXT.has(ext)) cb(null, true);
    else cb(new Error(`Formato non supportato. Usa: ${SUPPORTED_FORMATS}`));
  },
});

function ensureDataDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  fs.mkdirSync(FOG_DIR, { recursive: true });
  fs.mkdirSync(TOKENS_DIR, { recursive: true });
}

ensureDataDirs();

function hashPassword(password) {
  return crypto.scryptSync(password, PASSWORD_SALT, 64).toString('hex');
}

function verifyPassword(password, hash) {
  const a = Buffer.from(hashPassword(password), 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function ensureUsers() {
  if (fs.existsSync(USERS_FILE)) {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  }
  const users = [
    { id: 1, username: 'master', password: hashPassword('master'), role: 'master' },
    { id: 2, username: 'player', password: hashPassword('player'), role: 'player' },
  ];
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  return users;
}

let users = ensureUsers();

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non autenticato' });
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    return res.status(401).json({ error: 'Token non valido' });
  }
}

function scanDirectory(dir, relativePath = '') {
  if (!fs.existsSync(dir)) return { folders: [], maps: [] };
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const folders = [];
  const maps = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      const sub = scanDirectory(fullPath, relPath);
      folders.push({ id: relPath, name: entry.name, folders: sub.folders, maps: sub.maps });
    } else if (IMAGE_EXT.has(path.extname(entry.name).toLowerCase())) {
      maps.push({
        id: relPath,
        name: path.parse(entry.name).name,
        filename: entry.name,
        url: mapUrl(relPath),
      });
    }
  }

  folders.sort((a, b) => a.name.localeCompare(b.name));
  maps.sort((a, b) => a.name.localeCompare(b.name));
  return { folders, maps };
}

const fogStates = new Map();

function getFogPath(mapId) {
  return path.join(FOG_DIR, `${mapId.replace(/[/\\]/g, '_')}.json`);
}

function loadFogState(mapId) {
  if (fogStates.has(mapId)) return fogStates.get(mapId);
  const fogPath = getFogPath(mapId);
  if (fs.existsSync(fogPath)) {
    const data = JSON.parse(fs.readFileSync(fogPath, 'utf-8'));
    fogStates.set(mapId, data);
    return data;
  }
  const initial = { revealed: [], hidden: [] };
  fogStates.set(mapId, initial);
  return initial;
}

function saveFogState(mapId, state) {
  fogStates.set(mapId, state);
  fs.writeFileSync(getFogPath(mapId), JSON.stringify(state, null, 2));
}

const tokenStates = new Map();

function getTokensPath(mapId) {
  return path.join(TOKENS_DIR, `${mapId.replace(/[/\\]/g, '_')}.json`);
}

function loadTokenState(mapId) {
  if (tokenStates.has(mapId)) return tokenStates.get(mapId);
  const tokensPath = getTokensPath(mapId);
  if (fs.existsSync(tokensPath)) {
    const data = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'));
    tokenStates.set(mapId, data);
    return data;
  }
  const initial = { tokens: [] };
  tokenStates.set(mapId, initial);
  return initial;
}

function saveTokenState(mapId, state) {
  tokenStates.set(mapId, state);
  fs.mkdirSync(TOKENS_DIR, { recursive: true });
  fs.writeFileSync(getTokensPath(mapId), JSON.stringify(state, null, 2));
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username e password richiesti' });
  }
  const user = users.find((u) => u.username === username);
  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).json({ error: 'Credenziali non valide' });
  }
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

app.get('/api/auth/me', (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non autenticato' });
  }
  try {
    const user = verifyToken(header.slice(7));
    res.json({ user: { id: user.id, username: user.username, role: user.role } });
  } catch {
    res.status(401).json({ error: 'Token non valido' });
  }
});

app.get('/api/projects', authMiddleware, (_req, res) => {
  res.json(scanDirectory(PROJECTS_DIR));
});

app.get('/api/projects/:projectId(*)', authMiddleware, (req, res) => {
  const projectPath = path.join(PROJECTS_DIR, req.params.projectId);
  if (!fs.existsSync(projectPath) || !fs.statSync(projectPath).isDirectory()) {
    return res.status(404).json({ error: 'Progetto non trovato' });
  }
  res.json(scanDirectory(projectPath, req.params.projectId));
});

app.get('/api/formats', authMiddleware, (_req, res) => {
  res.json({ formats: [...IMAGE_EXT], label: SUPPORTED_FORMATS, maxMb: MAX_UPLOAD_MB });
});

app.post('/api/projects/folder', authMiddleware, masterMiddleware, (req, res) => {
  let fullPath = '';
  if (req.body.path) {
    fullPath = sanitizeRelativePath(req.body.path);
  } else {
    const name = String(req.body.name || '').trim().replace(/[\\/:*?"<>|]/g, '_');
    if (!name) return res.status(400).json({ error: 'Nome cartella richiesto' });
    const parent = sanitizeRelativePath(req.body.parent || '');
    fullPath = parent ? `${parent}/${name}` : name;
  }
  if (!fullPath) return res.status(400).json({ error: 'Percorso cartella richiesto' });
  const folderPath = path.join(PROJECTS_DIR, fullPath);
  fs.mkdirSync(folderPath, { recursive: true });
  res.json({ id: fullPath, name: path.basename(fullPath) });
});

app.post('/api/upload', authMiddleware, masterMiddleware, (req, res) => {
  upload.array('files', 20)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Caricamento fallito' });
    }
    if (!req.files?.length) {
      return res.status(400).json({ error: 'Nessun file selezionato' });
    }
    const folder = sanitizeRelativePath(req.body.folder || '');
    const destDir = path.join(PROJECTS_DIR, folder);
    fs.mkdirSync(destDir, { recursive: true });

    const uploaded = req.files.map((file) => {
      const filename = safeFilename(file.originalname);
      fs.writeFileSync(path.join(destDir, filename), file.buffer);
      const relPath = folder ? `${folder}/${filename}` : filename;
      return {
        id: relPath,
        name: path.parse(filename).name,
        filename,
        url: mapUrl(relPath),
      };
    });
    res.json({ uploaded, folder: folder || '/', tree: scanDirectory(PROJECTS_DIR) });
  });
});

app.use('/api/maps', express.static(PROJECTS_DIR, {
  setHeaders(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.svg') res.setHeader('Content-Type', 'image/svg+xml');
  },
}));

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Token mancante'));
  try {
    socket.user = verifyToken(token);
    next();
  } catch {
    next(new Error('Token non valido'));
  }
});

io.on('connection', (socket) => {
  socket.on('join-map', ({ mapId }) => {
    socket.join(mapId);
    socket.emit('fog-state', loadFogState(mapId));
    socket.emit('tokens-state', loadTokenState(mapId));
  });

  socket.on('leave-map', ({ mapId }) => socket.leave(mapId));

  socket.on('reveal-area', ({ mapId, area }) => {
    if (socket.user.role !== 'master') return;
    const state = loadFogState(mapId);
    state.revealed.push(area);
    saveFogState(mapId, state);
    io.to(mapId).emit('fog-updated', state);
  });

  socket.on('hide-area', ({ mapId, area }) => {
    if (socket.user.role !== 'master') return;
    const state = loadFogState(mapId);
    state.hidden.push(area);
    saveFogState(mapId, state);
    io.to(mapId).emit('fog-updated', state);
  });

  socket.on('reset-fog', ({ mapId }) => {
    if (socket.user.role !== 'master') return;
    const state = { revealed: [], hidden: [] };
    saveFogState(mapId, state);
    io.to(mapId).emit('fog-updated', state);
  });

  socket.on('reveal-all', ({ mapId }) => {
    if (socket.user.role !== 'master') return;
    const state = { revealed: [{ type: 'all' }], hidden: [] };
    saveFogState(mapId, state);
    io.to(mapId).emit('fog-updated', state);
  });

  socket.on('token-add', ({ mapId, token }) => {
    if (socket.user.role !== 'master' || !token?.type) return;
    const state = loadTokenState(mapId);
    const entry = {
      id: crypto.randomUUID(),
      type: String(token.type),
      label: String(token.label || ''),
      x: Number(token.x) || 0,
      y: Number(token.y) || 0,
      size: Number(token.size) || 48,
    };
    state.tokens.push(entry);
    saveTokenState(mapId, state);
    io.to(mapId).emit('tokens-updated', state);
  });

  socket.on('token-move', ({ mapId, id, x, y }) => {
    if (socket.user.role !== 'master' || !id) return;
    const state = loadTokenState(mapId);
    const entry = state.tokens.find((t) => t.id === id);
    if (!entry) return;
    entry.x = Number(x) || 0;
    entry.y = Number(y) || 0;
    saveTokenState(mapId, state);
    io.to(mapId).emit('tokens-updated', state);
  });

  socket.on('token-update', ({ mapId, id, label }) => {
    if (socket.user.role !== 'master' || !id) return;
    const state = loadTokenState(mapId);
    const entry = state.tokens.find((t) => t.id === id);
    if (!entry) return;
    if (label !== undefined) entry.label = String(label);
    saveTokenState(mapId, state);
    io.to(mapId).emit('tokens-updated', state);
  });

  socket.on('token-remove', ({ mapId, id }) => {
    if (socket.user.role !== 'master' || !id) return;
    const state = loadTokenState(mapId);
    state.tokens = state.tokens.filter((t) => t.id !== id);
    saveTokenState(mapId, state);
    io.to(mapId).emit('tokens-updated', state);
  });

  socket.on('tokens-clear', ({ mapId }) => {
    if (socket.user.role !== 'master') return;
    const state = { tokens: [] };
    saveTokenState(mapId, state);
    io.to(mapId).emit('tokens-updated', state);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Dungeon Viewer su http://0.0.0.0:${PORT}`);
});
