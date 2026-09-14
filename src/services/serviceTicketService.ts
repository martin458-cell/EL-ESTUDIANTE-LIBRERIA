import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { ServiceTicket } from '../hooks/useServiceTickets';

export const ServiceTicketService = {
  async saveServiceTicket(ticket: Partial<ServiceTicket>) {
    const { id, createdAt, updatedAt, ...data } = ticket as any;
    
    const payload = {
      number: String(data.number || '').trim(),
      clientName: String(data.clientName || 'Público General').trim(),
      date: String(data.date || '').trim(),
      items: Array.isArray(data.items) ? data.items : [],
      subtotal: Number(data.subtotal || 0),
      total: Number(data.total || 0),
      notes: String(data.notes || '').trim(),
      updatedAt: serverTimestamp()
    };

    try {
      if (id) {
        return await updateDoc(doc(db, 'service_tickets', id), payload);
      } else {
        const docRef = await addDoc(collection(db, 'service_tickets'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        return docRef;
      }
    } catch (err) {
      handleFirestoreError(err, id ? 'update' : 'create', id ? `service_tickets/${id}` : 'service_tickets');
    }
  },

  async deleteServiceTicket(id: string) {
    try {
      await deleteDoc(doc(db, 'service_tickets', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', `service_tickets/${id}`);
    }
  }
};
