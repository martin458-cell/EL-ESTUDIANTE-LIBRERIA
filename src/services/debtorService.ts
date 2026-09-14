import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { Debtor } from '../hooks/useDebtors';

export const DebtorService = {
  async saveDebtor(debtor: Partial<Debtor>) {
    const { id, createdAt, updatedAt, ...data } = debtor as any;
    
    const payload = {
      apellidosNombres: String(data.apellidosNombres || '').trim(),
      fecha: String(data.fecha || '').trim(),
      producto: String(data.producto || '').trim(),
      precio: Number(data.precio || 0),
      estado: String(data.estado || 'Pendiente') as 'Pendiente' | 'Pagado' | 'Vencido',
      observacion: String(data.observacion || '').trim(),
      updatedAt: serverTimestamp()
    };

    try {
      if (id) {
        return await updateDoc(doc(db, 'debtors', id), payload);
      } else {
        const docRef = await addDoc(collection(db, 'debtors'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        return docRef;
      }
    } catch (err) {
      handleFirestoreError(err, id ? 'update' : 'create', id ? `debtors/${id}` : 'debtors');
    }
  },

  async deleteDebtor(id: string) {
    try {
      await deleteDoc(doc(db, 'debtors', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', `debtors/${id}`);
    }
  }
};
