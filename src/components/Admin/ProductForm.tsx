import React, { useState } from 'react';
import { 
  X, 
  Tag as TagIcon,
  DollarSign,
  Layers,
  Image as ImageIcon,
  Link as LinkIcon,
  Save,
  Loader2,
  Trash2,
  UploadCloud
} from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { Product } from '../../hooks/useProducts';

interface ProductFormProps {
  initialData: Partial<Product>;
  editingId: string | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  categories: string[];
}

export const ProductForm: React.FC<ProductFormProps> = ({ 
  initialData, 
  editingId, 
  onSubmit, 
  onCancel,
  categories 
}) => {
  const [formData, setFormData] = useState<Partial<Product>>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingImage(true);
      setImageFile(file);
      
      // Optimizamos la previsualización usando URL local del navegador (instantáneo)
      const previewUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, imageUrl: previewUrl }));
      setIsProcessingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isProcessingImage) return;

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      let finalImageUrl = formData.imageUrl;

      // Si hay un archivo nuevo seleccionado, lo subimos a Firebase Storage
      if (imageFile) {
        const fileExtension = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
        const storageRef = ref(storage, `products/${fileName}`);
        
        const uploadTask = uploadBytesResumable(storageRef, imageFile);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => {
              console.error("Upload error:", error);
              reject(error);
            },
            async () => {
              finalImageUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(true);
            }
          );
        });
      }

      setUploadProgress(null); // Reset progress before calling onSubmit
      
      const { id, createdAt, updatedAt, ...cleanData } = formData as any;
      
      const payload = {
        ...cleanData,
        imageUrl: finalImageUrl,
        price: Number(formData.price || 0),
        stock: Math.floor(Number(formData.stock || 0)),
      };
      
      await onSubmit(payload);
    } catch (error) {
      console.error("Form Submit Error:", error);
      alert("Error al procesar la solicitud. Verifica tu conexión e inténtalo de nuevo.");
      setUploadProgress(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-bold text-slate-900">
          {editingId ? 'Editar Producto' : 'Nuevo Producto'}
        </h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {/* Image Upload Section */}
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block text-center">Imagen del Producto</label>
          <div className="relative group">
            <div className={`w-full aspect-video rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden bg-white ${formData.imageUrl ? 'border-brand-teal' : 'border-slate-200 group-hover:border-brand-teal/50'}`}>
              {isProcessingImage ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="animate-spin text-brand-teal" size={32} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Procesando...</span>
                </div>
              ) : formData.imageUrl ? (
                <div className="relative w-full h-full group">
                  <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <label className="p-2 bg-white text-slate-800 rounded-full cursor-pointer hover:scale-110 transition-transform">
                      <ImageIcon size={18} />
                      <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                    <button 
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                      className="p-2 bg-red-500 text-white rounded-full hover:scale-110 transition-transform"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  <div className="p-4 bg-slate-50 rounded-2xl text-slate-400 group-hover:text-brand-teal mb-3 transition-colors">
                    <ImageIcon size={32} />
                  </div>
                  <span className="text-xs font-bold text-slate-500">Haz clic para subir</span>
                  <span className="text-[10px] text-slate-400 mt-1">Cualquier tamaño - Alta resolución</span>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Manual URL/Path */}
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">O ruta del repositorio (ej: /logo.svg)</label>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-3 text-slate-300" size={18} />
            <input 
              type="text" 
              value={formData.imageUrl || ''}
              onChange={e => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 focus:border-brand-teal outline-none transition-colors text-xs"
              placeholder="/products/nombre.jpg"
            />
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Nombre</label>
          <div className="relative">
            <TagIcon className="absolute left-3 top-3 text-slate-300" size={18} />
            <input 
              required
              type="text" 
              value={formData.name || ''}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 focus:border-brand-teal outline-none transition-colors"
            />
          </div>
        </div>

        {/* Price & Stock */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Precio (S/)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 text-slate-300" size={18} />
              <input 
                required
                type="number" 
                step="0.01"
                value={formData.price || ''}
                onChange={e => setFormData(prev => ({ ...prev, price: e.target.value as any }))}
                className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 focus:border-brand-teal outline-none transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Stock</label>
            <div className="relative">
              <Layers className="absolute left-3 top-3 text-slate-300" size={18} />
              <input 
                required
                type="number" 
                value={formData.stock || ''}
                onChange={e => setFormData(prev => ({ ...prev, stock: e.target.value as any }))}
                className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 focus:border-brand-teal outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Categoría</label>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, category: cat }))}
                className={`px-4 py-2 rounded-lg text-xs font-bold capitalize border transition-all ${
                  formData.category === cat 
                    ? 'bg-brand-teal text-white border-brand-teal shadow-md' 
                    : 'bg-white text-slate-600 border-slate-200 hover:border-brand-teal/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <button 
          disabled={isSubmitting || isProcessingImage}
          type="submit"
          className="w-full relative overflow-hidden bg-brand-teal text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-teal/90 shadow-xl shadow-brand-teal/20 mt-4 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-3 z-10">
              <Loader2 className="animate-spin" size={20} />
              <span>{uploadProgress !== null ? `Subiendo ${Math.round(uploadProgress)}%` : 'Guardando...'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 z-10">
              <Save size={20} />
              <span>{editingId ? 'Actualizar Producto' : 'Guardar Producto'}</span>
            </div>
          )}
          
          {uploadProgress !== null && (
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${uploadProgress}%` }}
              className="absolute left-0 top-0 bottom-0 bg-white/20 transition-all duration-300"
            />
          )}
        </button>
      </form>
    </div>
  );
};
