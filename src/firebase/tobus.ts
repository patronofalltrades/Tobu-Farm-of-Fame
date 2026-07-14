import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { Tobu, TobuStatus } from '../types';

const tobusCol = collection(db, 'tobus');

type SnapshotMapper = (rawId: string, raw: Record<string, unknown>) => Tobu;
const mapDoc: SnapshotMapper = (id, raw) => ({ id, ...(raw as Omit<Tobu, 'id'>) });

export function subscribeToTobus(
  cb: (tobus: Tobu[]) => void,
  onError?: (error: Error) => void,
  status: TobuStatus | 'all' = 'approved',
) {
  const ref = status === 'all' ? tobusCol : query(tobusCol, where('status', '==', status));
  return onSnapshot(
    ref,
    (snap) => {
      // Deterministic order (date, then id): snapshot order is unspecified, and
      // repeat-winner coat variants are assigned by occurrence index — an
      // unstable order would swap which win gets which shade between reloads.
      // (`created_at` can't be the key: seeded docs store numbers, live
      // submissions store Firestore Timestamps.)
      const tobus = snap.docs.map((d) => mapDoc(d.id, d.data()));
      tobus.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
      cb(tobus);
    },
    (error) => onError?.(error),
  );
}

export async function addTobu(data: Omit<Tobu, 'id' | 'created_at'>) {
  return addDoc(tobusCol, { ...data, created_at: serverTimestamp() });
}

export async function updateTobu(id: string, data: Partial<Tobu>) {
  return updateDoc(doc(db, 'tobus', id), data);
}

export async function setTobuStatus(id: string, status: TobuStatus) {
  return updateDoc(doc(db, 'tobus', id), { status });
}

export async function deleteTobu(id: string) {
  return deleteDoc(doc(db, 'tobus', id));
}
