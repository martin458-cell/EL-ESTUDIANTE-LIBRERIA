import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface ServiceTicketItem {
  id?: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export interface ServiceTicket {
  id: string;
  number: string;
  clientName: string;
  date: string;
  items: ServiceTicketItem[];
  subtotal: number;
  total: number;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

export const useServiceTickets = () => {
  const [serviceTickets, setServiceTickets] = useState<ServiceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'service_tickets'), orderBy('number', 'desc'));

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ServiceTicket[];
        setServiceTickets(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching service tickets:", err);
        setError("Error al cargar el listado de servicios extras.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { serviceTickets, loading, error };
};
