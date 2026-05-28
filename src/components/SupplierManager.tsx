import React, { useState } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  User, 
  Briefcase, 
  X, 
  Save, 
  MessageSquare, 
  BookOpen, 
  Compass, 
  FileCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Supplier, useSuppliers } from '../hooks/useSuppliers';
import { SupplierService } from '../services/supplierService';

export const SupplierManager: React.FC = () => {
  const { suppliers, loading, error } = useSuppliers();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Suggested supply categories for easier selection
  const suggestedCategories = ['Libros', 'Útiles Escolares', 'Material de Oficina', 'Papelería', 'Tecnología', 'Mobiliario', 'Otros'];

  const filteredSuppliers = suppliers.filter(s => 
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.ruc || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.contactName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier?.name || !editingSupplier?.phone) {
      alert("Nombre/Razón Social y Teléfono son obligatorios.");
      return;
    }

    setIsSaving(true);
    try {
      await SupplierService.saveSupplier(editingSupplier);
      setEditingSupplier(null);
      setShowForm(false);
    } catch (err) {
      console.error(err);
      alert("Error al guardar el proveedor.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Está seguro de eliminar este proveedor de forma permanente?")) {
      try {
        await SupplierService.deleteSupplier(id);
      } catch (err) {
        console.error(err);
        alert("Error al eliminar el proveedor.");
      }
    }
  };

  const openAddForm = () => {
    setEditingSupplier({
      name: '',
      ruc: '',
      phone: '',
      email: '',
      address: '',
      contactName: '',
      category: 'Útiles Escolares',
      notes: ''
    });
    setShowForm(true);
  };

  const openEditForm = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowForm(true);
  };

  return (
    <div className="flex-1 flex flex-col h-[60vh] md:h-[65vh] overflow-hidden">
      {/* Search and Add Header Bar */}
      <div className="flex flex-col sm:flex-row gap-3 py-4 border-b border-slate-100 items-center justify-between shrink-0 px-1">
        <div className="relative w-full sm:max-w-md">
          <input 
            type="text" 
            value={searchTerm}
            placeholder="Buscar proveedores por nombre, RUC, categoría..." 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 pl-11 text-xs font-sans outline-none focus:border-brand-teal focus:bg-white transition-all text-slate-800"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-450 hover:text-slate-700"
            >
              Cerrar
            </button>
          )}
        </div>
        <button
          onClick={openAddForm}
          className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider px-5 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
        >
          <Plus size={14} />
          Nuevo Proveedor
        </button>
      </div>

      {/* Main Panel Content Area */}
      <div className="flex-1 overflow-y-auto py-4 min-h-0 pr-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 py-8">
            <div className="w-8 h-8 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 mt-3 font-semibold font-sans">Sincronizando proveedores...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-650 p-4 rounded-2xl text-xs font-semibold text-center mt-4">
            {error}
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="text-center py-16 px-4 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 mt-4">
            <Compass size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500 font-bold text-sm">No se encontraron proveedores</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-sans leading-relaxed">
              {searchTerm 
                ? "Prueba cambiando la búsqueda o agregando un nuevo proveedor a la base de datos." 
                : "Aún no tienes proveedores registrados en el sistema. Registra el primero para llevar un control ordenado."}
            </p>
            {!searchTerm && (
              <button
                onClick={openAddForm}
                className="mt-4 bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/15 px-4 py-2 rounded-xl text-xs font-black tracking-wide uppercase transition-colors"
              >
                Registrar Proveedor
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSuppliers.map((supplier) => (
              <div 
                key={supplier.id}
                className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-slate-200/80 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-teal-50 text-brand-teal rounded-md border border-brand-teal/10 mb-2">
                        {supplier.category || 'Otros'}
                      </span>
                      <h4 className="text-sm font-black text-slate-900 leading-tight">
                        {supplier.name}
                      </h4>
                      {supplier.ruc && (
                        <p className="text-[10px] text-slate-400 font-mono font-bold mt-1">
                          RUC: {supplier.ruc}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-1">
                      <button 
                        onClick={() => openEditForm(supplier)}
                        className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                        title="Editar Proveedor"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button 
                        onClick={() => handleDelete(supplier.id)}
                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                        title="Eliminar Proveedor"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="mt-4 space-y-2.5 text-xs text-slate-600 font-sans border-t border-slate-50 pt-3">
                    {supplier.contactName && (
                      <div className="flex items-center gap-2">
                        <User size={13} className="text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-700">{supplier.contactName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-slate-400 shrink-0" />
                      <span className="font-mono">{supplier.phone}</span>
                    </div>
                    {supplier.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={13} className="text-slate-400 shrink-0" />
                        <a href={`mailto:${supplier.email}`} className="hover:underline text-brand-teal truncate font-semibold">
                          {supplier.email}
                        </a>
                      </div>
                    )}
                    {supplier.address && (
                      <div className="flex items-center gap-2">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate" title={supplier.address}>{supplier.address}</span>
                      </div>
                    )}
                    {supplier.notes && (
                      <div className="mt-2.5 p-2 bg-slate-50 rounded-xl text-[10px] text-slate-500 font-medium leading-relaxed">
                        <span className="font-bold text-slate-750 block mb-0.5">📝 Notas / Cuentas:</span>
                        {supplier.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct Actions in Card Footer */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-50 shrink-0">
                  <a 
                    href={`tel:${supplier.phone}`} 
                    className="flex items-center justify-center gap-1.5 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
                  >
                    <Phone size={11} className="text-slate-500" />
                    Llamar
                  </a>
                  <a 
                    href={`https://wa.me/51${supplier.phone.replace(/[^0-9]/g, '')}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center justify-center gap-1.5 py-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
                  >
                    <MessageSquare size={11} className="text-emerald-600" />
                    WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Panel / Side Modal for Form - Slide over */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-end p-0 bg-slate-900/40 backdrop-blur-xs">
            {/* Backdrop click closer */}
            <div className="absolute inset-0" onClick={() => setShowForm(false)}></div>
            
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col p-6 z-10"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                    <FileCheck size={16} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingSupplier?.id ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                  </h3>
                </div>
                <button 
                  onClick={() => setShowForm(false)} 
                  className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Body Fields */}
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto py-5 space-y-4 pr-1 min-h-0">
                {/* Supplier Name */}
                <div>
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest block mb-1.5">
                    Nombre o Razón Social *
                  </label>
                  <input 
                    type="text" 
                    required
                    value={editingSupplier?.name || ''} 
                    onChange={e => setEditingSupplier(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Librerías Unidas S.A., Distribuidor ..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-sans outline-none focus:border-brand-teal transition-colors text-slate-800"
                  />
                </div>

                {/* RUC number (very important in PERU) */}
                <div>
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest block mb-1.5">
                    Número de RUC (Opcional)
                  </label>
                  <input 
                    type="text" 
                    maxLength={11}
                    value={editingSupplier?.ruc || ''} 
                    onChange={e => setEditingSupplier(prev => ({ ...prev, ruc: e.target.value.replace(/[^0-9]/g, '') }))}
                    placeholder="20123456789 (11 dígitos)"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono outline-none focus:border-brand-teal transition-colors text-slate-800"
                  />
                </div>

                {/* Category Selector */}
                <div>
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest block mb-1.5">
                    Categoría de Suministros
                  </label>
                  <select 
                    value={editingSupplier?.category || 'Útiles Escolares'} 
                    onChange={e => setEditingSupplier(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none focus:border-brand-teal transition-colors text-slate-800"
                  >
                    {suggestedCategories.map((c, i) => (
                      <option key={i} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Contact Name */}
                <div>
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest block mb-1.5">
                    Asesor / Persona de Contacto
                  </label>
                  <input 
                    type="text" 
                    value={editingSupplier?.contactName || ''} 
                    onChange={e => setEditingSupplier(prev => ({ ...prev, contactName: e.target.value }))}
                    placeholder="Ing. Carlos Mendoza, Distribuciones ..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-sans outline-none focus:border-brand-teal transition-colors text-slate-800"
                  />
                </div>

                {/* Direct Phone Cellular */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest block mb-1.5">
                      Teléfono / Celular de Contacto *
                    </label>
                    <input 
                      type="tel" 
                      required
                      value={editingSupplier?.phone || ''} 
                      onChange={e => setEditingSupplier(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="953 366 458"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono outline-none focus:border-brand-teal transition-colors text-slate-800"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest block mb-1.5">
                    Correo Electrónico (Opcional)
                  </label>
                  <input 
                    type="email" 
                    value={editingSupplier?.email || ''} 
                    onChange={e => setEditingSupplier(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="contacto@distribuidor.pe"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-sans outline-none focus:border-brand-teal transition-colors text-slate-800"
                  />
                </div>

                {/* Physical Address */}
                <div>
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest block mb-1.5">
                    Dirección Comercial / Almacén (Opcional)
                  </label>
                  <input 
                    type="text" 
                    value={editingSupplier?.address || ''} 
                    onChange={e => setEditingSupplier(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Av. Aviación 1234, La Victoria, Lima"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-sans outline-none focus:border-brand-teal transition-colors text-slate-800"
                  />
                </div>

                {/* Notes, Account numbers, etc. */}
                <div>
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest block mb-1.5">
                    Condiciones de Pago / Plazos / Notas
                  </label>
                  <textarea 
                    rows={3}
                    value={editingSupplier?.notes || ''} 
                    onChange={e => setEditingSupplier(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Pago a 30 días, depósito en Cuenta BCP Soles 191-..., o días de entrega en Puquio: los Jueves."
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-sans outline-none focus:border-brand-teal transition-colors text-slate-850 resize-none font-medium text-slate-800"
                  />
                </div>
              </form>

              {/* Form Actions Footer */}
              <div className="pt-4 border-t border-slate-100 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black uppercase tracking-wider text-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 py-3 bg-brand-teal hover:bg-brand-teal/90 disabled:bg-slate-200 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-brand-teal/10 transition-colors select-none"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Save size={14} />
                      Guardar
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
