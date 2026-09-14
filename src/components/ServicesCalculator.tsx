import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  FileDown, 
  RotateCcw, 
  Search, 
  History,
  FileText,
  Clock,
  User,
  ShoppingBag,
  Info,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Hash,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useServiceTickets, ServiceTicket, ServiceTicketItem } from '../hooks/useServiceTickets';
import { ServiceTicketService } from '../services/serviceTicketService';
import { jsPDF } from 'jspdf';

const DEFAULT_SHOP_SETTINGS = {
  name: 'LIBRERÍA "EL ESTUDIANTE"',
  ruc: '10434717731',
  phone: '95303660458',
  address: 'Jr. Tacna N° 668',
  email: 'libreriaelestudiante@gmail.com',
  message: '¡Gracias por su preferencia! Vuelve pronto.'
};

// Preset catalog of common digital/paper services in the bookstore
const SERVICE_PRESETS = [
  { name: 'Impresión B/N (Láser)', price: 0.20, category: 'Impresión' },
  { name: 'Impresión Color (Inyección)', price: 1.00, category: 'Impresión' },
  { name: 'Impresión Color (Láser - Foto)', price: 2.50, category: 'Impresión' },
  { name: 'Fotocopia B/N A4', price: 0.10, category: 'Fotocopia' },
  { name: 'Fotocopia Color A4', price: 0.80, category: 'Fotocopia' },
  { name: 'Anillado (Simple)', price: 3.50, category: 'Encuadernación' },
  { name: 'Anillado (Espiral Grueso)', price: 5.00, category: 'Encuadernación' },
  { name: 'Encuadernación Pasta Dura', price: 15.00, category: 'Encuadernación' },
  { name: 'Plastificado / Laminado A4', price: 3.00, category: 'Plastificado' },
  { name: 'Plastificado / Laminado Carnet', price: 1.50, category: 'Plastificado' },
  { name: 'Escaneo de Documento A4', price: 0.50, category: 'Digitalización' },
  { name: 'Digitación de Texto (por pág)', price: 5.00, category: 'Digitalización' },
  { name: 'Trámite Internet / Búsqueda', price: 2.00, category: 'Digitalización' },
];

