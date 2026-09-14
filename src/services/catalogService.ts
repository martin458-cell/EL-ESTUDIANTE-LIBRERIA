import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { Product } from '../hooks/useProducts';
import { normalizeProductImageUrl } from '../utils/imageUtils';

export const CatalogService = {
  async saveProduct(product: Partial<Product>) {
    const { id, createdAt, updatedAt, ...data } = product as any;
    
    const payload = {
      ...data,
      imageUrl: data.imageUrl ? normalizeProductImageUrl(data.imageUrl, data.category) : '',
      price: Number(data.price || 0),
      stock: Number(data.stock || 0),
      offerPrice: data.isOffer ? Number(data.offerPrice || 0) : null,
      offerExpiryDate: data.isOffer ? (data.offerExpiryDate || null) : null,
      updatedAt: serverTimestamp()
    };

    try {
      if (id) {
        return await updateDoc(doc(db, 'products', id), payload);
      } else {
        const docRef = await addDoc(collection(db, 'products'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        return docRef;
      }
    } catch (err) {
      handleFirestoreError(err, 'write', id ? `products/${id}` : 'products');
    }
  },

  async bulkSaveProducts(products: Partial<Product>[]) {
    // Firestore writeBatch has a limit of 500 writes. We chunk into 400.
    const CHUNK_SIZE = 400;
    for (let i = 0; i < products.length; i += CHUNK_SIZE) {
      const chunk = products.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      
      chunk.forEach(product => {
        const newDocRef = doc(collection(db, 'products'));
        batch.set(newDocRef, {
          ...product,
          imageUrl: product.imageUrl ? normalizeProductImageUrl(product.imageUrl, product.category) : '',
          price: Number(product.price || 0),
          stock: Number(product.stock || 0),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          featured: false,
          minStock: 5
        });
      });

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, 'write', `products/batch-${i}`);
      }
    }
  },

  async deleteProduct(id: string) {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', `products/${id}`);
    }
  },

  async bulkDeleteProducts(ids: string[]) {
    const CHUNK_SIZE = 400;
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      const chunk = ids.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      
      chunk.forEach(id => {
        batch.delete(doc(db, 'products', id));
      });

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, 'delete', `products/batch-delete-${i}`);
      }
    }
  }
};
