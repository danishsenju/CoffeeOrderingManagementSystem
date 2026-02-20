// src/components/Admin/BaristaManager.js
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserPlus, Users, Eye, EyeOff, Trash2, Coffee, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import './BaristaManager.css';

function BaristaManager() {
  const { createBarista, getBaristas, deleteBarista } = useAuth();

  const [baristas, setBaristas]         = useState([]);
  const [loadingList, setLoadingList]   = useState(true);
  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [confirmPass, setConfirmPass]   = useState('');
  const [showPass, setShowPass]         = useState(false);
  const [creating, setCreating]         = useState(false);
  const [deletingId, setDeletingId]     = useState(null);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');

  useEffect(() => { fetchBaristas(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchBaristas() {
    setLoadingList(true);
    try {
      const list = await getBaristas();
      setBaristas(list);
    } catch (err) {
      setError('Failed to load baristas: ' + err.message);
    }
    setLoadingList(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim() || !password.trim()) {
      setError('Username and password are required.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      setError('Username may only contain letters, numbers, and underscores.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPass) {
      setError('Passwords do not match.');
      return;
    }

    setCreating(true);
    try {
      await createBarista(username.trim(), password);
      setSuccess(`Barista "${username.trim()}" registered successfully!`);
      setUsername('');
      setPassword('');
      setConfirmPass('');
      await fetchBaristas();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      let msg = err.message;
      if (err.code === 'auth/email-already-in-use') msg = 'This username is already taken.';
      setError(msg);
    }
    setCreating(false);
  }

  async function handleDelete(uid, bUsername) {
    if (!window.confirm(`Remove barista "${bUsername}"? They will no longer be able to log in.`)) return;
    setDeletingId(uid);
    try {
      await deleteBarista(uid);
      setBaristas(prev => prev.filter(b => b.id !== uid));
      setSuccess(`Barista "${bUsername}" removed.`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError('Failed to remove barista: ' + err.message);
    }
    setDeletingId(null);
  }

  return (
    <div className="barista-manager">

      {/* Messages */}
      {error   && <div className="bm-message bm-error"><AlertTriangle size={16} />{error}</div>}
      {success && <div className="bm-message bm-success"><CheckCircle size={16} />{success}</div>}

      <div className="bm-grid">

        {/* ── Register form ── */}
        <div className="bm-card">
          <div className="bm-card-header">
            <span className="bm-card-icon"><UserPlus size={20} /></span>
            <div>
              <h3>Register New Barista</h3>
              <p>Create login credentials for a new staff member</p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="bm-form">
            <div className="bm-field">
              <label htmlFor="bm-username">Username</label>
              <input
                id="bm-username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. john_barista"
                required
                autoComplete="off"
              />
            </div>

            <div className="bm-field">
              <label htmlFor="bm-password">Password</label>
              <div className="bm-pass-wrap">
                <input
                  id="bm-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="bm-pass-toggle"
                  onClick={() => setShowPass(v => !v)}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="bm-field">
              <label htmlFor="bm-confirm">Confirm Password</label>
              <input
                id="bm-confirm"
                type={showPass ? 'text' : 'password'}
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                placeholder="Re-enter password"
                required
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="bm-submit-btn" disabled={creating}>
              {creating ? <><span className="bm-spinner" />Registering…</> : '+ Register Barista'}
            </button>
          </form>
        </div>

        {/* ── Barista list ── */}
        <div className="bm-card">
          <div className="bm-card-header">
            <span className="bm-card-icon"><Users size={20} /></span>
            <div>
              <h3>Active Baristas</h3>
              <p>{baristas.length} staff member{baristas.length !== 1 ? 's' : ''} registered</p>
            </div>
          </div>

          {loadingList ? (
            <div className="bm-loading">
              <span className="bm-spinner" />
              <span>Loading…</span>
            </div>
          ) : baristas.length === 0 ? (
            <div className="bm-empty">
              <span className="bm-empty-icon"><Coffee size={32} /></span>
              <p>No baristas registered yet</p>
              <p className="bm-empty-sub">Use the form to add your first staff member.</p>
            </div>
          ) : (
            <ul className="bm-list">
              {baristas.map(b => (
                <li key={b.id} className="bm-item">
                  <div className="bm-item-avatar">
                    {(b.username || b.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="bm-item-info">
                    <span className="bm-item-email">{b.username || b.email}</span>
                    {b.createdAt && (
                      <span className="bm-item-date">
                        Added {b.createdAt.toDate
                          ? b.createdAt.toDate().toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'
                        }
                      </span>
                    )}
                  </div>
                  <span className="bm-role-badge">Barista</span>
                  <button
                    className="bm-delete-btn"
                    onClick={() => handleDelete(b.id, b.username || b.email)}
                    disabled={deletingId === b.id}
                    title="Remove barista"
                  >
                    {deletingId === b.id ? '…' : <Trash2 size={16} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Info box */}
      <div className="bm-info">
        <span className="bm-info-icon"><Info size={16} /></span>
        <div>
          <strong>How it works:</strong> Barista accounts are stored in Firebase Authentication.
          Removing a barista here revokes their app access immediately.
          Their Firebase Auth account is kept for audit purposes but they won't be able to log in.
        </div>
      </div>
    </div>
  );
}

export default BaristaManager;
