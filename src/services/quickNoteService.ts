import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  onSnapshot, 
  query, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';

export type NoteColor = 'yellow' | 'blue' | 'green' | 'purple' | 'rose' | 'amber';
export type NoteCategory = 'general' | 'stock' | 'pedido' | 'cliente' | 'urgente';

export interface QuickNote {
  id: string;
  title: string;
  content: string;
  color: NoteColor;
  category: NoteCategory;
  pinned: boolean;
  completed: boolean;
  createdAt?: Timestamp | { seconds: number; nanoseconds: number } | string;
  updatedAt?: Timestamp | { seconds: number; nanoseconds: number } | string;
}

export const NOTE_CATEGORIES: { id: NoteCategory; label: string; badge: string; colorClass: string }[] = [
  { id: 'general', label: 'General / Apunte', badge: 'Apunte', colorClass: 'bg-slate-100 text-slate-700 border-slate-200' },
  { id: 'stock', label: 'Stock & Almacén', badge: 'Stock', colorClass: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'pedido', label: 'Pedidos / Compras', badge: 'Pedido', colorClass: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'cliente', label: 'Atención al Cliente', badge: 'Cliente', colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'urgente', label: 'Prioritario / Urgente', badge: 'Urgente', colorClass: 'bg-rose-100 text-rose-800 border-rose-200' },
];

export const NOTE_COLORS: { id: NoteColor; name: string; bg: string; border: string; header: string; ring: string }[] = [
  { id: 'yellow', name: 'Post-it Amarillo', bg: 'bg-amber-50', border: 'border-amber-200', header: 'bg-amber-100/70 text-amber-900', ring: 'ring-amber-400' },
  { id: 'blue', name: 'Celeste Suave', bg: 'bg-sky-50', border: 'border-sky-200', header: 'bg-sky-100/70 text-sky-900', ring: 'ring-sky-400' },
  { id: 'green', name: 'Menta Verde', bg: 'bg-emerald-50', border: 'border-emerald-200', header: 'bg-emerald-100/70 text-emerald-900', ring: 'ring-emerald-400' },
  { id: 'purple', name: 'Lavanda Violeta', bg: 'bg-purple-50', border: 'border-purple-200', header: 'bg-purple-100/70 text-purple-900', ring: 'ring-purple-400' },
  { id: 'rose', name: 'Coral / Rosa', bg: 'bg-rose-50', border: 'border-rose-200', header: 'bg-rose-100/70 text-rose-900', ring: 'ring-rose-400' },
  { id: 'amber', name: 'Dorado Cálido', bg: 'bg-orange-50', border: 'border-orange-200', header: 'bg-orange-100/70 text-orange-900', ring: 'ring-orange-400' },
];

const LOCAL_STORAGE_KEY = 'libreria_el_estudiante_quick_notes';

// Initial sample seed notes for instant convenience
export const INITIAL_SEED_NOTES: Omit<QuickNote, 'id'>[] = [
  {
    title: 'Reposición urgente de Cuadernos Cuadriculados',
    content: 'Coordinar con distribuidor Standford o Artesco la llegada de 5 docenas de cuadernos cuadriculados A4 para la campaña escolar.',
    color: 'yellow',
    category: 'stock',
    pinned: true,
    completed: false
  },
  {
    title: 'Proforma especial Colegio San Martín',
    content: 'El profesor Carlos pidió cotización con 10% de descuento por volumen en plumones para pizarra y cartulinas escolares.',
    color: 'blue',
    category: 'cliente',
    pinned: false,
    completed: false
  },
  {
    title: 'Verificar precios de tintas e impresiones',
    content: 'Revisar costo de recarga de tinta Epson para mantener la rentabilidad del servicio de impresiones y anillados.',
    color: 'green',
    category: 'pedido',
    pinned: false,
    completed: true
  }
];

