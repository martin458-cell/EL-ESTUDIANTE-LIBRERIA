import React, { useState, useMemo } from 'react';
import { Search, Plus, Minus, Trash2, FileDown, BookOpen, PenTool, Monitor, User, FileText, Check, Landmark, RefreshCw, History, Share2, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../hooks/useProducts';
import { jsPDF } from 'jspdf';

interface QuotedItem {
  product: Product;
  quantity: number;
  customPrice: number; // Admins can customize the price or keep the original
}

interface SavedQuotation {
  id: string;
  quoteNumber: string;
  clientName: string;
  clientDoc: string;
  clientAddress: string;
  clientPhone: string;
  quoteNotes: string;
  cart: QuotedItem[];
  date: string;
  total: number;
  globalDiscountPercent?: number; // Optional discount matching
}

interface ProductQuoterProps {
  products: Product[];
}

export const ProductQuoter: React.FC<ProductQuoterProps> = ({ products }) => {
  // Quotation Cart State
  const [cart, setCart] = useState<QuotedItem[]>([]);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'libros' | 'utiles' | 'tecnologia'>('all');

  // Client Info State
  const [clientName, setClientName] = useState('');
  const [clientDoc, setClientDoc] = useState(''); // DNI or RUC
  const [clientAddress, setClientAddress] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState<number>(0);
  
  const [quoteSeq, setQuoteSeq] = useState<number>(() => {
    const saved = localStorage.getItem('el_estudiante_quote_seq');
    if (saved) {
      const parsed = parseInt(saved, 10);
      return !isNaN(parsed) && parsed > 0 ? parsed : 1;
    }
    return 1;
  });
  const quoteNumber = useMemo(() => {
    return `COT-${String(quoteSeq).padStart(4, '0')}`;
  }, [quoteSeq]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  // Load saved quotes state from localStorage
  const [savedQuotes, setSavedQuotes] = useState<SavedQuotation[]>(() => {
    try {
      const saved = localStorage.getItem('el_estudiante_historical_quotes');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error reading history", e);
      return [];
    }
  });

  const [activeTab, setActiveTab] = useState<'catalog' | 'history'>('catalog');
  const [historySearchTerm, setHistorySearchTerm] = useState('');

  // Extract list of unique frequent clients from historical quotes for quick select
  const uniqueClients = useMemo(() => {
    const seen = new Set<string>();
    const clients: Array<{ name: string; doc: string; address: string; phone: string }> = [];
    
    savedQuotes.forEach(q => {
      const trimmedName = q.clientName?.trim();
      const trimmedDoc = q.clientDoc?.trim() || '';
      if (!trimmedName || trimmedName.toLowerCase() === 'público en general' || trimmedName.toLowerCase() === 'publico en general') {
        return;
      }
      const key = `${trimmedName.toLowerCase()}_${trimmedDoc.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        clients.push({
          name: trimmedName,
          doc: trimmedDoc,
          address: q.clientAddress?.trim() || '',
          phone: q.clientPhone?.trim() || ''
        });
      }
    });
    return clients;
  }, [savedQuotes]);

  // Save Quotation Function
  const handleSaveQuotation = (customNumber?: string, isSilent = false) => {
    if (cart.length === 0) return;

    const activeNum = customNumber || quoteNumber;
    const newQuote: SavedQuotation = {
      id: Date.now().toString(),
      quoteNumber: activeNum,
      clientName: clientName.trim() || 'Público en General',
      clientDoc: clientDoc.trim(),
      clientAddress: clientAddress.trim(),
      clientPhone: clientPhone.trim(),
      quoteNotes: quoteNotes.trim(),
      cart: [...cart],
      globalDiscountPercent,
      date: new Date().toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      total: stats.total
    };

    setSavedQuotes(prev => {
      // Avoid duplicate quote numbers by filtering out previous ones with same quoteNumber
      const filtered = prev.filter(q => q.quoteNumber !== activeNum);
      const updated = [newQuote, ...filtered];
      localStorage.setItem('el_estudiante_historical_quotes', JSON.stringify(updated));
      return updated;
    });

    if (!isSilent) {
      alert(`Cotización ${activeNum} guardada en el historial.`);
    }
  };

  const handleLoadQuote = (quote: SavedQuotation) => {
    setCart(quote.cart);
    setClientName(quote.clientName || '');
    setClientDoc(quote.clientDoc || '');
    setClientAddress(quote.clientAddress || '');
    setClientPhone(quote.clientPhone || '');
    setQuoteNotes(quote.quoteNotes || '');
    setGlobalDiscountPercent(quote.globalDiscountPercent || 0);
    
    // Parse the serial quote sequence from the quote number
    // e.g. "COT-0003" -> 3
    const match = quote.quoteNumber.match(/COT-(\d+)/);
    if (match && match[1]) {
      const seq = parseInt(match[1], 10);
      if (!isNaN(seq)) {
        setQuoteSeq(seq);
        localStorage.setItem('el_estudiante_quote_seq', String(seq));
      }
    }
  };

  // Generate WhatsApp message with rich text formatting and share/copy helper
  const handleWhatsAppShare = () => {
    if (cart.length === 0) {
      alert("La lista de cotización está vacía.");
      return;
    }
    
    const client = clientName.trim() || 'Público en General';
    let text = `*PROFORMA LIBRERÍA "EL ESTUDIANTE"* 📖✨\n`;
    text += `_Calidad y variedad al servicio de la educación en Puquio, Lucanas y todo Ayacucho_\n\n`;
    text += `*Número:* ${quoteNumber}\n`;
    text += `*Cliente:* ${client}\n`;
    if (clientDoc.trim()) {
      text += `*RUC/DNI:* ${clientDoc.trim()}\n`;
    }
    text += `*Fecha:* ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}\n`;
    text += `=================================\n`;
    
    cart.forEach((item, idx) => {
      text += `*${String(idx + 1).padStart(2, '0')}.* ${item.product.name}\n`;
      text += `   ${item.quantity} und. x S/ ${item.customPrice.toFixed(2)}  =  *S/ ${(item.customPrice * item.quantity).toFixed(2)}*\n`;
    });
    
    text += `=================================\n`;
    if (globalDiscountPercent > 0) {
      text += `*Subtotal Bruto:* S/ ${stats.rawTotal.toFixed(2)}\n`;
      text += `*Descuento Global (${globalDiscountPercent}%):* -S/ ${stats.discountAmount.toFixed(2)}\n`;
    }
    text += `*TOTAL GENERAL:* 💰 *S/ ${stats.total.toFixed(2)}*\n\n`;
    text += `*Cuentas de Depósito:* \n`;
    text += `• *Banco de la Nación:* 04-031-158235 (Herick Cahuana Mendoza)\n`;
    text += `• *BCP Soles:* 215-98314782-0-80\n`;
    text += `• *Yape / Plin:* 953 366 458\n\n`;
    text += `¡Muchas gracias por su preferencia! 🙏✨`;

    // Copy to clipboard
    try {
      navigator.clipboard.writeText(text).then(() => {
        const encodedText = encodeURIComponent(text);
        const url = `https://api.whatsapp.com/send?text=${encodedText}`;
        const win = window.open(url, '_blank');
        if (!win) {
          alert("¡Mensaje de cotización copiado al portapapeles! Ahora puedes abrir WhatsApp y pegarlo.");
        } else {
          alert("¡Cotización copiada al portapapeles! Abriendo chat de WhatsApp para enviar...");
        }
      }).catch(() => {
        // Fallback direct open
        const encodedText = encodeURIComponent(text);
        window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
      });
    } catch (e) {
      const encodedText = encodeURIComponent(text);
      window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
    }
  };

  const handleDeleteQuote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Está seguro de eliminar esta cotización del historial?')) {
      setSavedQuotes(prev => {
        const filtered = prev.filter(q => q.id !== id);
        localStorage.setItem('el_estudiante_historical_quotes', JSON.stringify(filtered));
        return filtered;
      });
    }
  };

  const filteredHistory = useMemo(() => {
    return savedQuotes.filter((q) => {
      const term = historySearchTerm.toLowerCase();
      return (
        q.quoteNumber.toLowerCase().includes(term) ||
        q.clientName.toLowerCase().includes(term) ||
        (q.clientDoc && q.clientDoc.toLowerCase().includes(term))
      );
    });
  }, [savedQuotes, historySearchTerm]);

  // Filter products for select drawer/menu
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.authorOrBrand && p.authorOrBrand.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // Handler to add item
  const handleAddItem = (product: Product) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        return prevCart.map((item) => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      // Product price fallback to promo/offer price if valid
      const initialPrice = product.isOffer && product.offerPrice ? product.offerPrice : product.price;
      return [...prevCart, { product, quantity: 1, customPrice: initialPrice }];
    });
  };

  // Handler to remove item
  const handleRemoveItem = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  // Adjust Quantity
  const handleUpdateQuantity = (productId: string, val: number) => {
    if (val <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setCart((prevCart) => 
      prevCart.map((item) => 
        item.product.id === productId ? { ...item, quantity: val } : item
      )
    );
  };

  // Adjust Custom Unit price
  const handleUpdatePrice = (productId: string, price: number) => {
    if (price < 0) return;
    setCart((prevCart) => 
      prevCart.map((item) => 
        item.product.id === productId ? { ...item, customPrice: price } : item
      )
    );
  };

  // Clear All
  const handleClearAll = () => {
    if (confirm('¿Desea limpiar toda la lista de cotización actual?')) {
      setCart([]);
    }
  };

  // manual increment and decrement sequence controls
  const handleIncrementSeq = () => {
    setQuoteSeq(prev => {
      const next = prev + 1;
      localStorage.setItem('el_estudiante_quote_seq', String(next));
      return next;
    });
  };

  const handleDecrementSeq = () => {
    setQuoteSeq(prev => {
      const next = Math.max(1, prev - 1);
      localStorage.setItem('el_estudiante_quote_seq', String(next));
      return next;
    });
  };

  // Compute stats
  const stats = useMemo(() => {
    const rawTotal = cart.reduce((sum, item) => sum + item.customPrice * item.quantity, 0);
    const discountAmount = (rawTotal * globalDiscountPercent) / 100;
    const total = Math.max(0, rawTotal - discountAmount);
    const subtotal = total / 1.18;
    const igv = total - subtotal;
    return {
      rawTotal,
      discountAmount,
      subtotal,
      igv,
      total,
      count: cart.reduce((sum, item) => sum + item.quantity, 0)
    };
  }, [cart, globalDiscountPercent]);

  // Export PDF layout generator
  const handleExportPDF = () => {
    if (cart.length === 0) {
      alert('Agregue al menos un producto para generar la cotización.');
      return;
    }

    setIsExporting(true);
    setExportComplete(false);

    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      // --- BRAND COLOR VALUES ---
      const primaryColor = [13, 148, 136]; // Teal #0d9488
      const darkColor = [15, 23, 42]; // Slate 900
      const accentColor = [249, 115, 22]; // Orange #f97316
      const lightGray = [241, 245, 249]; // Background Slate 100

      // --- HEADER ---
      // Colored accent bars top
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 5, 'F');
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(0, 5, 210, 1.5, 'F');

      // Brand Title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('LIBRERÍA "EL ESTUDIANTE"', 15, 20);

      // Business Info Subtitle
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('De: Martin Herick Cahuana Mendoza', 15, 25);
      doc.text('RUC: 10434717731 | Cel: 953366458 / 930103635', 15, 29);
      doc.text('Dirección: Jirón Tacna N° 668 / Puquio, Lucanas, Ayacucho', 15, 33);
      doc.text('Email: ventas.estudiante@gmail.com', 15, 37);

      // --- DOCUMENT HEADER BOX (COTIZACION) ---
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.rect(135, 12, 60, 26, 'F');
      
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.5);
      doc.rect(135, 12, 60, 26, 'S');

      // 1. Invoice / Quotation title (Centered, top of box)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('COTIZACIÓN COMERCIAL', 165, 19.5, { align: 'center' });

      // 2. Store RUC (Centered, middle of box)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text('R.U.C. 10434717731', 165, 25.5, { align: 'center' });
      
      // 3. Sequential Correlative (Centered, bottom of box)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.text(quoteNumber, 165, 33, { align: 'center' });

      // Clean divider
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(15, 43, 195, 43);

      // --- CLIENT DETAILS ---
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text('DATOS DEL CLIENTE / SOLICITANTE:', 15, 49);

      // Grey block container for client info
      doc.setFillColor(250, 250, 250);
      doc.rect(15, 52, 180, 28, 'F');
      doc.rect(15, 52, 180, 28, 'S');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Señor(es):', 18, 57);
      doc.text('RUC / DNI:', 18, 62);
      doc.text('Dirección:', 18, 67);
      doc.text('Teléfono:', 18, 72);

      doc.text('Fecha Emisión:', 130, 57);
      doc.text('Validez Oferta:', 130, 62);
      doc.text('Moneda:', 130, 67);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(15, 23, 42); // deep list black
      doc.text(clientName || 'PÚBLICO EN GENERAL', 38, 57);
      doc.text(clientDoc || 'SIN DOCUMENTO', 38, 62);
      doc.text(clientAddress || 'PUQUIO, LUCANAS, AYACUCHO', 38, 67);
      doc.text(clientPhone || 'N/A', 38, 72);

      const d = new Date();
      const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      doc.text(formattedDate, 155, 57);
      doc.text('15 Días Calendario', 155, 62);
      doc.text('Soles (S/ PEN)', 155, 67);

      // --- PRODUCT TABLE ---
      let startY = 88;
      
      const drawTableHeader = (y: number) => {
        // Column Headers Background
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(15, y, 180, 8, 'F');

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        
        doc.text('ITEM', 18, y + 5.5);
        doc.text('CÓDIGO', 28, y + 5.5);
        doc.text('PRODUCTO / DESCRIPCIÓN', 50, y + 5.5);
        doc.text('CANT.', 132, y + 5.5, { align: 'right' });
        doc.text('P. UNIT', 158, y + 5.5, { align: 'right' });
        doc.text('TOTAL', 190, y + 5.5, { align: 'right' });
      };

      // Draw table header on first page
      drawTableHeader(startY);

      // Rows
      let currentY = startY + 8;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);

      cart.forEach((item, index) => {
        // Safe check: If drawing this row (8 mm) would exceed Y limit (260 mm),
        // we add a new page, draw header on new page, and continue drawing on new page.
        if (currentY + 8 > 260) {
          doc.addPage();
          
          // Draw simplified header on new page
          doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.rect(0, 0, 210, 5, 'F');
          doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
          doc.rect(0, 5, 210, 1.5, 'F');
          
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.text('LIBRERÍA "EL ESTUDIANTE"', 15, 13);
          
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(100, 116, 139);
          doc.text(`Cotización Comercial: ${quoteNumber}`, 195, 13, { align: 'right' });
          
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.2);
          doc.line(15, 16, 195, 16);
          
          // Draw table header on new page
          drawTableHeader(19);
          currentY = 27; // first item on new page starts at 27
        }

        // Draw lighter alternating backgrounds
        if (index % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, currentY, 180, 8, 'F');
        }

        // Row Separator line
        doc.setDrawColor(241, 245, 249);
        doc.line(15, currentY + 8, 195, currentY + 8);

        // Print row strings
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        
        doc.text(String(index + 1).padStart(2, '0'), 18, currentY + 5);
        doc.text(item.product.sku.substring(0, 10), 28, currentY + 5);
        
        // Handle long title truncations elegantly
        const nameText = item.product.authorOrBrand 
          ? `${item.product.name} (${item.product.authorOrBrand})` 
          : item.product.name;
        const truncatedName = nameText.length > 48 
          ? nameText.substring(0, 46) + '...' 
          : nameText;
        doc.text(truncatedName, 50, currentY + 5);

        doc.text(String(item.quantity), 132, currentY + 5, { align: 'right' });
        doc.text(`S/ ${item.customPrice.toFixed(2)}`, 158, currentY + 5, { align: 'right' });
        doc.text(`S/ ${(item.customPrice * item.quantity).toFixed(2)}`, 190, currentY + 5, { align: 'right' });

        currentY += 8;
      });

      // --- MATEMATICAL TOTALIZATION BLOCKS ---
      // Draw grid outline wrapper
      doc.setDrawColor(226, 232, 240);
      doc.line(15, currentY, 195, currentY);

      // Check if we need to start a new page specifically for the totals block.
      // The totals block takes about 16 mm. If it doesn't fit, we push it to a new page.
      if (currentY + 20 > 260) {
        doc.addPage();
        
        // Draw simplified header on new page
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, 210, 5, 'F');
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.rect(0, 5, 210, 1.5, 'F');
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('LIBRERÍA "EL ESTUDIANTE"', 15, 13);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Cotización Comercial: ${quoteNumber}`, 195, 13, { align: 'right' });
        
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(15, 16, 195, 16);
        
        // Reset currentY for the new page
        currentY = 20; 
      }

      let totalsY = currentY + 4;
      
      // Subtotal IGV Total rows on the right
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);

      if (globalDiscountPercent > 0) {
        doc.text('SUB-TOTAL BRUTO (S/):', 150, totalsY, { align: 'right' });
        doc.text(`DESCUENTO GLOBAL (${globalDiscountPercent}%):`, 150, totalsY + 4.5, { align: 'right' });
        doc.text('I.G.V. IMPUESTO 18% (S/):', 150, totalsY + 9.0, { align: 'right' });
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('TOTAL GENERAL S/ (PEN):', 150, totalsY + 14.0, { align: 'right' });

        // Print values on the right
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`S/ ${stats.rawTotal.toFixed(2)}`, 190, totalsY, { align: 'right' });
        
        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]); // Orange color for discount row
        doc.text(`-S/ ${stats.discountAmount.toFixed(2)}`, 190, totalsY + 4.5, { align: 'right' });
        
        doc.setTextColor(15, 23, 42);
        doc.text(`S/ ${stats.igv.toFixed(2)}`, 190, totalsY + 9.0, { align: 'right' });
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.text(`S/ ${stats.total.toFixed(2)}`, 190, totalsY + 14.0, { align: 'right' });

        currentY = totalsY + 16;
      } else {
        doc.text('SUB-TOTAL AFECTO (S/):', 150, totalsY, { align: 'right' });
        doc.text('I.G.V. IMPUESTO 18% (S/):', 150, totalsY + 4.5, { align: 'right' });
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('TOTAL GENERAL S/ (PEN):', 150, totalsY + 9.5, { align: 'right' });

        // Print values on the right
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`S/ ${stats.subtotal.toFixed(2)}`, 190, totalsY, { align: 'right' });
        doc.text(`S/ ${stats.igv.toFixed(2)}`, 190, totalsY + 4.5, { align: 'right' });
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.text(`S/ ${stats.total.toFixed(2)}`, 190, totalsY + 9.5, { align: 'right' });

        currentY = totalsY + 12;
      }

      // --- LEGAL COMMONS / PAYMENT INSTRUCTIONS (Left side of totals, placed 2 cm below totals) ---
      // We start at the updated currentY, then add a 12mm spacer (adjusted for perfect layout safety)
      let notesY = currentY + 12; 

      // If the conditions box (takes 30 mm) won't fit, we put it on a new page
      if (notesY + 30 > 260) {
        doc.addPage();
        
        // Draw simplified header on new page
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, 210, 5, 'F');
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.rect(0, 5, 210, 1.5, 'F');
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('LIBRERÍA "EL ESTUDIANTE"', 15, 13);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Cotización Comercial: ${quoteNumber}`, 195, 13, { align: 'right' });
        
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(15, 16, 195, 16);
        
        notesY = 22; // Start near the top of the new page
      }

      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(252, 252, 252);
      // Container
      doc.rect(15, notesY, 95, 30, 'F');
      doc.rect(15, notesY, 95, 30, 'S');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text('CONDICIONES COMERCIALES Y CUENTAS DE CARGO:', 18, notesY + 4.5);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('• Precios expresados en Soles conformes a ley (incluyen I.G.V.)', 18, notesY + 8);
      doc.text('• BCP Soles corriente: 215-98314782-0-80 (CCI: 00221519831478208080)', 18, notesY + 12);
      doc.text('• Banco de la Nación: 04-031-158235 (Herick Cahuana Mendoza)', 18, notesY + 16);
      doc.text('• Se acepta YAPE / PLIN al número móvil comercial: 953 366 458', 18, notesY + 20);
      
      const customNotesLine = quoteNotes.trim() !== '' 
        ? `• Notas: ${quoteNotes.substring(0, 50)}` 
        : '• Entrega inmediata o bajo programación según niveles de inventario.';
      doc.text(customNotesLine, 18, notesY + 24);

      // --- SIGNATURE WORKFLOWS ---
      // The commercial conditions box has a height of 30, so its bottom edge is at notesY + 30.
      // We place the signature block exactly 2 cm (20 mm) below the box.
      let signatureY = notesY + 50; 
      
      // If the signature block (about 15 mm) doesn't fit on this page, push to a new page
      if (signatureY + 15 > 265) {
        doc.addPage();
        
        // Draw simplified header on new page
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, 210, 5, 'F');
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.rect(0, 5, 210, 1.5, 'F');
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('LIBRERÍA "EL ESTUDIANTE"', 15, 13);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Cotización Comercial: ${quoteNumber}`, 195, 13, { align: 'right' });
        
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(15, 16, 195, 16);
        
        signatureY = 40; // Start neatly on the new page
      }

      // Horizontal marker line of signature
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.35);
      doc.line(75, signatureY, 135, signatureY);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('DPTO. VENTAS Y COTIZACIONES', 105, signatureY + 4, { align: 'center' });
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('LIBRERÍA "EL ESTUDIANTE" - PUQUIO', 105, signatureY + 8, { align: 'center' });

      // --- FOOTER COPYRIGHT (Applied to all pages sequentially) ---
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.2);
        doc.line(15, 280, 195, 280);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('Librería "El Estudiante" - Calidad, variedad al servicio de la educación en Puquio, Lucanas y todo Ayacucho. ¡Muchas gracias por su preferencia!', 15, 284);
        doc.text(`Página ${i} de ${totalPages}`, 195, 284, { align: 'right' });
      }

      // Trigger Save
      doc.save(`Cotizacion_El_Estudiante_${quoteNumber}.pdf`);

      // Auto-save this quotation to history (silently so we don't alarm user with extra alerts)
      handleSaveQuotation(quoteNumber, true);

      // Auto-increment correlative sequence for the next quote
      setQuoteSeq(prev => {
        const next = prev + 1;
        localStorage.setItem('el_estudiante_quote_seq', String(next));
        return next;
      });

      setIsExporting(false);
      setExportComplete(true);
      setTimeout(() => setExportComplete(false), 3000);

    } catch (error) {
      console.error('Error generating pdf:', error);
      alert('Sucedió un problema al compilar el reporte PDF.');
      setIsExporting(false);
    }
  };

  // Icon categories fallback selector helper
  const renderCategoryIcon = (category: string) => {
    switch (category) {
      case 'libros':
        return <BookOpen size={16} className="text-teal-600" />;
      case 'utiles':
        return <PenTool size={16} className="text-orange-600" />;
      case 'tecnologia':
        return <Monitor size={16} className="text-blue-500" />;
      default:
        return <FileText size={16} className="text-slate-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-y-auto md:overflow-hidden min-h-0">
      {/* LEFT: Product catalog vs history selector */}
      <div className="w-full md:w-[45%] lg:w-[40%] p-4 md:p-6 flex flex-col gap-3 md:gap-4 border-b md:border-b-0 md:border-r border-slate-100 shrink-0 h-auto md:h-full overflow-visible md:overflow-hidden">
        
        {/* Main tabs: Catálogo vs Historial */}
        <div className="flex bg-slate-100 p-1 rounded-2xl shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'catalog'
                ? 'bg-white text-teal-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen size={13} className={activeTab === 'catalog' ? "text-brand-teal" : "text-slate-400"} />
            Catálogo ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 relative ${
              activeTab === 'history'
                ? 'bg-white text-orange-850 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <History size={13} className={activeTab === 'history' ? "text-brand-orange" : "text-slate-400"} />
            Historial ({savedQuotes.length})
            {savedQuotes.length > 0 && (
              <span className="bg-brand-orange text-white text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white shrink-0 ml-1">
                {savedQuotes.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'catalog' ? (
          <>
            <div>
              <h3 className="font-bold text-slate-800 text-xs md:text-sm mb-0.5 uppercase tracking-wider">Buscar Productos</h3>
              <p className="text-[11px] text-slate-500">Seleccione productos para agregar a la proforma</p>
            </div>

            {/* Filters and Searches */}
            <div className="flex flex-col gap-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3.5 top-2.5 text-slate-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Buscar por Nombre, Marca, SKU o Autor..."
                  className="w-full bg-slate-100 border-none rounded-xl py-2 px-9 text-xs focus:ring-2 ring-brand-teal outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Quick Category Tabs */}
              <div className="flex flex-wrap gap-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                    selectedCategory === 'all' 
                      ? 'bg-slate-900 text-white shadow-md' 
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
                  }`}
                >
                  Todos ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('libros')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all ${
                    selectedCategory === 'libros' 
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-500/10' 
                      : 'bg-slate-50 text-teal-700 hover:bg-teal-50 border border-slate-100'
                  }`}
                >
                  <BookOpen size={10} /> Libros
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('utiles')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all ${
                    selectedCategory === 'utiles' 
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/10' 
                      : 'bg-slate-50 text-orange-700 hover:bg-orange-50 border border-slate-100'
                  }`}
                >
                  <PenTool size={10} /> Útiles
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('tecnologia')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all ${
                    selectedCategory === 'tecnologia' 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                      : 'bg-slate-50 text-blue-700 hover:bg-blue-50 border border-slate-100'
                  }`}
                >
                  <Monitor size={10} /> Tecnología
                </button>
              </div>
            </div>

            {/* List of matched items */}
            <div id="quotable-products-results" className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[180px] md:min-h-0 max-h-[300px] md:max-h-none">
              {filteredProducts.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs font-bold">Sin coincidencias para la búsqueda</p>
                  <p className="text-[10px] mt-1">Intente remover filtros o cambiar palabras clave</p>
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const hasOffer = p.isOffer && p.offerPrice;
                  const cartItem = cart.find(item => item.product.id === p.id);
                  const isInCart = !!cartItem;
                  
                  return (
                    <div 
                      key={p.id} 
                      id={`quoter-product-item-${p.id}`}
                      onClick={() => handleAddItem(p)}
                      className={`group flex gap-2.5 items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer active:scale-[0.99] ${
                        isInCart 
                          ? 'border-brand-teal bg-teal-50/10 hover:border-brand-teal hover:bg-teal-50/25 hover:shadow-sm' 
                          : 'border-slate-100 bg-white hover:border-brand-teal/30 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden relative border border-slate-100">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt="" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
                          ) : (
                            renderCategoryIcon(p.category)
                          )}
                          
                          {/* Plus overlay */}
                          <div className="absolute inset-0 bg-brand-teal/95 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Plus size={14} strokeWidth={3} />
                          </div>
                          
                          {/* Quantity bubble if in cart */}
                          {isInCart && (
                            <div className="absolute -top-1.5 -right-1.5 bg-teal-600 text-white text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-sm border border-white">
                              {cartItem.quantity}
                            </div>
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="text-xs font-bold text-slate-800 leading-tight truncate">{p.name}</h4>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 max-w-[150px] truncate">
                            {p.sku} {p.authorOrBrand ? `· ${p.authorOrBrand}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-0.5 text-right">
                        {hasOffer ? (
                          <>
                            <span className="text-brand-orange text-xs font-black">S/ {p.offerPrice?.toFixed(2)}</span>
                            <span className="text-[9px] text-slate-400 line-through">S/ {p.price.toFixed(2)}</span>
                          </>
                        ) : (
                          <span className="text-slate-700 text-xs font-black">S/ {p.price.toFixed(2)}</span>
                        )}
                        <span className={`text-[9px] font-bold ${p.stock <= 0 ? 'text-red-500' : p.stock <= 5 ? 'text-amber-500' : 'text-slate-400'}`}>
                          Stock: {p.stock}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <>
            <div>
              <h3 className="font-bold text-slate-800 text-xs md:text-sm mb-0.5 uppercase tracking-wider">Historial de Cotizaciones</h3>
              <p className="text-[11px] text-slate-500">Haga clic en 'Editar/Cargar' para reabrir y modificar cualquier cotización anterior</p>
            </div>

            {/* Match History Search bar */}
            <div className="relative shrink-0">
              <Search className="absolute left-3.5 top-2.5 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Buscar por correlativo, cliente o RUC/DNI..."
                className="w-full bg-slate-100 border-none rounded-xl py-2 px-9 text-xs focus:ring-2 ring-brand-teal outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                value={historySearchTerm}
                onChange={e => setHistorySearchTerm(e.target.value)}
              />
            </div>

            {/* List of of saved proformas */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[180px] md:min-h-0 max-h-[300px] md:max-h-none">
              {filteredHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs font-bold">Sin cotizaciones registradas</p>
                  <p className="text-[10px] mt-1 text-slate-400">
                    {historySearchTerm 
                      ? 'No se encontraron proformas con ese filtro.' 
                      : 'Las cotizaciones se guardan automáticamente al descargar el PDF.'}
                  </p>
                </div>
              ) : (
                filteredHistory.map((q) => (
                  <div 
                    key={q.id}
                    onClick={() => handleLoadQuote(q)}
                    className="p-3.5 bg-white rounded-2xl border border-slate-150 hover:border-brand-teal/40 hover:shadow-md hover:bg-teal-50/5 transition-all cursor-pointer flex flex-col gap-2 group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono font-black text-brand-teal text-xs tracking-wider">{q.quoteNumber}</span>
                        <span className="text-[9px] text-slate-400 ml-2 font-mono font-medium">{q.date}</span>
                      </div>
                      <span className="font-mono text-xs font-black text-slate-850">S/ {q.total.toFixed(2)}</span>
                    </div>

                    <div className="text-[10px] text-slate-600 leading-normal space-y-0.5 bg-slate-50 p-2 rounded-xl border border-slate-100/50">
                      <p className="font-bold text-slate-800 truncate">
                        <span className="text-slate-400 font-normal">Cliente: </span>
                        {q.clientName}
                      </p>
                      {q.clientDoc && (
                        <p className="font-mono text-[9px]">
                          <span className="text-slate-400 font-normal font-sans">Documento: </span>
                          {q.clientDoc}
                        </p>
                      )}
                      <p className="text-[9px] text-slate-500 font-medium flex justify-between">
                        <span>{q.cart.length} productos</span>
                        {q.clientPhone && <span>📞 {q.clientPhone}</span>}
                      </p>
                    </div>

                    <div className="flex justify-end gap-1.5 pt-1.5 border-t border-slate-100 mt-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleDeleteQuote(q.id, e)}
                        className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all"
                        title="Eliminar del historial"
                      >
                        <Trash2 size={10} /> Eliminar
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadQuote(q);
                        }}
                        className="px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all"
                        title="Cargar al editor"
                      >
                        <RefreshCw size={10} /> Cargar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* RIGHT: Document settings and proforma cart list */}
      <div className="flex-1 bg-slate-50/70 p-4 md:p-6 flex flex-col gap-3 md:gap-4 h-auto md:h-full overflow-visible md:overflow-hidden min-h-0">
        
        {/* Client general credentials */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-2.5 shrink-0">
          <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <User size={14} className="text-brand-teal" />
              <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Información de Proforma</h4>
            </div>
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1 py-0.5">
              <button 
                type="button"
                onClick={handleDecrementSeq}
                className="w-4 h-4 rounded hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[10.5px] select-none transition-colors"
                title="Disminuir correlativo"
              >
                -
              </button>
              <div className="flex items-center font-mono text-[9px] font-black text-teal-800 bg-teal-50 px-1 rounded border border-teal-150">
                <span className="opacity-50 select-none">COT-</span>
                <input 
                  type="text"
                  maxLength={4}
                  className="w-7 text-center bg-transparent border-none outline-none font-black text-[9px] font-mono text-teal-800"
                  value={String(quoteSeq).padStart(4, '0')}
                  onChange={e => {
                    const parsed = parseInt(e.target.value, 10);
                    if (!isNaN(parsed) && parsed > 0) {
                      setQuoteSeq(parsed);
                      localStorage.setItem('el_estudiante_quote_seq', String(parsed));
                    } else if (e.target.value === '') {
                      setQuoteSeq(1);
                      localStorage.setItem('el_estudiante_quote_seq', '1');
                    }
                  }}
                />
              </div>
              <button 
                type="button"
                onClick={handleIncrementSeq}
                className="w-4 h-4 rounded hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[10.5px] select-none transition-colors"
                title="Incrementar correlativo"
              >
                +
              </button>
            </div>
          </div>

          {uniqueClients.length > 0 && (
            <div className="bg-slate-50/80 p-2 rounded-2xl border border-slate-100/75 shrink-0">
              <span className="text-[7.5px] font-black uppercase text-slate-400 mb-1 block">✨ Autofactura Rápida (Clientes Recientes):</span>
              <div className="flex flex-wrap gap-1 max-h-[50px] overflow-y-auto">
                {uniqueClients.slice(0, 5).map((c, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setClientName(c.name);
                      setClientDoc(c.doc);
                      setClientAddress(c.address);
                      setClientPhone(c.phone);
                    }}
                    className="px-2 py-0.5 bg-white hover:bg-teal-50 hover:text-teal-900 text-[9px] font-bold text-slate-705 rounded-lg transition-all border border-slate-200 hover:border-teal-200 truncate max-w-[140px] shadow-[0_1px_1px_rgba(0,0,0,0.02)]"
                    title={`${c.name} ${c.doc ? ` - Doc: ${c.doc}` : ''}`}
                  >
                    👤 {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[8px] font-black uppercase text-slate-400 mb-0.5 block">Cliente / Razón Social</label>
              <input 
                type="text" 
                placeholder="Público en General / Empresa"
                className="w-full bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs border border-slate-100 focus:bg-white focus:border-brand-teal outline-none transition-all font-medium text-slate-800"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-0.5">
                <label className="text-[8px] font-black uppercase text-slate-400 block font-sans">RUC / DNI del Solicitante</label>
                {clientDoc.length > 0 && (
                  <span className={`text-[8px] px-1.5 py-0.2 rounded font-black tracking-wider ${
                    clientDoc.length === 8 ? 'bg-teal-50 text-teal-700' : clientDoc.length === 11 ? 'bg-blue-50 text-blue-700 font-mono' : 'bg-red-50 text-red-500 font-mono'
                  }`}>
                    {clientDoc.length === 8 ? 'DNI VÁLIDO' : clientDoc.length === 11 ? 'RUC VÁLIDO' : 'INCOMPLETO'}
                  </span>
                )}
              </div>
              <input 
                type="text" 
                maxLength={11}
                placeholder="RUC de 11 dígitos o DNI de 8"
                className="w-full bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs border border-slate-100 focus:bg-white focus:border-brand-teal outline-none transition-all font-mono text-slate-850"
                value={clientDoc}
                onChange={e => setClientDoc(e.target.value.replace(/\D/g, ''))} // numbers only
              />
            </div>
            <div>
              <label className="text-[8px] font-black uppercase text-slate-400 mb-0.5 block">Dirección Facturable</label>
              <input 
                type="text" 
                placeholder="Ejemplo: Jíron Bolognesi 123"
                className="w-full bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs border border-slate-100 focus:bg-white focus:border-brand-teal outline-none transition-all font-medium text-slate-800"
                value={clientAddress}
                onChange={e => setClientAddress(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[8px] font-black uppercase text-slate-400 mb-0.5 block">Celular / Teléfono</label>
              <input 
                type="text" 
                placeholder="Nro de contacto"
                className="w-full bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs border border-slate-100 focus:bg-white focus:border-brand-teal outline-none transition-all font-medium text-slate-800"
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-[8px] font-black uppercase text-slate-400 mb-0.5 block">Observaciones Especiales / Notas (Aparece en el PDF)</label>
            <input 
              type="text" 
              placeholder="Ej: Entregar empastado, validez expandida a 30 días, etc."
              className="w-full bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs border border-slate-100 focus:bg-white focus:border-brand-teal outline-none transition-all font-medium text-slate-800"
              value={quoteNotes}
              onChange={e => setQuoteNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Selected Quotation Items List */}
        <div className="flex-1 flex flex-col min-h-[250px] md:min-h-0 bg-white rounded-3xl border border-slate-100 shadow-sm p-4 md:p-5 overflow-hidden">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-2.5 shrink-0">
            <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Ítems Cotizados ({cart.length})</h4>
            {cart.length > 0 && (
              <button 
                onClick={handleClearAll}
                className="text-[9px] text-red-500 hover:text-red-700 font-bold uppercase tracking-wider flex items-center gap-1 transition-colors px-2 py-0.5 rounded-lg hover:bg-red-50"
              >
                <Trash2 size={10} /> Limpiar Todo
              </button>
            )}
          </div>

          {/* Cart Table list */}
          <div id="quotation-selected-items-list" className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[160px] md:max-h-[180px] min-h-0 border-b border-dashed border-slate-100 pb-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-10">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-2 border border-slate-100">
                  <FileText size={20} />
                </div>
                <p className="text-xs font-bold">Sin productos seleccionados</p>
                <p className="text-[10px] mt-0.5 text-slate-400 max-w-[180px] mx-auto">Haz clic en los productos del catálogo de la izquierda para agregarlos instantáneamente.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div 
                  key={item.product.id}
                  id={`quoted-item-${item.product.id}`}
                  className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center justify-between p-2.5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2 overflow-hidden w-full sm:w-auto">
                    <button 
                      onClick={() => handleRemoveItem(item.product.id)}
                      className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      title="Quitar"
                    >
                      <Trash2 size={12} />
                    </button>
                    <div className="overflow-hidden">
                      <h5 className="text-xs font-bold text-slate-800 leading-tight truncate">{item.product.name}</h5>
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5">{item.product.sku}</p>
                    </div>
                  </div>

                  {/* Pricing and quantities controllers */}
                  <div className="flex items-center justify-between sm:justify-end gap-3.5 w-full sm:w-auto pt-1.5 sm:pt-0 border-t border-slate-100 sm:border-t-0">
                    
                    {/* Unit price (Dynamic Input for custom prices like discount) */}
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase text-slate-400 mb-0.5 block">Precio Unit S/</span>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-xs font-bold">S/</span>
                        <input 
                          type="number"
                          step="0.1"
                          className="w-12 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 font-black focus:border-brand-teal outline-none"
                          value={item.customPrice || 0}
                          onChange={e => handleUpdatePrice(item.product.id, parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>

                    {/* Quantity selectors */}
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase text-slate-400 mb-0.5 block">Cantidad</span>
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                        <button 
                          onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                          className="p-1 hover:bg-slate-100 text-slate-500 rounded"
                        >
                          <Minus size={8} />
                        </button>
                        <span className="text-xs font-bold text-slate-800 px-1 min-w-[16px] text-center font-mono">
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                          className="p-1 hover:bg-slate-100 text-slate-500 rounded"
                          disabled={item.quantity >= item.product.stock}
                          title={item.quantity >= item.product.stock ? "Cantidad máxima según Stock de almacén" : ""}
                        >
                          <Plus size={8} />
                        </button>
                      </div>
                    </div>

                    {/* Line total */}
                    <div className="text-right flex flex-col min-w-[55px]">
                      <span className="text-[8px] font-black uppercase text-slate-400 mb-0.5 block">Subtotal</span>
                      <span className="text-xs font-black text-slate-800">
                        S/ {(item.customPrice * item.quantity).toFixed(2)}
                      </span>
                    </div>

                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quotation summary values - ALWAYS PINNED ON DESKTOP */}
          <div className="mt-2.5 pt-3 border-t border-slate-100 bg-slate-50/50 p-3 md:p-3.5 rounded-2xl shrink-0 flex flex-col gap-2">
            {/* Global Discount Option */}
            <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-dashed border-slate-200">
              <span className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1">
                🏷️ Descuento Global (%):
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="90"
                  value={globalDiscountPercent || ''}
                  placeholder="0"
                  onChange={e => {
                    const val = Math.min(90, Math.max(0, parseInt(e.target.value, 10) || 0));
                    setGlobalDiscountPercent(val);
                  }}
                  className="w-12 bg-white border border-slate-200 rounded text-center font-black py-0.5 text-[11px] text-teal-800 outline-none focus:border-brand-teal"
                />
                <span className="text-xs text-slate-400 font-semibold">%</span>
              </div>
            </div>

            {globalDiscountPercent > 0 && (
              <div className="grid grid-cols-2 gap-1 px-1 text-[10px] pb-1.5 border-b border-dashed border-slate-200">
                <div className="text-left text-slate-400 font-semibold">Subtotal Bruto:</div>
                <div className="text-right font-mono text-slate-600">S/ {stats.rawTotal.toFixed(2)}</div>
                <div className="text-left text-brand-orange font-bold">Descuento ({globalDiscountPercent}%):</div>
                <div className="text-right font-mono text-brand-orange font-bold">-S/ {stats.discountAmount.toFixed(2)}</div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-1 text-center">
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase">Subtotal Neto</p>
                <p className="text-xs font-bold text-slate-600 font-mono">S/ {stats.subtotal.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase">I.G.V. (18%)</p>
                <p className="text-xs font-bold text-slate-600 font-mono">S/ {stats.igv.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[8px] font-black text-brand-teal uppercase">Total General</p>
                <p className="text-xs sm:text-sm font-black text-brand-teal font-mono">S/ {stats.total.toFixed(2)}</p>
              </div>
            </div>

            {/* Print, Save and WhatsApp share actions */}
            <div className="flex flex-col gap-1.5 mt-1">
              <div className="grid grid-cols-2 gap-1.5">
                <button 
                  type="button"
                  onClick={() => handleSaveQuotation()}
                  disabled={cart.length === 0}
                  className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border transition-all ${
                    cart.length === 0 
                      ? 'bg-slate-50 text-slate-350 border-slate-100 cursor-not-allowed shadow-none' 
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 active:scale-[0.99] shadow-sm'
                  }`}
                  title="Registrar esta cotización en el historial sin descargar el PDF"
                >
                  <History size={11} className="text-brand-orange" />
                  Guardar Historial
                </button>

                <button 
                  type="button"
                  onClick={handleWhatsAppShare}
                  disabled={cart.length === 0}
                  className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border transition-all ${
                    cart.length === 0 
                      ? 'bg-slate-50 text-slate-350 border-slate-100 cursor-not-allowed shadow-none' 
                      : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-150 text-emerald-850 active:scale-[0.99] shadow-xs'
                  }`}
                  title="Copiar cotización como texto y enviar por WhatsApp"
                >
                  <MessageCircle size={11} className="text-emerald-600" />
                  Enviar WhatsApp
                </button>
              </div>

              <button 
                type="button"
                onClick={handleExportPDF}
                disabled={cart.length === 0 || isExporting}
                className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all ${
                  cart.length === 0 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                    : exportComplete
                      ? 'bg-brand-green text-white shadow-brand-green/20 scale-[1.01]'
                      : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.99] shadow-slate-900/10'
                }`}
              >
                {isExporting ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-400 border-t-white animate-spin"></div>
                    GENERANDO PDF...
                  </>
                ) : exportComplete ? (
                  <>
                    <Check size={14} strokeWidth={3} />
                    ¡PROFORMA DESCARGADA!
                  </>
                ) : (
                  <>
                    <FileDown size={14} />
                    DESCARGAR PDF
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

        {/* Bank transfer info card footer */}
        <div className="bg-amber-50/40 p-2.5 rounded-2xl border border-amber-500/10 flex items-start gap-2.5 shrink-0">
          <Landmark size={14} className="text-brand-orange mt-0.5 shrink-0" />
          <div className="text-[9px] text-slate-600 leading-normal">
            <span className="font-bold text-slate-800">Nota para Puquio:</span> Los depósitos o Yape/Plin se concilian en caja al instante. La proforma PDF legal incluye validez comercial y cuentas del BCP y Banco de la Nación.
          </div>
        </div>

      </div>
    </div>
  );
};
