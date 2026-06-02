import React, { useState } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  User, 
  X, 
  Save, 
  MessageSquare, 
  Compass, 
  FileCheck,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Client, useClients } from '../hooks/useClients';
import { ClientService } from '../services/clientService';

export const ClientManager: React.FC = () => {
  const { clients, loading, error } = useClients();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingClient, setEditingClient] = useState<Partial<Client> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const filteredClients = clients.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.doc || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient?.name) {
      alert("El Nombre o Razón Social es obligatorio.");
      return;
    }

    setIsSaving(true);
    try {
      await ClientService.saveClient(editingClient);
      setEditingClient(null);
      setShowForm(false);
    } catch (err) {
      console.error(err);
      alert("Error al guardar el cliente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Está seguro de eliminar este cliente de forma permanente del sistema?")) {
      try {
        await ClientService.deleteClient(id);
      } catch (err) {
        console.error(err);
        alert("Error al eliminar el cliente.");
      }
    }
  };

  const openAddForm = () => {
    setEditingClient({
      name: '',
      doc: '',
      phone: '',
      email: '',
      address: '',
      notes: ''
    });
    setShowForm(true);
  };

  const openEditForm = (client: Client) => {
    setEditingClient(client);
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
            placeholder="Buscar por nombre, RUC, DNI o celular..." 
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
          Agregar Cliente
        </button>
      </div>

      {/* Main Panel Content Area */}
      <div className="flex-1 overflow-y-auto py-4 min-h-0 pr-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 py-8">
            <div className="w-8 h-8 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 mt-3 font-semibold font-sans">Sincronizando base de datos de clientes...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-650 p-4 rounded-2xl text-xs font-semibold text-center mt-4">
            {error}
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-16 px-4 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 mt-4">
            <Compass size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500 font-bold text-sm">No se encontraron clientes</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-sans leading-relaxed">
              {searchTerm 
                ? "Prueba cambiando la búsqueda o registrando un nuevo cliente." 
                : "No hay clientes registrados en la base de datos de forma web/servidor. Las cotizaciones con clientes nuevos los agregarán automáticamente."}
            </p>
            {!searchTerm && (
              <button
                onClick={openAddForm}
                className="mt-4 bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/15 px-4 py-2 rounded-xl text-xs font-black tracking-wide uppercase transition-colors"
              >
                Registrar Cliente
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredClients.map((client) => (
              <div 
                key={client.id}
                className="bg-white border border-slate-100 rounded-2xl p-3.5 shadow-xs hover:shadow-md hover:border-slate-200 transition-all flex flex-col justify-between relative group"
              >
                <div>
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0 flex-1">
                      {client.doc ? (
                        <span className="inline-flex px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 rounded border border-slate-200 mb-1 font-mono">
                          ID/Nº: {client.doc}
                        </span>
                      ) : (
                        <span className="inline-flex px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 rounded border border-amber-200 mb-1">
                          Sin Documento
                        </span>
                      )}
                      <h4 className="text-xs font-black text-slate-900 leading-tight truncate-two-lines" title={client.name}>
                        {client.name}
                      </h4>
                    </div>
                    
                    <div className="flex gap-0.5 shrink-0">
                      <button 
                        onClick={() => openEditForm(client)}
                        className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-all cursor-pointer"
                        title="Editar Cliente"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button 
                        onClick={() => handleDelete(client.id)}
                        className="p-1 text-rose-450 hover:text-rose-700 hover:bg-rose-50/50 rounded-lg transition-all cursor-pointer"
                        title="Eliminar Cliente"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="mt-2.5 space-y-1.5 text-[11px] text-slate-550 font-sans border-t border-slate-50 pt-2">
                    {client.phone && (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Phone size={11} className="text-slate-400 shrink-0" />
                        <span className="font-mono font-medium truncate">{client.phone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Mail size={11} className="text-slate-400 shrink-0" />
                        <a href={`mailto:${client.email}`} className="hover:underline text-brand-teal truncate font-medium">
                          {client.email}
                        </a>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin size={11} className="text-slate-400 shrink-0" />
                        <span className="truncate text-slate-500" title={client.address}>{client.address}</span>
                      </div>
                    )}
                    {client.notes && (
                      <div className="mt-1.5 p-1.5 bg-slate-50/80 rounded-lg text-[9px] text-slate-500 font-medium leading-normal max-h-16 overflow-y-auto w-full">
                        <span className="font-bold text-slate-700 block mb-0.5">📝 Notas:</span>
                        {client.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct Actions in Card Footer */}
                {client.phone && (
                  <div className="grid grid-cols-2 gap-1.5 mt-2.5 pt-2 border-t border-slate-50 shrink-0 w-full">
                    <a 
                      href={`tel:${client.phone}`} 
                      className="flex items-center justify-center gap-1.5 py-1.5 bg-slate-50 text-slate-705 hover:bg-slate-100 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors"
                    >
                      <Phone size={10} className="text-slate-400" />
                      Llamar
                    </a>
                    <a 
                      href={`https://wa.me/51${client.phone.replace(/[^0-9]/g, '')}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex items-center justify-center gap-1.5 py-1.5 bg-emerald-50 text-emerald-850 hover:bg-emerald-100 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors"
                    >
                      <MessageSquare size={10} className="text-emerald-555" />
                      WhatsApp
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slideout Side Modal for Edit / Create Form */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-end p-0 bg-slate-900/40 backdrop-blur-xs">
            <div className="absolute inset-0" onClick={() => setShowForm(false)}></div>
            
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col p-6 z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-650 text-white flex items-center justify-center">
                    <UserCheck size={16} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingClient?.id ? 'Editar Cliente' : 'Nuevo Cliente'}
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
                {/* Client Name */}
                <div>
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest block mb-1.5">
                    Señor(es) / Nombre Completo / Razón Social *
                  </label>
                  <input 
                    type="text" 
                    required
                    value={editingClient?.name || ''} 
                    onChange={e => setEditingClient(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej. Juan Pérez Ramos, Municipalidad de..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-sans outline-none focus:border-brand-teal transition-colors text-slate-800 font-medium"
                  />
                </div>

                {/* Document Number (DNI/RUC) */}
                <div>
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest block mb-1.5">
                    DNI o RUC del Cliente
                  </label>
                  <input 
                    type="text" 
                    value={editingClient?.doc || ''} 
                    onChange={e => setEditingClient(prev => ({ ...prev, doc: e.target.value.replace(/[^0-9]/g, '') }))}
                    placeholder="204347... (11 u 8 números)"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono outline-none focus:border-brand-teal transition-colors text-slate-800"
                  />
                </div>

                {/* Cellular Phone */}
                <div>
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest block mb-1.5">
                    Teléfono Celular
                  </label>
                  <input 
                    type="tel" 
                    value={editingClient?.phone || ''} 
                    onChange={e => setEditingClient(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="953 366 458"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono outline-none focus:border-brand-teal transition-colors text-slate-800"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest block mb-1.5">
                    Correo Electrónico (Opcional)
                  </label>
                  <input 
                    type="email" 
                    value={editingClient?.email || ''} 
                    onChange={e => setEditingClient(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="cliente@dominio.com"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-sans outline-none focus:border-brand-teal transition-colors text-slate-800"
                  />
                </div>

                {/* Physical Address */}
                <div>
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest block mb-1.5">
                    Dirección del Cliente
                  </label>
                  <input 
                    type="text" 
                    value={editingClient?.address || ''} 
                    onChange={e => setEditingClient(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Jr. Tacna, Puquio, Lucanas, Ayacucho"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-sans outline-none focus:border-brand-teal transition-colors text-slate-800"
                  />
                </div>

                {/* Notes and history details */}
                <div>
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest block mb-1.5">
                    Notas o Condiciones de Frecuencia
                  </label>
                  <textarea 
                    rows={4}
                    value={editingClient?.notes || ''} 
                    onChange={e => setEditingClient(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Cliente recurrente para útiles escolares de colegios, pagos con orden de servicio, plazos acordados..."
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
