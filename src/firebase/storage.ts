import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

export async function uploadTobuPhoto(file: File): Promise<string> {
  const path = `tobu-photos/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, file);
  return getDownloadURL(ref);
}
