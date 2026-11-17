import { useState, useEffect } from 'react';
import { DigitalProduct, DigitalService, INITIAL_ORIGINAL_DIGITALS } from '../services/digitalService';

export function useDigitalProducts() {
  const [digitalProducts, setDigitalProducts] = useState<DigitalProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = DigitalService.subscribeDigitalProducts((items) => {
      // Auto-inicializar sólo una vez si la colección está vacía y nunca se ha ejecutado
      const hasSeeded = localStorage.getItem('el_estudiante_digital_seeded_v1');
      if (items.length === 0 && !hasSeeded) {
        localStorage.setItem('el_estudiante_digital_seeded_v1', 'true');
        INITIAL_ORIGINAL_DIGITALS.forEach(async (initItem) => {
          try {
            await DigitalService.saveDigitalProduct(initItem);
          } catch (e) {
            console.warn('Init digital seed skip:', e);
          }
        });
      }
      setDigitalProducts(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { digitalProducts, loading };
}

