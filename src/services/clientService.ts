import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Client } from '../hooks/useClients';

export const ClientService = {
  async saveClient(client: Partial<Client>) {
    const { id, createdAt, updatedAt, ...data } = client as any;
    
    const payload = {
      name: String(data.name || '').trim(),
      doc: String(data.doc || '').trim(),
      phone: String(data.phone || '').trim(),
      email: String(data.email || '').trim(),
      address: String(data.address || '').trim(),
      notes: String(data.notes || '').trim(),
      updatedAt: serverTimestamp()
    };

    if (id) {
      return updateDoc(doc(db, 'clients', id), payload);
    } else {
      return addDoc(collection(db, 'clients'), {
        ...payload,
        createdAt: serverTimestamp()
      });
    }
  },

  // Auto upsert client when a quote is processed
  async upsertClientFromQuote(clientData: { name: string; doc?: string; phone?: string; address?: string }) {
    const name = String(clientData.name || '').trim();
    const docNum = String(clientData.doc || '').trim();
    const phone = String(clientData.phone || '').trim();
    const address = String(clientData.address || '').trim();

    // Ignore generic/default names
    if (!name || name.toLowerCase() === 'público en general' || name.toLowerCase() === 'publico en general') {
      return null;
    }

    try {
      const clientsRef = collection(db, 'clients');
      let existingClient: any = null;

      // 1. Try to search by Document (DNI/RUC) first if present
      if (docNum) {
        const q = query(clientsRef, where('doc', '==', docNum));
        const snap = await getDocs(q);
        if (!snap.empty) {
          existingClient = { id: snap.docs[0].id, ...snap.docs[0].data() };
        }
      }

      // 2. Try to search by Name if no client found by docNum
      if (!existingClient) {
        // Query exact match for name (Firestore requires exact match or search indexes)
        const qName = query(clientsRef, where('name', '==', name));
        const snapName = await getDocs(qName);
        if (!snapName.empty) {
          existingClient = { id: snapName.docs[0].id, ...snapName.docs[0].data() };
        }
      }

      const payload: any = {
        name,
        doc: docNum || (existingClient?.doc || ''),
        phone: phone || (existingClient?.phone || ''),
        address: address || (existingClient?.address || ''),
        updatedAt: serverTimestamp()
      };

      if (existingClient) {
        // Update existing matching client
        await updateDoc(doc(db, 'clients', existingClient.id), payload);
        return existingClient.id;
      } else {
        // Create new client
        const newDoc = await addDoc(clientsRef, {
          ...payload,
          notes: 'Registrado automáticamente desde cotizador.',
          email: '',
          createdAt: serverTimestamp()
        });
        return newDoc.id;
      }
    } catch (e) {
      console.error("Error upserting client from quote", e);
      return null;
    }
  },

  async deleteClient(id: string) {
    return deleteDoc(doc(db, 'clients', id));
  }
};
