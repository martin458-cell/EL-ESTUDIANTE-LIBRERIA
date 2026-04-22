import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from '../hooks/useProducts';

export const CatalogService = {
  async saveProduct(product: Partial<Product>) {
    const { id, createdAt, updatedAt, ...data } = product as any;
    
    const payload = {
      ...data,
      price: Number(data.price || 0),
      stock: Number(data.stock || 0),
      updatedAt: serverTimestamp()
    };

    if (id) {
      return updateDoc(doc(db, 'products', id), payload);
    } else {
      return addDoc(collection(db, 'products'), {
        ...payload,
        createdAt: serverTimestamp()
      });
    }
  },

  async bulkSaveProducts(products: Partial<Product>[]) {
    const batch = writeBatch(db);
    
    products.forEach(product => {
      const newDocRef = doc(collection(db, 'products'));
      batch.set(newDocRef, {
        ...product,
        price: Number(product.price || 0),
        stock: Number(product.stock || 0),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        featured: false,
        minStock: 5
      });
    });

    return batch.commit();
  },

  async deleteProduct(id: string) {
    return deleteDoc(doc(db, 'products', id));
  }
};
