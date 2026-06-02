import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  Search, 
  Package, 
  Briefcase, 
  Calendar, 
  Edit2, 
  Truck, 
  Copy, 
  Check, 
  Printer, 
  X, 
  FileText, 
  Loader2, 
  ChevronRight, 
  AlertCircle,
  FileDown,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { useProducts, Product } from '../hooks/useProducts';
import { useSuppliers, Supplier } from '../hooks/useSuppliers';
import { usePurchaseOrders, PurchaseOrder, PurchaseOrderItem } from '../hooks/usePurchaseOrders';
import { PurchaseOrderService } from '../services/purchaseOrderService';
import { CatalogService } from '../services/catalogService';

export const PurchaseOrderManager: React.FC = () => {
  const { products } = useProducts();
  const { suppliers } = useSuppliers();
  const { purchaseOrders, loading: loadingOrders } = usePurchaseOrders();

  const [activeForm, setActiveForm] = useState<Partial<PurchaseOrder> | null>(null);
  const [selectedProductSearch, setSelectedProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQuantity, setItemQuantity] = useState<number>(5);
  const [itemCostPrice, setItemCostPrice] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  
  // Active viewing detail order
  const [viewingOrderDetail, setViewingOrderDetail] = useState<PurchaseOrder | null>(null);

  // State for delete confirmation modal
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<PurchaseOrder | null>(null);

  // State for registering pregrabado item in catalog
  const [oficializeTarget, setOficializeTarget] = useState<{
    orderId: string;
    itemIndex: number;
    sku: string;
    name: string;
    costPrice: number;
    quantity: number;
  } | null>(null);

  // Form states for the officialize modal
  const [oficializeSku, setOficializeSku] = useState('');
  const [oficializeCategory, setOficializeCategory] = useState('utiles');
  const [oficializeBrand, setOficializeBrand] = useState('');
  const [oficializePrice, setOficializePrice] = useState<number>(0);
  const [oficializeStock, setOficializeStock] = useState<number>(0);
  const [oficializeSaving, setOficializeSaving] = useState(false);

  // Export PDF layout generator mirroring the style of ProductQuoter
  const handleExportPDF = (order: PurchaseOrder) => {
    if (!order.items || order.items.length === 0) {
      alert('El pedido no tiene productos registrados.');
      return;
    }

    setIsExporting(true);

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

      // --- DOCUMENT HEADER BOX (REPOSICION / COMPRA) ---
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.rect(135, 12, 60, 26, 'F');
      
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.5);
      doc.rect(135, 12, 60, 26, 'S');

      // 1. Title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('PEDIDO DE COMPRA', 165, 18.5, { align: 'center' });

      // Sub-title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text('CONSOLIDADO PROVEEDOR', 165, 24, { align: 'center' });
      
      // Correlative ID truncated safely
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      const shortId = order.id ? order.id.substring(0, 10).toUpperCase() : 'NUEVO';
      doc.text(`N° ${shortId}`, 165, 31, { align: 'center' });

      // Clean divider
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(15, 43, 195, 43);

      // --- TRANSACTION DETAILS ---
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text('DATOS DE LA ADQUISICIÓN / PROVEEDOR:', 15, 49);

      // Grey block container
      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(226, 232, 240);
      doc.rect(15, 52, 180, 28, 'F');
      doc.rect(15, 52, 180, 28, 'S');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Proveedor:', 18, 57);
      doc.text('Estado:', 18, 62);
      doc.text('Notas:', 18, 67);
      doc.text('Flete:', 18, 72);

      doc.text('Fecha Creación:', 130, 57);
      doc.text('ID Reposición:', 130, 62);
      doc.text('Establecimiento:', 130, 67);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(order.supplierName || 'N/A', 38, 57);
      
      const statusText = order.status === 'borrador' ? '✏️ BORRADOR (Guardando productos)' : order.status === 'enviado' ? '📤 ENVIADO A PROVEEDOR' : '✅ RECIBIDO EN ALMACÉN';
      doc.text(statusText, 38, 62);
      doc.text(order.notes || 'Sin anotaciones adicionales', 38, 67);
      doc.text(order.freightCost ? `S/ ${Number(order.freightCost).toFixed(2)}` : 'S/ 0.00 (Flete gratuito / no asignado)', 38, 72);

      const dStr = order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : new Date().toLocaleDateString();
      doc.text(dStr, 155, 57);
      doc.text(order.id || 'N/A', 155, 62);
      doc.text('ALMACÉN PRINCIPAL / PUQUIO', 155, 67);

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
        doc.text('SKU / CÓDIGO', 28, y + 5.5);
        doc.text('DESCRIPCIÓN DEL PRODUCTO', 58, y + 5.5);
        doc.text('CANT.', 135, y + 5.5, { align: 'right' });
        doc.text('COSTO UNIT.', 160, y + 5.5, { align: 'right' });
        doc.text('IMPORTE', 190, y + 5.5, { align: 'right' });
      };

      // Draw table header on first page
      drawTableHeader(startY);

      // Rows
      let currentY = startY + 8;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);

      order.items.forEach((item, index) => {
        const descLines = doc.splitTextToSize(item.name || 'N/A', 72) as string[];
        const rowHeight = descLines.length > 1 ? 6 + (descLines.length * 3.5) : 8;

        // Safe check: If drawing this row would exceed Y limit (260 mm),
        // we add a new page, draw header on new page, and continue drawing on new page.
        if (currentY + rowHeight > 260) {
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
          doc.text(`Pedido consolidado: N° ${shortId}`, 195, 13, { align: 'right' });
          
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.2);
          doc.line(15, 16, 195, 16);
          
          startY = 20;
          drawTableHeader(startY);
          currentY = startY + 8;
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(30, 41, 59);
        }

        // Zebra lines
        if (index % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, currentY, 180, rowHeight, 'F');
        }

        // Draw Row Cells
        doc.text(String(index + 1), 18, currentY + 5.5);
        doc.text(item.sku || 'S/N', 28, currentY + 5.5);
        
        // Render description line by line
        descLines.forEach((line, lineIdx) => {
          doc.text(line, 58, currentY + 5.5 + (lineIdx * 3.5));
        });

        doc.text(String(item.quantity), 135, currentY + 5.5, { align: 'right' });
        doc.text(`S/ ${item.costPrice.toFixed(2)}`, 160, currentY + 5.5, { align: 'right' });
        
        const lineTotal = item.costPrice * item.quantity;
        doc.text(`S/ ${lineTotal.toFixed(2)}`, 190, currentY + 5.5, { align: 'right' });

        // Draw light bottom border
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.1);
        doc.line(15, currentY + rowHeight, 195, currentY + rowHeight);

        currentY += rowHeight;
      });

      // --- TOTALS BLOCK ---
      let totalsY = currentY + 4;
      if (totalsY + 25 > 260) {
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
        
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(15, 16, 195, 16);
        
        totalsY = 22;
      }

      const itemsSum = order.items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
      const freightVal = Number(order.freightCost || 0);
      const totalEstimatedVal = itemsSum + freightVal;

      // Draw background or separator lines for totals to make it neat
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.25);
      doc.line(130, totalsY - 2, 195, totalsY - 2);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('SUB-TOTAL ADQUISICIONES S/:', 145, totalsY + 3, { align: 'right' });
      doc.text('FLETE CONSOLIDADO S/:', 145, totalsY + 8.5, { align: 'right' });
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('PRESUPUESTO TOTAL GENERAL S/:', 145, totalsY + 15, { align: 'right' });

      // Print values
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`S/ ${itemsSum.toFixed(2)}`, 190, totalsY + 3, { align: 'right' });
      doc.text(`S/ ${freightVal.toFixed(2)}`, 190, totalsY + 8.5, { align: 'right' });
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.text(`S/ ${totalEstimatedVal.toFixed(2)}`, 190, totalsY + 15, { align: 'right' });

      currentY = totalsY + 19;

      // --- OPTIMIZATION NOTICE BOX ---
      let noticeY = currentY + 6;
      if (noticeY + 28 > 260) {
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
        
        doc.setDrawColor(226, 232, 240);
        doc.line(15, 16, 195, 16);
        
        noticeY = 22;
      }

      doc.setDrawColor(13, 148, 136); // teal border of box
      doc.setFillColor(242, 251, 251); // extra light teal filled background
      doc.rect(15, noticeY, 180, 20, 'F');
      doc.rect(15, noticeY, 180, 20, 'S');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(13, 148, 136);
      doc.text('ESTRATEGIAS DE OPTIMIZACIÓN Y CONTROL DEL FLETE:', 18, noticeY + 5);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('• Al consolidar múltiples ítems de compra por cada proveedor, evitamos pagar fletes costosos de manera individual.', 18, noticeY + 9.5);
      doc.text('• Este pedido actúa como una cartera que recolecta requerimientos para despachar un solo envío de gran volumen.', 18, noticeY + 14);

      // --- SIGNATURES WORKFLOWS ---
      let signatureY = noticeY + 42;
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
        
        doc.setDrawColor(226, 232, 240);
        doc.line(15, 16, 195, 16);
        
        signatureY = 40;
      }

      // Horizontal marker line of signature
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.35);
      doc.line(75, signatureY, 135, signatureY);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('DPTO. ADQUISICIONES Y LOGÍSTICA', 105, signatureY + 4, { align: 'center' });
      
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
        doc.text('Librería "El Estudiante" - Calidad, variedad al servicio de la educación en Puquio, Lucanas y todo Ayacucho. Gestión consolidada de pedidos.', 15, 284);
        doc.text(`Página ${i} de ${totalPages}`, 195, 284, { align: 'right' });
      }

      // Trigger Save
      doc.save(`Pedido_Compra_${order.supplierName.replace(/[^a-zA-Z0-9]/g, '_')}_${shortId}.pdf`);

      setIsExporting(false);
    } catch (error) {
      console.error('Error generating purchase order pdf:', error);
      alert('Sucedió un problema al compilar el reporte PDF.');
      setIsExporting(false);
    }
  };

  // Filter purchase orders
  const filteredOrders = purchaseOrders.filter(order => 
    order.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.notes || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter products for dropdown
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(selectedProductSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(selectedProductSearch.toLowerCase())
  ).slice(0, 8); // top 8 results

  const handleCreateNew = () => {
    setActiveForm({
      supplierId: suppliers[0]?.id || '',
      supplierName: suppliers[0]?.name || '',
      status: 'borrador',
      items: [],
      notes: '',
      freightCost: 0
    });
    setSelectedProductSearch('');
    setSelectedProductId('');
    setItemQuantity(5);
    setItemCostPrice(0);
  };

  const handleEdit = (order: PurchaseOrder) => {
    setActiveForm({ ...order });
    setSelectedProductSearch('');
    setSelectedProductId('');
    setItemQuantity(5);
    setItemCostPrice(0);
  };

  const handleDeleteClick = (order: PurchaseOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmOrder(order);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmOrder) return;
    try {
      await PurchaseOrderService.deletePurchaseOrder(deleteConfirmOrder.id);
      if (viewingOrderDetail?.id === deleteConfirmOrder.id) {
        setViewingOrderDetail(null);
      }
      setDeleteConfirmOrder(null);
    } catch (err) {
      console.error('Error al eliminar:', err);
      alert('Sucedió un problema al eliminar el pedido consolidado.');
    }
  };

  // Export consolidated list to CSV / Excel compatible format
  const handleExportCSV = (order: PurchaseOrder) => {
    try {
      const dateStr = order.createdAt 
        ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() 
        : 'Borrador';

      // CSV with UTF-8 BOM
      let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
      csvContent += "CONSOLIDADO DE PEDIDO DE COMPRA - LIBRERIA EL ESTUDIANTE\n";
      csvContent += `Referencia PO,${order.id || 'Borrador'}\n`;
      csvContent += `Proveedor,"${order.supplierName.replace(/"/g, '""')}"\n`;
      csvContent += `Fecha Creacion,${dateStr}\n`;
      csvContent += `Estado del Consolidado,${order.status.toUpperCase()}\n`;
      csvContent += `Notas,"${(order.notes || 'Ninguna').replace(/"/g, '""')}"\n`;
      csvContent += `Flete Consolidado,S/ ${Number(order.freightCost || 0).toFixed(2)}\n\n`;

      csvContent += "ITEM,SKU/CODIGO,DESCRIPCION DEL PRODUCTO,CANTIDAD,COSTO UNITARIO (S/),IMPORTE TOTAL (S/)\n";

      order.items.forEach((item, index) => {
        const lineTotal = item.costPrice * item.quantity;
        const nameEscaped = `"${(item.name || 'N/A').replace(/"/g, '""')}"`;
        const skuEscaped = `"${(item.sku || 'S/N').replace(/"/g, '""')}"`;
        csvContent += `${index + 1},${skuEscaped},${nameEscaped},${item.quantity},S/ ${item.costPrice.toFixed(2)},S/ ${lineTotal.toFixed(2)}\n`;
      });

      const itemsSum = order.items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
      const totalEstimatedVal = itemsSum + Number(order.freightCost || 0);

      csvContent += `\n,,,,Subtotal Adquisiciones,S/ ${itemsSum.toFixed(2)}\n`;
      csvContent += `,,,,Flete Consolidado,S/ ${Number(order.freightCost || 0).toFixed(2)}\n`;
      csvContent += `,,,,PRESUPUESTO TOTAL GENERAL,S/ ${totalEstimatedVal.toFixed(2)}\n`;

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      
      const fileSafeSupplierName = order.supplierName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      link.setAttribute("download", `pedido_compra_${order.id || 'borrador'}_${fileSafeSupplierName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error al exportar CSV:', err);
      alert('Sucedió un problema al generar la exportación en CSV.');
    }
  };

  // Add low stock suggested item directly to active Purchase Order draft
  const handleAddLowStockItem = (p: Product) => {
    if (!activeForm) return;
    const newItems = [...(activeForm.items || [])];
    const existingIndex = newItems.findIndex(it => it.productId === p.id);
    
    // Suggested replenishment quantity: e.g. enough to reach 4x the minimum stock (or default to 20 if stock is extremely depleted)
    const minS = p.minStock || 5;
    const currentS = p.stock || 0;
    const suggestedQty = Math.max(5, minS * 4 - currentS);
    const cost = p.costPrice || Number((p.price * 0.70).toFixed(2)) || 0;

    if (existingIndex > -1) {
      newItems[existingIndex].quantity += suggestedQty;
      newItems[existingIndex].costPrice = Number(cost);
    } else {
      newItems.push({
        productId: p.id,
        sku: p.sku || '',
        name: p.name,
        costPrice: Number(cost),
        quantity: suggestedQty
      });
    }

    setActiveForm({
      ...activeForm,
      items: newItems
    });
  };

  const handleStartOficialize = (it: PurchaseOrderItem, itemIndex: number) => {
    if (!viewingOrderDetail) return;
    setOficializeTarget({
      orderId: viewingOrderDetail.id,
      itemIndex,
      sku: it.sku,
      name: it.name,
      costPrice: it.costPrice,
      quantity: it.quantity
    });
    setOficializeSku(it.sku);
    setOficializeCategory('utiles');
    setOficializeBrand('');
    setOficializePrice(Number((it.costPrice * 1.40).toFixed(2))); // Suggest 40% margin
    setOficializeStock(it.quantity); // Suggest purchase order's qty as initial stock
  };

  const handleConfirmOficialize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oficializeTarget || !viewingOrderDetail) return;

    if (!oficializeSku.trim()) {
      alert("Por favor ingresa un código/SKU para el nuevo producto.");
      return;
    }
    if (oficializePrice <= 0) {
      alert("El precio de venta de catálogo debe ser mayor que cero.");
      return;
    }

    setOficializeSaving(true);
    try {
      // 1. Create product in CATALOG!
      const docRef = (await CatalogService.saveProduct({
        sku: oficializeSku.trim(),
        name: oficializeTarget.name,
        category: oficializeCategory,
        authorOrBrand: oficializeBrand.trim(),
        price: Number(oficializePrice),
        costPrice: Number(oficializeTarget.costPrice),
        stock: Number(oficializeStock),
        featured: false,
        minStock: 5
      })) as any;

      const newProductId = docRef.id;

      // 2. Map and update purchase order items in DB & UI
      const updatedItems = [...viewingOrderDetail.items];
      updatedItems[oficializeTarget.itemIndex] = {
        ...updatedItems[oficializeTarget.itemIndex],
        productId: newProductId,
        sku: oficializeSku.trim(),
        isManual: false
      };

      const updatedOrder = {
        ...viewingOrderDetail,
        items: updatedItems
      };

      // 3. Persist order changes to DB
      await PurchaseOrderService.savePurchaseOrder(updatedOrder);

      // 4. Update UI in active detail container
      setViewingOrderDetail(updatedOrder);
      setOficializeTarget(null);

    } catch (err) {
      console.error("Error al oficializar producto:", err);
      alert("Sucedió un problema al registrar el producto oficialmente en el catálogo.");
    } finally {
      setOficializeSaving(false);
    }
  };

  // When supplier is selected
  const handleSupplierChange = (supplierId: string) => {
    const s = suppliers.find(sup => sup.id === supplierId);
    if (s && activeForm) {
      setActiveForm({
        ...activeForm,
        supplierId: s.id,
        supplierName: s.name
      });
    }
  };

  // Quick select product helper
  const handleSelectProduct = (p: Product) => {
    setSelectedProductId(p.id);
    setSelectedProductSearch(p.name);
    // Suggest the current costPrice of product, if undefined fallback to standard price or 0
    setItemCostPrice(p.costPrice || p.price * 0.70); // Assume default cost price of 70% if empty
  };

  // Add item to active purchase order
  const handleAddItem = () => {
    if (!activeForm || selectedProductSearch.trim() === '') return;

    const newItems = [...(activeForm.items || [])];

    if (selectedProductId) {
      const p = products.find(prod => prod.id === selectedProductId);
      if (!p) return;

      const existingIndex = newItems.findIndex(it => it.productId === p.id);
      if (existingIndex > -1) {
        newItems[existingIndex].quantity += Number(itemQuantity);
        newItems[existingIndex].costPrice = Number(itemCostPrice || 0);
      } else {
        newItems.push({
          productId: p.id,
          sku: p.sku || '',
          name: p.name,
          costPrice: Number(itemCostPrice || 0),
          quantity: Number(itemQuantity)
        });
      }
    } else {
      // Manual / Pregrabado item!
      // Check if matches any existing product names in the catalog to be safe
      const matchedProd = products.find(prod => prod.name.toLowerCase() === selectedProductSearch.trim().toLowerCase());
      if (matchedProd) {
        // Safe match
        const existingIndex = newItems.findIndex(it => it.productId === matchedProd.id);
        if (existingIndex > -1) {
          newItems[existingIndex].quantity += Number(itemQuantity);
          newItems[existingIndex].costPrice = Number(itemCostPrice || 0);
        } else {
          newItems.push({
            productId: matchedProd.id,
            sku: matchedProd.sku || '',
            name: matchedProd.name,
            costPrice: Number(itemCostPrice || 0),
            quantity: Number(itemQuantity)
          });
        }
      } else {
        // Create manual/pregrabado item
        const manualId = `manual_${Date.now()}`;
        const manualSku = `MAN-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        const existingIndex = newItems.findIndex(it => it.name.trim().toLowerCase() === selectedProductSearch.trim().toLowerCase());
        if (existingIndex > -1) {
          newItems[existingIndex].quantity += Number(itemQuantity);
          newItems[existingIndex].costPrice = Number(itemCostPrice || 0);
        } else {
          newItems.push({
            productId: manualId,
            sku: manualSku,
            name: selectedProductSearch.trim(),
            costPrice: Number(itemCostPrice || 0),
            quantity: Number(itemQuantity),
            isManual: true
          });
        }
      }
    }

    setActiveForm({
      ...activeForm,
      items: newItems
    });

    // Reset fields
    setSelectedProductSearch('');
    setSelectedProductId('');
    setItemQuantity(5);
    setItemCostPrice(0);
  };

  // Remove item from active purchase order
  const handleRemoveItem = (index: number) => {
    if (!activeForm || !activeForm.items) return;
    const items = [...activeForm.items];
    items.splice(index, 1);
    setActiveForm({ ...activeForm, items });
  };

  // Change quantity inside the grid directly
  const handleUpdateItemQty = (index: number, qty: number) => {
    if (!activeForm || !activeForm.items || qty < 1) return;
    const items = [...activeForm.items];
    items[index].quantity = qty;
    setActiveForm({ ...activeForm, items });
  };

  // Change cost price inside the grid directly
  const handleUpdateItemCost = (index: number, cost: number) => {
    if (!activeForm || !activeForm.items || cost < 0) return;
    const items = [...activeForm.items];
    items[index].costPrice = cost;
    setActiveForm({ ...activeForm, items });
  };

  // Save order to Firestore
  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeForm) return;

    if (!activeForm.supplierId) {
      alert('Debe seleccionar un proveedor');
      return;
    }

    if (!activeForm.items || activeForm.items.length === 0) {
      alert('Debe agregar al menos un producto a la lista consolidada.');
      return;
    }

    setIsSaving(true);
    try {
      const previousOrder = activeForm.id ? purchaseOrders.find(o => o.id === activeForm.id) : null;
      const isTransitioningToReceived = activeForm.status === 'recibido' && (!previousOrder || previousOrder.status !== 'recibido');

      let updatedStockCount = 0;
      let skippedItemsCount = 0;

      if (isTransitioningToReceived && activeForm.items) {
        for (const item of activeForm.items) {
          if (item.productId && !item.isManual && !item.productId.startsWith('manual_')) {
            const currentProd = products.find(p => p.id === item.productId);
            if (currentProd) {
              const newStock = Number(currentProd.stock || 0) + Number(item.quantity);
              await CatalogService.saveProduct({
                ...currentProd,
                id: currentProd.id,
                stock: newStock,
                costPrice: Number(item.costPrice) // Update central database costPrice with latest purchase cost!
              });
              updatedStockCount++;
            } else {
              skippedItemsCount++;
            }
          } else {
            skippedItemsCount++;
          }
        }
      }

      await PurchaseOrderService.savePurchaseOrder(activeForm);
      setActiveForm(null);
      
      let msg = 'Pedido consolidado guardado exitosamente.';
      if (isTransitioningToReceived) {
        msg += `\n\n📢 CONTROL DE ALMACÉN: ¡Stock actualizado automáticamente! Se ha incrementado el stock de ${updatedStockCount} productos en el catálogo principal con sus respectivos nuevos costos de compra.`;
        if (skippedItemsCount > 0) {
          msg += ` Sábete que ${skippedItemsCount} ítems manuales o sin oficializar en el Catálogo no se sumaron automáticamente.`;
        }
      }
      alert(msg);
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al guardar el pedido');
    } finally {
      setIsSaving(false);
    }
  };

  // Copy order formatted summary to clipboard
  const handleCopyOrderSummary = (order: PurchaseOrder) => {
    const date = order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : 'Borrador';
    const totalCost = order.items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
    const totalWithFreight = totalCost + Number(order.freightCost || 0);

    let text = `📋 *PEDIDO DE COMPRA - LIBRERÍA EL ESTUDIANTE*\n`;
    text += `🏢 *Proveedor:* ${order.supplierName}\n`;
    text += `📅 *Fecha:* ${date}\n`;
    text += `📦 *Consolidado de Productos:*\n`;
    
    order.items.forEach((it, idx) => {
      text += `  *${idx + 1}.* SKU: ${it.sku} | ${it.name}\n`;
      text += `     Cantidad: ${it.quantity} unds @ S/ ${it.costPrice.toFixed(2)} = S/ ${(it.costPrice * it.quantity).toFixed(2)}\n`;
    });

    text += `\n💵 *Subtotal:* S/ ${totalCost.toFixed(2)}`;
    if (order.freightCost) {
      text += `\n🚚 *Flete consolidado:* S/ ${Number(order.freightCost).toFixed(2)}`;
    }
    text += `\n💰 *Total Estimado de Compra:* S/ ${totalWithFreight.toFixed(2)}\n`;
    text += `📝 *Notas:* ${order.notes || 'Ninguna'}`;

    navigator.clipboard.writeText(text);
    setCopiedOrderId(order.id);
    setTimeout(() => {
      setCopiedOrderId(null);
    }, 2000);
  };

  // Helper calculating active total
  const activeItemsCost = activeForm?.items?.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0) || 0;
  const activeTotalWithFreight = activeItemsCost + Number(activeForm?.freightCost || 0);

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-slate-50/50">
      
      {/* LEFT PANEL: Purchase Orders List */}
      <div className="w-full md:w-[420px] shrink-0 border-r border-slate-100 flex flex-col h-full bg-white">
        
        {/* Panel Header */}
        <div className="p-4 border-b border-slate-100 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Truck size={16} className="text-brand-orange" /> Consolidación de Pedidos
            </h3>
            <button 
              onClick={handleCreateNew}
              className="bg-slate-900 text-white rounded-lg px-2.5 py-1.5 text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-colors flex items-center gap-1"
            >
              <Plus size={13} />
              Crear Lista
            </button>
          </div>

          <p className="text-[10px] sm:text-[11px] text-slate-500 font-sans leading-relaxed">
            Consolida múltiples productos por proveedor en una misma orden para ahorrar en flete/transporte y optimizar tu presupuesto.
          </p>

          <div className="relative">
            <Search className="absolute left-2.5 top-2 text-slate-400" size={13} />
            <input 
              type="text" 
              placeholder="Buscar por Proveedor o notas..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1 px-8 text-xs outline-none focus:border-brand-teal transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Purchase Orders Scroll Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar bg-slate-50/20">
          {loadingOrders ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="animate-spin text-slate-550 mb-2" size={20} />
              <p className="text-[11px] font-bold uppercase tracking-wider">Cargando listas...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center text-slate-400">
              <AlertCircle className="text-slate-300 mb-2" size={24} />
              <p className="text-xs font-bold text-slate-700">Sin pedidos para compras</p>
              <p className="text-[10px] text-slate-400 mt-1">Crea un pedido consolidado para ir agregando ítems poco a poco.</p>
            </div>
          ) : (
            filteredOrders.map(order => {
              const orderTotal = order.items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
              const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
              const totalWithFreight = orderTotal + Number(order.freightCost || 0);
              const formattedDate = () => {
                if (!order.createdAt) return 'Borrador';
                try {
                  return new Date(order.createdAt.seconds * 1000).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
                } catch {
                  return 'Reciente';
                }
              };

              return (
                <div 
                  key={order.id}
                  onClick={() => { setViewingOrderDetail(order); setActiveForm(null); }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    viewingOrderDetail?.id === order.id 
                      ? 'bg-brand-teal/5 border-brand-teal/30 shadow-xs' 
                      : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border flex items-center gap-1 bg-slate-50 border-slate-200">
                          <Calendar size={9} /> {typeof formattedDate === 'function' ? formattedDate() : formattedDate}
                        </span>
                        
                        {order.status === 'borrador' ? (
                          <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/50">
                            ✏️ Borrador
                          </span>
                        ) : order.status === 'enviado' ? (
                          <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/50">
                            📤 Enviado
                          </span>
                        ) : (
                          <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/50">
                            ✅ Recibido
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-black text-slate-800 truncate" title={order.supplierName}>
                        {order.supplierName}
                      </h4>
                      {order.notes && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5 leading-none">
                          📝 {order.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEdit(order); setViewingOrderDetail(null); }}
                        className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-800 rounded transition-all"
                        title="Modificar Pedido"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteClick(order, e)}
                        className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-all"
                        title="Eliminar"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-50 flex items-center justify-between text-[11px]">
                    <div className="text-slate-450 font-sans">
                      <span className="font-bold text-slate-700 font-mono">{itemsCount}</span> unidades · <span className="font-bold text-slate-700 font-mono">{order.items.length}</span> ítems
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 block -mb-0.5 leading-none">PRESUPUESTO</span>
                      <span className="font-mono font-bold text-slate-900">
                        {totalWithFreight.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT WORKSPACE: Form Editor OR Interactive Detail Visualizer */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col h-full bg-slate-50/30">
        
        <AnimatePresence mode="wait">
          
          {/* 1. CREATING / EDITING PROCUREMENT DRAFT FORM */}
          {activeForm ? (
            <motion.form 
              key="procurement-form"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={handleSaveOrder}
              className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm max-w-4xl mx-auto w-full flex flex-col h-full max-h-[82vh] md:max-h-[85vh] overflow-hidden"
            >
              {/* Form Title */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                <div>
                  <h3 className="font-black text-slate-900 text-sm sm:text-base uppercase tracking-wider text-brand-teal">
                    {activeForm.id ? '✏️ Modificar Pedido Consolidado' : '➕ Crear Nuevo Pedido Consolidado'}
                  </h3>
                  <p className="text-[10px] text-slate-450 font-sans">
                    Agrega los productos poco a poco y guárdalos para tener siempre al día los requerimientos.
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setActiveForm(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 flex flex-col min-h-0 py-4 space-y-4 pr-1">
                
                {/* FIRST: Supplier & Meta row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Proveedor Organizador</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:border-brand-teal focus:ring-1 focus:ring-brand-teal outline-none"
                      value={activeForm.supplierId || ''}
                      onChange={e => handleSupplierChange(e.target.value)}
                    >
                      <option value="" disabled>-- Selecciona un Proveedor --</option>
                      {suppliers.map(sup => (
                        <option key={sup.id} value={sup.id}>{sup.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Costo de Flete Estimado (S/.)</label>
                    <div className="relative">
                      <Truck size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                      <input 
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-8 pr-2.5 text-xs focus:border-brand-teal outline-none font-mono font-bold"
                        value={activeForm.freightCost || ''}
                        onChange={e => setActiveForm({ ...activeForm, freightCost: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Estado del Consolidado</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:border-brand-teal focus:ring-1 focus:ring-brand-teal outline-none capitalize text-semibold"
                      value={activeForm.status || 'borrador'}
                      onChange={e => setActiveForm({ ...activeForm, status: e.target.value as any })}
                    >
                      <option value="borrador">✏️ Borrador (Poco a poco)</option>
                      <option value="enviado">📤 Enviado a Proveedor</option>
                      <option value="recibido">✅ Recibido en Almacén</option>
                    </select>
                  </div>
                </div>

                {/* Notes input */}
                <div className="shrink-0">
                  <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Notas del Pedido</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Consolidar antes de fin de mes, coordinar para flete compartido, etc."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs focus:border-brand-teal outline-none"
                    value={activeForm.notes || ''}
                    onChange={e => setActiveForm({ ...activeForm, notes: e.target.value })}
                  />
                </div>

                {/* ADD PRODUCTS SUB-PANEL */}
                <div className="bg-slate-50/60 p-4 rounded-2xl border border-dashed border-slate-200/80 flex-1 flex flex-col min-h-0 space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-555 flex items-center gap-1 shrink-0">
                    <Package size={13} className="text-brand-teal" /> Añadir Producto a la Orden de Compra
                  </h4>

                  {/* Search and item selection row */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 border-b border-slate-100 pb-3 shrink-0">
                    <div className="sm:col-span-2 relative">
                      <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wide block mb-0.5">Buscar Producto (SKU o Nombre)</label>
                      <div className="relative">
                        <Search size={11} className="absolute left-2.5 top-2.5 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Escribe para buscar..."
                          className="w-full bg-white border border-slate-200 rounded-lg py-1 px-7 text-xs outline-none focus:border-brand-teal"
                          value={selectedProductSearch}
                          onChange={e => {
                            setSelectedProductSearch(e.target.value);
                            setSelectedProductId('');
                          }}
                        />
                      </div>

                      {/* Dropdown search lists */}
                      {selectedProductSearch && !selectedProductId && (
                        <div className="absolute left-0 right-0 z-40 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto divide-y divide-slate-50">
                          {filteredProducts.map(p => (
                            <div 
                              key={p.id}
                              onClick={() => handleSelectProduct(p)}
                              className="p-2 text-xs hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                            >
                              <div className="min-w-0 pr-2">
                                <p className="font-bold text-slate-800 truncate leading-none mb-1">{p.name}</p>
                                <span className="text-[8px] font-mono text-slate-400 tracking-wider">SKU: {p.sku || 'N/A'}</span>
                              </div>
                              <span className="text-[9px] font-bold bg-slate-100 text-slate-550 px-1 p-0.5 rounded shrink-0">
                                Stock: {p.stock}
                              </span>
                            </div>
                          ))}
                          {filteredProducts.length === 0 && (
                            <div className="p-2 text-center text-[10px] text-slate-500 font-sans leading-tight">
                              <p className="font-bold text-amber-600">Ningún producto coincide</p>
                              <p className="text-[8px] mt-0.5 text-slate-400">Puedes continuar escribiendo y presionar el botón "Añadir" de la derecha para incluirlo como pregrabado.</p>
                            </div>
                          )}
                        </div>
                      )}

                      {selectedProductSearch && !selectedProductId && (
                        <p className="text-[8px] sm:text-[9px] text-brand-teal font-extrabold mt-1 tracking-tight">
                          💡 Escribe el nombre completo y presiona "Añadir" para agregarlo como pregrabado.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wide block mb-0.5">Costo Unitario (S/.)</label>
                      <input 
                        type="number" 
                        min="0"
                        step="any"
                        className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-xs outline-none focus:border-brand-teal font-mono"
                        placeholder="0.00"
                        value={itemCostPrice || ''}
                        onChange={e => setItemCostPrice(Number(e.target.value))}
                      />
                    </div>

                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wide block mb-0.5">Cantidad</label>
                        <input 
                          type="number" 
                          min="1"
                          className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-xs outline-none focus:border-brand-teal font-mono"
                          value={itemQuantity}
                          onChange={e => setItemQuantity(Number(e.target.value))}
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={handleAddItem}
                        disabled={selectedProductSearch.trim() === ''}
                        className="bg-brand-teal text-white rounded-lg p-2 text-xs font-black uppercase hover:bg-brand-teal/90 disabled:opacity-50 transition-colors shrink-0 flex items-center justify-center gap-1 cursor-pointer h-8"
                      >
                        <Plus size={14} /> Añadir
                      </button>
                    </div>
                  </div>

                  {/* LOW STOCK REPLENISHMENT SUGGESTIONS ROW */}
                  {products.some(p => (p.stock || 0) <= (p.minStock || 5)) && (
                    <div className="bg-amber-50/40 border border-amber-100/50 p-2.5 rounded-xl space-y-2 shrink-0">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-amber-800 uppercase tracking-wider flex items-center gap-1">
                          <AlertCircle size={10} className="text-amber-600 animate-pulse" /> Sugerencias de Reposición (Stock Crítico)
                        </span>
                        <span className="text-[8px] text-amber-600 font-sans">Sugerido para reabastecer</span>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1 max-w-full custom-scrollbar">
                        {products
                          .filter(p => (p.stock || 0) <= (p.minStock || 5))
                          .slice(0, 6) // Display top 6 low stock products in catalog
                          .map(p => {
                            const minS = p.minStock || 5;
                            const currentS = p.stock || 0;
                            const suggestedQty = Math.max(5, minS * 4 - currentS);
                            const alreadyAdded = activeForm.items?.some(it => it.productId === p.id);
                            return (
                              <div key={p.id} className="bg-white border border-amber-100 p-2 rounded-lg text-[10px] min-w-[160px] max-w-[180px] shrink-0 flex flex-col justify-between shadow-xxs">
                                <p className="font-extrabold text-slate-800 truncate leading-tight" title={p.name}>{p.name}</p>
                                <div className="flex justify-between items-center mt-1 text-[8px] font-mono">
                                  <span className="text-rose-600 font-bold">Stock actual: {currentS}</span>
                                  <span className="text-slate-400">Min: {minS}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleAddLowStockItem(p)}
                                  className={`mt-1.5 w-full py-1 rounded text-[8px] font-black uppercase text-center cursor-pointer transition ${
                                    alreadyAdded 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-amber-100 hover:bg-amber-150 text-amber-900'
                                  }`}
                                >
                                  {alreadyAdded ? '✓ Añadido' : `+ Sugerir ${suggestedQty} unds`}
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Added Items Grid */}
                  <div className="flex-1 overflow-y-auto min-h-[140px] space-y-1 custom-scrollbar">
                    {(!activeForm.items || activeForm.items.length === 0) ? (
                      <p className="text-center py-4 text-[10px] text-slate-450 font-medium font-sans">
                        La lista de compra está vacía. Busca y añade productos arriba.
                      </p>
                    ) : (
                      <div className="space-y-1.5 pr-1">
                        {activeForm.items.map((item, idx) => (
                          <div 
                            key={idx}
                            className="bg-white border border-slate-100 p-2 rounded-xl flex items-center justify-between text-xs gap-3"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-extrabold text-slate-800 truncate leading-tight">{item.name}</p>
                                {item.isManual && (
                                  <span className="bg-amber-50 text-amber-700 text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider border border-amber-100/50 shrink-0">
                                    ✏️ Pregrabado
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] font-mono text-slate-400">SKU: {item.sku}</span>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {/* Quantity inputs direct */}
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-400">Cant:</span>
                                <input 
                                  type="number"
                                  min="1" 
                                  className="w-12 bg-slate-50 border border-slate-200 rounded-md py-0.5 px-1.5 text-center text-xs font-mono font-bold"
                                  value={item.quantity}
                                  onChange={e => handleUpdateItemQty(idx, Number(e.target.value))}
                                />
                              </div>

                              {/* Price inputs direct */}
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-400">Costo: S/</span>
                                <input 
                                  type="number"
                                  min="0"
                                  step="any"
                                  className="w-16 bg-slate-50 border border-slate-200 rounded-md py-0.5 px-1.5 text-center text-xs font-mono font-bold"
                                  value={item.costPrice}
                                  onChange={e => handleUpdateItemCost(idx, Number(e.target.value))}
                                />
                              </div>

                              <div className="text-right min-w-[70px] font-mono font-bold text-slate-800">
                                S/ {(item.costPrice * item.quantity).toFixed(2)}
                              </div>

                              <button 
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-red-400 hover:text-red-600 p-1 rounded-md transition"
                                title="Quitar ítem"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

              </div>

              {/* Form Actions Footer */}
              <div className="border-t border-slate-100 pt-3 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 bg-white">
                <div className="text-left font-sans text-xs flex gap-4 w-full sm:w-auto">
                  <div className="text-slate-500">
                    Subtotal: <span className="font-mono font-bold text-slate-800">S/ {activeItemsCost.toFixed(2)}</span>
                  </div>
                  {activeForm.freightCost ? (
                    <div className="text-slate-500">
                      🚚 Flete consolidado: <span className="font-mono font-bold text-slate-800">S/ {Number(activeForm.freightCost).toFixed(2)}</span>
                    </div>
                  ) : null}
                  <div className="text-brand-teal font-extrabold uppercase text-[12px]">
                    Total Estimado: <span className="font-mono font-black text-slate-900 border-b border-brand-tealpb-0.5">S/ {activeTotalWithFreight.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto self-end">
                  <button 
                    type="button" 
                    onClick={() => setActiveForm(null)}
                    className="flex-1 sm:flex-initial px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    disabled={isSaving}
                    type="submit" 
                    className="flex-1 sm:flex-initial bg-brand-teal text-white px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-brand-teal/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-brand-teal/20"
                  >
                    {isSaving ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Save size={13} />
                    )}
                    Guardar Consolidado
                  </button>
                </div>
              </div>

            </motion.form>
          ) : viewingOrderDetail ? (
            
            /* 2. SPECIFIC PURCHASE ORDER DETAIL / COPY RECEIPT VIEW */
            <motion.div 
              key="procurement-details"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm max-w-3xl mx-auto w-full flex flex-col overflow-hidden max-h-[82vh] md:max-h-[85vh]"
            >
              <div className="flex justify-between items-start border-b border-slate-100 pb-4 shrink-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                    {viewingOrderDetail.status === 'borrador' ? (
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        ✏️ Lista en Borrador (Poco a poco)
                      </span>
                    ) : viewingOrderDetail.status === 'enviado' ? (
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        📤 Enviado a Proveedor
                      </span>
                    ) : (
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-250">
                        ✅ Recibido en Almacén
                      </span>
                    )}

                    <span className="text-[9px] font-medium text-slate-400 font-mono tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                      ID: {viewingOrderDetail.id}
                    </span>
                  </div>
                  <h3 className="font-black text-slate-950 text-base sm:text-lg tracking-tight leading-tight uppercase">
                    {viewingOrderDetail.supplierName}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-sans mt-0.5 flex gap-3 items-center">
                    <span className="flex items-center gap-1"><Calendar size={11} className="text-slate-400" /> Fecha de Consolidado: {viewingOrderDetail.createdAt ? new Date(viewingOrderDetail.createdAt.seconds * 1000).toLocaleDateString() : 'Borrador'}</span>
                    {viewingOrderDetail.notes && <span className="truncate max-w-xs block">📝 Notas: {viewingOrderDetail.notes}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    type="button"
                    onClick={() => handleCopyOrderSummary(viewingOrderDetail)}
                    className="p-2 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider cursor-pointer"
                    title="Copiar texto formateado para enviar por WhatsApp o Mail"
                  >
                    {copiedOrderId === viewingOrderDetail.id ? (
                      <>
                        <Check size={13} className="text-green-600" />
                        <span className="hidden sm:inline text-green-700">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span className="hidden sm:inline">Copiar WhatsApp</span>
                      </>
                    )}
                  </button>

                  <button 
                    type="button" 
                    onClick={() => handleExportCSV(viewingOrderDetail)}
                    className="p-2 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider cursor-pointer"
                    title="Exportar Pedido de Compra a CSV / Excel"
                  >
                    <FileSpreadsheet size={13} className="text-emerald-600" />
                    <span className="hidden sm:inline">Exportar Excel</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => handleExportPDF(viewingOrderDetail)}
                    disabled={isExporting}
                    className="p-2 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
                    title="Exportar Pedido de Compra a PDF"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="animate-spin text-slate-500" size={13} />
                        <span className="hidden sm:inline">Exportando...</span>
                      </>
                    ) : (
                      <>
                        <FileDown size={13} className="text-brand-teal" />
                        <span className="hidden sm:inline">Exportar PDF</span>
                      </>
                    )}
                  </button>

                  <button 
                    type="button"
                    onClick={() => window.print()}
                    className="p-2 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                    title="Imprimir Pedido"
                  >
                    <Printer size={13} />
                  </button>

                  <button 
                    type="button"
                    onClick={() => setViewingOrderDetail(null)}
                    className="p-2 text-slate-450 hover:bg-slate-50 rounded-xl transition shrink-0"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Receipt Area */}
              <div className="flex-1 flex flex-col min-h-0 py-5 space-y-4">
                
                {/* Printable Format */}
                <div id="procurement-print-box" className="border border-slate-100 rounded-2xl bg-white p-4 flex-1 flex flex-col min-h-0 space-y-4 shadow-xs font-sans print:overflow-visible print:h-auto">
                  
                  {/* Miniature Invoice Header */}
                  <div className="flex justify-between items-start border-b border-slate-50 pb-3 shrink-0">
                    <div>
                      <h4 className="text-[11px] font-black tracking-widest text-brand-teal uppercase">Librería El Estudiante</h4>
                      <p className="text-[9px] text-slate-400 font-mono">REPOSICIÓN DE ALMACÉN</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-400 font-mono uppercase">ESTABILIZADO DE COSTO</p>
                      <p className="text-[10px] font-bold text-slate-800 font-mono">FRENTE TOTAL DE CARGA</p>
                    </div>
                  </div>

                  {/* List of items table style */}
                  <div className="flex-1 overflow-y-auto min-h-[145px] border border-slate-100/50 rounded-xl custom-scrollbar print:overflow-visible print:max-h-none">
                    <table className="w-full text-xs text-left text-slate-600">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-450 uppercase text-[9px] font-black tracking-wider bg-slate-50/50">
                          <th className="py-2 px-2">#</th>
                          <th className="py-2 px-1">SKU</th>
                          <th className="py-2 px-1">Descripción del Producto</th>
                          <th className="py-2 px-1 text-center">Cant.</th>
                          <th className="py-2 px-1 text-right">Costo Unit.</th>
                          <th className="py-2 px-2 text-right">Importe Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-sans">
                        {viewingOrderDetail.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/40">
                            <td className="py-2 px-2 text-slate-450">{idx + 1}</td>
                            <td className="py-2 px-1 font-mono tracking-wider text-[11px] text-slate-500">{it.sku}</td>
                            <td className="py-2 px-1 font-semibold text-slate-800">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                                <span className="truncate max-w-[220px] sm:max-w-[340px]">{it.name}</span>
                                {it.isManual && (
                                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                                    <span className="bg-amber-50 text-amber-700 text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider border border-amber-100 shrink-0">
                                      ✏️ Pregrabado
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleStartOficialize(it, idx)}
                                      className="bg-brand-teal hover:bg-brand-teal/90 text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs transition cursor-pointer flex items-center gap-0.5 shrink-0"
                                      title="Registrar permanentemente en el Catálogo"
                                    >
                                      <Plus size={8} /> Oficiar en Catálogo
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-1 text-center font-bold font-mono text-slate-700">{it.quantity}</td>
                            <td className="py-2 px-1 text-right font-mono text-slate-650">S/ {it.costPrice.toFixed(2)}</td>
                            <td className="py-2 px-2 text-right font-mono font-bold text-slate-800">S/ {(it.costPrice * it.quantity).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pricing recap */}
                  <div className="border-t border-slate-100 pt-3 flex flex-col items-end gap-1.5 shrink-0 bg-white">
                    
                    <div className="flex justify-between w-full max-w-[280px] text-xs text-slate-500">
                      <span>Subtotal de Artículos (Items Cost):</span>
                      <span className="font-mono font-bold text-slate-800">
                        S/ {viewingOrderDetail.items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0).toFixed(2)}
                      </span>
                    </div>

                    {viewingOrderDetail.freightCost ? (
                      <div className="flex justify-between w-full max-w-[280px] text-xs text-slate-500">
                        <span>Costo de Flete consolidado:</span>
                        <span className="font-mono font-bold text-slate-800">
                          S/ {Number(viewingOrderDetail.freightCost).toFixed(2)}
                        </span>
                      </div>
                    ) : null}

                    <div className="flex justify-between w-full max-w-[280px] text-sm border-t border-slate-105 pt-2 uppercase text-slate-900 font-extrabold">
                      <span className="text-brand-orange">PRESUPUESTO TOTAL:</span>
                      <span className="font-mono font-black text-slate-950">
                        S/ {(viewingOrderDetail.items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0) + Number(viewingOrderDetail.freightCost || 0)).toFixed(2)}
                      </span>
                    </div>

                  </div>

                </div>

                {/* Freight consolidation savings banner */}
                <div className="bg-teal-50/50 rounded-2xl border border-teal-100/60 p-3 flex gap-2.5 items-start shrink-0 bg-white">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-xs border border-teal-200/50 text-brand-teal flex items-center justify-center shrink-0">
                    <Truck size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="text-[11px] font-extrabold text-brand-teal uppercase tracking-wide">Flete Consolidado Optimizador</h5>
                    <p className="text-[10px] text-slate-500 font-sans leading-normal">
                      Gracias a consolidar este pedido, reduces los gastos individuales de flete por envío. Has agrupado <span className="font-bold text-slate-700">{viewingOrderDetail.items.length} productos</span> y pagas un único transporte de <span className="font-bold text-slate-700 font-mono">S/ {Number(viewingOrderDetail.freightCost || 0).toFixed(2)}</span>.
                    </p>
                  </div>
                </div>

              </div>

              {/* Details Actions footer */}
              <div className="border-t border-slate-105 pt-3.5 flex justify-end gap-2.5 shrink-0 bg-white">
                <button 
                  onClick={() => handleEdit(viewingOrderDetail)}
                  className="px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Edit2 size={12} /> Modificar Pedido
                </button>
                <button 
                  onClick={() => setViewingOrderDetail(null)}
                  className="px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Regresar
                </button>
              </div>

            </motion.div>
          ) : (
            
            /* 3. WELCOME SCREEN / CHOOSE OPTION INITIAL PLATFORM */
            <motion.div 
              key="procurement-welcome"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-lg mx-auto"
            >
              <div className="w-16 h-16 bg-white border border-slate-100 rounded-3xl flex items-center justify-center shadow-lg text-brand-orange animate-bounce">
                <Truck size={32} />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-black text-slate-900 text-base sm:text-lg uppercase tracking-wider">
                  Módulo de Fletes y Pedidos Consolidados
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 font-sans leading-relaxed">
                  Realizar compras individuales de productos incrementa el costo de flete. Con el consolidador puedes crear canastas de pedidos para cada proveedor y guardarlas para ir añadiendo ítems conforme los vas necesitando.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateNew}
                  className="bg-brand-teal text-white rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-wider hover:bg-brand-teal/90 transition-all flex items-center gap-2 shadow-lg shadow-brand-teal/25 cursor-pointer"
                >
                  <Plus size={16} /> Crear Lista de Pedido
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

      </div>

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmOrder && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-55" id="delete-order-modal">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-md w-full overflow-hidden"
            >
              <div className="p-5 flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center text-rose-500">
                  <Trash2 size={24} />
                </div>
                
                <div className="space-y-1.5">
                  <h4 className="font-black text-slate-900 text-sm sm:text-base uppercase tracking-wider">
                    ¿Confirmar Eliminación?
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-sans">
                    ¿Estás seguro de que deseas eliminar permanentemente este pedido consolidado? No podrás recuperar la lista de productos acumulada.
                  </p>
                </div>

                {/* Pedido Info Badge */}
                <div className="bg-slate-50 rounded-2xl p-3.5 w-full text-left border border-slate-100/50">
                  <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">PROVEEDOR</p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5 truncate">{deleteConfirmOrder.supplierName || 'N/A'}</p>
                  
                  <div className="flex justify-between items-center mt-2.5 pt-2.5 border-t border-slate-200/50 text-xs">
                    <span className="text-slate-450 font-sans">Productos Registrados:</span>
                    <span className="font-mono font-bold text-slate-700">{deleteConfirmOrder.items?.length || 0} ítems</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 w-full pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmOrder(null)}
                    className="flex-1 py-3 border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider rounded-2xl hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-rose-600/20 transition cursor-pointer"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Product Officialization Modal */}
      <AnimatePresence>
        {oficializeTarget && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-[110]" id="oficialize-product-modal">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-brand-teal text-white rounded-xl flex items-center justify-center">
                    <Package size={18} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">
                      Oficializar en Catálogo
                    </h4>
                    <p className="text-[10px] text-slate-450 font-sans">Convertir pregrabado a producto oficial de inventario</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOficializeTarget(null)}
                  className="p-1 px-2.5 hover:bg-slate-200 text-slate-500 rounded-lg text-xs"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleConfirmOficialize} className="p-5 space-y-4 font-sans text-xs">
                
                {/* Product Name (Read-only status card) */}
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100/50 text-left">
                  <span className="text-[8px] uppercase tracking-widest font-black text-slate-400">Nombre del Producto nuevo</span>
                  <p className="font-black text-slate-800 text-sm mt-0.5 leading-tight">{oficializeTarget.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-3.5 text-left">
                  {/* SKU */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-450 block">Código / SKU de Barras</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-brand-teal font-mono font-bold"
                      value={oficializeSku}
                      onChange={e => setOficializeSku(e.target.value)}
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-450 block">Categoría de Catálogo</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 outline-none focus:border-brand-teal font-semibold capitalize"
                      value={oficializeCategory}
                      onChange={e => setOficializeCategory(e.target.value)}
                    >
                      <option value="utiles">🎯 Útiles escolares</option>
                      <option value="libros">📚 Libros u obras</option>
                      <option value="tecnologia">💻 Tecnología / Oficina</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5 text-left">
                  {/* Cost Price */}
                  <div className="space-y-1 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 text-left">
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Precio de Costo (Pedido)</label>
                    <p className="font-mono font-bold text-slate-700 text-sm">S/ {oficializeTarget.costPrice.toFixed(2)}</p>
                  </div>

                  {/* Selling Price */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-brand-teal block">Precio de Venta Catálogo (S/.)</label>
                    <input
                      type="number"
                      min={oficializeTarget.costPrice}
                      step="any"
                      required
                      className="w-full bg-white border border-brand-teal/50 rounded-xl px-3 py-2 outline-none focus:border-brand-teal font-mono font-bold text-brand-teal shadow-xs"
                      value={oficializePrice}
                      onChange={e => setOficializePrice(Number(e.target.value))}
                    />
                    <p className="text-[8px] text-slate-400">Sugerido con ~40% de margen</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5 text-left">
                  {/* Brand / Author */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-450 block">Marca o Autor</label>
                    <input
                      type="text"
                      placeholder="Ej. Fabio, Faber Castell, N/A"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-brand-teal font-semibold"
                      value={oficializeBrand}
                      onChange={e => setOficializeBrand(e.target.value)}
                    />
                  </div>

                  {/* Stock */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-450 block">Stock Inicial en Almacén</label>
                    <input
                      type="number"
                      min="0"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-brand-teal font-mono font-bold text-slate-700"
                      value={oficializeStock}
                      onChange={e => setOficializeStock(Number(e.target.value))}
                    />
                    <p className="text-[8px] text-slate-450">Precargado de la cantidad pedida</p>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-3 border-t border-slate-50">
                  <button
                    type="button"
                    onClick={() => setOficializeTarget(null)}
                    className="flex-1 py-3 border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider rounded-2xl hover:bg-slate-50 transition cursor-pointer"
                  >
                    Salir
                  </button>
                  <button
                    type="submit"
                    disabled={oficializeSaving}
                    className="flex-1 py-3 bg-brand-teal hover:bg-brand-teal/90 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-brand-teal/20 transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    {oficializeSaving ? (
                      <>
                        <Loader2 size={13} className="animate-spin" /> Guardando...
                      </>
                    ) : (
                      <>
                        <Save size={13} /> Guardar Oficial
                      </>
                    )}
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
