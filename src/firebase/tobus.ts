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

export { uploadTobuPhoto } from './storage';

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
    (snap) => cb(snap.docs.map((d) => mapDoc(d.id, d.data()))),
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