export const QuickNoteService = {
  getLocalStorageNotes(): QuickNote[] {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Error reading notes from localStorage:', e);
    }
    return [];
  },

  setLocalStorageNotes(notes: QuickNote[]) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notes));
    } catch (e) {
      console.warn('Error saving notes to localStorage:', e);
    }
  },

  subscribeQuickNotes(callback: (notes: QuickNote[]) => void) {
    const q = query(collection(db, 'quick_notes'), orderBy('createdAt', 'desc'));
    
    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          // If Firestore is empty, check localStorage or initialize with seed notes
          const cached = QuickNoteService.getLocalStorageNotes();
          if (cached.length > 0) {
            callback(cached);
          } else {
            const seeded = INITIAL_SEED_NOTES.map((n, idx) => ({
              ...n,
              id: `local-seed-${idx + 1}`,
              createdAt: new Date().toISOString()
            }));
            QuickNoteService.setLocalStorageNotes(seeded);
            callback(seeded);
          }
          return;
        }

        const notes: QuickNote[] = snapshot.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title || '',
          content: doc.data().content || '',
          color: (doc.data().color as NoteColor) || 'yellow',
          category: (doc.data().category as NoteCategory) || 'general',
          pinned: doc.data().pinned === true,
          completed: doc.data().completed === true,
          createdAt: doc.data().createdAt,
          updatedAt: doc.data().updatedAt,
        }));

        QuickNoteService.setLocalStorageNotes(notes);
        callback(notes);
      },
      (error) => {
        console.warn("Firestore subscription error for quick_notes, using localStorage fallback:", error);
        const cached = QuickNoteService.getLocalStorageNotes();
        if (cached.length > 0) {
          callback(cached);
        } else {
          const seeded = INITIAL_SEED_NOTES.map((n, idx) => ({
            ...n,
            id: `local-seed-${idx + 1}`,
            createdAt: new Date().toISOString()
          }));
          QuickNoteService.setLocalStorageNotes(seeded);
          callback(seeded);
        }
      }
    );
  },

  async saveNote(note: Partial<QuickNote>): Promise<string> {
    const { id, createdAt, updatedAt, ...rest } = note;

    const payload = {
      title: String(rest.title || '').trim(),
      content: String(rest.content || '').trim(),
      color: (rest.color || 'yellow') as NoteColor,
      category: (rest.category || 'general') as NoteCategory,
      pinned: rest.pinned === true,
      completed: rest.completed === true,
      updatedAt: serverTimestamp()
    };

    if (!payload.content && !payload.title) {
      throw new Error("La nota debe tener al menos un título o contenido.");
    }

    try {
      if (id && !id.startsWith('local-')) {
        await updateDoc(doc(db, 'quick_notes', id), payload);
        return id;
      } else {
        const docRef = await addDoc(collection(db, 'quick_notes'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        return docRef.id;
      }
    } catch (err) {
      console.warn("Falling back to local storage save due to Firestore error:", err);
      // Fallback save in localStorage
      const notes = QuickNoteService.getLocalStorageNotes();
      const newId = id && !id.startsWith('local-') ? id : `local-note-${Date.now()}`;
      const noteToSave: QuickNote = {
        id: newId,
        title: payload.title,
        content: payload.content,
        color: payload.color,
        category: payload.category,
        pinned: payload.pinned,
        completed: payload.completed,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const existingIndex = notes.findIndex(n => n.id === newId);
      if (existingIndex >= 0) {
        notes[existingIndex] = noteToSave;
      } else {
        notes.unshift(noteToSave);
      }
      QuickNoteService.setLocalStorageNotes(notes);
      return newId;
    }
  },

  async deleteNote(id: string): Promise<void> {
    // Also remove from localStorage cache
    const notes = QuickNoteService.getLocalStorageNotes().filter(n => n.id !== id);
    QuickNoteService.setLocalStorageNotes(notes);

    if (id.startsWith('local-')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'quick_notes', id));
    } catch (err) {
      console.warn("Error deleting note from Firestore:", err);
    }
  },

  async togglePin(id: string, currentPinned: boolean): Promise<void> {
    const notes = QuickNoteService.getLocalStorageNotes().map(n => 
      n.id === id ? { ...n, pinned: !currentPinned } : n
    );
    QuickNoteService.setLocalStorageNotes(notes);

    if (id.startsWith('local-')) return;

    try {
      await updateDoc(doc(db, 'quick_notes', id), {
        pinned: !currentPinned,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.warn("Error toggling pin:", err);
    }
  },

  async toggleCompleted(id: string, currentCompleted: boolean): Promise<void> {
    const notes = QuickNoteService.getLocalStorageNotes().map(n => 
      n.id === id ? { ...n, completed: !currentCompleted } : n
    );
    QuickNoteService.setLocalStorageNotes(notes);

    if (id.startsWith('local-')) return;

    try {
      await updateDoc(doc(db, 'quick_notes', id), {
        completed: !currentCompleted,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.warn("Error toggling completed:", err);
    }
  }
};
