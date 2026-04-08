import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import type { Tobu } from '../types';

const tobusCol = collection(db, 'tobus');

export function subscribeToTobus(cb: (tobus: Tobu[]) => void) {
  return onSnapshot(tobusCol, (snap) => {
    const list: Tobu[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Tobu, 'id'>) }));
    cb(list);
  });
}

export async function addTobu(data: Omit<Tobu, 'id' | 'created_at'>) {
  return addDoc(tobusCol, { ...data, created_at: serverTimestamp() });
}

export async function updateTobu(id: string, data: Partial<Tobu>) {
  return updateDoc(doc(db, 'tobus', id), data);
}

export async function deleteTobu(id: string) {
  return deleteDoc(doc(db, 'tobus', id));
}
