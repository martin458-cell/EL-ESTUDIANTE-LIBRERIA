import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { SalesNote } from '../hooks/useSalesNotes';

export const SalesNoteService = {
  async saveSalesNote(salesNote: Partial<SalesNote>) {
    const { id, createdAt, updatedAt, ...data } = salesNote as any;
    
    const payload = {
      number: String(data.number || '').trim(),
      clientName: String(data.clientName || '').trim(),
      clientDoc: String(data.clientDoc || '').trim(),
      date: String(data.date || '').trim(),
      items: Array.isArray(data.items) ? data.items : [],
      subtotal: Number(data.subtotal || 0),
      discount: Number(data.discount || 0),
      igv: Number(data.igv || 0),
      total: Number(data.total || 0),
      paymentMethod: String(data.paymentMethod || 'Efectivo'),
      status: String(data.status || 'Cancelado') as 'Cancelado' | 'Pendiente' | 'Parcial',
      paidAmount: Number(data.paidAmount || 0),
      notes: String(data.notes || '').trim(),
      updatedAt: serverTimestamp()
    };

    try {
      if (id) {
        return await updateDoc(doc(db, 'sales_notes', id), payload);
      } else {
        const docRef = await addDoc(collection(db, 'sales_notes'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        return docRef;
      }
    } catch (err) {
      handleFirestoreError(err, id ? 'update' : 'create', id ? `sales_notes/${id}` : 'sales_notes');
    }
  },

  async deleteSalesNote(id: string) {
    try {
      await deleteDoc(doc(db, 'sales_notes', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', `sales_notes/${id}`);
    }
  }
};
