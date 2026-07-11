import { useState } from 'react';
import { useFarmStore } from '../stores/useFarmStore';

const ADMIN_PIN = (import.meta.env.VITE_ADMIN_PIN as string | undefined) ?? '1234';

interface AdminPinGateProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminPinGate({ onClose, onSuccess }: AdminPinGateProps) {
  const setAdmin = useFarmStore((s) => s.setAdmin);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (pin === ADMIN_PIN) {
      setAdmin(true);
      onSuccess();
    } else {
      setError('Wrong PIN.');
    }
  };

  return (
    <div className="speech-bubble" onClick={onClose}>
      <div className="speech-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 320 }}>
        <h2>🔐 Admin PIN</h2>
        <p>Class rep only. Enter the shared PIN to manage submissions.</p>
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          autoFocus
          onChange={(e) => { setPin(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }}
        />
        {error && <p className="barn-error">{error}</p>}
        <div className="barn-row">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={!pin}>Unlock</button>
        </div>
      </div>
    </div>
  );
}
