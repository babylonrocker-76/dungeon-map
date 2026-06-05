import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './auth';

const ACCEPT = '.png,.jpg,.jpeg,.webp,.gif,.svg';

function flattenFolders(folders, prefix = '') {
  const result = [{ id: '', label: '— Radice (nessuna cartella) —' }];
  for (const f of folders || []) {
    const label = prefix ? `${prefix} / ${f.name}` : f.name;
    result.push({ id: f.id, label });
    result.push(...flattenFolders(f.folders, label));
  }
  return result;
}

function countMaps(folder) {
  let count = folder.maps?.length || 0;
  for (const sub of folder.folders || []) count += countMaps(sub);
  return count;
}

function findFolderByPath(tree, folderPath) {
  if (!folderPath) return tree;
  let current = tree;
  for (const part of folderPath.split('/')) {
    const folder = current.folders?.find((f) => f.name === part);
    if (!folder) return null;
    current = folder;
  }
  return current;
}

export default function Dashboard() {
  const { user, logout, api, uploadFiles } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [data, setData] = useState(null);
  const [currentPath, setCurrentPath] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [targetFolder, setTargetFolder] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [formats, setFormats] = useState({ label: 'PNG, JPG, JPEG, WEBP, GIF, SVG', maxMb: 50 });
  const isMaster = user.role === 'master';

  useEffect(() => {
    setTargetFolder(currentPath || '');
  }, [currentPath]);

  const loadProjects = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const result = await api('/projects');
      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
    api('/formats').then(setFormats).catch(() => {});
  }, []);

  const resolveUploadPath = () => {
    const created = newFolderName.trim()
      .replace(/\\/g, '/')
      .split('/')
      .map((s) => s.trim().replace(/[\\/:*?"<>|]/g, '_'))
      .filter(Boolean)
      .join('/');
    if (created) {
      return targetFolder ? `${targetFolder}/${created}` : created;
    }
    return targetFolder;
  };

  const applyFolderPath = (folderPath) => {
    if (folderPath) {
      setCurrentPath(folderPath);
      setTargetFolder(folderPath);
    }
  };

  const createFolderOnly = async () => {
    const folderPath = resolveUploadPath();
    if (!folderPath) {
      setError('Inserisci un nome per la nuova cartella');
      return;
    }
    setError('');
    try {
      await api('/projects/folder', {
        method: 'POST',
        body: JSON.stringify({ path: folderPath }),
      });
      setNewFolderName('');
      const result = await loadProjects(true);
      if (result) applyFolderPath(folderPath);
      setUploadMsg(`Cartella "${folderPath}" creata`);
    } catch (err) {
      setError(err.message);
    }
  };

  const addPendingFiles = (fileList) => {
    const valid = [...fileList].filter((f) => /\.(png|jpe?g|webp|gif|svg)$/i.test(f.name));
    if (!valid.length) {
      setError('Seleziona un file immagine valido (PNG, JPG, WEBP, GIF, SVG)');
      return;
    }
    setPendingFiles((prev) => [...prev, ...valid]);
    setError('');
  };

  const handleUpload = async () => {
    if (!pendingFiles.length) return;
    setUploading(true);
    setUploadMsg('');
    setError('');
    try {
      const folder = resolveUploadPath();
      const formData = new FormData();
      if (folder) formData.append('folder', folder);
      for (const file of pendingFiles) formData.append('files', file);

      const result = await uploadFiles(formData);
      if (result.tree) setData(result.tree);
      else await loadProjects(true);

      setUploadMsg(`${result.uploaded.length} mappa/e caricata/e in "${folder || 'radice'}"`);
      setPendingFiles([]);
      setNewFolderName('');
      applyFolderPath(folder);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (!isMaster) return;
    addPendingFiles(e.dataTransfer.files);
  };

  const folderOptions = flattenFolders(data?.folders);
  const uploadDestination = resolveUploadPath();
  const content = currentPath
    ? (findFolderByPath(data, currentPath) || { folders: [], maps: [] })
    : (data || { folders: [], maps: [] });
  const segments = currentPath ? currentPath.split('/') : [];

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-brand"><span>⚔</span><h1>Dungeon Viewer</h1></div>
        <div className="header-user">
          <span className={`role-badge role-${user.role}`}>{isMaster ? 'Master' : 'Giocatore'}</span>
          <span className="username">{user.username}</span>
          <button className="btn-logout" onClick={logout}>Esci</button>
        </div>
      </header>
      <main className="dashboard-main">
        {segments.length > 0 && (
          <nav className="breadcrumb">
            <button onClick={() => setCurrentPath(null)}>Progetti</button>
            {segments.map((seg, i) => (
              <span key={i}>
                <span className="breadcrumb-sep">›</span>
                <button onClick={() => setCurrentPath(segments.slice(0, i + 1).join('/'))}>{seg}</button>
              </span>
            ))}
          </nav>
        )}

        {isMaster && (
          <section className="upload-panel">
            <h2>Carica mappe</h2>
            <p className="upload-info">
              Formati: <strong>{formats.label}</strong> — max {formats.maxMb} MB
            </p>

            <div className="upload-folder-fields">
              <label>
                <span>Cartella esistente</span>
                <select value={targetFolder} onChange={(e) => setTargetFolder(e.target.value)}>
                  {folderOptions.map((opt) => (
                    <option key={opt.id || 'root'} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Oppure crea nuova cartella</span>
                <input
                  type="text"
                  placeholder="Es. Forgia dei Nani / Livello 1"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                />
              </label>
            </div>
            <p className="upload-destination">
              Destinazione: <code>{uploadDestination || 'radice'}</code>
            </p>

            <div className="upload-actions" style={{ marginTop: 0, marginBottom: '1rem' }}>
              <button type="button" className="btn-clear" onClick={createFolderOnly} disabled={!resolveUploadPath()}>
                Crea cartella
              </button>
            </div>

            <div
              className={`upload-dropzone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                multiple
                hidden
                onChange={(e) => { addPendingFiles(e.target.files); e.target.value = ''; }}
              />
              <p>Trascina le immagini qui o clicca per selezionarle</p>
            </div>

            {pendingFiles.length > 0 && (
              <ul className="upload-file-list">
                {pendingFiles.map((f, i) => (
                  <li key={`${f.name}-${i}`}>
                    {f.name}
                    <button type="button" onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}>×</button>
                  </li>
                ))}
              </ul>
            )}

            <div className="upload-actions">
              <button type="button" className="btn-upload" onClick={handleUpload} disabled={uploading || !pendingFiles.length}>
                {uploading ? 'Caricamento...' : `Carica ${pendingFiles.length} file`}
              </button>
              {pendingFiles.length > 0 && (
                <button type="button" className="btn-clear" onClick={() => setPendingFiles([])}>Annulla</button>
              )}
            </div>
            {uploadMsg && <p className="upload-success">{uploadMsg}</p>}
          </section>
        )}

        {loading && <p className="status-msg">Caricamento...</p>}
        {error && <p className="status-msg error">{error}</p>}

        {!loading && (
          <>
            {content.folders?.length > 0 && (
              <section className="section">
                <h2>Cartelle</h2>
                <div className="folder-grid">
                  {content.folders.map((f) => (
                    <button key={f.id} className="folder-card" onClick={() => setCurrentPath(f.id)}>
                      <span className="folder-icon">📁</span>
                      <div><h3>{f.name}</h3><span>{countMaps(f)} mappe</span></div>
                    </button>
                  ))}
                </div>
              </section>
            )}
            {content.maps?.length > 0 && (
              <section className="section">
                <h2>Mappe</h2>
                <div className="map-grid">
                  {content.maps.map((map) => (
                    <button key={map.id} className="map-card" onClick={() => navigate(`/map/${map.id.split('/').map(encodeURIComponent).join('/')}`, { state: { map } })}>
                      <div className="map-thumb">
                        <img src={map.url} alt={map.name} loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
                      </div>
                      <h3>{map.name}</h3>
                    </button>
                  ))}
                </div>
              </section>
            )}
            {!content.folders?.length && !content.maps?.length && !loading && (
              <div className="empty-state">
                <p>Nessuna mappa in questa cartella.</p>
                {isMaster ? (
                  <p className="hint">Crea una cartella e carica PNG, JPG, WEBP, GIF o SVG.</p>
                ) : (
                  <p className="hint">Il Master deve caricare le mappe dalla sua sessione.</p>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
