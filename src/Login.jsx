import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './auth';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-emblem">⚔</div>
        <h1>Dungeon Viewer</h1>
        <p className="login-subtitle">Mappe per le tue sessioni di D&amp;D</p>
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}
          <label>
            <span>Utente</span>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </label>
          <label>
            <span>Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Accesso in corso...' : 'Entra'}
          </button>
        </form>
        <div className="login-hint">
          <p><strong>Master:</strong> master / master</p>
          <p><strong>Giocatore:</strong> player / player</p>
        </div>
      </div>
    </div>
  );
}
