import React, { useState, useEffect, useMemo } from 'react';
import { 
  Check, 
  X, 
  Smartphone, 
  Search, 
  Plus, 
  Trash2, 
  Edit2, 
  Info, 
  Calendar, 
  DollarSign, 
  AlertCircle, 
  TrendingUp, 
  Send,
  HelpCircle,
  TrendingDown,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface NetflixAccount {
  id: string;
  name: string;
  phone?: string;
  profile?: string;
  monthlyAmount: number;
  payments: { [monthKey: string]: boolean }; // '01' to '12' -> true/false
  notes?: string;
  order: number;
  createdAt?: any;
  updatedAt?: any;
}

const MONTHS = [
  { key: '01', name: 'Enero', short: 'Ene' },
  { key: '02', name: 'Febrero', short: 'Feb' },
  { key: '03', name: 'Marzo', short: 'Mar' },
  { key: '04', name: 'Abril', short: 'Abr' },
  { key: '05', name: 'Mayo', short: 'May' },
  { key: '06', name: 'Junio', short: 'Jun' },
  { key: '07', name: 'Julio', short: 'Jul' },
  { key: '08', name: 'Agosto', short: 'Ago' },
  { key: '09', name: 'Septiembre', short: 'Sep' },
  { key: '10', name: 'Octubre', short: 'Oct' },
  { key: '11', name: 'Noviembre', short: 'Nov' },
  { key: '12', name: 'Diciembre', short: 'Dic' },
];

export function NetflixManager() {
  const [accounts, setAccounts] = useState<NetflixAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingAccount, setEditingAccount] = useState<NetflixAccount | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formProfile, setFormProfile] = useState('');
  const [formMonthlyAmount, setFormMonthlyAmount] = useState(14);
  const [formNotes, setFormNotes] = useState('');

  // Local state for instant UI responsiveness while saving
  const [updatingIds, setUpdatingIds] = useState<string[]>([]);

  // Fetch accounts with real-time sync
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'netflix_accounts'),
      async (snapshot) => {
        const list = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as NetflixAccount[];

        // Sort by order or name
        list.sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));

        // Prepopulate with 6 personnel if empty
        if (list.length === 0 && snapshot.metadata.fromCache === false) {
          try {
            const batch = writeBatch(db);
            const defaultNames = [
              'Personal 1',
              'Personal 2',
              'Personal 3',
              'Personal 4',
              'Personal 5',
              'Personal 6'
            ];

            const initialAccounts: NetflixAccount[] = defaultNames.map((name, index) => {
              const docId = `netflix_p${index + 1}`;
              const defaultPayments: { [key: string]: boolean } = {};
              MONTHS.forEach(m => {
                defaultPayments[m.key] = false; // "Deben" by default
              });

              const newAcc: Omit<NetflixAccount, 'id'> = {
                name,
                phone: '',
                profile: `Perfil ${index + 1}`,
                monthlyAmount: 14,
                payments: defaultPayments,
                notes: '',
                order: index + 1,
              };

              const docRef = doc(db, 'netflix_accounts', docId);
              batch.set(docRef, {
                ...newAcc,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });

              return { id: docId, ...newAcc };
            });

            await batch.commit();
            setAccounts(initialAccounts);
          } catch (err) {
            console.error('Error pre-populating Netflix accounts:', err);
          }
        } else {
          setAccounts(list);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to netflix accounts:', err);
        setError('No se pudieron cargar los datos de Netflix.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => 
      acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (acc.profile || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (acc.phone || '').includes(searchTerm)
    );
  }, [accounts, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    let totalCollected = 0;
    let totalPending = 0;
    let totalCheckedPayments = 0;
    let totalPossiblePayments = accounts.length * 12;

    accounts.forEach(acc => {
      MONTHS.forEach(m => {
        const paid = acc.payments[m.key] || false;
        if (paid) {
          totalCollected += acc.monthlyAmount;
          totalCheckedPayments++;
        } else {
          totalPending += acc.monthlyAmount;
        }
      });
    });

    const completionRate = totalPossiblePayments > 0 
      ? Math.round((totalCheckedPayments / totalPossiblePayments) * 100) 
      : 0;

    return {
      totalCollected,
      totalPending,
      totalPossiblePayments,
      totalCheckedPayments,
      completionRate
    };
  }, [accounts]);

  // Per-month collections statistics
  const monthlyStats = useMemo(() => {
    return MONTHS.map(m => {
      let paidCount = 0;
      let owesCount = 0;
      accounts.forEach(acc => {
        if (acc.payments[m.key]) {
          paidCount++;
        } else {
          owesCount++;
        }
      });
      return {
        ...m,
        paidCount,
        owesCount,
        totalCollected: paidCount * 14, // Assuming standard 14 or using dynamic values
      };
    });
  }, [accounts]);

  // Toggle single month check
  const handleTogglePayment = async (accountId: string, monthKey: string, currentValue: boolean) => {
    const loadingKey = `${accountId}-${monthKey}`;
    if (updatingIds.includes(loadingKey)) return;

    setUpdatingIds(prev => [...prev, loadingKey]);

    try {
      const accRef = doc(db, 'netflix_accounts', accountId);
      await updateDoc(accRef, {
        [`payments.${monthKey}`]: !currentValue,
        updatedAt: serverTimestamp()
      });
    } catch (err: any) {
      console.error('Error toggling payment:', err);
      alert('Error al actualizar el estado de pago: ' + (err.message || err));
    } finally {
      setUpdatingIds(prev => prev.filter(id => id !== loadingKey));
    }
  };

  // Add new account
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const defaultPayments: { [key: string]: boolean } = {};
    MONTHS.forEach(m => {
      defaultPayments[m.key] = false;
    });

    const newDocId = `netflix_custom_${Date.now()}`;
    const newAcc: Omit<NetflixAccount, 'id'> = {
      name: formName.trim(),
      phone: formPhone.trim(),
      profile: formProfile.trim() || 'Principal',
      monthlyAmount: Number(formMonthlyAmount) || 14,
      payments: defaultPayments,
      notes: formNotes.trim(),
      order: accounts.length + 1
    };

    try {
      await setDoc(doc(db, 'netflix_accounts', newDocId), {
        ...newAcc,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      // Reset form
      setFormName('');
      setFormPhone('');
      setFormProfile('');
      setFormMonthlyAmount(14);
      setFormNotes('');
      setIsAdding(false);
      alert('¡Usuario de Netflix agregado exitosamente!');
    } catch (err: any) {
      console.error('Error adding Netflix account:', err);
      alert('Error al agregar el usuario de Netflix: ' + (err.message || err));
    }
  };

  // Save edited account
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !formName.trim()) return;

    try {
      const accRef = doc(db, 'netflix_accounts', editingAccount.id);
      await updateDoc(accRef, {
        name: formName.trim(),
        phone: formPhone.trim(),
        profile: formProfile.trim(),
        monthlyAmount: Number(formMonthlyAmount) || 14,
        notes: formNotes.trim(),
        updatedAt: serverTimestamp()
      });
      setEditingAccount(null);
      alert('¡Datos de usuario actualizados exitosamente!');
    } catch (err: any) {
      console.error('Error editing Netflix account:', err);
      alert('Error al editar el usuario de Netflix: ' + (err.message || err));
    }
  };

  // Set up form for editing
  const startEdit = (acc: NetflixAccount) => {
    setEditingAccount(acc);
    setFormName(acc.name);
    setFormPhone(acc.phone || '');
    setFormProfile(acc.profile || '');
    setFormMonthlyAmount(acc.monthlyAmount);
    setFormNotes(acc.notes || '');
  };

  // Delete account
  const handleDelete = async (accountId: string) => {
    if (!window.confirm('¿Está seguro de eliminar este registro de control?')) return;
    try {
      await deleteDoc(doc(db, 'netflix_accounts', accountId));
    } catch (err) {
      console.error('Error deleting account:', err);
    }
  };

  // WhatsApp reminder generator
  const getWhatsAppLink = (acc: NetflixAccount, month: { key: string, name: string }) => {
    const cleanPhone = (acc.phone || '').replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('51') ? cleanPhone : `51${cleanPhone}`;
    const text = `Hola *${acc.name}*, te escribo de Librería "El Estudiante" para recordarte amablemente que se encuentra pendiente el pago de tu cuenta de Netflix de *2026* correspondiente al mes de *${month.name}* por un monto de *S/ ${acc.monthlyAmount.toFixed(2)}*. Muchas gracias.`;
    return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-6 md:p-8 pt-28">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header section with brand representation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-red-650 to-red-800 text-white p-6 sm:p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl transform translate-x-1/3 -translate-y-1/3 pointer-events-none" />
          
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/25 text-xs font-black uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              Gestión Netflix 2026
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-display">
              Control de Cuentas Netflix
            </h1>
            <p className="text-red-100 max-w-xl text-sm font-medium">
              Hoja de control de aportes para 6 personas, con cuota mensual fija de S/ 14.00. Haz clic directamente en las casillas para actualizar los pagos en tiempo real.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => {
                setFormName('');
                setFormPhone('');
                setFormProfile('');
                setFormMonthlyAmount(14);
                setFormNotes('');
                setIsAdding(true);
              }}
              className="bg-white text-red-700 hover:bg-slate-100 font-bold px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all cursor-pointer text-sm"
            >
              <Plus size={18} />
              <span>Nuevo Usuario</span>
            </button>
          </div>
        </div>

        {/* Dashboard stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white p-5 rounded-[1.75rem] border border-slate-100 shadow-xxs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center shrink-0 border border-green-100">
              <DollarSign size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Recaudado</p>
              <p className="text-2xl font-black text-slate-900 font-mono">S/ {stats.totalCollected.toFixed(2)}</p>
              <p className="text-xs text-green-600 font-bold mt-0.5 flex items-center gap-1">
                <TrendingUp size={12} /> {stats.totalCheckedPayments} cuotas cobradas
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-[1.75rem] border border-slate-100 shadow-xxs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <AlertCircle size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Por Cobrar</p>
              <p className="text-2xl font-black text-slate-900 font-mono text-rose-600">S/ {stats.totalPending.toFixed(2)}</p>
              <p className="text-xs text-rose-500 font-bold mt-0.5 flex items-center gap-1">
                <TrendingDown size={12} /> {stats.totalPossiblePayments - stats.totalCheckedPayments} cuotas pendientes
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-[1.75rem] border border-slate-100 shadow-xxs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <UserCheck size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tasa de Pago</p>
              <p className="text-2xl font-black text-slate-900 font-mono">{stats.completionRate}%</p>
              <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${stats.completionRate}%` }} />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-[1.75rem] border border-slate-100 shadow-xxs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <RefreshCw size={20} className="animate-spin-slow" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monto Base</p>
              <p className="text-2xl font-black text-slate-900 font-mono">S/ 14.00</p>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">Monto mensual por persona</p>
            </div>
          </div>

        </div>

        {/* Search, filters, and actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-xxs">
          <div className="relative w-full sm:max-w-md">
            <input 
              type="text"
              placeholder="Buscar por nombre o perfil..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-11 outline-none text-slate-700 focus:border-red-500 focus:bg-white text-sm font-medium transition-all"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <Info size={14} className="text-slate-400 shrink-0" />
            <span>Haz clic sobre los checks para cambiar el estado de pago.</span>
          </div>
        </div>

        {/* Master Payments Table Container */}
        <div className="bg-white rounded-3xl border border-slate-150 overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="animate-spin mb-4 text-red-600" size={40} />
              <p className="font-bold text-base">Cargando control de Netflix...</p>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="py-20 text-center">
              <HelpCircle className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-500 font-bold text-lg">No se encontraron usuarios</p>
              <p className="text-xs text-slate-400 mt-1">Prueba cambiando tu búsqueda de texto.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100">
                    <th className="py-4 px-5 text-[10px] font-black uppercase text-slate-500 tracking-wider w-[220px]">Personal / Perfil</th>
                    {MONTHS.map(m => (
                      <th 
                        key={m.key} 
                        className="py-4 px-2 text-center text-[10px] font-black uppercase text-slate-500 tracking-wider"
                      >
                        <div>{m.name}</div>
                        <div className="text-[8px] font-mono text-slate-400 lowercase mt-0.5">S/ 14</div>
                      </th>
                    ))}
                    <th className="py-4 px-5 text-right text-[10px] font-black uppercase text-slate-500 tracking-wider w-[120px]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredAccounts.map((acc) => {
                    // Count paid months for this account
                    const paidCount = MONTHS.filter(m => acc.payments[m.key]).length;
                    const totalOwed = (12 - paidCount) * acc.monthlyAmount;
                    const totalPaid = paidCount * acc.monthlyAmount;

                    return (
                      <tr 
                        key={acc.id} 
                        className="hover:bg-slate-50/40 transition-colors group"
                      >
                        {/* Person Name Block */}
                        <td className="py-4 px-5 align-middle border-r border-slate-50">
                          <div className="min-w-0">
                            <h3 className="font-extrabold text-sm text-slate-800 leading-tight truncate">
                              {acc.name}
                            </h3>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {acc.profile && (
                                <span className="bg-red-50 text-red-650 px-2 py-0.5 rounded-md text-[9px] font-black uppercase border border-red-100">
                                  {acc.profile}
                                </span>
                              )}
                              <span className="bg-slate-50 text-slate-500 font-mono text-[9px] px-1.5 py-0.5 rounded border border-slate-200">
                                S/ {acc.monthlyAmount}/m
                              </span>
                            </div>
                            
                            {/* Short indicators of total payment for the person */}
                            <div className="mt-2.5 flex items-center gap-2.5 text-[10px] font-mono text-slate-400">
                              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Cobrado: S/ {totalPaid}
                              </span>
                              <span className="text-slate-300">|</span>
                              <span className={`flex items-center gap-1 font-bold ${totalOwed > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${totalOwed > 0 ? 'bg-rose-500' : 'bg-slate-300'}`} />
                                Debe: S/ {totalOwed}
                              </span>
                            </div>

                            {acc.notes && (
                              <p className="mt-1.5 text-xs text-slate-400 italic bg-amber-50/50 p-1 rounded border border-dashed border-amber-100 leading-tight">
                                {acc.notes}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Month Checklist Cells */}
                        {MONTHS.map((m) => {
                          const isPaid = acc.payments[m.key] || false;
                          const loadingKey = `${acc.id}-${m.key}`;
                          const isUpdating = updatingIds.includes(loadingKey);

                          return (
                            <td 
                              key={m.key} 
                              onClick={() => handleTogglePayment(acc.id, m.key, isPaid)}
                              className="py-3 px-1.5 text-center align-middle cursor-pointer hover:bg-slate-50 transition-all select-none border-r border-slate-50 relative group/cell"
                            >
                              <div className="flex flex-col items-center justify-center">
                                {isUpdating ? (
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 animate-spin">
                                    <RefreshCw size={12} className="text-slate-400" />
                                  </div>
                                ) : isPaid ? (
                                  <motion.div 
                                    whileTap={{ scale: 0.8 }}
                                    className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm border border-emerald-600 cursor-pointer"
                                    title="Pagado - Clic para cambiar a Deuda"
                                  >
                                    <Check size={16} strokeWidth={3} />
                                  </motion.div>
                                ) : (
                                  <motion.div 
                                    whileTap={{ scale: 0.8 }}
                                    className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 border border-rose-250 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all duration-200 cursor-pointer"
                                    title="Debe - Clic para marcar como Pagado"
                                  >
                                    <X size={14} strokeWidth={2.5} />
                                  </motion.div>
                                )}

                                {/* WhatsApp Reminder Icon Overlay when unpaid */}
                                {!isPaid && acc.phone && !isUpdating && (
                                  <a
                                    href={getWhatsAppLink(acc, m)}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="absolute bottom-1 right-1 opacity-0 group-hover/cell:opacity-100 bg-[#25D366] text-white p-0.5 rounded-md hover:scale-115 transition-all shadow-md"
                                    title={`Enviar recordatorio de WhatsApp para ${m.name}`}
                                  >
                                    <Smartphone size={10} />
                                  </a>
                                )}
                              </div>
                            </td>
                          );
                        })}

                        {/* Actions buttons */}
                        <td className="py-4 px-5 text-right align-middle">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => startEdit(acc)}
                              className="p-2 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors cursor-pointer border border-slate-100"
                              title="Editar datos del usuario"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(acc.id)}
                              className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-colors cursor-pointer border border-rose-100"
                              title="Eliminar registro"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Dynamic Month statistics charts or visual grid */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xxs">
          <h3 className="font-extrabold text-base text-slate-800 mb-4 flex items-center gap-2">
            <Calendar size={18} className="text-red-650" />
            Estado de Recaudación por Mes 2026
          </h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {monthlyStats.map((ms) => {
              const totalMonth = (ms.paidCount + ms.owesCount) * 14;
              const rate = ms.paidCount + ms.owesCount > 0 
                ? Math.round((ms.paidCount / (ms.paidCount + ms.owesCount)) * 100) 
                : 0;

              return (
                <div 
                  key={ms.key} 
                  className="bg-slate-50/60 rounded-2xl p-3 border border-slate-150 flex flex-col justify-between"
                >
                  <div>
                    <span className="font-extrabold text-xs text-slate-800 block">{ms.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">S/ {ms.totalCollected}.00 recaudado</span>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-[9px] font-bold text-slate-500">
                      <span className="text-emerald-600">{ms.paidCount} pagaron</span>
                      <span className={ms.owesCount > 0 ? 'text-rose-500' : 'text-slate-400'}>{ms.owesCount} deben</span>
                    </div>

                    <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          rate === 100 ? 'bg-emerald-500' : rate > 50 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${rate}%` }} 
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* --- ADD/EDIT MODAL DIALOG --- */}
      <AnimatePresence>
        {(isAdding || editingAccount) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-red-650 uppercase tracking-widest block">Netflix 2026</span>
                  <h3 className="font-extrabold text-lg text-slate-800 mt-0.5">
                    {isAdding ? 'Registrar Nuevo Usuario' : 'Editar Datos de Usuario'}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setEditingAccount(null);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full bg-white shadow-sm border border-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <form 
                onSubmit={isAdding ? handleAddAccount : handleSaveEdit}
                className="p-6 space-y-4 overflow-y-auto"
              >
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Nombre Completo</label>
                  <input 
                    type="text"
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="Ej. Juan Pérez Ramos"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-red-500 text-sm font-medium text-slate-800 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Teléfono de Contacto</label>
                    <input 
                      type="text"
                      value={formPhone}
                      onChange={e => setFormPhone(e.target.value)}
                      placeholder="Ej. 953366458"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-red-500 text-sm font-medium text-slate-800 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Perfil Asignado</label>
                    <input 
                      type="text"
                      value={formProfile}
                      onChange={e => setFormProfile(e.target.value)}
                      placeholder="Ej. Perfil 1, Kids, etc."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-red-500 text-sm font-medium text-slate-800 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Monto de Pago Mensual (S/.)</label>
                  <input 
                    type="number"
                    required
                    min="1"
                    value={formMonthlyAmount}
                    onChange={e => setFormMonthlyAmount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-red-500 text-sm font-medium text-slate-800 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Observaciones o Notas</label>
                  <textarea 
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    placeholder="Detalles de la cuenta o forma de pago recurrente..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-red-500 text-sm font-medium text-slate-800 transition-all h-20 resize-none"
                  />
                </div>

                <div className="pt-4 border-t border-slate-50 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setEditingAccount(null);
                    }}
                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-red-650 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-colors cursor-pointer shadow-lg hover:shadow-xl"
                  >
                    Guardar Registro
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
