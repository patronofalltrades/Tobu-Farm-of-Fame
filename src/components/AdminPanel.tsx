import { useEffect, useState } from 'react';
import { useFarmStore } from '../stores/useFarmStore';
import { isFirebaseConfigured } from '../firebase/config';
import { setTobuStatus, subscribeToTobus } from '../firebase/tobus';
import type { Tobu } from '../types';

interface AdminPanelProps {
  onClose: () => void;
  isFirebaseLive: boolean;
}

export function AdminPanel({ onClose, isFirebaseLive }: AdminPanelProps) {
  const localTobus = useFarmStore((s) => s.tobus);
  const setLocalTobus = useFarmStore((s) => s.setTobus);
  const [remotePending, setRemotePending] = useState<Tobu[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseLive) return;
    const unsub = subscribeToTobus(
      (list) => setRemotePending(list),
      (e) => setError(e.message),
      'pending',
    );
    return () => unsub();
  }, [isFirebaseLive]);

  const pending = isFirebaseLive
    ? remotePending
    : localTobus.filter((t) => t.status === 'pending');

  const decide = async (id: string, approved: boolean) => {
    setBusyId(id);
    setError(null);
    try {
      if (isFirebaseLive) {
        await setTobuStatus(id, approved ? 'approved' : 'rejected');
      } else {
        setLocalTobus(
          localTobus.map((t) =>
            t.id === id ? { ...t, status: approved ? 'approved' : 'rejected' } : t,
          ),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="speech-bubble" onClick={onClose}>
      <div className="speech-content admin-queue" onClick={(e) => e.stopPropagation()}>
        <h2>🛠 Pending Tobus</h2>
        {!isFirebaseConfigured && (
          <small>Demo mode — decisions only affect this browser session.</small>
        )}
        {error && <p className="barn-error">{error}</p>}

        {pending.length === 0 ? (
          <p>Nothing in the queue. 🎉</p>
        ) : (
          <ul>
            {pending.map((t) => (
              <li key={t.id}>
                <strong>{t.winner_name}</strong> · Term {t.term} · {t.date}
                <p style={{ margin: '6px 0' }}>"{t.story}"</p>
                <small>Submitted by {t.submitted_by}</small>
                {t.photo_url && (
                  <div>
                    <img src={t.photo_url} alt="" style={{ maxWidth: '100%', borderRadius: 6, marginTop: 6 }} />
                  </div>
                )}
                <div className="admin-actions">
                  <button
                    className="approve"
                    disabled={busyId === t.id}
                    onClick={() => void decide(t.id, true)}
                  >
                    Approve
                  </button>
                  <button
                    className="reject"
                    disabled={busyId === t.id}
                    onClick={() => void decide(t.id, false)}
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