export const ServicesCalculator: React.FC = () => {
  const { serviceTickets, loading, error } = useServiceTickets();
  const [activeView, setActiveView] = useState<'calculator' | 'history'>('calculator');
  const [shopSettings] = useState(() => {
    const cached = localStorage.getItem('shop_settings_invoice');
    return cached ? JSON.parse(cached) : DEFAULT_SHOP_SETTINGS;
  });

  // State for active calculator items
  const [clientName, setClientName] = useState('Público General');
  const [serviceDate, setServiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [ticketNumber, setTicketNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ServiceTicketItem[]>([]);

  // State for the item input form
  const [customName, setCustomName] = useState('');
  const [unitPrice, setUnitPrice] = useState<number>(0.20);
  const [quantity, setQuantity] = useState<number>(1);

  // Search filter for history
  const [historySearch, setHistorySearch] = useState('');
  const [selectedHistoryTicket, setSelectedHistoryTicket] = useState<ServiceTicket | null>(null);

  // Loading/saving state
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Calculate ticket number sequentially
  useEffect(() => {
    if (serviceTickets.length === 0) {
      setTicketNumber('SER-0001');
      return;
    }
    const numbers = serviceTickets
      .map(t => {
        const match = t.number?.match(/SER-(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
      });
    const highest = Math.max(...numbers, 0);
    const nextNum = String(highest + 1).padStart(4, '0');
    setTicketNumber(`SER-${nextNum}`);
  }, [serviceTickets]);

  // Quick select preset populate
  const handleSelectPreset = (preset: typeof SERVICE_PRESETS[0]) => {
    setCustomName(preset.name);
    setUnitPrice(preset.price);
    // Auto-focus quantity or just append if desired, let's pre-fill the form values
  };

  // Double click preset to directly append to rows for fast operations
  const handleDirectAppendPreset = (preset: typeof SERVICE_PRESETS[0]) => {
    const existingIndex = items.findIndex(item => item.name.toLowerCase() === preset.name.toLowerCase());
    if (existingIndex !== -1) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].price;
      setItems(updated);
    } else {
      setItems(prev => [
        ...prev,
        {
          name: preset.name,
          price: preset.price,
          quantity: 1,
          total: preset.price
        }
      ]);
    }
  };

  // Add manually entered service to grid
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const serviceName = customName.trim() || 'Servicio General';
    if (unitPrice < 0) return;
    if (quantity <= 0) return;

    // Check if item already exists in rows to accumulate quantity
    const existingIndex = items.findIndex(item => item.name.toLowerCase() === serviceName.toLowerCase());
    
    if (existingIndex !== -1) {
      const updated = [...items];
      updated[existingIndex].quantity += quantity;
      updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].price;
      setItems(updated);
    } else {
      setItems(prev => [
        ...prev,
        {
          name: serviceName,
          price: unitPrice,
          quantity: quantity,
          total: Number((unitPrice * quantity).toFixed(2))
        }
      ]);
    }

    // Reset standard input elements (keep price, reset name)
    setCustomName('');
    setQuantity(1);
  };

  // Edit item rows dynamically inside table
  const handleUpdateItemRow = (index: number, updatedField: Partial<ServiceTicketItem>) => {
    const updated = [...items];
    const item = { ...updated[index], ...updatedField };
    if (item.price < 0) item.price = 0;
    if (item.quantity < 1) item.quantity = 1;
    item.total = Number((item.price * item.quantity).toFixed(2));
    updated[index] = item;
    setItems(updated);
  };

  // Remove item row
  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Live subtotals
  const subtotal = Number(items.reduce((sum, item) => sum + item.total, 0).toFixed(2));
  const totalAmount = subtotal;

  // Clear work sheet
  const handleResetCalculator = () => {
    setItems([]);
    setClientName('Público General');
    setNotes('');
    setServiceDate(new Date().toISOString().split('T')[0]);
  };

  // Register collection record in Firestore unifies extra ingresos
  const handleRegisterServiceInvoice = async () => {
    if (items.length === 0) {
      alert('Por favor ingrese al menos un servicio al listado.');
      return;
    }
    setIsSaving(true);
    try {
      const ticketPayload: Partial<ServiceTicket> = {
        number: ticketNumber,
        clientName: clientName.trim() || 'Público General',
        date: serviceDate,
        items: items,
        subtotal: subtotal,
        total: totalAmount,
        notes: notes.trim()
      };

      await ServiceTicketService.saveServiceTicket(ticketPayload);
      
      setSuccessMessage(`Servicio registrado con éxito: ${ticketNumber}`);
      setTimeout(() => setSuccessMessage(null), 4000);
      
      // Auto reprint PDF? Yes, let's keep sheet clear
      handleResetCalculator();
    } catch (err: any) {
      console.error(err);
      alert('Error guardando servicio extra: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Universal Gorgeous PDF Exporter modeled precisely on Sales Note Design
  const handleExportPDF = (ticket: ServiceTicket | typeof items, inputNumber?: string, inputClient?: string, inputDate?: string, inputNotes?: string) => {
    // Determine source data (whether printing active calculator or a historic selected ticket)
    const activeIsArray = Array.isArray(ticket);
    const dataItems = activeIsArray ? ticket : ticket.items;
    const dataNum = activeIsArray ? (inputNumber || ticketNumber) : ticket.number;
    const dataClient = activeIsArray ? (inputClient || clientName) : ticket.clientName;
    const dataDate = activeIsArray ? (inputDate || serviceDate) : ticket.date;
    const dataTotal = activeIsArray ? totalAmount : ticket.total;
    const dataNotes = activeIsArray ? (inputNotes || notes) : ticket.notes;

    if (dataItems.length === 0) {
      alert("No hay ningún servicio registrado para exportar a PDF.");
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor = [15, 23, 42]; // Slate 900
    const lightColor = [248, 250, 252]; // Slate 50
    const accentColor = [13, 148, 136]; // Teal 600
    let y = 15;

    // Outer Margin Box
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(8, 8, 194, 281); // elegant thin boundary surrounding page

    // Thin dark band top-edge
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(9, 9, 192, 10, 'F');
    
    y = 28;
    // Shop Brand Header
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(shopSettings.name, 15, y);
    
    y += 5.5;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Dirección: ${shopSettings.address}`, 15, y);
    
    y += 4.5;
    doc.text(`Celular: ${shopSettings.phone}   |   Email: ${shopSettings.email}`, 15, y);

    // Metadata Right Box RUC / NOTA DE SERVICIO / CORRELATIVO
    const rightBoxX = 138;
    const rightBoxY = 25;
    const rightBoxW = 58;
    const rightBoxH = 26;

    doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setLineWidth(0.6);
    doc.rect(rightBoxX, rightBoxY, rightBoxW, rightBoxH);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text(`R.U.C. ${shopSettings.ruc}`, rightBoxX + (rightBoxW / 2), rightBoxY + 7, { align: 'center' });

    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(rightBoxX + 0.3, rightBoxY + 10.5, rightBoxW - 0.6, 6.5, 'F'); // Filled Teal Banner
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("NOTA DE SERVICIO", rightBoxX + (rightBoxW / 2), rightBoxY + 15, { align: 'center' });

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(dataNum, rightBoxX + (rightBoxW / 2), rightBoxY + 22, { align: 'center' });

    // Client/Ticket metadata grid row
    y = 58;
    doc.setLineWidth(0.2);
    doc.setDrawColor(218, 226, 237);
    doc.setFillColor(lightColor[0], lightColor[1], lightColor[2]);
    doc.rect(12, y, 186, 25, 'DF'); // Grid container

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);

    doc.text("CLIENTE:", 16, y + 6);
    doc.text("FECHA EMISIÓN:", 16, y + 13);
    doc.text("TIPO INGRESO:", 16, y + 20);
    
    doc.text("MÉTODO DE PAGO:", 112, y + 6);
    doc.text("ESTADO INGRESO:", 112, y + 13);
    doc.text("MONEDA:", 112, y + 20);

    doc.setFont("Helvetica", "medium");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42); // slate 900

    doc.text(dataClient, 35, y + 6);
    
    const parts = (dataDate || '').split('-');
    const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dataDate;
    doc.text(formattedDate, 44, y + 13);
    doc.text("Servicios Digitales y Gráficos Extras", 42, y + 20);

    doc.text("Efectivo / Caja Chica", 145, y + 6);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text("PAGADO EN EFECTIVO", 145, y + 13);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text("Soles (PEN)", 145, y + 20);

    // Table of Services items
    y = 90;
    const itemColX = 12;
    const descColX = 22;
    const cantColX = 135;
    const pUnitColX = 153;
    const totalColX = 173;
    const tableRightEdge = 198;

    // Draw table header backplate
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(12, y, 186, 8, 'F');

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    
    doc.text("N°", (itemColX + descColX) / 2, y + 5.5, { align: 'center' });
    doc.text("DESCRIPCIÓN DEL SERVICIO REALIZADO", descColX + 2.5, y + 5.5);
    doc.text("CANT.", (cantColX + pUnitColX) / 2, y + 5.5, { align: 'center' });
    doc.text("PRECIO UNIT.", (pUnitColX + totalColX) / 2, y + 5.5, { align: 'center' });
    doc.text("IMPORTE TOTAL", (totalColX + tableRightEdge) / 2, y + 5.5, { align: 'center' });

    // Drawing Service Rows elements
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    let rowY = y + 8;
    const rowHeight = 7.5;

    dataItems.forEach((item, index) => {
      // Row alternating line block bg
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(12, rowY, 186, rowHeight, 'F');
      }

      // Draw grid outline vertical rows borders
      doc.setDrawColor(226, 232, 240);
      doc.line(12, rowY + rowHeight, 198, rowY + rowHeight);

      // Value lines
      doc.text(String(index + 1).padStart(2, '0'), (itemColX + descColX) / 2, rowY + 5, { align: 'center' });
      
      let sName = item.name || '';
      if (sName.length > 55) {
        sName = sName.substring(0, 52) + "...";
      }
      doc.text(sName, descColX + 2.5, rowY + 5);
      
      doc.text(String(item.quantity), (cantColX + pUnitColX) / 2, rowY + 5, { align: 'center' });
      doc.text(`S/ ${Number(item.price).toFixed(2)}`, (pUnitColX + totalColX) / 2, rowY + 5, { align: 'center' });
      doc.text(`S/ ${Number(item.total).toFixed(2)}`, (totalColX + tableRightEdge) / 2, rowY + 5, { align: 'center' });

      rowY += rowHeight;
    });

    // Outer table border limits skeleton
    doc.setDrawColor(148, 163, 184); // slate-400
    doc.rect(12, y, 186, rowY - y);

    // Outer table vertical grids partitions
    doc.line(descColX, y, descColX, rowY);
    doc.line(cantColX, y, cantColX, rowY);
    doc.line(pUnitColX, y, pUnitColX, rowY);
    doc.line(totalColX, y, totalColX, rowY);

    // Totals, notes & design footer layout
    y = rowY + 8;

    // Check if the table is overflowing page boundaries
    if (y > 210) {
      doc.addPage();
      doc.setDrawColor(226, 232, 240);
      doc.rect(8, 8, 194, 281);
      y = 20;
    }

    // Observations block left
    const obsY = y;
    doc.setDrawColor(218, 226, 237);
    doc.rect(12, obsY, 110, 24);
    doc.setFillColor(lightColor[0], lightColor[1], lightColor[2]);
    doc.rect(12, obsY, 110, 5.5, 'F');
    doc.line(12, obsY + 5.5, 122, obsY + 5.5);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text("OBSERVACIONES / DETALLES DE SERVICIO", 15, obsY + 4);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    
    if (dataNotes) {
      const splitObs = doc.splitTextToSize(dataNotes, 104);
      doc.text(splitObs, 15, obsY + 10);
    } else {
      doc.text("Servicio de copiado, digitalización y/o impresiones calculado e ingresado al registro diario interno de la librería.", 15, obsY + 10);
      doc.text("Entregado conforme en counter.", 15, obsY + 14);
    }

    // Subtotal and Grand Totals values box right
    const totX = 132;
    let totY = y;
    const totW = 66;

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);

    // Draw subtotal row line
    doc.text("SUBTOTAL:", totX + 2, totY + 4);
    doc.setFont("Helvetica", "normal");
    doc.text(`S/ ${dataTotal.toFixed(2)}`, totX + totW - 2, totY + 4, { align: 'right' });
    
    // Draw IGV (Included) row line
    totY += 6.5;
    doc.setFont("Helvetica", "bold");
    doc.text("IGV INCLUIDO (0%):", totX + 2, totY + 4);
    doc.setFont("Helvetica", "normal");
    doc.text("S/ 0.00", totX + totW - 2, totY + 4, { align: 'right' });

    // Draw Grand Total banner row line
    totY += 6.5;
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(totX, totY, totW, 7.5, 'F');
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL NETO:", totX + 2, totY + 5);
    doc.text(`S/ ${dataTotal.toFixed(2)}`, totX + totW - 2, totY + 5, { align: 'right' });

    // Accent frame border totals layout
    doc.setDrawColor(218, 226, 237);
    doc.rect(totX, y, totW, totY + 7.5 - y);
    doc.line(totX, y + 6.5, totX + totW, y + 6.5);
    doc.line(totX, y + 13, totX + totW, y + 13);

    // Beautiful footer note
    y = Math.max(obsY + 32, totY + 15);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text(shopSettings.message.toUpperCase(), 105, y, { align: 'center' });

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("REGISTRO DE CONTROL DE GASTOS E INGRESOS EXTRAS - LIBRERIA EL ESTUDIANTE", 105, y + 4.5, { align: 'center' });

    // Save/Download PDF
    const safeNum = dataNum.replace(/[^\w-]/g, '_');
    const safeClient = dataClient.replace(/[^\s\w]/g, '').trim().substring(0, 15).replace(/\s+/g, '_');
    doc.save(`ServicioExtra_${safeNum}_${safeClient}.pdf`);
  };

  // Filter history tickets
  const filteredHistory = serviceTickets.filter(t => {
    const term = historySearch.toLowerCase();
    return t.number.toLowerCase().includes(term) || t.clientName.toLowerCase().includes(term);
  });

  // Calculate high-level stats of historic service incomes
  const totalIncomesFromServices = serviceTickets.reduce((sum, t) => sum + (t.total || 0), 0);
  const totalIncomesCount = serviceTickets.length;

  return (
    <div id="services-calculator-tab" className="flex-1 flex flex-col md:flex-row overflow-hidden h-full">
      {/* LEFT COLUMN: ACTIVE CALCULATOR FORM / HISTORY */}
      <div className="flex-1 p-6 overflow-y-auto border-r border-slate-100 flex flex-col min-h-0">
        
        {/* KPI stats bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 shrink-0">
          <div className="bg-slate-50 border border-slate-100/80 p-3 rounded-2xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-900/10 text-slate-800 flex items-center justify-center shrink-0">
              <TrendingUp size={15} />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Servicios Totales</span>
              <span className="text-xs font-black text-slate-850 font-mono">{totalIncomesCount} Notas</span>
            </div>
          </div>

          <div className="bg-teal-50/40 border border-teal-100/60 p-3 rounded-2xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center shrink-0">
              <ShoppingBag size={15} />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Recaudación Extra</span>
              <span className="text-xs font-black text-[#0D9488] font-mono">S/ {totalIncomesFromServices.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100/80 p-3 rounded-2xl flex items-center gap-2.5 justify-end">
            <button
              onClick={() => setActiveView('calculator')}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                activeView === 'calculator' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-500 hover:bg-slate-200'
              }`}
            >
              Calculadora
            </button>
            <button
              onClick={() => setActiveView('history')}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                activeView === 'history' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-500 hover:bg-slate-200'
              }`}
            >
              <History size={11} />
              Historial
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginBottom: 0 }}
              animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
              exit={{ height: 0, opacity: 0, marginBottom: 0 }}
              className="bg-teal-50 border border-teal-200 text-[#0D9488] p-3.5 rounded-xl flex items-center gap-3 text-xs font-semibold shrink-0"
            >
              <CheckCircle2 size={16} />
              <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {activeView === 'calculator' ? (
          <div className="flex-1 flex flex-col gap-6">
            
            {/* WORK FORM SEED */}
            <div className="bg-[#FAFBFD] border border-slate-100 p-4 rounded-2xl flex flex-col gap-3 shrink-0">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Hash size={13} className="text-slate-400" />
                Nueva Nota de Servicio: <span className="font-mono text-[#0D9488] font-bold">{ticketNumber}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-405 tracking-wider mb-1 block">Cliente / Solicitante</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400"><User size={14} /></span>
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:border-[#0D9488] outline-none font-semibold text-slate-800"
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      placeholder="Ej. Juan Pérez o Público General"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-405 tracking-wider mb-1 block">Fecha de Realización</label>
                  <input
                    type="date"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-[#0D9488] outline-none font-mono font-bold text-slate-800"
                    value={serviceDate}
                    onChange={e => setServiceDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* PRESETS RAIL GRAPHICS */}
            <div className="flex flex-col gap-2 shrink-0">
              <span className="text-[10px] font-black uppercase text-slate-405 tracking-wider flex items-center gap-1">
                <Briefcase size={12} className="text-slate-400" />
                Servicios Rápidos de Librería (Un Clic para cargar, Dos Clics para agregar directo)
              </span>
              <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
                {SERVICE_PRESETS.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    onDoubleClick={() => handleDirectAppendPreset(preset)}
                    className="bg-white border border-slate-100 hover:border-[#0D9488]/40 hover:bg-teal-50/20 px-3.5 py-2.5 rounded-xl text-left shadow-sm min-w-[170px] transition-all cursor-pointer select-none group shrink-0 active:scale-95"
                    title="Doble clic para agregar instantáneamente"
                  >
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide block mb-0.5">{preset.category}</span>
                    <span className="text-[11px] font-bold text-slate-800 block truncate group-hover:text-[#0D9488]">{preset.name}</span>
                    <span className="text-[10px] font-black text-[#0D9488] font-mono mt-1 block">S/ {preset.price.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* QUICK LINE CALCULATOR INPUT BLOCK */}
            <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 bg-white border border-slate-150 p-4 rounded-2xl shrink-0">
              <div className="sm:col-span-6">
                <label className="text-[10px] font-black uppercase text-slate-405 tracking-wider mb-1 block">Descripción del Servicio</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#0D9488] outline-none font-semibold text-slate-800"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="Ej. Fotocopias A4 del DNI, Impresiones tesis, etc."
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-405 tracking-wider mb-1 block">Precio Unit S/</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#0D9488] outline-none font-mono font-bold text-slate-850"
                  value={unitPrice}
                  onChange={e => setUnitPrice(Number(e.target.value))}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-405 tracking-wider mb-1 block">Cantidad</label>
                <input
                  type="number"
                  min="1"
                  required
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#0D9488] outline-none font-mono font-bold text-slate-850"
                  value={quantity}
                  onChange={e => setQuantity(parseInt(e.target.value, 10) || 1)}
                />
              </div>

              <div className="sm:col-span-2 flex items-end">
                <button
                  type="submit"
                  className="w-full bg-slate-900 text-white rounded-xl py-2 text-xs font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 h-[34px]"
                >
                  <Plus size={13} />
                  Calcular
                </button>
              </div>
            </form>

            {/* WORKSHEET TABLE GRID CONTAINER */}
            <div className="flex-1 border border-slate-150 rounded-2xl bg-white overflow-hidden flex flex-col min-h-[220px]">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-150 flex items-center justify-between shrink-0">
                <span className="text-xs font-black text-slate-700 uppercase tracking-widest font-sans">Hoja de Cálculo Activa</span>
                <span className="text-[10px] font-extrabold text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded-md">
                  {items.length} {items.length === 1 ? 'Línea' : 'Líneas'}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                    <div className="w-11 h-11 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-350 mb-3 animate-bounce">
                      <FileText size={18} />
                    </div>
                    <span className="text-xs font-bold text-slate-500">No hay servicios calculados</span>
                    <p className="text-[10.5px] text-slate-400 font-medium max-w-[280px] mt-1">
                      Haga clic en algún servicio rápido arriba o ingrese una descripción manual para calcular.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-405 bg-slate-50/50">
                        <th className="p-3.5 text-center w-12">#</th>
                        <th className="p-3.5">Detalle del Servicio o Material</th>
                        <th className="p-3.5 text-center w-28">Precio Unitario</th>
                        <th className="p-3.5 text-center w-28">Cantidad</th>
                        <th className="p-3.5 text-right w-24">Subtotal</th>
                        <th className="p-3.5 text-center w-14"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/30 text-xs font-medium text-slate-800">
                          <td className="p-3 text-center text-slate-400 font-mono font-bold">{String(idx + 1).padStart(2, '0')}</td>
                          <td className="p-3 font-semibold text-slate-800">{item.name}</td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="text-slate-400 font-bold font-sans">S/</span>
                              <input
                                type="number"
                                step="0.01"
                                className="w-18 text-center font-mono font-extrabold bg-slate-50 hover:bg-slate-100 focus:bg-white text-slate-800 rounded px-1.5 py-0.5 border border-slate-200 outline-none focus:border-[#0D9488]"
                                value={item.price}
                                onChange={e => handleUpdateItemRow(idx, { price: Number(e.target.value) })}
                              />
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateItemRow(idx, { quantity: item.quantity - 1 })}
                                className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-250 flex items-center justify-center text-xs text-slate-600 font-black cursor-pointer active:scale-95"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                className="w-12 text-center font-mono font-extrabold bg-slate-50 text-slate-850 rounded py-0.5 border border-slate-200 outline-none"
                                value={item.quantity}
                                onChange={e => handleUpdateItemRow(idx, { quantity: parseInt(e.target.value, 10) || 1 })}
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateItemRow(idx, { quantity: item.quantity + 1 })}
                                className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-250 flex items-center justify-center text-xs text-slate-600 font-black cursor-pointer active:scale-95"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono font-extrabold text-slate-900 bg-slate-50/10">
                            S/ {item.total.toFixed(2)}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                              title="Remover de lista"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* NOTES & SUMMARY FOOTER WORK SHEET */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start bg-slate-50/60 border border-slate-100 p-5 rounded-2xl shrink-0">
              <div className="md:col-span-6 flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-slate-405 tracking-wider block">Observaciones adicionales</label>
                <textarea
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-[#0D9488] outline-none font-medium text-slate-700 min-h-[64px] resize-none"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Detalles sobre imprenta, papel, lomo, tintas, copias especiales, etc."
                />
              </div>

              <div className="md:col-span-6 flex flex-col justify-between h-full min-h-[64px]">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Total del Servicio:</span>
                  <span className="text-xl font-mono font-black text-[#0D9488]">S/ {totalAmount.toFixed(2)}</span>
                </div>

                <div className="flex gap-2.5 mt-3">
                  <button
                    type="button"
                    onClick={handleResetCalculator}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-250 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <RotateCcw size={13} />
                    Limpiar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportPDF(items)}
                    disabled={items.length === 0}
                    className="flex-1 bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <FileDown size={14} className="text-[#0D9488]" />
                    Generar PDF
                  </button>

                  <button
                    type="button"
                    onClick={handleRegisterServiceInvoice}
                    disabled={items.length === 0 || isSaving}
                    className="flex-1 bg-slate-900 hover:bg-slate-850 text-white py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Save size={14} />
                    {isSaving ? 'Guardando...' : 'Registrar'}
                  </button>
                </div>
              </div>
            </div>

          </div>
        ) : (
          
          /* HISTORY LIST COMPONENT VIEWER */
          <div className="flex-1 flex flex-col min-h-0">
            {/* SEARCH PANEL IN HISTORY */}
            <div className="relative mb-4 shrink-0">
              <span className="absolute left-3 top-2.5 text-slate-400"><Search size={14} /></span>
              <input
                type="text"
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:border-[#0D9488] outline-none font-semibold text-slate-800"
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                placeholder="Buscar por N°Nota (SER-xxxx) o nombre del cliente..."
              />
            </div>

            <div className="flex-1 border border-slate-150 rounded-2xl bg-white overflow-hidden flex flex-col">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-150 flex items-center justify-between shrink-0">
                <span className="text-xs font-black text-slate-700 uppercase tracking-widest font-sans">Registro General de Servicios Realizados</span>
                <span className="text-[10px] font-extrabold text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded-md">
                  {filteredHistory.length} Registros
                </span>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="h-full flex items-center justify-center p-8 text-slate-400 font-semibold text-xs">
                    Cargando historial de servicios...
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                    <Info size={18} className="mb-2 text-slate-300" />
                    <span className="text-xs font-bold text-slate-500">No se encontraron registros</span>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-405 bg-slate-50/50">
                        <th className="p-3 w-16 text-center">N° Nota</th>
                        <th className="p-3 w-28">Fecha</th>
                        <th className="p-3">Cliente</th>
                        <th className="p-3 text-center w-24">Servicios</th>
                        <th className="p-3 text-right w-28">Total Recaudado</th>
                        <th className="p-3 text-center w-32">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredHistory.map((ticket) => (
                        <tr key={ticket.id} className="hover:bg-slate-50/30 text-xs font-medium text-slate-850">
                          <td className="p-3 text-center font-mono font-bold text-[#0D9488] bg-teal-50/10">{ticket.number}</td>
                          <td className="p-3 font-mono text-slate-500">{ticket.date}</td>
                          <td className="p-3 font-semibold text-slate-800">{ticket.clientName}</td>
                          <td className="p-3 text-center text-slate-500 font-mono font-bold">
                            {ticket.items?.length || 0}
                          </td>
                          <td className="p-3 text-right font-mono font-extrabold text-[#0D9488]">
                            S/ {(ticket.total || 0).toFixed(2)}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {/* Detail trigger */}
                              <button
                                type="button"
                                onClick={() => setSelectedHistoryTicket(ticket)}
                                className="px-2 py-1 text-[10px] font-black text-slate-650 bg-slate-100 rounded hover:bg-slate-200 transition-colors cursor-pointer"
                              >
                                Ver Detalle
                              </button>

                              {/* PDF reprint */}
                              <button
                                type="button"
                                onClick={() => handleExportPDF(ticket)}
                                className="p-1 rounded bg-teal-50 text-[#0D9488] hover:bg-teal-100/60 transition-colors cursor-pointer"
                                title="Volver a exportar en PDF"
                              >
                                <FileDown size={13} />
                              </button>

                              {/* Prune record */}
                              <button
                                type="button"
                                onClick={async () => {
                                  if (confirm(`¿Desea borrar permanentemente este reporte de servicio diario ${ticket.number}?`)) {
                                    await ServiceTicketService.deleteServiceTicket(ticket.id);
                                    if (selectedHistoryTicket?.id === ticket.id) {
                                      setSelectedHistoryTicket(null);
                                    }
                                  }
                                }}
                                className="p-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100/60 transition-colors cursor-pointer"
                                title="Eliminar registro"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* RIGHT SIDE PANEL: DETAILED HISTORY PREVIEW BOX OR INTERACTIVE LEGEND */}
      <div className="w-full md:w-80 bg-slate-50/40 p-6 flex flex-col overflow-y-auto shrink-0 border-t md:border-t-0 border-slate-100">
        {selectedHistoryTicket ? (
          <div className="flex flex-col h-full gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-black uppercase text-[#0D9488] tracking-widest font-mono">Detalle del Registro</span>
                <h4 className="text-sm font-black text-slate-800 font-mono">{selectedHistoryTicket.number}</h4>
              </div>
              <button
                onClick={() => setSelectedHistoryTicket(null)}
                className="w-5 h-5 rounded-full hover:bg-slate-250 flex items-center justify-center text-slate-500 font-black cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3 font-sans text-xs">
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Cliente / Solicitante:</span>
                <span className="font-semibold text-slate-800 text-[13px]">{selectedHistoryTicket.clientName}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Fecha:</span>
                  <span className="font-mono font-bold text-slate-700">{selectedHistoryTicket.date}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Total Recaudado:</span>
                  <span className="font-mono font-extrabold text-[#0D9488]">S/ {(selectedHistoryTicket.total || 0).toFixed(2)}</span>
                </div>
              </div>

              {selectedHistoryTicket.notes && (
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Observaciones:</span>
                  <p className="bg-white p-2.5 rounded-lg border border-slate-150 text-[11px] text-slate-600 font-medium">
                    {selectedHistoryTicket.notes}
                  </p>
                </div>
              )}
            </div>

            {/* List items inside selected ticket */}
            <div className="flex-1 flex flex-col min-h-[150px] bg-white border border-slate-150 rounded-xl overflow-hidden mt-2">
              <span className="bg-slate-50 border-b border-slate-150 px-3 py-2 text-[9px] font-black uppercase text-slate-500 tracking-wider font-sans block">
                Conceptos Cobrados ({selectedHistoryTicket.items?.length || 0})
              </span>
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {selectedHistoryTicket.items?.map((item, i) => (
                  <div key={i} className="p-3 flex justify-between items-start text-xs hover:bg-slate-50/20">
                    <div className="max-w-[70%]">
                      <span className="font-bold text-slate-800 block leading-tight">{item.name}</span>
                      <span className="font-mono text-[10px] text-slate-400">{item.quantity} x S/ {Number(item.price).toFixed(2)}</span>
                    </div>
                    <span className="font-mono font-extrabold text-slate-800">S/ {Number(item.total).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleExportPDF(selectedHistoryTicket)}
              className="w-full bg-[#0D9488] hover:bg-[#0B7F74] text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 mt-auto cursor-pointer font-sans"
            >
              <FileDown size={14} />
              Imprimir Nota PDF
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-10 my-auto text-slate-400">
            <div className="w-11 h-11 rounded-full bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center border border-[#0D9488]/10 animate-pulse mb-3">
              <Clock size={18} />
            </div>
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Cálculo en Counter</span>
            <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed max-w-[210px]">
              Use este panel complementario para calcular el cobro exacto de servicios digitales como impresiones en el instante.
            </p>
            <div className="mt-5 border-t border-slate-200/60 pt-4 text-left w-full">
              <span className="text-[9px] font-black uppercase text-slate-405 tracking-wider block mb-2">Consejos de uso:</span>
              <ol className="list-decimal pl-4 text-[10.5px] text-slate-500 font-medium space-y-1 my-0">
                <li>Haga <strong>un clic</strong> sobre cualquier servicio rápido para pre-llenar precio y descripción.</li>
                <li>Haga <strong>doble clic</strong> para agregarlo instantáneamente con cantidad 1.</li>
                <li>Edite cantidades o precios directamente en las celdas de la tabla para ajustes rápidos.</li>
                <li>Haga clic en <strong>Registrar</strong> para que se guarde permanentemente en los ingresos extras de la librería.</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
