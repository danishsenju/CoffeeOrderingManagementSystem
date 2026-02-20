// src/components/Admin/QRUpload.js
import { useState, useEffect, useRef } from 'react';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { ref as dbRef, set, get } from 'firebase/database';
import { storage, database } from '../../firebase/config';
import './QRUpload.css';

function QRUpload() {
  const [currentQrUrl, setCurrentQrUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchCurrentQr();
  }, []);

  async function fetchCurrentQr() {
    try {
      const snapshot = await get(dbRef(database, 'settings/qrCodeUrl'));
      if (snapshot.exists()) {
        setCurrentQrUrl(snapshot.val());
      }
    } catch (err) {
      console.error('Failed to fetch QR URL:', err);
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, etc.)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB');
      return;
    }

    setError('');
    setPreview(URL.createObjectURL(file));
  }

  async function handleUpload() {
    const file = fileInputRef.current?.files[0];
    if (!file) {
      setError('Please select an image first');
      return;
    }

    setUploading(true);
    setProgress(0);
    setError('');
    setSuccess('');

    const qrStorageRef = storageRef(storage, 'payment-qr/qr.png');
    const uploadTask = uploadBytesResumable(qrStorageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setProgress(pct);
      },
      (err) => {
        console.error('Upload error:', err);
        setError('Upload failed: ' + err.message);
        setUploading(false);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          await set(dbRef(database, 'settings/qrCodeUrl'), downloadURL);
          setCurrentQrUrl(downloadURL);
          setSuccess('QR code uploaded and saved successfully!');
          setPreview(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          setTimeout(() => setSuccess(''), 4000);
        } catch (err) {
          setError('Failed to save QR URL: ' + err.message);
        }
        setUploading(false);
        setProgress(0);
      }
    );
  }

  function handleRemovePreview() {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setError('');
  }

  return (
    <div className="qr-upload">
      {/* Page description */}
      <div className="qr-upload-intro">
        <p>
          Upload your payment QR code here. It will be displayed to baristas during
          checkout when customers select QR payment.
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="qr-message qr-error">
          <span className="qr-msg-icon">⚠</span>
          {error}
        </div>
      )}
      {success && (
        <div className="qr-message qr-success">
          <span className="qr-msg-icon">✓</span>
          {success}
        </div>
      )}

      <div className="qr-upload-grid">

        {/* Current QR */}
        <div className="qr-card">
          <div className="qr-card-header">
            <h3>Current QR Code</h3>
            <span className={`qr-status-dot ${currentQrUrl ? 'active' : 'inactive'}`} />
          </div>
          <div className="qr-display">
            {currentQrUrl ? (
              <img src={currentQrUrl} alt="Current Payment QR" className="qr-img" />
            ) : (
              <div className="qr-empty">
                <span className="qr-empty-icon">📷</span>
                <p>No QR code uploaded yet</p>
                <p className="qr-empty-sub">Upload one using the form on the right</p>
              </div>
            )}
          </div>
          {currentQrUrl && (
            <p className="qr-card-note">
              This QR code is live and visible to baristas during payment.
            </p>
          )}
        </div>

        {/* Upload form */}
        <div className="qr-card">
          <div className="qr-card-header">
            <h3>Upload New QR Code</h3>
          </div>

          {/* Drop / click area */}
          <label
            className={`qr-dropzone ${preview ? 'has-preview' : ''}`}
            htmlFor="qr-file-input"
          >
            {preview ? (
              <>
                <img src={preview} alt="Preview" className="qr-preview-img" />
                <div className="qr-preview-overlay">
                  <span>Click to change</span>
                </div>
              </>
            ) : (
              <>
                <span className="qr-drop-icon">📤</span>
                <p className="qr-drop-text">Click to select image</p>
                <p className="qr-drop-sub">PNG, JPG, GIF up to 5 MB</p>
              </>
            )}
          </label>
          <input
            id="qr-file-input"
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="qr-file-input"
          />

          {preview && (
            <button className="qr-remove-btn" onClick={handleRemovePreview}>
              Remove
            </button>
          )}

          {/* Upload progress */}
          {uploading && (
            <div className="qr-progress-wrap">
              <div className="qr-progress-bar">
                <div className="qr-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="qr-progress-label">{progress}%</span>
            </div>
          )}

          <button
            className="qr-upload-btn"
            onClick={handleUpload}
            disabled={uploading || !preview}
          >
            {uploading ? (
              <><span className="qr-btn-spinner" />Uploading…</>
            ) : (
              <><span>📤</span> Upload QR Code</>
            )}
          </button>

          <ul className="qr-tips">
            <li>Use a clear, high-resolution QR image</li>
            <li>Make sure the QR points to the correct payment account</li>
            <li>Test the QR before informing baristas</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default QRUpload;
