import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Supplier } from '../hooks/useSuppliers';

export const SupplierService = {
  async saveSupplier(supplier: Partial<Supplier>) {
    const { id, createdAt, updatedAt, ...data } = supplier as any;
    
    const payload = {
      name: String(data.name || '').trim(),
      phone: String(data.phone || '').trim(),
      ruc: String(data.ruc || '').trim(),
      email: String(data.email || '').trim(),
      address: String(data.address || '').trim(),
      contactName: String(data.contactName || '').trim(),
      category: String(data.category || '').trim(),
      notes: String(data.notes || '').trim(),
      updatedAt: serverTimestamp()
    };

    if (id) {
      return updateDoc(doc(db, 'suppliers', id), payload);
    } else {
      return addDoc(collection(db, 'suppliers'), {
        ...payload,
        createdAt: serverTimestamp()
      });
    }
  },

  async deleteSupplier(id: string) {
    return deleteDoc(doc(db, 'suppliers', id));
  }
};
