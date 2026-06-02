import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Client {
  id: string;
  name: string;        // Nombre o Razón Social del cliente
  doc?: string;         // DNI o RUC
  phone?: string;       // Teléfono
  address?: string;     // Dirección
  email?: string;       // Correo electrónico
  notes?: string;       // Notas, historial de pagos, etc.
  createdAt?: any;
  updatedAt?: any;
}

export const useClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'clients'), orderBy('name', 'asc'));

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const clientsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Client[];
        setClients(clientsList);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching clients:", err);
        setError("Error al cargar los clientes.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { clients, loading, error };
};
