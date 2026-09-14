import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Calendar, 
  FileText, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Download, 
  Save, 
  X, 
  ArrowLeft,
  SearchCode,
  AlertTriangle,
  User,
  ShoppingBag,
  CreditCard,
  Building,
  Briefcase,
  Sliders,
  Sparkles,
  Info,
  Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSalesNotes, SalesNote, SalesNoteItem } from '../hooks/useSalesNotes';
import { SalesNoteService } from '../services/salesNoteService';
import { DebtorService } from '../services/debtorService';
import { useClients } from '../hooks/useClients';
import { useProducts, Product } from '../hooks/useProducts';
import { jsPDF } from 'jspdf';

// Store default shop settings in localStorage so they persist
const DEFAULT_SHOP_SETTINGS = {
  name: 'LIBRERÍA "EL ESTUDIANTE"',
  ruc: '10434717731',
  phone: '95303660458',
  address: 'Jr. Tacna N° 668',
  email: 'libreriaelestudiante@gmail.com',
  message: '¡Gracias por su preferencia! Vuelve pronto.'
};

export const SalesNoteManager: React.FC = () => {
  const { salesNotes, loading, error } = useSalesNotes();
  const { clients } = useClients();
  const { products } = useProducts();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Cancelado' | 'Pendiente' | 'Parcial'>('Todos');
  const [selectedNote, setSelectedNote] = useState<SalesNote | null>(null);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Shop settings state are system-wide fixed
  const [shopSettings, setShopSettings] = useState(DEFAULT_SHOP_SETTINGS);
  const [showConfig, setShowConfig] = useState(false);

  // Creator state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteNumber, setNoteNumber] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientName, setSelectedClientName] = useState('');
  const [selectedClientDoc, setSelectedClientDoc] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [noteDate, setNoteDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [noteItems, setNoteItems] = useState<SalesNoteItem[]>([]);
  const [noteDiscount, setNoteDiscount] = useState(0);
  const [includeIgv, setIncludeIgv] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Yape' | 'Plin' | 'Transferencia' | 'Tarjeta'>('Efectivo');
  const [paidAmount, setPaidAmount] = useState(0);
  const [noteStatus, setNoteStatus] = useState<'Cancelado' | 'Pendiente' | 'Parcial'>('Cancelado');
  const [noteObservations, setNoteObservations] = useState('');
  const [billingCondition, setBillingCondition] = useState<'Contado' | 'Crédito'>('Contado');

  // Autocomplete for items
  const [itemSearchText, setItemSearchText] = useState<{ [key: number]: string }>({});
  const [itemDropdownActive, setItemDropdownActive] = useState<{ [key: number]: boolean }>({});

  // Save shop settings
  const handleSaveShopSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('shop_settings_invoice', JSON.stringify(shopSettings));
    setShowConfig(false);
  };

  // Generate next sequential note number
  useEffect(() => {
    if (editingNoteId || !isCreatorOpen) return;
    if (salesNotes.length === 0) {
      setNoteNumber('NV-0001');
      return;
    }
    // Extract numbers and search for highest
    const numbers = salesNotes
      .map(n => {
        const match = n.number?.match(/NV-(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => !isNaN(num));
    
    const highest = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNum = String(highest + 1).padStart(4, '0');
    setNoteNumber(`NV-${nextNum}`);
  }, [salesNotes, isCreatorOpen, editingNoteId]);

  // Clear creator form
  const handleOpenCreator = () => {
    setEditingNoteId(null);
    setSelectedClientName('');
    setSelectedClientDoc('');
    setClientSearch('');
    setNoteDate(new Date().toISOString().split('T')[0]);
    setNoteItems([{ name: '', price: 0, quantity: 1, total: 0 }]);
    setNoteDiscount(0);
    setIncludeIgv(false);
    setPaymentMethod('Efectivo');
    setPaidAmount(0);
    setNoteStatus('Cancelado');
    setNoteObservations('');
    setItemSearchText({});
    setItemDropdownActive({});
    setBillingCondition('Contado');
    setIsCreatorOpen(true);
  };

  // Populate form with existing note details to edit
  const handleEditNote = (note: SalesNote) => {
    setEditingNoteId(note.id);
    setNoteNumber(note.number || '');
    setSelectedClientName(note.clientName || '');
    setSelectedClientDoc(note.clientDoc || '');
    setClientSearch(note.clientName || '');
    setNoteDate(note.date || new Date().toISOString().split('T')[0]);
    
    const itemsCopy = (note.items || []).map(item => ({
      name: item.name || '',
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 1),
      total: Number((item.price * item.quantity).toFixed(2))
    }));
    // Append a blank row for easy editing
    itemsCopy.push({ name: '', price: 0, quantity: 1, total: 0 });
    
    setNoteItems(itemsCopy);
    setNoteDiscount(note.discount || 0);
    setIncludeIgv(note.igv > 0);
    setPaymentMethod(note.paymentMethod || 'Efectivo');
    setPaidAmount(note.paidAmount || 0);
    setNoteStatus(note.status || 'Cancelado');
    setNoteObservations(note.notes || '');
    setBillingCondition(note.paidAmount < note.total ? 'Crédito' : 'Contado');
    setItemSearchText({});
    setItemDropdownActive({});
    setIsCreatorOpen(true);
  };

  // Item additions / deletions
  const handleAddItemRow = () => {
    setNoteItems(prev => [...prev, { name: '', price: 0, quantity: 1, total: 0 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (noteItems.length <= 1) {
      alert("La nota de venta debe contener al menos un producto.");
      return;
    }
    setNoteItems(prev => prev.filter((_, i) => i !== index));
    // Clear search states for this row
    const newSearchText = { ...itemSearchText };
    delete newSearchText[index];
    setItemSearchText(newSearchText);
  };

  const handleItemPropertyChange = (index: number, key: keyof SalesNoteItem, value: any) => {
    const updatedItems = [...noteItems];
    const item = { ...updatedItems[index], [key]: value };

    // Update individual totals
    const price = Number(key === 'price' ? value : item.price);
    const quantity = Number(key === 'quantity' ? value : item.quantity);
    item.total = Number((price * quantity).toFixed(2));

    updatedItems[index] = item;
    setNoteItems(updatedItems);
  };

  // Select product from inventory directly
  const handleSelectProduct = (index: number, p: Product) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const isOfferExpired = p.isOffer && p.offerExpiryDate ? p.offerExpiryDate < todayStr : false;
    const isOfferActive = p.isOffer && !isOfferExpired;
    const actualPrice = p.offerPrice && isOfferActive ? p.offerPrice : p.price;
    const updatedItems = [...noteItems];
    updatedItems[index] = {
      productId: p.id,
      name: p.name,
      price: actualPrice,
      quantity: 1,
      total: actualPrice
    };

    // If it's the last row of the incorporated products table, automatically append a blank row
    if (index === noteItems.length - 1) {
      updatedItems.push({ name: '', price: 0, quantity: 1, total: 0 });
    }

    setNoteItems(updatedItems);
    
    // Update label
    setItemSearchText(prev => ({ ...prev, [index]: p.name }));
    setItemDropdownActive(prev => ({ ...prev, [index]: false }));

    // Autofocus and auto-select the quantity input so they only have to type the amount
    setTimeout(() => {
      const qInput = document.getElementById(`quantity-input-${index}`) as HTMLInputElement | null;
      if (qInput) {
        qInput.focus();
        qInput.select();
      }
    }, 50);
  };

  // Calculate totals
  const subtotalSum = noteItems.reduce((sum, item) => sum + (item.total || 0), 0);
  const igvCalculated = includeIgv ? Number((subtotalSum * 0.18).toFixed(2)) : 0;
  const grandTotalCalculated = Number((subtotalSum + igvCalculated - noteDiscount).toFixed(2));

  // Auto-set Status & Default Paid Amount based on values
  useEffect(() => {
    const total = grandTotalCalculated;

    if (billingCondition === 'Contado') {
      setPaidAmount(total);
      setNoteStatus('Cancelado');
    } else {
      if (paidAmount >= total && total > 0) {
        setNoteStatus('Cancelado');
      } else if (paidAmount > 0 && paidAmount < total) {
        setNoteStatus('Parcial');
      } else {
        setNoteStatus('Pendiente');
      }
    }
  }, [paidAmount, noteDiscount, subtotalSum, includeIgv, billingCondition, grandTotalCalculated]);

  // Create Sales Note in DB
  const handleSaveSalesNote = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClientName.trim()) {
      alert("El nombre de cliente es obligatorio.");
      return;
    }

    // Filter out rows that are completely blank/unentered to allow smooth automatic line appends
    const activeItems = noteItems.filter(item => item.name.trim() !== '');

    if (activeItems.length === 0) {
      alert("La nota de venta debe contener al menos un producto.");
      return;
    }

    const invalidItem = activeItems.find(item => item.price <= 0 || item.quantity <= 0);
    if (invalidItem) {
      alert("Todos los productos incorporados deben tener precio y cantidad válidos.");
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<SalesNote> = {
        ...(editingNoteId ? { id: editingNoteId } : {}),
        number: noteNumber,
        clientName: selectedClientName,
        clientDoc: selectedClientDoc,
        date: noteDate,
        items: activeItems,
        subtotal: subtotalSum,
        discount: noteDiscount,
        igv: igvCalculated,
        total: grandTotalCalculated,
        paymentMethod,
        status: noteStatus,
        paidAmount: Math.min(paidAmount, grandTotalCalculated),
        notes: noteObservations
      };

      await SalesNoteService.saveSalesNote(payload);

      // AUTOMATIC INCORPORATION TO DEBTORS IF PURCHASE METHOD IS AL CRÉDITO AND IS NEW NOTE
      if (!editingNoteId && billingCondition === 'Crédito') {
        const remainingDebt = grandTotalCalculated - paidAmount;
        if (remainingDebt > 0) {
          const debtorPayload = {
            apellidosNombres: selectedClientName,
            fecha: noteDate,
            producto: `Nota de Venta ${noteNumber} (${activeItems.map(item => `${item.quantity}x ${item.name}`).join(', ')})`,
            precio: remainingDebt,
            estado: 'Pendiente' as const,
            observacion: `Registrado automáticamente desde Nota de Venta ${noteNumber}. Total de Compra: S/ ${grandTotalCalculated}. Pagó a cuenta: S/ ${paidAmount}.`
          };
          await DebtorService.saveDebtor(debtorPayload);
        }
      }

      if (editingNoteId) {
        // Update local state details
        setSelectedNote({
          id: editingNoteId,
          ...payload
        } as SalesNote);
      }

      setIsCreatorOpen(false);
      alert("Nota de venta guardada exitosamente.");
    } catch (err) {
      console.error(err);
      alert("Falla al guardar nota de venta.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete
  const handleDeleteNote = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este registro de venta? No afectará físicamente al inventario básico, pero la boleta se borrará del historial.")) {
      try {
        await SalesNoteService.deleteSalesNote(id);
        setSelectedNote(null);
      } catch (err) {
        console.error(err);
        alert("Falla al remover nota de venta.");
      }
    }
  };

  // Filtering list
  const filteredNotes = salesNotes.filter(n => {
    const matchesSearch = 
      (n.number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.clientDoc || '').includes(searchTerm);
    
    const matchesStatus = statusFilter === 'Todos' || n.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // KPI Computations
  const totalInvoiced = salesNotes.reduce((sum, n) => sum + (n.total || 0), 0);
  const totalReceived = salesNotes.reduce((sum, n) => sum + (n.paidAmount || 0), 0);
  const totalPendingBalance = totalInvoiced - totalReceived;
  const countNotes = salesNotes.length;

  // Auto-complete Client Selection
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.doc || '').includes(clientSearch)
  ).slice(0, 5);

  const handleSelectClient = (c: any) => {
    setSelectedClientName(c.name);
    setSelectedClientDoc(c.doc || '');
    setClientSearch(c.name);
    setShowClientDropdown(false);
  };

  const handleCustomClient = () => {
    setSelectedClientName(clientSearch);
    setShowClientDropdown(false);
  };

  // Export beautiful PDF - "DOCUMENTO BANDERA"
  const handleDownloadPDF = (note: SalesNote) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Color definitions
    const primaryColor = [15, 23, 42]; // Slate 900
    const lightColor = [248, 250, 252]; // Slate 50
    const accentColor = [13, 148, 136]; // Teal 600

    // Coordinates mapping
    let y = 15;

    // Outer Margin Box
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(8, 8, 194, 281); // beautiful fine border surrounding page

    // 1. Sleek corporate design layout header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(9, 9, 192, 10, 'F'); // elegant thin dark band top-edge
    
    y = 28;
    // Business details left
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(shopSettings.name, 15, y);
    
    // Business details address,phone under name
    y += 5;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Dirección: ${shopSettings.address}`, 15, y);
    
    y += 4.5;
    doc.text(`Celular: ${shopSettings.phone}   |   Email: ${shopSettings.email}`, 15, y);

    // Business details box right (RUC / NOTA / CORRELATIVO)
    const rightBoxX = 138;
    const rightBoxY = 25;
    const rightBoxW = 58;
    const rightBoxH = 26;

    doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setLineWidth(0.6);
    doc.rect(rightBoxX, rightBoxY, rightBoxW, rightBoxH); // Accent border for receipt header

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text(`R.U.C. ${shopSettings.ruc}`, rightBoxX + (rightBoxW / 2), rightBoxY + 7, { align: 'center' });

    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(rightBoxX + 0.3, rightBoxY + 10.5, rightBoxW - 0.6, 6.5, 'F'); // Teal banner filled
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("NOTA DE VENTA", rightBoxX + (rightBoxW / 2), rightBoxY + 15, { align: 'center' });

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(note.number, rightBoxX + (rightBoxW / 2), rightBoxY + 22, { align: 'center' });

    // 2. Client registration grid
    y = 58;
    doc.setLineWidth(0.2);
    doc.setDrawColor(218, 226, 237);
    doc.setFillColor(lightColor[0], lightColor[1], lightColor[2]);
    doc.rect(12, y, 186, 26, 'DF'); // Background client block

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); // slate-600
    
    // Labels inside grid
    doc.text("CLIENTE:", 16, y + 6);
    doc.text("DNI / RUC:", 16, y + 12);
    doc.text("FECHA EMISIÓN:", 16, y + 18);
    
    doc.text("MÉT. PAGO:", 120, y + 6);
    doc.text("ESTADO:", 120, y + 12);
    doc.text("MONEDA:", 120, y + 18);

    doc.setFont("Helvetica", "medium");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42); // slate-900

    doc.text(note.clientName, 36, y + 6);
    doc.text(note.clientDoc || '-- Sin Documento --', 36, y + 12);
    
    // Format date nicely inside PDF
    const parts = (note.date || '').split('-');
    const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : note.date;
    doc.text(formattedDate, 46, y + 18);
    
    doc.text(note.paymentMethod || 'Efectivo', 140, y + 6);
    
    // Capitalize and format status
    const statusText = note.status === 'Cancelado' ? 'PAGADO / CANCELADO' : note.status === 'Parcial' ? 'PAGO PARCIAL' : 'PENDIENTE DE PAGO';
    doc.text(statusText, 140, y + 12);
    doc.text("Soles (PEN)", 140, y + 18);

    // 3. Table of items layout
    y = 92;
    const itemColX = 12;
    const descColX = 24;
    const cantColX = 134;
    const pUnitColX = 152;
    const totalColX = 174;
    const tableRightEdge = 198;

    // Headers heights
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(12, y, 186, 8, 'F');

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    
    doc.text("CÓD.", (itemColX + descColX) / 2, y + 5.5, { align: 'center' });
    doc.text("DESCRIPCIÓN DEL PRODUCTO", descColX + 2, y + 5.5);
    doc.text("CANT.", (cantColX + pUnitColX) / 2, y + 5.5, { align: 'center' });
    doc.text("P.UNIT", (pUnitColX + totalColX) / 2, y + 5.5, { align: 'center' });
    doc.text("IMPORTE", (totalColX + tableRightEdge) / 2, y + 5.5, { align: 'center' });

    // Drawing rows elements
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59); // slate-800

    let rowY = y + 8;
    const rowHeight = 7.5;

    (note.items || []).forEach((item, index) => {
      // Row alternating line block bg
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252); // soft slate alternate rows
        doc.rect(12, rowY, 186, rowHeight, 'F');
      }

      // Draw grid outline vertical rows borders
      doc.setDrawColor(226, 232, 240);
      doc.line(12, rowY + rowHeight, 198, rowY + rowHeight);

      // Value lines
      doc.text(String(index + 1).padStart(2, '0'), (itemColX + descColX) / 2, rowY + 5, { align: 'center' });
      
      // Cut off very long product names nicely to prevent visual overlapping
      let pName = item.name || '';
      if (pName.length > 55) {
        pName = pName.substring(0, 52) + "...";
      }
      doc.text(pName, descColX + 2, rowY + 5);
      
      doc.text(String(item.quantity), (cantColX + pUnitColX) / 2, rowY + 5, { align: 'center' });
      doc.text(`S/ ${Number(item.price).toFixed(2)}`, (pUnitColX + totalColX) / 2, rowY + 5, { align: 'center' });
      doc.text(`S/ ${Number(item.total).toFixed(2)}`, (totalColX + tableRightEdge) / 2, rowY + 5, { align: 'center' });

      rowY += rowHeight;
    });

    // Outer table limits
    doc.setDrawColor(148, 163, 184); // slate-400
    doc.rect(12, y, 186, rowY - y);

    // Grid vertical partitions
    doc.line(descColX, y, descColX, rowY);
    doc.line(cantColX, y, cantColX, rowY);
    doc.line(pUnitColX, y, pUnitColX, rowY);
    doc.line(totalColX, y, totalColX, rowY);

    // 4. Totals and signatures section
    y = rowY + 8;

    // Check if the table is overflowing
    if (y > 210) {
      doc.addPage();
      doc.setDrawColor(226, 232, 240);
      doc.rect(8, 8, 194, 281);
      y = 20;
    }

    // Observations block left
    const obsY = y;
    doc.setDrawColor(218, 226, 237);
    doc.rect(12, obsY, 110, 22);
    doc.setFillColor(lightColor[0], lightColor[1], lightColor[2]);
    doc.rect(12, obsY, 110, 5, 'F');
    doc.line(12, obsY + 5, 122, obsY + 5);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text("OBSERVACIONES / DETALLES DE VENTA", 15, obsY + 3.5);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    
    // Multi-line wrap text observations
    if (note.notes) {
      const splitObs = doc.splitTextToSize(note.notes, 104);
      doc.text(splitObs, 15, obsY + 9);
    } else {
      doc.text("Ninguna observación registrada para esta transacción.", 15, obsY + 9);
    }

    // Totals box right
    const totX = 132;
    let totY = y;
    const totW = 66;
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);

    // Draw lines
    const drawTotalLine = (label: string, val: number, isGrandTotal = false) => {
      doc.text(label, totX + 2, totY + 4);
      doc.setFont("Helvetica", isGrandTotal ? "bold" : "normal");
      if (isGrandTotal) {
        doc.setFontSize(10);
        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      }
      doc.text(`S/ ${val.toFixed(2)}`, totX + totW - 2, totY + 4, { align: 'right' });
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      
      doc.setDrawColor(226, 232, 240);
      doc.line(totX, totY + 6, totX + totW, totY + 6);
      totY += 6.5;
    };

    drawTotalLine("SUBTOTAL:", note.subtotal);
    if (note.discount > 0) {
      drawTotalLine("DESCUENTO:", note.discount);
    }
    if (note.igv > 0) {
      drawTotalLine("I.G.V. (18%):", note.igv);
    }
    drawTotalLine("TOTAL NETO:", note.total, true);
    
    // Paid & Balance remaining fields
    drawTotalLine("PAGO A CUENTA:", note.paidAmount || 0);
    const balance = Math.max(0, note.total - (note.paidAmount || 0));
    drawTotalLine("SALDO RESTANTE:", balance);

    // Box around totals
    doc.setDrawColor(203, 213, 225); // Slate 300
    doc.rect(totX, y, totW, totY - y);

    // 5. Final footer (Signatures section deleted!)
    y = totY + 12;
    if (y > 270) {
      doc.addPage();
      doc.setDrawColor(226, 232, 240);
      doc.rect(8, 8, 194, 281);
      y = 25;
    }

    // Legal footer disclaimer
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(shopSettings.message, 105, y, { align: 'center' });
    
    y += 5.5;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Documento interno sin valor fiscal Sunat. Control de inventario y cuenta corriente.", 105, y, { align: 'center' });

    // Trigger save and download dialog
    doc.save(`NOTA_VENTA_${note.number}.pdf`);
  };

  return (
    <div className="flex-1 flex flex-col h-[60vh] md:h-[65vh] overflow-hidden bg-slate-50/10">
      
      {/* 1. Header Dynamic KPIs of all Sales Notes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 shrink-0 px-1">
        <div className="bg-slate-50/85 border border-slate-200 rounded-2xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900/5 text-slate-800 flex items-center justify-center shrink-0">
            <FileText size={16} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block leading-tight uppercase tracking-wider">Boletas Emitidas</span>
            <span className="text-sm font-black text-slate-800 font-mono">{countNotes} uds.</span>
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-emerald-600 block leading-tight uppercase tracking-wider">Recaudado (Efectivo)</span>
            <span className="text-sm font-black text-slate-800 font-mono">S/ {totalReceived.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-700 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-rose-600 block leading-tight uppercase tracking-wider">Por Cobrar (Saldos)</span>
            <span className="text-sm font-black text-slate-800 font-mono">S/ {totalPendingBalance.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-900 rounded-2xl p-3 flex items-center gap-3 text-white">
          <div className="w-9 h-9 rounded-xl bg-white/10 text-brand-teal flex items-center justify-center shrink-0">
            <ShoppingBag size={16} />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block leading-tight uppercase tracking-wider">Volumen Financiero</span>
            <span className="text-sm font-black font-mono">S/ {totalInvoiced.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 2. Top Navigation Actions toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 py-3 border-b border-slate-100 items-center justify-between shrink-0 px-1">
        
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:max-w-2xl">
          {/* Searching input */}
          <div className="relative w-full sm:w-64">
            <input 
              type="text" 
              value={searchTerm}
              placeholder="Buscar por nro, cliente o DNI..." 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 text-xs font-sans outline-none focus:border-brand-teal focus:bg-white transition-all text-slate-800"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-slate-700"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Estado dynamic filter switches */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-150 shrink-0">
            {(['Todos', 'Cancelado', 'Pendiente', 'Parcial'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  statusFilter === filter
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {filter === 'Todos' ? 'Todos' : filter === 'Cancelado' ? 'Cancelado' : filter === 'Pendiente' ? 'Pendiente' : 'A Cuenta'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto self-end">
          <button
            onClick={() => setShowConfig(true)}
            className="px-3 py-2 border border-slate-200 text-slate-655 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            title="Configurar Emisor (RUC, Empresa)"
          >
            <Building size={14} />
            Datos de Emisor
          </button>
          
          <button
            onClick={handleOpenCreator}
            className="flex-1 sm:flex-none bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus size={14} />
            Nueva Nota
          </button>
        </div>
      </div>

      {/* 3. Notes display content */}
      <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden shrink-0 mt-3">
        {/* Left lists column */}
        <div className="w-full md:w-96 flex flex-col border-r border-slate-100 h-full overflow-y-auto pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 py-8">
              <div className="w-8 h-8 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-400 mt-3 font-semibold font-sans">Cargando notas de venta...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-650 p-4 rounded-2xl text-xs font-semibold text-center">
              {error}
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <FileText size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="text-slate-500 font-bold text-xs">Sin notas de venta</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed font-sans">
                {searchTerm || statusFilter !== 'Todos'
                  ? "Prueba cambiando el filtro."
                  : "Presiona 'Nueva Nota' para generar tu primer documento bandera."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left relative flex flex-col justify-between ${
                    selectedNote?.id === note.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-950/10'
                      : 'bg-white border-slate-150 hover:border-slate-300 hover:bg-slate-50/40 text-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black tracking-tight block">
                        {note.number}
                      </span>
                      {note.status === 'Cancelado' ? (
                        <span className={`inline-flex px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded ${
                          selectedNote?.id === note.id ? 'bg-emerald-555 text-white' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          Pagado
                        </span>
                      ) : note.status === 'Parcial' ? (
                        <span className={`inline-flex px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded ${
                          selectedNote?.id === note.id ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800'
                        }`}>
                          A cuenta
                        </span>
                      ) : (
                        <span className={`inline-flex px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded ${
                          selectedNote?.id === note.id ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-800'
                        }`}>
                          Pendiente
                        </span>
                      )}
                    </div>

                    <h4 className="text-[12px] font-black tracking-tight mt-1.5 font-sans leading-snug truncate">
                      {note.clientName}
                    </h4>
                    
                    {note.clientDoc && (
                      <span className={`text-[9px] font-bold block mt-0.5 font-mono ${selectedNote?.id === note.id ? 'text-slate-300' : 'text-slate-400'}`}>
                        DNI/RUC: {note.clientDoc}
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-end mt-3 pt-2.5 border-t border-slate-100/10">
                    <span className={`inline-flex text-[9px] font-bold ${selectedNote?.id === note.id ? 'text-slate-350' : 'text-slate-400'}`}>
                      {note.date}
                    </span>
                    <span className="text-xs font-black font-mono">
                      S/ {Number(note.total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Detail Pane */}
        <div className="flex-1 flex flex-col p-4 bg-slate-50/50 rounded-2xl border border-slate-150 h-full overflow-y-auto min-h-0 ml-0 md:ml-4 mt-4 md:mt-0">
          {selectedNote ? (
            <div className="flex-1 flex flex-col justify-between h-full">
              {/* Note Full view */}
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-slate-900 font-mono">
                        {selectedNote.number}
                      </span>
                      {selectedNote.status === 'Cancelado' ? (
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded">
                          Cancelado
                        </span>
                      ) : selectedNote.status === 'Parcial' ? (
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 rounded">
                          Pago Parcial S/ {Number(selectedNote.paidAmount || 0).toFixed(2)}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 rounded">
                          Pendiente total
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">Registrado el {selectedNote.date}</p>
                  </div>

                  <div className="flex gap-2 mt-3 sm:mt-0">
                    <button
                      onClick={() => handleEditNote(selectedNote)}
                      className="px-3 py-2 border border-slate-200 text-slate-755 hover:bg-slate-100 font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Editar registro de nota de venta"
                    >
                      <Pencil size={14} />
                      Editar
                    </button>

                    <button
                      onClick={() => handleDownloadPDF(selectedNote)}
                      className="px-3.5 py-2 bg-brand-teal text-white hover:bg-teal-555 font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Descargar Nota de Venta PDF"
                    >
                      <Download size={14} />
                      PDF
                    </button>
                    
                    <button
                      onClick={() => handleDeleteNote(selectedNote.id)}
                      className="p-2 border border-rose-200 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Eliminar del Historial"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Grid clients */}
                <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-100 text-xs text-slate-700">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider mb-0.5">Cliente:</span>
                    <p className="font-bold text-slate-800">{selectedNote.clientName}</p>
                    {selectedNote.clientDoc && (
                      <p className="font-mono text-[10px] text-slate-500 mt-0.5">DNI/RUC: {selectedNote.clientDoc}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider mb-0.5">Condiciones Financieras:</span>
                    <p className="font-semibold text-slate-700">Método: <span className="font-sans font-bold text-slate-900">{selectedNote.paymentMethod}</span></p>
                    <p className="font-semibold text-slate-750">Saldo Restante: <span className="font-mono font-bold text-rose-600">S/ {(selectedNote.total - (selectedNote.paidAmount || 0)).toFixed(2)}</span></p>
                  </div>
                </div>

                {/* Item List Header */}
                <div className="mt-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Productos Incluidos:</span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 font-bold text-slate-550 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2">Item</th>
                          <th className="px-4 py-2 text-right">Cant.</th>
                          <th className="px-4 py-2 text-right">P.Unit</th>
                          <th className="px-4 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedNote.items || []).map((it, idx) => (
                          <tr key={idx} className="border-b last:border-b-0 border-slate-100 hover:bg-slate-50/50">
                            <td className="px-4 py-2.5 font-semibold text-slate-850 truncate max-w-[160px]" title={it.name}>
                              {it.name}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-slate-500 font-mono">
                              {it.quantity}
                            </td>
                            <td className="px-4 py-2.5 text-right font-medium text-slate-600 font-mono">
                              S/ {Number(it.price).toFixed(2)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-black text-slate-900 font-mono">
                              S/ {Number(it.total).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Summary panel */}
                <div className="mt-4 flex justify-end">
                  <div className="w-64 space-y-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-150">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal:</span>
                      <span className="font-mono">S/ {selectedNote.subtotal.toFixed(2)}</span>
                    </div>
                    {selectedNote.discount > 0 && (
                      <div className="flex justify-between text-rose-500">
                        <span>Descuento:</span>
                        <span className="font-mono">-S/ {selectedNote.discount.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedNote.igv > 0 && (
                      <div className="flex justify-between text-slate-500">
                        <span>IGV (18%):</span>
                        <span className="font-mono">S/ {selectedNote.igv.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-slate-900 border-t border-slate-200 pt-1.5 text-[13px]">
                      <span>Total Neto:</span>
                      <span className="font-mono text-brand-teal">S/ {selectedNote.total.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-emerald-650 pt-2 border-t border-dashed border-slate-200 font-medium">
                      <span>Pago Recibido:</span>
                      <span className="font-mono font-bold">S/ {Number(selectedNote.paidAmount || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Remarks detail */}
                {selectedNote.notes && (
                  <div className="mt-4 p-3 bg-teal-50/30 rounded-xl text-xs border border-teal-100 text-slate-655 font-medium leading-relaxed">
                    <span className="font-black text-slate-750 block mb-0.5">📝 Observaciones registradas:</span>
                    {selectedNote.notes}
                  </div>
                )}
              </div>

              {/* Notice */}
              <div className="text-[10px] text-slate-400 mt-6 flex items-center gap-1">
                <Info size={11} />
                <span>Haz clic en &quot;PDF&quot; arriba para descargar un documento de impresión en tamaño A4.</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-16">
              <FileText size={48} className="text-slate-200 mb-2" />
              <p className="text-sm font-semibold">Nota de Venta No Seleccionada</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs font-sans">
                Por favor, elige una boleta del listado de la izquierda para ver su detalle estructurado y poder exportarlo a PDF en tamaño A4 listo para imprimir.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 4. Form Drawer Modal: Sales Note Creator */}
      <AnimatePresence>
        {isCreatorOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-end p-0 bg-slate-900/40 backdrop-blur-xs">
            <div className="absolute inset-0" onClick={() => setIsCreatorOpen(false)}></div>
            
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col p-6 z-10"
            >
              {/* Creator Heading */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/10">
                    <Sparkles size={15} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {editingNoteId ? 'EDITAR NOTA DE VENTA' : 'NOTA DE VENTA'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{editingNoteId ? 'Actualizar detalles e items en el historial' : 'Nota de Venta e Imprimir PDF'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCreatorOpen(false)} 
                  className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Dynamic Creator Form Layout */}
              <form onSubmit={handleSaveSalesNote} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 min-h-0 relative">
                
                {/* 1. Client detail card + Number & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest block mb-1">
                      Correlativo Nota
                    </label>
                    <input 
                      type="text" 
                      required
                      value={noteNumber} 
                      onChange={e => setNoteNumber(e.target.value)}
                      placeholder="NV-XXXX"
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 text-xs font-mono outline-none focus:border-brand-teal transition-all text-slate-800 font-black"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest block mb-1">
                      Fecha Emisión
                    </label>
                    <div className="relative">
                      <input 
                        type="date" 
                        required
                        value={noteDate} 
                        onChange={e => setNoteDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-mono outline-none focus:border-brand-teal transition-all text-slate-800"
                      />
                      <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest block mb-1">
                      Condición *
                    </label>
                    <select
                      value={billingCondition}
                      onChange={e => {
                        const condition = e.target.value as 'Contado' | 'Crédito';
                        setBillingCondition(condition);
                        if (condition === 'Contado') {
                          setPaidAmount(grandTotalCalculated);
                        } else {
                          setPaidAmount(0);
                        }
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs outline-none focus:border-brand-teal transition-all text-slate-800 font-bold"
                    >
                      <option value="Contado">Contado</option>
                      <option value="Crédito">Crédito</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest block mb-1">
                      Método Pago *
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs outline-none focus:border-brand-teal transition-all text-slate-800 font-bold"
                    >
                      <option value="Efectivo">💵 Efectivo</option>
                      <option value="Yape">📱 Yape</option>
                      <option value="Plin">📱 Plin</option>
                      <option value="Transferencia">🏦 Transferencia</option>
                      <option value="Tarjeta">💳 Tarjeta Crédito</option>
                    </select>
                  </div>
                </div>

                {/* 2. Client auto-suggestion box */}
                <div className="relative p-3.5 bg-slate-50 rounded-2xl border border-slate-150">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">👤 Información del Cliente</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative">
                      <label className="text-[9px] font-bold text-slate-500 block mb-0.5">Buscar/Nombre Cliente *</label>
                      <input 
                        type="text" 
                        required
                        value={clientSearch}
                        onChange={e => {
                          setClientSearch(e.target.value);
                          setSelectedClientName(e.target.value);
                          setShowClientDropdown(true);
                        }}
                        onFocus={() => setShowClientDropdown(true)}
                        placeholder="Quispe, Maria (Escribir o Buscar)..."
                        className="w-full bg-white border border-slate-250 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-brand-teal transition-all text-slate-800 font-semibold"
                      />
                      
                      {/* Dropdown clients selector */}
                      {showClientDropdown && clientSearch.trim().length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-35 text-xs max-h-40 overflow-y-auto">
                          {filteredClients.map(c => (
                            <div
                              key={c.id}
                              onClick={() => handleSelectClient(c)}
                              className="px-4 py-2 hover:bg-teal-50/50 cursor-pointer border-b border-slate-50 flex flex-col text-left transition-all"
                            >
                              <span className="font-bold text-slate-800">{c.name}</span>
                              {c.doc && <span className="text-[9px] text-slate-400 font-mono">DNI/RUC: {c.doc}</span>}
                            </div>
                          ))}
                          <div 
                            onClick={handleCustomClient}
                            className="px-4 py-2 bg-slate-50 hover:bg-slate-100 cursor-pointer text-[10px] text-slate-500 font-bold text-center border-t border-slate-100"
                          >
                            Usar &quot;{clientSearch}&quot; como cliente libre
                          </div>
                        </div>
                      )}
                      
                      {showClientDropdown && (
                        <div 
                          className="fixed inset-0 z-20" 
                          onClick={() => setShowClientDropdown(false)}
                        ></div>
                      )}
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-500 block mb-0.5">DNI o RUC del Cliente</label>
                      <input 
                        type="text" 
                        value={selectedClientDoc}
                        onChange={e => setSelectedClientDoc(e.target.value)}
                        placeholder="DNI de 8 dígitos o RUC de 11..."
                        className="w-full bg-white border border-slate-250 rounded-xl px-3 py-1.5 text-xs font-mono outline-none focus:border-brand-teal transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Items list & Autocomplete */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">📝 Tabla de Productos Incorporados</span>
                    
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-slate-100 hover:bg-slate-150 text-slate-700 transition-colors rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={12} />
                      Añadir Fila
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-2xl bg-white overflow-visible relative">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 font-bold text-slate-400 border-b border-slate-100 text-[10px] uppercase tracking-wider">
                        <tr>
                          <th className="px-3 py-2 w-9">#</th>
                          <th className="px-3 py-2">Producto *</th>
                          <th className="px-3 py-2 w-24">Cant *</th>
                          <th className="px-3 py-2 w-28">P. Unit S/ *</th>
                          <th className="px-3 py-2 w-28 text-right">Subtotal S/</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {noteItems.map((item, index) => {
                          const queryText = itemSearchText[index] ?? item.name;

                          const filteredInventoryProducts = products.filter(p => 
                            p.name.toLowerCase().includes(queryText.toLowerCase()) ||
                            (p.sku || '').toLowerCase().includes(queryText.toLowerCase())
                          ).slice(0, 8);

                          return (
                            <tr key={index} className="border-b last:border-b-0 border-slate-100 hover:bg-slate-50/20">
                              {/* Row num */}
                              <td className="px-3 py-2.5 text-slate-400 font-bold">
                                {String(index + 1).padStart(2, '0')}
                              </td>

                              {/* Search product name input */}
                              <td className="px-2 py-2.5 relative">
                                <input 
                                  type="text" 
                                  id={`product-input-${index}`}
                                  required
                                  value={queryText}
                                  onChange={e => {
                                    handleItemPropertyChange(index, 'name', e.target.value);
                                    setItemSearchText(prev => ({ ...prev, [index]: e.target.value }));
                                    setItemDropdownActive(prev => ({ ...prev, [index]: true }));
                                  }}
                                  onFocus={() => {
                                    setItemDropdownActive(prev => ({ ...prev, [index]: true }));
                                  }}
                                  placeholder="Escribir o buscar en almacén..."
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-brand-teal text-slate-800 font-semibold"
                                />

                                {/* dropdown inventory suggestions */}
                                {itemDropdownActive[index] && filteredInventoryProducts.length > 0 && (
                                  <div className="absolute left-0 top-full mt-1.5 bg-white border-2 border-teal-550 rounded-2xl shadow-2xl z-50 text-left max-h-56 overflow-y-auto w-full min-w-[320px] md:min-w-[480px]">
                                    <div className="bg-teal-600 text-white px-3 py-1.5 font-black text-[9px] uppercase tracking-wider border-b border-teal-100 flex items-center justify-between">
                                      <span>🔍 Almacén de Inventario</span>
                                      <span className="text-[8px] bg-teal-700 px-1.5 py-0.5 rounded font-black text-teal-200">Encontrados</span>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                      {filteredInventoryProducts.map(p => {
                                        const todayStr = new Date().toISOString().split('T')[0];
                                        const isOfferExpired = p.isOffer && p.offerExpiryDate ? p.offerExpiryDate < todayStr : false;
                                        const isOfferActive = p.isOffer && !isOfferExpired;
                                        const pPrice = p.offerPrice && isOfferActive ? p.offerPrice : p.price;
                                        const lowStock = p.stock <= 5;
                                        return (
                                          <div
                                            key={p.id}
                                            onClick={() => handleSelectProduct(index, p)}
                                            className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition-all group"
                                          >
                                            <div className="truncate pr-3 flex flex-col gap-1">
                                              <span className="font-extrabold text-slate-800 text-xs truncate group-hover:text-teal-600">{p.name}</span>
                                              <div className="flex items-center gap-2">
                                                {p.sku && (
                                                  <span className="text-[8px] px-1.5 py-0.5 bg-slate-100 text-slate-500 font-mono rounded font-bold">
                                                    SKU: {p.sku}
                                                  </span>
                                                )}
                                                {p.category && (
                                                  <span className="text-[8px] px-1.5 py-0.5 bg-sky-50 text-sky-600 rounded font-black uppercase tracking-wider">
                                                    {p.category}
                                                  </span>
                                                )}
                                                <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${
                                                  lowStock 
                                                    ? 'bg-rose-50 text-rose-600' 
                                                    : 'bg-emerald-50 text-emerald-600'
                                                }`}>
                                                  Stock: {p.stock} uds
                                                </span>
                                              </div>
                                            </div>
                                            <div className="font-mono text-right shrink-0 flex flex-col justify-center items-end">
                                              <span className="text-xs font-black text-slate-900">
                                                S/ {pPrice.toFixed(2)}
                                              </span>
                                              <span className="text-[8px] uppercase tracking-widest font-black text-slate-400">
                                                Unitario
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                {itemDropdownActive[index] && (
                                  <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setItemDropdownActive(prev => ({ ...prev, [index]: false }))}
                                  ></div>
                                )}
                              </td>

                              {/* Quantity */}
                              <td className="px-2 py-2.5">
                                <input 
                                  type="number" 
                                  id={`quantity-input-${index}`}
                                  min="1"
                                  required
                                  value={item.quantity === 0 ? '' : item.quantity}
                                  onChange={e => handleItemPropertyChange(index, 'quantity', Number(e.target.value))}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      // Focus layout of next row automatically
                                      const nextIndex = index + 1;
                                      setTimeout(() => {
                                        const nextProductInput = document.getElementById(`product-input-${nextIndex}`);
                                        if (nextProductInput) {
                                          nextProductInput.focus();
                                        }
                                      }, 50);
                                    }
                                  }}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-brand-teal font-mono text-center text-slate-800 font-black"
                                />
                              </td>

                              {/* Unit Price */}
                              <td className="px-2 py-2.5">
                                <input 
                                  type="number" 
                                  step="0.01"
                                  min="0"
                                  required
                                  value={item.price === 0 ? '' : item.price}
                                  onChange={e => handleItemPropertyChange(index, 'price', Number(e.target.value))}
                                  placeholder="0.00"
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-brand-teal font-mono text-right text-slate-800 font-black"
                                />
                              </td>

                              {/* Total line item */}
                              <td className="px-3 py-2.5 text-right font-black font-mono text-slate-800">
                                S/ {Number(item.total || 0).toFixed(2)}
                              </td>

                              {/* Delete row */}
                              <td className="px-2 py-2.5 text-center">
                                <button 
                                  type="button" 
                                  onClick={() => handleRemoveItemRow(index)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                                >
                                  <X size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Visual margin spacer with stylish subtitle to separate items and calculation */}
                <div className="pt-12 pb-2 mt-8 border-t border-slate-150 flex items-center justify-between">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                      📊 Tributación, Pagos y Resumen General
                    </h4>
                    <p className="text-[9px] text-slate-400 font-medium">Configuración de impuesto IGV, descuentos, método de liquidación y saldos</p>
                  </div>
                  <div className="h-px bg-slate-200 flex-1 ml-4 hidden sm:block"></div>
                </div>

                {/* 4. Financial Controls column details & Downpayment */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Controls layout */}
                  <div className="space-y-3">
                    <div className="p-3 bg-teal-50/15 border border-teal-100 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-black text-teal-800 uppercase tracking-widest block">Gravar Impuesto IGV</span>
                        <span className="text-[9px] text-slate-400">Inserta cálculo adicional de IGV (18%)</span>
                      </div>
                      <input 
                        type="checkbox"
                        checked={includeIgv}
                        onChange={e => setIncludeIgv(e.target.checked)}
                        className="w-4 h-4 text-brand-teal focus:ring-accent-teal border-slate-350 rounded cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest block mb-1">
                        Descuento Comercial S/
                      </label>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        value={noteDiscount === 0 ? '' : noteDiscount}
                        onChange={e => setNoteDiscount(Number(e.target.value))}
                        placeholder="0.00"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-mono outline-none focus:border-brand-teal transition-all font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest block mb-1">
                        Pago Recibido a Cuenta S/ *
                      </label>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        value={paidAmount === 0 ? '' : paidAmount}
                        onChange={e => setPaidAmount(Number(e.target.value))}
                        placeholder="Dejar 0 para deuda total"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-mono outline-none focus:border-brand-teal transition-all font-black text-emerald-700"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest block mb-1">
                        Observaciones Adicionales
                      </label>
                      <textarea 
                        rows={2}
                        value={noteObservations}
                        onChange={e => setNoteObservations(e.target.value)}
                        placeholder="Instrucciones del pago, notas, plazos..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-sans outline-none focus:border-brand-teal transition-all text-slate-800 resize-none font-medium text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Right Subtotal calculation visual */}
                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex flex-col justify-between h-auto gap-3.5">
                    <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block mb-1 border-b pb-1">Resumen del Presupuesto</span>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between font-bold text-slate-500">
                        <span>Valor de Productos:</span>
                        <span className="font-mono">S/ {subtotalSum.toFixed(2)}</span>
                      </div>
                      
                      {noteDiscount > 0 && (
                        <div className="flex justify-between font-bold text-rose-500">
                          <span>Descuento Aplicado:</span>
                          <span className="font-mono">-S/ {noteDiscount.toFixed(2)}</span>
                        </div>
                      )}

                      {includeIgv && (
                        <div className="flex justify-between font-bold text-slate-500">
                          <span>IGV (18%):</span>
                          <span className="font-mono">S/ {igvCalculated.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between font-black text-slate-900 border-t border-slate-250 pt-2 text-[13px]">
                        <span>Importe Total:</span>
                        <span className="font-mono text-teal-700">S/ {grandTotalCalculated.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between font-bold mt-2 pt-2 border-t border-dashed border-slate-200 text-slate-600">
                        <span>Estado Estimado:</span>
                        <div>
                          {noteStatus === 'Cancelado' ? (
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded">
                              Cancelado / Pagado
                            </span>
                          ) : noteStatus === 'Parcial' ? (
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 rounded">
                              Pago parcial
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 rounded">
                              Pendiente completo
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between font-bold text-slate-950 pt-1.5 border-t border-white">
                        <span>Saldo Pendiente:</span>
                        <span className="font-mono font-black text-rose-600">
                          S/ {Math.max(0, grandTotalCalculated - paidAmount).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="text-[9.5px] p-2 bg-amber-50 rounded-xl border border-amber-100 font-semibold text-amber-800 leading-snug">
                      ⚠️ Al guardar se registrará en el historial de facturación de deudas, de forma centralizada y segura.
                    </div>
                  </div>
                </div>
              </form>

              {/* Creator actions footer */}
              <div className="pt-4 border-t border-slate-100 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreatorOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black uppercase tracking-wider text-slate-705 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveSalesNote}
                  disabled={isSaving}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-slate-900/10"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Save size={14} />
                      Guardar Documento
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Emisor Configuration Dialog modal */}
      <AnimatePresence>
        {showConfig && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="absolute inset-0" onClick={() => setShowConfig(false)}></div>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Building size={16} className="text-slate-900" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Configurar Datos de Emisor</h3>
                </div>
                <button onClick={() => setShowConfig(false)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="mt-3 bg-teal-50 border border-teal-100 rounded-xl p-3 text-[10px] font-bold text-teal-850 leading-relaxed flex items-center gap-1.5 shadow-sm">
                <span>🔒 Los datos del emisor están fijados por el sistema de forma institucional para LIBRERÍA &quot;EL ESTUDIANTE&quot;.</span>
              </div>

              <form onSubmit={e => { e.preventDefault(); setShowConfig(false); }} className="space-y-3.5 py-4">
                <div>
                  <label className="text-[9.5px] font-black text-slate-400 block mb-1 uppercase tracking-wider">Nombre del Negocio *</label>
                  <input
                    type="text"
                    readOnly
                    value={shopSettings.name}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-sans outline-none block text-slate-500 font-bold select-none cursor-not-allowed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9.5px] font-black text-slate-400 block mb-1 uppercase tracking-wider">Número R.U.C. *</label>
                    <input
                      type="text"
                      readOnly
                      value={shopSettings.ruc}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono outline-none text-slate-500 font-bold select-none cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-[9.5px] font-black text-slate-400 block mb-1 uppercase tracking-wider">Teléfono / Celular</label>
                    <input
                      type="text"
                      readOnly
                      value={shopSettings.phone}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-sans outline-none text-slate-500 font-bold select-none cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9.5px] font-black text-slate-400 block mb-1 uppercase tracking-wider">Dirección Física *</label>
                  <input
                    type="text"
                    readOnly
                    value={shopSettings.address}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-sans outline-none text-slate-500 font-bold select-none cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-[9.5px] font-black text-slate-400 block mb-1 uppercase tracking-wider">Contacto de Correo</label>
                  <input
                    type="email"
                    readOnly
                    value={shopSettings.email}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-sans outline-none text-slate-500 font-bold select-none cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-[9.5px] font-black text-slate-400 block mb-1 uppercase tracking-wider">Mensaje de Despedida (Pie de Página)</label>
                  <input
                    type="text"
                    readOnly
                    value={shopSettings.message}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-sans outline-none text-slate-500 font-bold select-none cursor-not-allowed"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowConfig(false)}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-md transition-colors"
                  >
                    Cerrar y Aceptar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
