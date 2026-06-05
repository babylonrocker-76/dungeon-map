import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './auth';
import { WATABOU_GENERATORS, buildWatabouUrl, randomSeed } from './watabouGenerators';

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
  const [watabouId, setWatabouId] = useState('dungeon');
  const [watabouSeed, setWatabouSeed] = useState('');
  const [watabouTags, setWatabouTags] = useState([]);
  const [watabouCitySize, setWatabouCitySize] = useState(15);
  const [watabouCityToggles, setWatabouCityToggles] = useState({ walls: 1, river: 1, citadel: 0, coast: 0 });
  const [watabouMsg, setWatabouMsg] = useState('');
  const isMaster = user.role === 'master';

  const watabouGen = useMemo(
    () => WATABOU_GENERATORS.find((g) => g.id === watabouId) || WATABOU_GENERATORS[0],
    [watabouId],
  );

  const watabouOptions = useMemo(() => ({
    seed: watabouSeed,
    tags: watabouTags,
    citySize: watabouCitySize,
    cityToggles: watabouCityToggles,
  }), [watabouSeed, watabouTags, watabouCitySize, watabouCityToggles]);

  const openWatabou = (exportPng) => {
    const url = buildWatabouUrl(watabouGen, { ...watabouOptions, exportPng });
    window.open(url, '_blank', 'noopener,noreferrer');
    if (exportPng && watabouGen.autoExport) {
      setWatabouMsg('Il PNG dovrebbe scaricarsi automaticamente. Trascinalo nella zona «Carica mappe» qui sotto.');
    } else if (exportPng) {
      setWatabouMsg('Apri il menu contestuale (tasto destro) sul generatore e scegli «Save as PNG», poi carica il file qui sotto.');
    } else {
      setWatabouMsg('Generatore aperto in una nuova scheda. Esporta il PNG e caricalo qui sotto.');
    }
  };

  const toggleWatabouTag = (tagId) => {
    setWatabouTags((prev) => (
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    ));
  };

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
          <section className="watabou-panel">
            <h2>Genera da watabou</h2>
            <p className="watabou-info">
              Crea mappe procedurali con i generatori di{' '}
              <a href="https://watabou.itch.io/" target="_blank" rel="noopener noreferrer">watabou.itch.io</a>
              , poi caricale nella sessione.
            </p>

            <div className="watabou-fields">
              <label>
                <span>Generatore</span>
                <select value={watabouId} onChange={(e) => { setWatabouId(e.target.value); setWatabouMsg(''); }}>
                  {WATABOU_GENERATORS.map((g) => (
                    <option key={g.id} value={g.id}>{g.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Seed (opzionale)</span>
                <div className="watabou-seed-row">
                  <input
                    type="text"
                    placeholder="Lascia vuoto per casuale"
                    value={watabouSeed}
                    onChange={(e) => setWatabouSeed(e.target.value)}
                  />
                  <button type="button" className="btn-clear" onClick={() => setWatabouSeed(randomSeed())}>
                    Casuale
                  </button>
                </div>
              </label>
            </div>

            <p className="watabou-desc">{watabouGen.description}</p>

            {watabouGen.id === 'dungeon' && watabouGen.tags?.length > 0 && (
              <div className="watabou-tags">
                <span className="watabou-tags-label">Tag dungeon</span>
                <div className="watabou-tag-list">
                  {watabouGen.tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      className={`watabou-tag ${watabouTags.includes(tag.id) ? 'active' : ''}`}
                      onClick={() => toggleWatabouTag(tag.id)}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {watabouGen.id === 'city' && (
              <div className="watabou-city-options">
                <label>
                  <span>Dimensione città</span>
                  <input
                    type="range"
                    min={5}
                    max={50}
                    value={watabouCitySize}
                    onChange={(e) => setWatabouCitySize(Number(e.target.value))}
                  />
                  <em>{watabouCitySize} distretti</em>
                </label>
                <div className="watabou-city-toggles">
                  {watabouGen.toggles.map((toggle) => (
                    <label key={toggle.id} className="watabou-toggle">
                      <input
                        type="checkbox"
                        checked={!!(watabouCityToggles[toggle.id] ?? toggle.default)}
                        onChange={(e) => setWatabouCityToggles((prev) => ({
                          ...prev,
                          [toggle.id]: e.target.checked ? 1 : 0,
                        }))}
                      />
                      {toggle.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="watabou-actions">
              {watabouGen.autoExport ? (
                <button type="button" className="btn-upload" onClick={() => openWatabou(true)}>
                  Genera e scarica PNG
                </button>
              ) : (
                <button type="button" className="btn-upload" onClick={() => openWatabou(false)}>
                  Apri generatore
                </button>
              )}
              <button type="button" className="btn-clear" onClick={() => openWatabou(false)}>
                Anteprima
              </button>
              <a
                className="btn-clear watabou-link"
                href={watabouGen.itchUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Su itch.io
              </a>
            </div>

            {!watabouGen.autoExport && (
              <p className="watabou-hint">
                Questo generatore non supporta il download automatico: esporta il PNG con tasto destro → «Save as PNG».
              </p>
            )}
            {watabouMsg && <p className="watabou-success">{watabouMsg}</p>}
          </section>
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
