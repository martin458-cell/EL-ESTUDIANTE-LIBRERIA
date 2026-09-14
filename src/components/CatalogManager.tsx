import React, { useState, useRef, useMemo } from 'react';
import { 
  Plus, Edit2, Trash2, X, Save, Search, Package, Check, FileDown, 
  UploadCloud, Loader2, Briefcase, Users, Truck, TrendingUp, AlertTriangle, 
  FileSpreadsheet, Layers, Activity, AlertCircle, XCircle, CheckCircle2, Coins, FileText,
  Tv, Menu, ChevronRight, LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../hooks/useProducts';
import { CatalogService } from '../services/catalogService';
import { normalizeProductImageUrl, handleImageError } from '../utils/imageUtils';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { ProductQuoter } from './ProductQuoter';
import { SupplierManager } from './SupplierManager';
import { ClientManager } from './ClientManager';
import { PurchaseOrderManager } from './PurchaseOrderManager';
import { DebtorManager } from './DebtorManager';
import { SalesNoteManager } from './SalesNoteManager';
import { ServicesCalculator } from './ServicesCalculator';
import { NetflixManager } from './NetflixManager';

interface ExcelValidationIssue {
  row: number;
  itemIdentifier: string;
  type: 'error' | 'warning';
  description: string;
}

interface ExcelReport {
  fileName: string;
  totalRows: number;
  validProducts: Partial<Product>[];
  invalidProductsCount: number;
  issues: ExcelValidationIssue[];
}

const parseCurrency = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  
  let str = String(val).trim();
  // Remove currency symbol/abbreviation prefixes (S/, S/., $, soles, USD, etc.)
  str = str.replace(/[sS]\/\.?/g, '') // remove S/ or S/.
           .replace(/[$]/g, '')        // remove $
           .replace(/soles/gi, '')     // remove "soles"
           .trim();
  
  // Handle commas as decimal separators (e.g. 12,50 or 1.200,50)
  if (str.includes(',') && str.includes('.')) {
    const commaIndex = str.indexOf(',');
    const periodIndex = str.indexOf('.');
    if (commaIndex < periodIndex) {
      str = str.replace(/,/g, ''); // Comma is thousand delimiter (1,234.56)
    } else {
      str = str.replace(/\./g, '').replace(/,/g, '.'); // Period is thousand, comma is decimal (1.234,56)
    }
  } else if (str.includes(',')) {
    // If only comma exists (e.g. 12,50 vs 1,234)
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length === 2) {
      str = str.replace(/,/g, '.'); // E.g. 12,50 -> 12.50
    } else if (parts.length === 2 && parts[1].length === 1) {
      str = str.replace(/,/g, '.'); // E.g. 12,5 -> 12.5
    } else {
      str = str.replace(/,/g, ''); // Assume thousand separator E.g. 1,000 -> 1000
    }
  }
  
  // Strip any other non-numeric character except signs
  str = str.replace(/[^\d.-]/g, '');
  const result = parseFloat(str);
  return isNaN(result) ? 0 : result;
};

const parseQuantity = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return Math.floor(val);
  
  let str = String(val).trim().replace(/[^\d.-]/g, '');
  const result = parseInt(str, 10);
  return isNaN(result) ? 0 : result;
};

interface CatalogManagerProps {
  products: Product[];
  onClose: () => void;
}

export const CatalogManager: React.FC<CatalogManagerProps> = ({ products, onClose }) => {
  const [activeTab, setActiveTab ] = useState<'catalog' | 'quoter' | 'suppliers' | 'clients' | 'purchaseOrders' | 'debtors' | 'salesNotes' | 'services' | 'netflix'>('catalog');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const ADMIN_NAV_SECTIONS = [
    {
      title: 'Operaciones y Ventas',
      items: [
        { id: 'catalog' as const, buttonId: 'admin-catalog-tab-button', label: 'Inventario', desc: 'Stock y Catálogo', icon: Package },
        { id: 'quoter' as const, buttonId: 'admin-quoter-tab-button', label: 'Cotizador PDF', desc: 'Proformas Oficiales', icon: FileDown },
        { id: 'salesNotes' as const, buttonId: 'admin-sales-notes-tab-button', label: 'Nota de Venta', desc: 'Emisión y Boletas', icon: FileText },
      ]
    },
    {
      title: 'Gestión Comercial',
      items: [
        { id: 'clients' as const, buttonId: 'admin-clients-tab-button', label: 'Clientes', desc: 'Directorio y Registro', icon: Users },
        { id: 'suppliers' as const, buttonId: 'admin-suppliers-tab-button', label: 'Proveedores', desc: 'Catálogo de Compras', icon: Briefcase },
        { id: 'purchaseOrders' as const, buttonId: 'admin-procurements-tab-button', label: 'Pedidos de Compra', desc: 'Abastecimiento', icon: Truck },
        { id: 'debtors' as const, buttonId: 'admin-debtors-tab-button', label: 'Deudores a Crédito', desc: 'Cuentas por Cobrar', icon: Coins },
      ]
    },
    {
      title: 'Servicios y Otros',
      items: [
        { id: 'services' as const, buttonId: 'admin-services-tab-button', label: 'Servicios y Extras', desc: 'Calculadora de Costos', icon: Activity },
        { id: 'netflix' as const, buttonId: 'admin-netflix-tab-button', label: 'Netflix 2026', desc: 'Cuentas y Pantallas', icon: Tv },
      ]
    }
  ];

  const activeModuleInfo = useMemo(() => {
    for (const section of ADMIN_NAV_SECTIONS) {
      const found = section.items.find(item => item.id === activeTab);
      if (found) return found;
    }
    return ADMIN_NAV_SECTIONS[0].items[0];
  }, [activeTab]);

  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  // Excel matching interactive state
  const [excelRows, setExcelRows] = useState<any[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelFileName, setExcelFileName] = useState<string>('');
  const [columnMapping, setColumnMapping] = useState({
    skuIdx: 0,
    nameIdx: 1,
    priceIdx: 2,
    stockIdx: 3,
    catIdx: 4,
    imgIdx: 5,
    brandIdx: 6,
  });
  
  const [reportTab, setReportTab] = useState<'preview' | 'issues'>('preview');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for duplicate/triplicate removal manager
  const [showDuplicateManager, setShowDuplicateManager] = useState(false);
  const [duplicateGroupCriterion, setDuplicateGroupCriterion] = useState<'sku' | 'name'>('sku');
  const [idsToDelete, setIdsToDelete] = useState<Set<string>>(new Set());
  const [isDeletingDuplicates, setIsDeletingDuplicates] = useState(false);

  const excelReport = React.useMemo(() => {
    if (excelRows.length === 0) return null;

    const issues: ExcelValidationIssue[] = [];
    const validProducts: Partial<Product>[] = [];
    const seenSKUsInExcel = new Set<string>();
    const dbSkus = new Set(products.map(p => String(p.sku || '').toLowerCase().trim()));

    excelRows.forEach((row, idx) => {
      if (!Array.isArray(row) || row.length === 0) return;
      
      const excelRowNumber = idx + 2; // Rows starts counting after headers
      
      // Safe column extracts using current mapping indices
      const rawSku = String(row[columnMapping.skuIdx] !== undefined && row[columnMapping.skuIdx] !== null ? row[columnMapping.skuIdx] : '').trim();
      const rawName = String(row[columnMapping.nameIdx] !== undefined && row[columnMapping.nameIdx] !== null ? row[columnMapping.nameIdx] : '').trim();
      const rawBrand = columnMapping.brandIdx !== undefined ? String(row[columnMapping.brandIdx] !== undefined && row[columnMapping.brandIdx] !== null ? row[columnMapping.brandIdx] : '').trim() : '';
      
      const rawPriceVal = row[columnMapping.priceIdx];
      const rawStockVal = row[columnMapping.stockIdx];
      const rawCatVal = row[columnMapping.catIdx];
      const rawImgVal = row[columnMapping.imgIdx];
      
      let rowHasError = false;
      const itemIdentifier = rawName || rawSku || `Fila ${excelRowNumber}`;

      // Validate SKU
      if (!rawSku) {
        issues.push({
          row: excelRowNumber,
          itemIdentifier,
          type: 'error',
          description: 'El Código/SKU está vacío. Cada producto requiere un código para guardarse.'
        });
        rowHasError = true;
      } else {
        const skuLower = rawSku.toLowerCase();
        if (seenSKUsInExcel.has(skuLower)) {
          issues.push({
            row: excelRowNumber,
            itemIdentifier,
            type: 'error',
            description: `Código SKU '${rawSku}' duplicado dentro del mismo archivo Excel.`
          });
          rowHasError = true;
        } else {
          seenSKUsInExcel.add(skuLower);
          if (dbSkus.has(skuLower)) {
            issues.push({
              row: excelRowNumber,
              itemIdentifier,
              type: 'warning',
              description: `El Código SKU '${rawSku}' ya existe en el inventario actual (se sobreescribirá/actualizará al guardar).`
            });
          }
        }
      }

      // Validate Name
      if (!rawName) {
        issues.push({
          row: excelRowNumber,
          itemIdentifier,
          type: 'error',
          description: 'El Nombre del producto está vacío.'
        });
        rowHasError = true;
      }

      // Validate Price
      let price = 0;
      if (rawPriceVal !== undefined && rawPriceVal !== null && rawPriceVal !== '') {
        const parsedPrice = parseCurrency(rawPriceVal);
        if (parsedPrice < 0) {
          issues.push({
            row: excelRowNumber,
            itemIdentifier,
            type: 'error',
            description: `El precio no puede ser negativo (valor actual: S/ ${parsedPrice.toFixed(2)}).`
          });
          rowHasError = true;
        } else {
          price = parsedPrice;
          if (price > 100000) {
            issues.push({
              row: excelRowNumber,
              itemIdentifier,
              type: 'warning',
              description: `El precio de venta ingresado es inusualmente alto (S/ ${price.toFixed(2)}).`
            });
          }
        }
      } else {
        issues.push({
          row: excelRowNumber,
          itemIdentifier,
          type: 'warning',
          description: `El campo de precio está vacío o no se ha podido leer de la columna seleccionada. Se guardará con S/ 0.00.`
        });
      }

      // Validate Stock
      let stock = 0;
      if (rawStockVal !== undefined && rawStockVal !== null && rawStockVal !== '') {
        const parsedStock = parseQuantity(rawStockVal);
        if (parsedStock < 0) {
          issues.push({
            row: excelRowNumber,
            itemIdentifier,
            type: 'error',
            description: `El stock inicial no puede ser negativo (valor actual: ${parsedStock}).`
          });
          rowHasError = true;
        } else {
          stock = parsedStock;
        }
      }

      // Normalize custom catalog categories for the database
      let category = String(rawCatVal !== undefined && rawCatVal !== null ? rawCatVal : 'utiles').toLowerCase().trim();
      if (category.includes('libro') || category.includes('text') || category.includes('lect') || category.includes('educ')) {
        category = 'libros';
      } else if (category.includes('tec') || category.includes('comp') || category.includes('elec') || category.includes('tablet') || category.includes('cel')) {
        category = 'tecnologia';
      } else {
        category = 'utiles';
      }

      // Normalize image URL (resolving Google Drive, Dropbox, etc.)
      const rawImgStr = rawImgVal !== undefined && rawImgVal !== null ? String(rawImgVal).trim() : '';
      const imageUrl = normalizeProductImageUrl(rawImgStr, category);

      if (!rowHasError) {
        validProducts.push({
          sku: rawSku,
          name: rawName,
          price: price,
          stock: stock,
          imageUrl: imageUrl,
          category: category,
          authorOrBrand: rawBrand || ''
        });
      }
    });

    return {
      fileName: excelFileName,
      totalRows: excelRows.filter(r => Array.isArray(r) && r.length > 0).length,
      validProducts,
      invalidProductsCount: excelRows.filter(r => Array.isArray(r) && r.length > 0).length - validProducts.length,
      issues
    };
  }, [excelRows, columnMapping, excelFileName, products]);

  const categories = ['libros', 'utiles', 'tecnologia'];

  // Advanced Interactive Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStockFilter, setSelectedStockFilter] = useState<string>('all');

  // KPI computations
  const totalItemsCount = products.length;
  const outOfStockCount = products.filter(p => (p.stock || 0) === 0).length;
  const lowStockCount = products.filter(p => (p.stock || 0) <= (p.minStock || 5) && (p.stock || 0) > 0).length;
  const totalInventoryValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0);

  // Advanced Filtering
  const filtered = products.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.authorOrBrand || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
                            (p.category || 'utiles').toLowerCase() === selectedCategory.toLowerCase();
    
    let matchesStock = true;
    if (selectedStockFilter === 'low') {
      matchesStock = (p.stock || 0) <= (p.minStock || 5) && (p.stock || 0) > 0;
    } else if (selectedStockFilter === 'out') {
      matchesStock = (p.stock || 0) === 0;
    } else if (selectedStockFilter === 'offer') {
      matchesStock = !!p.isOffer;
    }
    
    return matchesSearch && matchesCategory && matchesStock;
  });

  // Action function to export the complete catalog to Excel
  const handleExportAllToExcel = () => {
    try {
      const dataToExport = products.map((p, idx) => ({
        "N°": idx + 1,
        "SKU / Código": p.sku || 'S/N',
        "Nombre del Producto": p.name || 'Sin nombre',
        "Marca / Editorial": p.authorOrBrand || 'N/A',
        "Categoría": p.category ? p.category.toUpperCase() : 'ÚTILES',
        "Costo de Compra (S/)": p.costPrice || 0,
        "Precio de Venta (S/)": p.price || 0,
        "Stock Actual": p.stock || 0,
        "Stock Mínimo Alerta": p.minStock || 5,
        "Estado": (p.stock || 0) === 0 ? "AGOTADO" : (p.stock || 0) <= (p.minStock || 5) ? "STOCK BAJO" : "SUFICIENTE",
        "En Oferta": p.isOffer ? "SÍ" : "NO",
        "Precio Oferta (S/)": p.isOffer && p.offerPrice ? p.offerPrice : ""
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Catálogo");
      
      // Auto-fit column widths
      const max_len = dataToExport.reduce((w, r) => Math.max(w, String(r["Nombre del Producto"]).length), 15);
      worksheet["!cols"] = [ 
        { wch: 4 }, { wch: 15 }, { wch: Math.min(35, max_len) }, { wch: 12 }, 
        { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 15 } 
      ];

      XLSX.writeFile(workbook, `catalogo_inventario_estudiante_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error(err);
      alert("No se pudo exportar el catálogo a Excel.");
    }
  };

  // Helper to generate the next sequential SKU code like 001, 002...
  const getNextSequentialSKU = () => {
    let maxNum = 0;
    products.forEach(p => {
      if (p.sku) {
        // Find trailing digits or any numeric sequence in SKU
        const matches = p.sku.match(/\d+/g);
        if (matches) {
          matches.forEach(m => {
            const num = parseInt(m, 10);
            if (num > maxNum) {
              maxNum = num;
            }
          });
        }
      }
    });
    const nextNum = maxNum + 1;
    // Pad to 3 digits (e.g., 001, 012, 104)
    return String(nextNum).padStart(3, '0');
  };

  // Helper to load image securely as Base64 or fallback
  const getBase64ImageFromUrl = async (rawUrl: string): Promise<string | null> => {
    const url = normalizeProductImageUrl(rawUrl);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 sec timeout
      
      const res = await fetch(url, { referrerPolicy: 'no-referrer', signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error("Fetch failed");
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.referrerPolicy = 'no-referrer';
        const timer = setTimeout(() => {
          img.src = '';
          resolve(null);
        }, 5000);

        img.onload = () => {
          clearTimeout(timer);
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/jpeg', 0.8));
              return;
            }
          } catch (e) {
            console.error("Canvas conversion failed:", e);
          }
          resolve(null);
        };
        img.onerror = () => {
          clearTimeout(timer);
          resolve(null);
        };
        img.src = url;
      });
    }
  };

  // Action function to export the database catalog as a premium designed PDF with descriptive boxes
  const handleExportPDFCatalog = async () => {
    try {
      const pdfProducts = products;
      if (pdfProducts.length === 0) {
        alert("No hay productos en la base de datos para generar el catálogo en PDF.");
        return;
      }

      setIsExportingPDF(true);

      // Preload product images in background batches to prevent performance locks
      const imagesMap = new Map<string, string | null>();
      const batchSize = 15;
      for (let i = 0; i < pdfProducts.length; i += batchSize) {
        const batch = pdfProducts.slice(i, i + batchSize);
        await Promise.all(batch.map(async (p) => {
          if (p.imageUrl && p.imageUrl.trim() !== '') {
            try {
              const base64 = await getBase64ImageFromUrl(p.imageUrl);
              imagesMap.set(p.id, base64);
            } catch (e) {
              imagesMap.set(p.id, null);
            }
          } else {
            imagesMap.set(p.id, null);
          }
        }));
      }

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const totalItems = pdfProducts.length;
      const lowStock = pdfProducts.filter(p => (p.stock || 0) <= (p.minStock || 5) && (p.stock || 0) > 0).length;
      const outOfStock = pdfProducts.filter(p => (p.stock || 0) === 0).length;

      let currentPage = 1;

      // Draw header template function
      const drawHeader = (pageNum: number) => {
        // Top solid layout banner
        doc.setFillColor(13, 148, 136); // Teal #0D9488
        doc.rect(0, 0, 210, 14, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.text("LIBRERÍA EL ESTUDIANTE · CATÁLOGO ILUSTRADO DE ARTÍCULOS", 15, 9);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(`Generado el: ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE', {hour: '2-digit', minute:'2-digit'})}`, 152, 9);

        if (pageNum === 1) {
          // Main decorative header card on the first page
          doc.setFillColor(248, 250, 252); // slate 50
          doc.roundedRect(15, 20, 180, 23, 3, 3, 'F');
          doc.setDrawColor(241, 245, 249); // slate 100
          doc.roundedRect(15, 20, 180, 23, 3, 3, 'S');

          doc.setTextColor(15, 23, 42); // slate 900
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(13);
          doc.text("CATÁLOGO OFICIAL ILUSTRADO", 21, 27);
          
          doc.setFont('Helvetica', 'normal');
          doc.setTextColor(100, 116, 139); // slate 500
          doc.setFontSize(8);
          doc.text("Catálogo visual de inventario con fotografía de producto, stock actual e indicador de alertas en tiempo real.", 21, 32);
          doc.text("Establecimiento: Almacén Central Puente Piedra / Puquio", 21, 36);

          // Render micro stats on top right of the cover page header
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(132, 23, 58, 17, 2, 2, 'F');
          doc.setDrawColor(226, 232, 240); // slate 200
          doc.roundedRect(132, 23, 58, 17, 2, 2, 'S');

          doc.setTextColor(51, 65, 85);
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(7);
          doc.text(`TOTAL CATÁLOGO:`, 135, 27);
          doc.setFont('Helvetica', 'normal');
          doc.text(`${totalItems} Ítems`, 164, 27);

          doc.setTextColor(180, 83, 9); // amber 700
          doc.setFont('Helvetica', 'bold');
          doc.text(`STOCK CRÍTICO:`, 135, 31);
          doc.setFont('Helvetica', 'normal');
          doc.text(`${lowStock} Items`, 164, 31);

          doc.setTextColor(185, 28, 28); // rose 700
          doc.setFont('Helvetica', 'bold');
          doc.text(`AGOTADOS:`, 135, 35);
          doc.setFont('Helvetica', 'normal');
          doc.text(`${outOfStock} Items`, 164, 35);
        }
      };

      const drawFooter = (pageNum: number) => {
        doc.setDrawColor(226, 232, 240);
        doc.line(15, 284, 195, 284);
        doc.setTextColor(148, 163, 184); // slate 400
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7);
        doc.text("Librería El Estudiante - Catálogo oficial e ilustrado con base de datos unificada", 15, 288);
        doc.text(`Página ${pageNum}`, 188, 288);
      };

      // Set up page 1
      drawHeader(currentPage);
      drawFooter(currentPage);

      // Design metrics for 4-column-per-row layout matching screen grid exactly
      const marginX = 11.55;
      const columnWidth = 43.5;
      const columnSpacing = 4.3;
      const cardHeight = 55;
      const cardSpacingY = 3.5;

      let x = marginX;
      let y = 46; // Starts below descriptive card header on page 1
      let colIdx = 0; // 0 to 3 columns

      pdfProducts.forEach((p, idx) => {
        // Render card background
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.15);
        doc.roundedRect(x, y, columnWidth, cardHeight, 3, 3, 'FD');

        const minS = p.minStock || 5;
        const currentS = p.stock || 0;
        const isOut = currentS === 0;
        const isCritical = currentS <= minS && currentS > 0;

        // Subtle decorative accent band at the top of each card representing stock level
        if (isOut) {
          doc.setFillColor(239, 68, 68); // Rose red for Out of stock
        } else if (isCritical) {
          doc.setFillColor(245, 158, 11); // Amber yellow for low stock
        } else {
          doc.setFillColor(13, 148, 136); // Teal for good stock
        }
        doc.rect(x + 1.2, y + 1.2, columnWidth - 2.4, 1.2, 'F');

        // Draw Product Image frame / container
        doc.setFillColor(248, 250, 252); // slate 50 container background
        doc.setDrawColor(241, 245, 249); // slate 100 border
        doc.roundedRect(x + 3.5, y + 4.5, columnWidth - 7, 21, 1.5, 1.5, 'FD');

        // Draw fetched Image or initials fallback
        const imgBase64 = imagesMap.get(p.id);
        if (imgBase64) {
          try {
            doc.addImage(imgBase64, 'JPEG', x + 4, y + 5, columnWidth - 8, 20, undefined, 'FAST');
          } catch (immErr) {
            console.error("Failed to render product image in PDF:", immErr);
            doc.setTextColor(203, 213, 225);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(14);
            doc.text((p.name || 'P').trim().charAt(0).toUpperCase(), x + (columnWidth/2) - 2.5, y + 16.5);
          }
        } else {
          // Draw category abbreviation as icon placeholder
          doc.setTextColor(191, 219, 254); // slate/blue 200
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(11);
          const firstChar = (p.name || 'P').trim().charAt(0).toUpperCase();
          doc.text(firstChar, x + (columnWidth/2) - 1.8, y + 15.5);
          
          doc.setTextColor(148, 163, 184); // slate 400
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(5);
          doc.text("Sin Foto", x + (columnWidth/2) - 3.2, y + 19.5);
        }

        // Draw Product Title with split size matching 4 columns
        doc.setTextColor(15, 23, 42); // slate 900
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(6.4);
        const titleLines = doc.splitTextToSize(p.name || 'Sin Nombre', columnWidth - 6);
        const topLines = titleLines.slice(0, 2);
        if (topLines.length > 0) doc.text(topLines[0], x + 3.5, y + 28.5);
        if (topLines.length > 1) {
          doc.text(topLines[1], x + 3.5, y + 31.5);
        }

        // Draw Code / SKU and Category
        doc.setTextColor(148, 163, 184); // slate 400
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(5.2);
        doc.text(`CÓD: ${p.sku || 'S/N'}`, x + 3.5, y + 35.5);

        doc.setTextColor(100, 116, 139); // slate 500
        doc.setFont('Helvetica', 'normal');
        const brandLabel = p.authorOrBrand ? ` / ${p.authorOrBrand.toUpperCase().substring(0, 16)}` : '';
        doc.text(`CAT: ${(p.category || 'Útiles').toUpperCase()}${brandLabel}`, x + 3.5, y + 38);

        // Render stock level status with micro horizontal progress line
        const statusColor = isOut ? [220, 38, 38] : isCritical ? [180, 83, 9] : [13, 148, 136];
        doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(5.2);
        doc.text(`Stock: ${currentS} / ${minS}`, x + 3.5, y + 42);

        // Progress bar background track
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(x + 3.5, y + 43.5, columnWidth - 7, 1.2, 0.4, 0.4, 'F');

        // Progress bar core fill representing current ratio
        const pct = Math.min(100, Math.max(0, (currentS / Math.max(1, minS * 4)) * 100));
        if (pct > 0) {
          const fillW = ((columnWidth - 7) * pct) / 100;
          doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
          doc.roundedRect(x + 3.5, y + 43.5, fillW, 1.2, 0.4, 0.4, 'F');
        }

        // Price details
        doc.setTextColor(100, 116, 139);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(5.2);
        doc.text("PRECIO VENTA", x + 3.5, y + 49.5);

        doc.setTextColor(15, 23, 42);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text(`S/ ${(p.price || 0).toFixed(2)}`, x + 3.5, y + 53.2);

        // Special dynamic offer overlay inside card
        if (p.isOffer && p.offerPrice) {
          // Cross off normal price
          doc.setDrawColor(148, 163, 184);
          doc.line(x + 3.5, y + 52, x + 11.5, y + 52);

          // Draw promo badge
          doc.setFillColor(204, 251, 241); // Teal 100 bg
          doc.rect(x + 22, y + 47.5, columnWidth - 22 - 3.5, 3, 'F');
          doc.setTextColor(13, 148, 136); // Teal text
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(4.5);
          doc.text("PROMO %", x + 23, y + 49.8);

          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(7.8);
          doc.text(`S/ ${p.offerPrice.toFixed(2)}`, x + 22, y + 53.2);
        } else if (p.costPrice !== undefined && p.costPrice > 0) {
          // Discreet purchase cost indicator inside card
          doc.setTextColor(156, 163, 175); // gray 400
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(5.2);
          doc.text(`Comp: S/${p.costPrice.toFixed(2)}`, x + 21, y + 53.2);
        }

        // Increment position mathematically
        if (colIdx < 3) {
          // Move laterally to next column
          colIdx++;
          x = marginX + colIdx * (columnWidth + columnSpacing);
        } else {
          // Carriage return to next row
          colIdx = 0;
          x = marginX;
          y += cardHeight + cardSpacingY;

          // Process Page break automatically
          const limitY = currentPage === 1 ? 222 : 232;
          if (y > limitY && idx < pdfProducts.length - 1) {
            currentPage++;
            doc.addPage();
            drawHeader(currentPage);
            drawFooter(currentPage);
            x = marginX;
            y = 19; // Reset Y positioning on new pages
            colIdx = 0;
          }
        }
      });

      doc.save(`catalogo_ilustrado_el_estudiante_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("Error al exportar Catálogo PDF:", err);
      alert("No se pudo generar el catálogo de productos en formato PDF.");
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result;
        if (!arrayBuffer) throw new Error("No se pudo leer el contenido del archivo.");
        
        const dataBytes = new Uint8Array(arrayBuffer as ArrayBuffer);
        const wb = XLSX.read(dataBytes, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[];

        if (!data || data.length === 0) {
          alert("El archivo Excel seleccionado está vacío.");
          return;
        }

        // Find the best header row dynamically by searching for score of candidate keywords
        let headerRowIndex = 0;
        let maxScore = 0;
        const keywords = ['sku', 'codigo', 'código', 'nombre', 'producto', 'precio', 'price', 'stock', 'cantidad', 'categoria', 'categoría', 'imagen', 'foto'];
        
        const scanRowsLimit = Math.min(data.length, 10);
        for (let r = 0; r < scanRowsLimit; r++) {
          const row = data[r];
          if (!Array.isArray(row)) continue;
          let score = 0;
          row.forEach(cell => {
            const valStr = String(cell || '').toLowerCase().trim();
            if (keywords.some(kw => valStr.includes(kw))) {
              score++;
            }
          });
          if (score > maxScore) {
            maxScore = score;
            headerRowIndex = r;
          }
        }

        const headerRow = data[headerRowIndex] || [];
        // Format headers beautifully with excel column letters A, B, C...
        const colLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
        const loadedHeaders = headerRow.map((cell: any, idx: number) => {
          const letter = colLetters[idx] || `${idx + 1}`;
          const text = String(cell || '').trim();
          return text ? `Columna ${letter} [${text}]` : `Columna ${letter} (Fila sin título)`;
        });

        const normalizedHeaders = headerRow.map((cell: any) => String(cell || '').toLowerCase().trim());

        // Find matches for each property with smart string indices
        let skuIdx = normalizedHeaders.findIndex((h: string) => 
          h.includes('sku') || h.includes('codigo') || h.includes('código') || h.includes('cod') || h.includes('cód') || h.includes('referencia') || h.includes('ref') || h.includes('id')
        );
        let nameIdx = normalizedHeaders.findIndex((h: string) => 
          h.includes('nombre') || h.includes('producto') || h.includes('name') || h.includes('descrip') || h.includes('articulo') || h.includes('artículo') || h.includes('título') || h.includes('titulo')
        );
        let priceIdx = normalizedHeaders.findIndex((h: string) => 
          h.includes('precio') || h.includes('price') || h.includes('venta') || h.includes('costo') || h.includes('cost') || h.includes('pvp') || h.includes('p.v.p')
        );
        let stockIdx = normalizedHeaders.findIndex((h: string) => 
          h.includes('stock') || h.includes('cantidad') || h.includes('cant') || h.includes('inventario') || h.includes('unidades') || h.includes('units') || h.includes('existenci')
        );
        let imgIdx = normalizedHeaders.findIndex((h: string) => 
          h.includes('imagen') || h.includes('url') || h.includes('foto') || h.includes('image') || h.includes('img')
        );
        let catIdx = normalizedHeaders.findIndex((h: string) => 
          h.includes('categoria') || h.includes('categoría') || h.includes('category') || h.includes('grupo') || h.includes('tipo')
        );
        let brandIdx = normalizedHeaders.findIndex((h: string) => 
          h.includes('marca') || h.includes('brand') || h.includes('editorial') || h.includes('autor') || h.includes('author') || h.includes('editora')
        );

        // Fallbacks if not recognized automatically
        if (skuIdx === -1) skuIdx = 0;
        if (nameIdx === -1) nameIdx = Math.min(1, headerRow.length - 1);
        if (priceIdx === -1) priceIdx = Math.min(2, headerRow.length - 1);
        if (stockIdx === -1) stockIdx = Math.min(3, headerRow.length - 1);
        if (catIdx === -1) catIdx = Math.min(4, headerRow.length - 1);
        if (imgIdx === -1) imgIdx = Math.min(5, headerRow.length - 1);
        if (brandIdx === -1) brandIdx = Math.min(6, headerRow.length - 1);

        const rows = data.slice(headerRowIndex + 1);

        setExcelHeaders(loadedHeaders);
        setExcelFileName(file.name);
        setColumnMapping({
          skuIdx,
          nameIdx,
          priceIdx,
          stockIdx,
          catIdx,
          imgIdx,
          brandIdx
        });
        setExcelRows(rows);

      } catch (err: any) {
        console.error("Error al procesar e importar Excel:", err);
        alert("Ocurrió un error al procesar el archivo Excel. Asegúrate de seguir un formato correcto.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleCancelExcel = () => {
    setExcelRows([]);
    setExcelHeaders([]);
    setExcelFileName('');
  };

  const handleConfirmImport = async () => {
    if (!excelReport) return;
    if (excelReport.validProducts.length === 0) {
      alert("No hay ningún producto válido que importar.");
      return;
    }

    setIsSaving(true);
    try {
      await CatalogService.bulkSaveProducts(excelReport.validProducts);
      alert(`¡Éxito! Se han importado e incorporado ${excelReport.validProducts.length} productos válidos al inventario.`);
      handleCancelExcel();
    } catch (err: any) {
      console.error("Error al importar productos masivamente:", err);
      let errorMsg = "Ocurrió un error al guardar los productos en la base de datos.";
      if (err && err.message) {
        if (err.message.toLowerCase().includes("permission") || err.message.toLowerCase().includes("insufficient")) {
          errorMsg = "Error de Permisos: No tienes los privilegios de Administrador necesarios en la base de datos de Firestore.";
        } else {
          errorMsg = `Error de Base de Datos:\n${err.message}`;
        }
      }
      alert(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const productImageInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de tipo imagen (PNG, JPG, WEBP, etc.)');
      return;
    }

    setIsUploadingImage(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 450;
        const MAX_HEIGHT = 450;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
        if (editingProduct) {
          setEditingProduct({
            ...editingProduct,
            imageUrl: compressedBase64
          });
        }
        setIsUploadingImage(false);
      };
      img.onerror = () => {
        alert('Error al leer la imagen.');
        setIsUploadingImage(false);
      };
    };
    reader.onerror = () => {
      alert('Error en la lectura del archivo.');
      setIsUploadingImage(false);
    };
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || !editingProduct?.sku) {
      alert("Nombre y Código son obligatorios");
      return;
    }

    setIsSaving(true);
    try {
      const productToSave = {
        ...editingProduct,
        imageUrl: normalizeProductImageUrl(editingProduct.imageUrl, editingProduct.category)
      };
      await CatalogService.saveProduct(productToSave);
      setEditingProduct(null);
    } catch (error) {
      console.error(error);
      alert("Error al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Está seguro de que desea eliminar este producto de forma permanente del inventario?")) {
      try {
        await CatalogService.deleteProduct(id);
      } catch (error: any) {
        console.error("Error al eliminar el producto:", error);
        let errorMsg = "Ocurrió un error al intentar eliminar el producto.";
        try {
          const parsed = JSON.parse(error.message);
          if (parsed && parsed.error && (parsed.error.toLowerCase().includes("permission") || parsed.error.toLowerCase().includes("insufficient"))) {
            errorMsg = "No tiene permisos suficientes para eliminar productos (debe ser Administrador/Propietario en la base de datos).";
          }
        } catch (_) {
          if (error.message && (error.message.toLowerCase().includes("permission") || error.message.toLowerCase().includes("insufficient"))) {
            errorMsg = "No tiene permisos de administrador suficientes para eliminar productos.";
          }
        }
        alert("Error al Eliminar\n\n" + errorMsg);
      }
    }
  };

  // 1. Identify duplicates of products (grouped by either SKU or Name)
  const duplicateGroups = React.useMemo(() => {
    const groups: { [key: string]: Product[] } = {};
    
    products.forEach(p => {
      const valueToGroup = duplicateGroupCriterion === 'sku' ? p.sku : p.name;
      const key = String(valueToGroup || '').trim().toLowerCase();
      if (key) {
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
      }
    });

    // We only care about groups with size > 1 (duplicates, triplicates, etc.)
    return Object.entries(groups)
      .filter(([_, items]) => items.length > 1)
      .map(([key, items]) => {
        return {
          id: key,
          criterionValue: duplicateGroupCriterion === 'sku' ? items[0].sku : items[0].name,
          products: items
        };
      });
  }, [products, duplicateGroupCriterion]);

  // Identify only the redundant duplicate/triplicate occurrences (to be listed in rows)
  const redundantCandidates = React.useMemo(() => {
    const list: Array<{
      product: Product;
      masterProduct: Product;
      occurrenceIndex: number; // 2 for duplicate, 3 for triplicate, etc.
    }> = [];

    duplicateGroups.forEach(group => {
      // Sort: keep the best as master at index 0
      const sorted = [...group.products].sort((a, b) => {
        // Prioritize highest stock first to keep inventory
        if ((b.stock ?? 0) !== (a.stock ?? 0)) {
          return (b.stock ?? 0) - (a.stock ?? 0);
        }
        // Then newest modified date
        const timeA = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
        const timeB = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
        if (timeB !== timeA) return timeB - timeA;
        return b.id.localeCompare(a.id);
      });

      const master = sorted[0];
      // Registros sobrantes (duplicados y triplicados)
      sorted.slice(1).forEach((p, index) => {
        list.push({
          product: p,
          masterProduct: master,
          occurrenceIndex: index + 2 // Duplicado es 2, Triplicado es 3
        });
      });
    });

    return list;
  }, [duplicateGroups]);

  // 2. Reactively pre-populate idsToDelete when redundantCandidates changes or modal shows up
  React.useEffect(() => {
    if (showDuplicateManager) {
      const toDelete = new Set<string>();
      redundantCandidates.forEach(c => toDelete.add(c.product.id));
      setIdsToDelete(toDelete);
    }
  }, [showDuplicateManager, duplicateGroupCriterion, redundantCandidates]);

  // helper utilities
  const toggleSelectCandidate = (productId: string) => {
    setIdsToDelete(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const selectAllCandidates = () => {
    const next = new Set<string>();
    redundantCandidates.forEach(c => next.add(c.product.id));
    setIdsToDelete(next);
  };

  const deselectAllCandidates = () => {
    setIdsToDelete(new Set());
  };

  // 3. Handle actual bulk deletion of duplicates
  const handleBulkDeleteDuplicates = async () => {
    if (idsToDelete.size === 0) {
      alert("No hay productos seleccionados para eliminar.");
      return;
    }

    const confirmMsg = `¿Está seguro de que desea eliminar permanentemente ${idsToDelete.size} registros de productos duplicados/triplicados? Esta acción es irreversible y conservará únicamente 1 registro por cada grupo de duplicidad.`;
    if (!confirm(confirmMsg)) {
      return;
    }

    setIsDeletingDuplicates(true);
    try {
      await CatalogService.bulkDeleteProducts(Array.from(idsToDelete));
      alert(`¡Eliminación Masiva Exitosa!\nSe han eliminado ${idsToDelete.size} registros duplicados de forma permanente.`);
      setShowDuplicateManager(false);
    } catch (error: any) {
      console.error("Error al realizar eliminación masiva:", error);
      let errorMsg = "Ocurrió un error al intentar realizar la eliminación masiva de duplicados.";
      try {
        const parsed = JSON.parse(error.message);
        if (parsed?.error && (parsed.error.toLowerCase().includes("permission") || parsed.error.toLowerCase().includes("insufficient"))) {
          errorMsg = "No cuenta con roles o permisos de administrador para realizar eliminaciones masivas en base de datos.";
        }
      } catch (_) {
        if (error.message && (error.message.toLowerCase().includes("permission") || error.message.toLowerCase().includes("insufficient"))) {
          errorMsg = "No cuenta con roles o permisos de administrador.";
        }
      }
      alert("Error en Eliminación Masiva\n\n" + errorMsg);
    } finally {
      setIsDeletingDuplicates(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex">
      <motion.div 
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.99 }}
        className="bg-slate-900 w-[100vw] h-[100vh] flex flex-col md:flex-row overflow-hidden transition-all duration-300"
      >
        {/* SIDEBAR VERTICAL IZQUIERDO (Desktop) */}
        <aside className="hidden md:flex w-64 lg:w-72 bg-slate-900 text-slate-200 flex-col shrink-0 border-r border-slate-800 h-full select-none z-20">
          {/* Header del Sidebar */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/50">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-brand-teal text-white rounded-xl flex items-center justify-center shadow-md shadow-teal-900/40 shrink-0">
                <Package size={22} />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-black text-white tracking-tight leading-tight truncate">
                  El Estudiante
                </h2>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  Panel de Administración
                </p>
              </div>
            </div>
          </div>

          {/* Lista Vertical de Módulos */}
          <div className="flex-1 overflow-y-auto p-3 space-y-5 custom-scrollbar">
            {ADMIN_NAV_SECTIONS.map((section, idx) => (
              <div key={idx} className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 mb-2">
                  {section.title}
                </p>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      id={item.buttonId}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-3 group relative cursor-pointer ${
                        isActive
                          ? 'bg-brand-teal text-white shadow-lg shadow-teal-950/40 font-bold'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/70 font-medium'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isActive 
                          ? 'bg-white/20 text-white' 
                          : 'bg-slate-800/90 text-slate-400 group-hover:text-white group-hover:bg-slate-700'
                      }`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs block truncate leading-tight">{item.label}</span>
                        <span className={`text-[10px] block truncate font-normal ${isActive ? 'text-teal-100' : 'text-slate-400'}`}>
                          {item.desc}
                        </span>
                      </div>
                      {isActive && (
                        <ChevronRight size={14} className="text-white/80 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer del Sidebar */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/50 space-y-2">
            <div className="flex items-center justify-between px-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Base de datos activa
              </span>
              <span className="text-[10px] font-mono text-slate-400">v2.5</span>
            </div>
            <button 
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700/60 transition-all text-xs font-semibold cursor-pointer"
            >
              <LogOut size={14} />
              Cerrar Administración
            </button>
          </div>
        </aside>

        {/* DRAWER MÓVIL (Pantallas pequeñas) */}
        <AnimatePresence>
          {isMobileNavOpen && (
            <div className="fixed inset-0 z-[150] md:hidden flex">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
                onClick={() => setIsMobileNavOpen(false)}
              />
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 260 }}
                className="relative w-4/5 max-w-xs bg-slate-900 text-slate-100 flex flex-col h-full z-10 shadow-2xl border-r border-slate-800"
              >
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-brand-teal text-white rounded-lg flex items-center justify-center">
                      <Package size={18} />
                    </div>
                    <div>
                      <span className="font-bold text-sm block leading-tight">Módulos</span>
                      <span className="text-[10px] text-slate-400">El Estudiante</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsMobileNavOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X size={18} />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-4">
                  {ADMIN_NAV_SECTIONS.map((section, idx) => (
                    <div key={idx} className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 mb-1.5">
                        {section.title}
                      </p>
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveTab(item.id);
                              setIsMobileNavOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-colors ${
                              isActive
                                ? 'bg-brand-teal text-white font-bold'
                                : 'text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                            <div className="flex-1 min-w-0">
                              <span className="text-xs block truncate">{item.label}</span>
                              <span className="text-[10px] block opacity-75 truncate">{item.desc}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>

                <div className="p-3 border-t border-slate-800">
                  <button 
                    onClick={onClose}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-rose-500/20 hover:text-rose-300 transition-colors text-xs font-semibold"
                  >
                    <LogOut size={14} />
                    Cerrar Administración
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ÁREA PRINCIPAL DE CONTENIDO (Derecha) */}
        <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden h-full">
          {/* Top Bar Superior */}
          <div className="px-4 sm:px-6 py-3.5 border-b border-slate-100 flex items-center justify-between gap-4 bg-white shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {/* Botón menú móvil */}
              <button 
                onClick={() => setIsMobileNavOpen(true)}
                className="md:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors shrink-0 cursor-pointer"
                aria-label="Ver módulos"
              >
                <Menu size={18} />
              </button>

              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-brand-teal flex items-center justify-center shrink-0 border border-slate-200/60">
                  <activeModuleInfo.icon size={18} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate">
                    {activeModuleInfo.label}
                  </h1>
                  <p className="text-[11px] text-slate-400 font-medium truncate hidden sm:block">
                    Módulo de Administración · {activeModuleInfo.desc}
                  </p>
                </div>
              </div>
            </div>

            {/* Acciones de Cabecera */}
            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={onClose} 
                className="p-2 sm:px-3 sm:py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95 cursor-pointer"
                title="Cerrar módulo de administración"
              >
                <X size={16} />
                <span className="hidden sm:inline">Cerrar</span>
              </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {activeTab === 'catalog' ? (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* List Section */}
              <div className="flex-1 p-6 overflow-y-auto border-r border-slate-50 flex flex-col min-h-0">
                
                {/* 1. KPI SUMMARY METRIC ROW */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5 shrink-0">
                  <div className="bg-slate-50 border border-slate-100/80 p-3 rounded-2xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-900/10 text-slate-800 flex items-center justify-center shrink-0">
                      <Layers size={15} />
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Productos</span>
                      <span className="text-xs font-black text-slate-850 font-mono">{totalItemsCount}</span>
                    </div>
                  </div>

                  <div className="bg-emerald-50/40 border border-emerald-100/60 p-3 rounded-2xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center shrink-0">
                      <TrendingUp size={15} />
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Venta Estimada</span>
                      <span className="text-xs font-black text-emerald-800 font-mono">S/ {totalInventoryValue.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div className="bg-amber-50/40 border border-amber-100/60 p-3 rounded-2xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0 animate-pulse">
                      <AlertTriangle size={15} />
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Stock Crítico</span>
                      <span className="text-xs font-black text-amber-800 font-mono">{lowStockCount} items</span>
                    </div>
                  </div>

                  <div className="bg-rose-50/30 border border-rose-100/40 p-3 rounded-2xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-700 flex items-center justify-center shrink-0">
                      <Activity size={15} />
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Agotados</span>
                      <span className="text-xs font-black text-rose-800 font-mono">{outOfStockCount} items</span>
                    </div>
                  </div>
                </div>

                {/* 2. DYNAMIC TOOLBAR */}
                <div className="flex gap-3 mb-5 shrink-0">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Buscar por nombre o SKU..."
                      className="w-full bg-slate-100 border-none rounded-xl py-2 px-10 text-sm focus:ring-2 ring-brand-teal outline-none transition-all"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleExcelImport} 
                    accept=".xlsx, .xls" 
                    className="hidden" 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-slate-700 text-white px-3 sm:px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-600 transition-all shadow-md cursor-pointer shrink-0"
                    title="Importar catálogo completo desde Excel"
                  >
                    <UploadCloud size={15} /> <span className="hidden sm:inline">Importar</span>
                  </button>
                  <button 
                    onClick={handleExportAllToExcel}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 sm:px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer shrink-0 animate-fade-in"
                    title="Exportar catálogo completo a Excel (XLSX)"
                  >
                    <FileSpreadsheet size={15} /> <span className="hidden sm:inline">Exportar</span>
                  </button>
                  <button 
                    onClick={handleExportPDFCatalog}
                    disabled={isExportingPDF}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-3 sm:px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer shrink-0 disabled:opacity-50 animate-fade-in"
                    title="Exportar catálogo completo a PDF diseñado con fotos"
                  >
                    {isExportingPDF ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
                    <span className="hidden sm:inline">
                      {isExportingPDF ? 'Exportando...' : 'Catálogo PDF'}
                    </span>
                  </button>
                  <button 
                    onClick={() => setShowDuplicateManager(true)}
                    className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer shrink-0 ${
                      duplicateGroups.length > 0 
                        ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse hover:animate-none' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                    title="Análisis y depuración de registros duplicados o triplicados"
                  >
                    <Layers size={13} className={duplicateGroups.length > 0 ? "animate-bounce" : ""} /> 
                    <span className="hidden sm:inline">Duplicados</span>
                    {duplicateGroups.length > 0 && (
                      <span className="bg-white text-amber-700 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-amber-200 ml-0.5">
                        {duplicateGroups.length}
                      </span>
                    )}
                  </button>
                  <button 
                    onClick={() => setEditingProduct({ sku: getNextSequentialSKU(), category: 'libros', featured: false, minStock: 5, stock: 0, price: 0, costPrice: 0 })}
                    className="bg-brand-teal text-white px-3 sm:px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-brand-teal/90 transition-all shadow-lg shadow-brand-teal/20 cursor-pointer shrink-0"
                  >
                    <Plus size={15} /> Nuevo
                  </button>
                </div>

                {/* 3. ADVANCED INTERACTIVE FILTER PILLS */}
                <div className="flex flex-col sm:flex-row gap-3 mb-5 border-b border-slate-50 pb-4 shrink-0 justify-between items-stretch sm:items-center">
                  <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-none py-1">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                        selectedCategory === 'all' 
                          ? 'bg-slate-900 text-white' 
                          : 'bg-slate-100 text-slate-500 hover:text-slate-850'
                      }`}
                    >
                      Todos ({totalItemsCount})
                    </button>
                    {categories.map(cat => {
                      const count = products.filter(p => (p.category || 'utiles').toLowerCase() === cat.toLowerCase()).length;
                      return (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition capitalize ${
                            selectedCategory === cat 
                              ? 'bg-slate-900 text-white' 
                              : 'bg-slate-100 text-slate-500 hover:text-slate-850'
                          }`}
                        >
                          {cat} ({count})
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedStockFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition ${
                        selectedStockFilter === 'all'
                          ? 'bg-white text-slate-900 shadow-xxs border border-slate-200/50'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Ver Todo
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStockFilter('low')}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition flex items-center gap-1 ${
                        selectedStockFilter === 'low'
                          ? 'bg-amber-100 text-amber-900 shadow-xxs border border-amber-200'
                          : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      ⚠️ Crítico ({lowStockCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStockFilter('out')}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition flex items-center gap-1 ${
                        selectedStockFilter === 'out'
                          ? 'bg-rose-105 text-rose-900 shadow-xxs border border-rose-200'
                          : 'text-slate-400 hover:text-slate-705'
                      }`}
                    >
                      🚨 Agotado ({outOfStockCount})
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-1">
                  {filtered.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50/50 rounded-3xl border border-dashed border-slate-100 flex flex-col items-center justify-center p-6">
                      <Search size={32} className="text-slate-300 mb-2" />
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">No se encontraron productos</p>
                      <p className="text-[10px] text-slate-400 font-sans mt-1">Prueba refinando la búsqueda o cambiando los filtros superiores.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filtered.map(p => {
                        const minS = p.minStock || 5;
                        const isCritical = (p.stock || 0) <= minS && (p.stock || 0) > 0;
                        const isOut = (p.stock || 0) === 0;
                        
                        const todayStr = new Date().toISOString().split('T')[0];
                        const isOfferExpired = p.isOffer && p.offerExpiryDate ? p.offerExpiryDate < todayStr : false;
                        
                        return (
                          <div key={p.id} className="group flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 hover:border-brand-teal/35 hover:bg-teal-50/15 transition-all bg-white shadow-xxs">
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                                {p.imageUrl ? (
                                  <img 
                                    src={normalizeProductImageUrl(p.imageUrl, p.category, p.id)} 
                                    alt="" 
                                    className="w-full h-full object-contain p-1" 
                                    referrerPolicy="no-referrer" 
                                    onError={(e) => handleImageError(e, p.category, p.id)}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300">
                                    <Package size={16} />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 leading-tight truncate">{p.name}</h4>
                                  
                                  {p.isOffer && (
                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border flex items-center gap-1.5 ${
                                      isOfferExpired 
                                      ? 'bg-rose-50 text-rose-600 border-rose-250 animate-pulse' 
                                      : 'bg-teal-50 text-brand-teal border-teal-200'
                                    }`}>
                                      <span>{isOfferExpired ? 'OFERTA VENCIDA' : 'OFERTA'}</span>
                                      {p.offerExpiryDate && (
                                        <span className={`text-[7.5px] font-mono normal-case border-l pl-1.5 ${
                                          isOfferExpired ? 'border-rose-200 text-rose-500' : 'border-teal-200 text-slate-500'
                                        }`}>
                                          Vence: {p.offerExpiryDate}
                                        </span>
                                      )}
                                    </span>
                                  )}
                                  
                                  {isOut ? (
                                    <span className="text-[8px] font-black uppercase bg-rose-50 text-rose-750 px-1.5 py-0.5 rounded border border-rose-200">
                                      Agotado
                                    </span>
                                  ) : isCritical ? (
                                    <span className="text-[8px] font-black uppercase bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-250 animate-pulse">
                                      Stock Crítico
                                    </span>
                                  ) : null}
                                </div>
                                
                                <div className="flex items-center gap-x-2.5 gap-y-0.5 mt-1 text-[10px] text-slate-500 font-sans flex-wrap">
                                  <span className="font-mono font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">{p.sku || 'S/N'}</span>
                                  {p.authorOrBrand && (
                                    <span className="font-sans font-extrabold text-[#0D9488] bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100 uppercase text-[9.5px] tracking-wide" title="Marca / Editorial">
                                      {p.authorOrBrand}
                                    </span>
                                  )}
                                  <span className="capitalize font-semibold text-slate-450">{p.category}</span>
                                  <span className="text-slate-300">•</span>
                                  <span className="font-mono">
                                    Venta: <strong className="text-slate-800">S/ {(p.price || 0).toFixed(2)}</strong>
                                    {p.isOffer && p.offerPrice ? (
                                      <span className={`${isOfferExpired ? 'text-rose-500 line-through opacity-60' : 'text-brand-teal'} ml-1 sm:inline hidden`}>
                                        {isOfferExpired ? `(Oferta Vencida: S/ ${p.offerPrice.toFixed(2)})` : `(Oferta: S/ ${p.offerPrice.toFixed(2)})`}
                                      </span>
                                    ) : null}
                                  </span>
                                  {p.costPrice !== undefined && p.costPrice > 0 && (
                                    <>
                                      <span className="text-slate-300">•</span>
                                      <span className="font-mono text-slate-400">
                                        Compra: <strong className="text-slate-550">S/ {p.costPrice.toFixed(2)}</strong>
                                      </span>
                                    </>
                                  )}
                                </div>

                                {/* Stock Quantity Bar Indicator */}
                                <div className="mt-2 flex items-center gap-2 max-w-[280px]">
                                  <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-300 ${isOut ? 'w-0' : isCritical ? 'bg-amber-550 w-[20%]' : 'bg-emerald-500 w-[75%]'}`}
                                      style={{ width: `${Math.min(100, Math.max(8, ((p.stock || 0) / (minS * 5)) * 100))}%` }}
                                    ></div>
                                  </div>
                                  <span className={`text-[8px] sm:text-[9px] font-bold font-mono tracking-wide px-1 rounded leading-none py-0.5 ${isOut ? 'text-rose-700 bg-rose-50' : isCritical ? 'text-amber-700 bg-amber-50' : 'text-emerald-700 bg-emerald-50'}`}>
                                    {p.stock || 0} de {minS} unds
                                  </span>
                                </div>

                              </div>
                            </div>
                            <div className="flex gap-1 ml-2 shrink-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setEditingProduct(p)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-500 border border-slate-100 bg-white transition hover:text-slate-800 cursor-pointer" title="Editar Producto"><Edit2 size={13} /></button>
                              <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-55 rounded-xl text-red-500 border border-slate-100 bg-white transition hover:text-red-700 cursor-pointer" title="Eliminar Producto"><Trash2 size={13} /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Form Section */}
              <AnimatePresence>
                {editingProduct && (
                  <motion.div 
                    initial={{ x: 200, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 200, opacity: 0 }}
                    className="w-full md:w-80 bg-slate-50 p-6 border-l border-slate-100 overflow-y-auto"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-slate-800">{editingProduct.id ? 'Editar' : 'Nuevo'}</h3>
                      <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                    </div>

                    <form onSubmit={handleSave} className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 block">Código SKU Correlativo</label>
                          {!editingProduct.id && (
                            <button
                              type="button"
                              onClick={() => setEditingProduct({...editingProduct, sku: getNextSequentialSKU()})}
                              className="text-[9px] font-bold text-brand-teal hover:text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-1.5 py-0.5 rounded transition cursor-pointer"
                              title="Generar siguiente código correlativo de llegada"
                            >
                              Siguiente SKU
                            </button>
                          )}
                        </div>
                        <input 
                          required
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-brand-teal outline-none font-semibold text-slate-800"
                          value={editingProduct.sku || ''}
                          onChange={e => setEditingProduct({...editingProduct, sku: e.target.value.toUpperCase()})}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Nombre</label>
                        <input 
                          required
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-brand-teal outline-none"
                          value={editingProduct.name || ''}
                          onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Marca / Editorial</label>
                        <input 
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-brand-teal outline-none font-medium text-slate-800"
                          value={editingProduct.authorOrBrand || ''}
                          onChange={e => setEditingProduct({...editingProduct, authorOrBrand: e.target.value})}
                          placeholder="Ej. Faber-Castell, Artesco, Norma, Santillana..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Precio Venta S/</label>
                          <input 
                            type="number"
                            step="0.01"
                            required
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-brand-teal outline-none font-semibold text-slate-800"
                            value={editingProduct.price || ''}
                            onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Costo Compra S/</label>
                          <input 
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-brand-teal outline-none text-slate-600 font-medium"
                            value={editingProduct.costPrice || ''}
                            onChange={e => setEditingProduct({...editingProduct, costPrice: Number(e.target.value)})}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Stock Actual</label>
                          <input 
                            type="number"
                            required
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-brand-teal outline-none font-bold"
                            value={editingProduct.stock || 0}
                            onChange={e => setEditingProduct({...editingProduct, stock: Number(e.target.value)})}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Stock Mínimo Alerta</label>
                          <input 
                            type="number"
                            required
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-brand-teal outline-none font-semibold text-amber-700"
                            value={editingProduct.minStock || 5}
                            onChange={e => setEditingProduct({...editingProduct, minStock: Number(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Foto del Producto (Adjuntar copia original o ingresar URL)</label>
                        
                        {/* Interactive Attach Button & Thumbnail Display */}
                        <div className="border border-dashed border-slate-200 rounded-xl p-3 bg-slate-50/50 flex flex-col gap-3">
                          <input 
                            type="file"
                            ref={productImageInputRef}
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageFileChange}
                          />

                          {editingProduct.imageUrl ? (
                            <div className="flex items-center gap-3 bg-white p-2 border border-slate-200 rounded-lg">
                              <img 
                                src={normalizeProductImageUrl(editingProduct.imageUrl, editingProduct.category)} 
                                alt="Vista previa" 
                                className="w-10 h-10 object-cover rounded-lg border border-slate-100 shrink-0 bg-slate-50"
                                referrerPolicy="no-referrer"
                                onError={(e) => handleImageError(e, editingProduct.category)}
                              />
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] font-black uppercase text-brand-teal block">Imagen Adjunta</span>
                                <span className="text-[11px] text-slate-500 font-mono truncate block">
                                  {editingProduct.imageUrl.startsWith('data:') ? 'Imagen Base64 Local' : editingProduct.imageUrl}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setEditingProduct({...editingProduct, imageUrl: ''})}
                                className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 cursor-pointer"
                                title="Eliminar imagen"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => productImageInputRef.current?.click()}
                              disabled={isUploadingImage}
                              className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none"
                            >
                              {isUploadingImage ? (
                                <>
                                  <Loader2 className="animate-spin text-[#0D9488]" size={14} />
                                  <span>Procesando imagen...</span>
                                </>
                              ) : (
                                <>
                                  <UploadCloud className="text-[#0D9488]" size={14} />
                                  <span>Adjuntar foto original del producto</span>
                                </>
                              )}
                            </button>
                          )}

                          {/* Fallback option to type or edit URL */}
                          <div className="relative">
                            <input 
                              type="text"
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-brand-teal outline-none font-medium"
                              value={editingProduct.imageUrl || ''}
                              onChange={e => setEditingProduct({...editingProduct, imageUrl: e.target.value})}
                              placeholder="O ingrese un enlace de foto web (URL)..."
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Descripción</label>
                        <textarea 
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-brand-teal outline-none min-h-[80px]"
                          value={editingProduct.description || ''}
                          onChange={e => setEditingProduct({...editingProduct, description: e.target.value})}
                          placeholder="Descripción del producto..."
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Categoría</label>
                        <select 
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-brand-teal outline-none capitalize"
                          value={editingProduct.category || 'libros'}
                          onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                        >
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100 space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox"
                            className="w-4 h-4 rounded text-brand-teal focus:ring-brand-teal"
                            checked={editingProduct.isOffer || false}
                            onChange={e => setEditingProduct({...editingProduct, isOffer: e.target.checked})}
                          />
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Poner en Oferta / Remate</span>
                        </label>
                        
                        {editingProduct.isOffer && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="overflow-hidden grid grid-cols-2 gap-3"
                          >
                            <div>
                              <label className="text-[10px] font-black uppercase text-brand-teal mb-1 block">Precio de Oferta S/</label>
                              <input 
                                type="number"
                                className="w-full bg-white border border-teal-200 rounded-lg px-3 py-2 text-sm focus:border-brand-teal outline-none"
                                value={editingProduct.offerPrice || ''}
                                onChange={e => setEditingProduct({...editingProduct, offerPrice: Number(e.target.value)})}
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black uppercase text-brand-teal mb-1 block">Vence el: (Opcional)</label>
                              <input 
                                type="date"
                                className="w-full bg-white border border-teal-200 rounded-lg px-3 py-2 text-sm focus:border-brand-teal outline-none font-medium text-slate-700"
                                value={editingProduct.offerExpiryDate || ''}
                                onChange={e => setEditingProduct({...editingProduct, offerExpiryDate: e.target.value})}
                              />
                            </div>
                          </motion.div>
                        )}
                      </div>

                      <button 
                        disabled={isSaving}
                        type="submit" 
                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50 font-sans"
                      >
                        {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        {editingProduct.id ? 'Actualizar' : 'Guardar'}
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : activeTab === 'quoter' ? (
            <ProductQuoter products={products} />
          ) : activeTab === 'suppliers' ? (
            <div className="flex-1 p-6 overflow-hidden flex flex-col bg-slate-50/20">
              <SupplierManager />
            </div>
          ) : activeTab === 'clients' ? (
            <div className="flex-1 p-6 overflow-hidden flex flex-col bg-slate-50/20">
              <ClientManager />
            </div>
          ) : activeTab === 'purchaseOrders' ? (
            <PurchaseOrderManager />
          ) : activeTab === 'debtors' ? (
            <div className="flex-1 p-6 overflow-hidden flex flex-col bg-slate-50/20">
              <DebtorManager products={products} />
            </div>
          ) : activeTab === 'salesNotes' ? (
            <div className="flex-1 p-6 overflow-hidden flex flex-col bg-slate-50/20">
              <SalesNoteManager />
            </div>
          ) : activeTab === 'netflix' ? (
            <div className="flex-1 p-6 overflow-y-auto flex flex-col bg-slate-50/20">
              <NetflixManager />
            </div>
          ) : (
            <div className="flex-1 p-6 overflow-hidden flex flex-col bg-slate-50/20">
              <ServicesCalculator />
            </div>
          )}
        </div>

        {/* EXCEL IMPORT VALIDATION REPORT MODAL - VENTANA EMERGENTE */}
        <AnimatePresence>
          {excelReport && (
            <div className="fixed inset-0 z-[250] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100/80"
              >
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-brand-teal">
                      <FileSpreadsheet size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">Diagnóstico de Importación Excel</h3>
                      <p className="text-[10px] text-slate-400 font-semibold font-mono truncate max-w-sm sm:max-w-md">{excelReport.fileName}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCancelExcel}
                    className="p-1 px-2.5 text-xs text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Bento KPI Summary */}
                <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3 border-b border-slate-50 bg-slate-50/20 shrink-0">
                  <div className="bg-white border border-slate-100 p-3 rounded-2xl">
                    <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Filas Leídas</span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-lg font-black text-slate-800 font-sans">{excelReport.totalRows}</span>
                      <span className="text-[10px] text-slate-400 font-medium">filas</span>
                    </div>
                  </div>

                  <div className="bg-teal-50/20 border border-teal-100/50 p-3 rounded-2xl">
                    <span className="text-[9px] font-black uppercase text-teal-600 block tracking-wider">Para Importar</span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-lg font-black text-brand-teal font-sans">{excelReport.validProducts.length}</span>
                      <span className="text-[10px] text-teal-500 font-semibold">OK</span>
                    </div>
                  </div>

                  <div className="bg-rose-50/20 border border-rose-100/50 p-3 rounded-2xl">
                    <span className="text-[9px] font-black uppercase text-rose-600 block tracking-wider">Errores Críticos</span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-lg font-black text-rose-600 font-sans">{excelReport.invalidProductsCount}</span>
                      <span className="text-[10px] text-rose-450 text-rose-400 font-semibold">Omitidos</span>
                    </div>
                  </div>

                  <div className="bg-amber-50/20 border border-amber-100/50 p-3 rounded-2xl">
                    <span className="text-[9px] font-black uppercase text-amber-600 block tracking-wider font-sans">Advertencias</span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-lg font-black text-amber-600 font-sans font-mono animate-pulse">
                        {excelReport.issues.filter(i => i.type === 'warning').length}
                      </span>
                      <span className="text-[10px] text-amber-550 text-amber-500 font-semibold">Alertas</span>
                    </div>
                  </div>
                </div>

                {/* ADVANCED COLUMN MAPPER DROPDOWN GRID */}
                <div className="mx-5 mt-4 bg-teal-50/20 border border-teal-100/35 p-4 rounded-2xl shrink-0 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Layers size={14} className="text-brand-teal" />
                      <span className="text-xs font-black font-sans">Asociación Interactiva de Columnas del Excel</span>
                    </div>
                    <span className="text-[9.5px] bg-teal-100 text-brand-teal border border-teal-200 font-extrabold px-2 py-0.5 rounded-lg uppercase tracking-wider font-sans">
                      ¿Precios en 0? Elige la columna adecuada:
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {/* SKU */}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Código / SKU</span>
                      <select
                        value={columnMapping.skuIdx}
                        onChange={e => setColumnMapping(prev => ({...prev, skuIdx: Number(e.target.value)}))}
                        className="w-full text-[11px] font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 cursor-pointer shadow-sm hover:border-slate-300 focus:outline-none focus:border-brand-teal transition-all animate-pulse focus:animate-none"
                      >
                        {excelHeaders.map((h, i) => (
                          <option key={i} value={i}>{h}</option>
                        ))}
                      </select>
                    </div>
                    {/* Name */}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Nombre del Producto</span>
                      <select
                        value={columnMapping.nameIdx}
                        onChange={e => setColumnMapping(prev => ({...prev, nameIdx: Number(e.target.value)}))}
                        className="w-full text-[11px] font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 cursor-pointer shadow-sm hover:border-slate-300 focus:outline-none focus:border-brand-teal transition-all"
                      >
                        {excelHeaders.map((h, i) => (
                          <option key={i} value={i}>{h}</option>
                        ))}
                      </select>
                    </div>
                    {/* Price with Highlight indicator */}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-black uppercase text-brand-teal tracking-wider flex items-center gap-1 font-sans">Precio Unitario (S/) ⭐</span>
                      <select
                        value={columnMapping.priceIdx}
                        onChange={e => setColumnMapping(prev => ({...prev, priceIdx: Number(e.target.value)}))}
                        className="w-full text-[11px] font-black border border-brand-teal rounded-lg px-2 py-1 text-teal-950 cursor-pointer shadow-sm focus:outline-none focus:ring-1 focus:ring-brand-teal bg-teal-50"
                      >
                        {excelHeaders.map((h, i) => (
                          <option key={i} value={i}>{h}</option>
                        ))}
                      </select>
                    </div>
                    {/* Stock */}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-black uppercase text-slate-405 tracking-wider">Stock Inventario</span>
                      <select
                        value={columnMapping.stockIdx}
                        onChange={e => setColumnMapping(prev => ({...prev, stockIdx: Number(e.target.value)}))}
                        className="w-full text-[11px] font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 cursor-pointer shadow-sm hover:border-slate-300 focus:outline-none focus:border-brand-teal transition-all"
                      >
                        {excelHeaders.map((h, i) => (
                          <option key={i} value={i}>{h}</option>
                        ))}
                      </select>
                    </div>
                    {/* Category */}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-black uppercase text-slate-405 tracking-wider">Categoría</span>
                      <select
                        value={columnMapping.catIdx}
                        onChange={e => setColumnMapping(prev => ({...prev, catIdx: Number(e.target.value)}))}
                        className="w-full text-[11px] font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 cursor-pointer shadow-sm hover:border-slate-300 focus:outline-none focus:border-brand-teal transition-all"
                      >
                        {excelHeaders.map((h, i) => (
                          <option key={i} value={i}>{h}</option>
                        ))}
                      </select>
                    </div>
                    {/* Image */}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-black uppercase text-slate-405 tracking-wider font-sans">URL de Foto (Opcional)</span>
                      <select
                        value={columnMapping.imgIdx}
                        onChange={e => setColumnMapping(prev => ({...prev, imgIdx: Number(e.target.value)}))}
                        className="w-full text-[11px] font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 cursor-pointer shadow-sm hover:border-slate-300 focus:outline-none focus:border-brand-teal transition-all"
                      >
                        {excelHeaders.map((h, i) => (
                          <option key={i} value={i}>{h}</option>
                        ))}
                      </select>
                    </div>
                    {/* Brand / Editorial */}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-black uppercase text-slate-405 tracking-wider font-sans">Marca / Editorial</span>
                      <select
                        value={columnMapping.brandIdx}
                        onChange={e => setColumnMapping(prev => ({...prev, brandIdx: Number(e.target.value)}))}
                        className="w-full text-[11px] font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 cursor-pointer shadow-sm hover:border-slate-300 focus:outline-none focus:border-brand-teal transition-all"
                      >
                        {excelHeaders.map((h, i) => (
                          <option key={i} value={i}>{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Tab switcher */}
                <div className="px-5 border-b border-slate-100 bg-slate-50/10 flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setReportTab('preview')}
                    className={`pb-3 pt-4 text-xs font-bold border-b-2 transition-all px-2 flex items-center gap-1.5 cursor-pointer ${
                      reportTab === 'preview'
                        ? 'border-brand-teal text-brand-teal font-extrabold'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <CheckCircle2 size={14} />
                    Vista Previa de Importación ({excelReport.validProducts.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportTab('issues')}
                    className={`pb-3 pt-4 text-xs font-bold border-b-2 transition-all px-2 flex items-center gap-1.5 cursor-pointer ${
                      reportTab === 'issues'
                        ? 'border-rose-500 text-rose-600 font-extrabold'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <AlertTriangle size={14} />
                    Errores y Alertas ({excelReport.issues.length})
                  </button>
                </div>

                {/* Issues / Correction logs Section */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {reportTab === 'preview' ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center bg-teal-50/50 border border-teal-100/30 px-3 py-2 rounded-xl">
                        <span className="text-xs font-bold text-slate-700">Muestra de Productos Detectados (Listos para Guardar)</span>
                        <span className="text-[10px] font-black uppercase text-brand-teal bg-white border border-teal-100 px-2 py-0.5 rounded-lg font-mono">
                          {excelReport.validProducts.length} productos
                        </span>
                      </div>

                      {excelReport.validProducts.length > 0 ? (
                        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm max-h-[36vh] overflow-y-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm">
                              <tr className="text-slate-550 border-b border-slate-100 font-bold">
                                <th className="p-3 text-center w-12">#</th>
                                <th className="p-3 w-28">Código / SKU</th>
                                <th className="p-3">Nombre</th>
                                <th className="p-3">Marca / Editorial</th>
                                <th className="p-3 text-right w-24">Precio (S/)</th>
                                <th className="p-3 text-center w-20">Inventario</th>
                                <th className="p-3 w-24">Categoría</th>
                              </tr>
                            </thead>
                            <tbody>
                              {excelReport.validProducts.map((p, pidx) => (
                                <tr key={pidx} className="border-b border-slate-50 hover:bg-slate-50/35 transition-colors">
                                  <td className="p-3 text-center font-mono font-bold text-[10px] text-slate-400">{pidx + 1}</td>
                                  <td className="p-3 font-mono font-bold text-slate-700 text-[11px]">
                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                      {p.sku}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <div className="flex items-center gap-2.5">
                                      {p.imageUrl && (
                                        <img src={p.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-100 shrink-0 bg-slate-100" referrerPolicy="no-referrer" />
                                      )}
                                      <div>
                                        <div className="font-semibold text-slate-800 line-clamp-1">{p.name}</div>
                                        <div className="text-[9px] font-black flex items-center gap-1 uppercase select-none">
                                          {p.imageUrl && p.imageUrl.includes("unsplash") ? (
                                            <span className="text-teal-600">✨ Imagen por defecto (Faltaba en Excel)</span>
                                          ) : (
                                            <span className="text-slate-400">🔗 Foto de columna Excel</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-3 text-slate-600 font-bold text-[11px]">
                                    {p.authorOrBrand || <span className="text-slate-300 italic font-normal">Sin marca</span>}
                                  </td>
                                  <td className="p-3 text-right font-extrabold text-slate-900 font-mono text-[11px] bg-slate-50/10">
                                    {p.price !== undefined ? (
                                      <span className={p.price === 0 ? "text-amber-500 font-black animate-pulse bg-amber-50 px-1 py-0.5 rounded border border-amber-200" : "text-brand-teal font-extrabold"}>
                                        S/ {Number(p.price).toFixed(2)}
                                      </span>
                                    ) : (
                                      <span className="text-rose-500 font-black">S/ 0.00</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-center font-bold text-slate-600 font-mono text-[11px]">
                                    {p.stock ?? 0} unds.
                                  </td>
                                  <td className="p-4">
                                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                      p.category === 'libros'
                                        ? 'bg-blue-50 border-blue-100 text-blue-600'
                                        : p.category === 'tecnologia'
                                        ? 'bg-purple-50 border-purple-100 text-purple-600'
                                        : 'bg-teal-50 border-teal-100 text-teal-600'
                                    }`}>
                                      {p.category}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
                          <AlertCircle size={24} className="text-slate-400 mb-2" />
                          <h5 className="font-bold text-slate-700 text-xs">No hay productos válidos</h5>
                          <p className="text-[11px] text-slate-500 max-w-xs mt-1">
                            Revisa el archivo de Excel y corrige los errores en la pestaña "Errores y Alertas" para poder continuar.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {excelReport.issues.length > 0 ? (
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-center bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">
                            <span className="text-xs font-bold text-slate-750">Detalle de Conflictos y Alertas</span>
                            <span className="text-[10px] font-black uppercase text-brand-teal bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-100 font-mono">
                              {excelReport.issues.length} observaciones found
                            </span>
                          </div>

                          <div className="space-y-2 max-h-[36vh] overflow-y-auto pr-1">
                            {excelReport.issues.map((issue, idx) => (
                              <div
                                key={idx}
                                className={`flex gap-3 p-3 rounded-2xl border text-xs leading-relaxed ${
                                  issue.type === 'error'
                                    ? 'bg-rose-50/40 border-rose-100/80 text-rose-800'
                                    : 'bg-amber-50/40 border-amber-100/80 text-amber-805'
                                }`}
                              >
                                <div className="shrink-0 mt-0.5">
                                  {issue.type === 'error' ? (
                                    <XCircle className="text-rose-500" size={15} />
                                  ) : (
                                    <AlertTriangle className="text-amber-500" size={15} />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1">
                                    <span className={`font-black uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded border ${
                                      issue.type === 'error' 
                                        ? 'bg-rose-100 border-rose-200' 
                                        : 'bg-amber-100 border-amber-200'
                                    }`}>
                                      Fila {issue.row}
                                    </span>
                                    <span className="font-bold truncate max-w-[200px] sm:max-w-xs">{issue.itemIdentifier}</span>
                                    <span className={`text-[9px] font-black uppercase tracking-wider ml-auto ${
                                      issue.type === 'error' ? 'text-rose-600' : 'text-amber-600'
                                    }`}>
                                      {issue.type === 'error' ? 'ERROR CRÍTICO' : 'ADVERTENCIA'}
                                    </span>
                                  </div>
                                  <p className="text-slate-600 font-medium">{issue.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-center bg-teal-50/20 border border-teal-100/50 rounded-3xl">
                          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 text-teal-650 flex items-center justify-center mb-3">
                            <CheckCircle2 size={24} className="text-brand-teal" />
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm mb-1">¡Archivo de Excel 100% Válido!</h4>
                          <p className="text-xs text-slate-500 font-medium max-w-sm leading-relaxed">
                            No se detectaron errores críticos ni advertencias en la verificación de datos. Los {excelReport.validProducts.length} productos analizados son totalmente seguros para su importación directa.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Additional diagnostic guideline */}
                  {excelReport.invalidProductsCount > 0 && (
                    <div className="bg-rose-50/25 border border-rose-100/40 p-4 rounded-2xl text-xs flex gap-2.5 leading-relaxed text-rose-850">
                      <AlertCircle className="shrink-0 mt-0.5 text-rose-550" size={15} />
                      <p className="font-medium text-[11px]">
                        <strong>Nota sobre errores críticos:</strong> Se omitirán automáticamente {excelReport.invalidProductsCount} filas que contienen códigos SKU vacíos o errores severos. Si deseas conservarlos, presiona el botón "Cancelar" inferior, rellena las celdas faltantes en Excel e inicia nuevamente la importación.
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col-reverse sm:flex-row justify-between items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={handleCancelExcel}
                    className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition duration-150 cursor-pointer text-center font-sans shadow-sm"
                  >
                    Salir y Corregir Excel
                  </button>

                  <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      disabled={isSaving || excelReport.validProducts.length === 0}
                      onClick={handleConfirmImport}
                      className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 active:scale-[0.98] disabled:opacity-40 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="animate-spin" size={14} />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <Check size={14} />
                          Importar {excelReport.validProducts.length} Productos Válidos
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* DUPLICATE/TRIPLICATE BULK CLEANER MODAL - VENTANA EMERGENTE */}
        <AnimatePresence>
          {showDuplicateManager && (
            <div className="fixed inset-0 z-[250] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100/80"
              >
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                      <Layers size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">Limpieza y Depuración de Duplicados</h3>
                      <p className="text-[10px] text-slate-400 font-semibold font-mono">Consolida y unifica registros repetidos mantieniendo solo uno</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDuplicateManager(false)}
                    className="p-1 px-2.5 text-xs text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Criterion selector Tabs & Metric summary bar */}
                <div className="p-5 bg-slate-50/20 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between shrink-0">
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl self-start">
                    <button
                      onClick={() => setDuplicateGroupCriterion('sku')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        duplicateGroupCriterion === 'sku'
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Agrupar por Código SKU
                    </button>
                    <button
                      onClick={() => setDuplicateGroupCriterion('name')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        duplicateGroupCriterion === 'name'
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Agrupar por Nombre
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="bg-amber-50 border border-amber-100 px-3 py-2 rounded-2xl flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                      <span className="text-[11px] font-bold text-amber-800">
                        {duplicateGroups.length} Grupos repetidos
                      </span>
                    </div>
                    <div className="bg-rose-50 border border-rose-100 px-3 py-2 rounded-2xl flex items-center gap-2">
                      <Trash2 size={13} className="text-rose-500" />
                      <span className="text-[11px] font-black text-rose-850">
                        {idsToDelete.size} Sobrantes a eliminar
                      </span>
                    </div>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[50vh]">
                  {redundantCandidates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center bg-teal-50/10 border border-dashed border-teal-100 rounded-3xl">
                      <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center text-brand-teal mb-3.5 border border-teal-100">
                        <CheckCircle2 size={28} />
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-sm">¡Catálogo Limpio y Optimizado!</h4>
                      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-2">
                        No se encontraron productos duplicados ni triplicados sobrantes en base al criterio seleccionado (<strong>{duplicateGroupCriterion === 'sku' ? 'Código SKU' : 'Nombre'}</strong>).
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Controls to select all / none */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <div className="text-xs text-slate-600 leading-relaxed">
                          💡 <strong>Habilitado para selección de eliminación masiva:</strong> Cada fila listada abajo representa una copia redundante (el sistema conservará automáticamente la copia principal con mayor stock o más reciente). Marca cada checkbox para confirmar su eliminación.
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={selectAllCandidates}
                            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-[11px] font-black uppercase cursor-pointer transition shadow-sm"
                          >
                            Seleccionar Todos
                          </button>
                          <button
                            type="button"
                            onClick={deselectAllCandidates}
                            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-[11px] font-black uppercase cursor-pointer transition shadow-sm"
                          >
                            Deseleccionar Todos
                          </button>
                        </div>
                      </div>

                      {/* List of redundant candidate rows */}
                      <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                        <div className="hidden md:grid grid-cols-12 gap-2 bg-slate-50 px-4 py-3 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <div className="col-span-1 text-center">Eliminar</div>
                          <div className="col-span-5">Producto Sobrante</div>
                          <div className="col-span-2">Código SKU</div>
                          <div className="col-span-2">Precio y Stock</div>
                          <div className="col-span-2 text-right">Referencia Original</div>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {redundantCandidates.map((c, idx) => {
                            const p = c.product;
                            const isSelected = idsToDelete.has(p.id);

                            return (
                              <div
                                key={p.id}
                                onClick={(e) => {
                                  // toggle state
                                  toggleSelectCandidate(p.id);
                                }}
                                className={`grid grid-cols-1 md:grid-cols-12 gap-2 p-4 items-center transition-colors cursor-pointer hover:bg-slate-50/50 ${
                                  isSelected ? 'bg-rose-50/10' : ''
                                }`}
                              >
                                {/* Checkbox Selector Column */}
                                <div className="col-span-1 flex items-center justify-center">
                                  <div
                                    className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                                      isSelected
                                        ? 'bg-rose-600 border-rose-650 text-white shadow-sm'
                                        : 'border-slate-300 bg-white hover:border-slate-400'
                                    }`}
                                  >
                                    {isSelected && <Check size={12} className="stroke-[3.5px]" />}
                                  </div>
                                </div>

                                {/* Product Image & Info Column */}
                                <div className="col-span-5 flex items-center gap-3">
                                  {p.imageUrl && (
                                    <img
                                      src={p.imageUrl}
                                      alt=""
                                      className="w-9 h-9 rounded-lg object-cover bg-slate-50 border border-slate-150 shrink-0"
                                      referrerPolicy="no-referrer"
                                    />
                                  )}
                                  <div className="min-w-0">
                                    <div className="font-extrabold text-slate-800 text-[12px] line-clamp-1">{p.name || 'Sin nombre'}</div>
                                    <div className="text-[9px] font-black text-slate-400 uppercase flex flex-wrap items-center gap-1.5 mt-0.5">
                                      <span className="font-mono bg-slate-100 px-1 rounded">ID: {p.id}</span>
                                      <span className="text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-100">
                                        {c.occurrenceIndex === 2 ? 'Copia #2 (Duplicado)' : `Copia #${c.occurrenceIndex} (Triplicado)`}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* SKU Column */}
                                <div className="col-span-2">
                                  <span className="md:hidden inline text-[8px] font-black text-slate-400 uppercase mr-1">SKU:</span>
                                  <span className="font-mono text-xs font-extrabold text-slate-700 bg-slate-100/60 px-2 py-0.5 rounded border border-slate-200/50">
                                    {p.sku || 'N/A'}
                                  </span>
                                </div>

                                {/* Stock & Price Column */}
                                <div className="col-span-2">
                                  <span className="md:hidden inline text-[8px] font-black text-slate-400 uppercase mr-1">Precio/Stock:</span>
                                  <span className="text-[11px] font-semibold text-slate-650 inline-flex items-center">
                                    <span className="font-mono text-brand-teal font-extrabold mr-2">S/ {Number(p.price || 0).toFixed(2)}</span>
                                    <span className="font-mono font-bold text-slate-500 bg-slate-50 border border-slate-100 px-1 rounded shrink-0">
                                      {p.stock ?? 0} unds
                                    </span>
                                  </span>
                                </div>

                                {/* Original Product To Keep Column */}
                                <div className="col-span-2 text-left md:text-right">
                                  <span className="md:hidden inline text-[8px] font-black text-slate-400 uppercase mr-1">Original Conservado:</span>
                                  <div className="inline-block md:block text-left md:text-right text-[10px] text-slate-550 leading-tight">
                                    <div className="font-black text-emerald-600 uppercase flex md:justify-end items-center gap-1">
                                      <CheckCircle2 size={10} /> Se conserva {c.masterProduct.stock ?? 0}u
                                    </div>
                                    <div className="text-[9px] text-slate-400 font-mono mt-0.5 max-w-[120px] truncate md:ml-auto">
                                      ID: {c.masterProduct.id}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer with warning note and operations */}
                <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
                  <div className="text-[10px] text-slate-450 font-bold max-w-sm sm:max-w-md">
                    ⚠️ Al consolidar, se eliminarán permanentemente los registros duplicados sobrantes de Firestore, pero sus historiales/transacciones asociadas anteriores podrían verse afectadas si referenciaban a esos IDs específicos.
                  </div>

                  <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDuplicateManager(false)}
                      className="px-5 py-2.5 text-xs font-bold text-slate-650 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition duration-150 cursor-pointer text-center"
                    >
                      Cerrar Analizador
                    </button>
                    {redundantCandidates.length > 0 && (
                      <button
                        type="button"
                        disabled={isDeletingDuplicates || idsToDelete.size === 0}
                        onClick={handleBulkDeleteDuplicates}
                        className="px-6 py-2.5 text-xs font-bold bg-rose-650 hover:bg-rose-700 text-white rounded-xl active:scale-[0.98] disabled:opacity-40 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        {isDeletingDuplicates ? (
                          <>
                            <Loader2 className="animate-spin" size={14} />
                            Borrando registros repetidos...
                          </>
                        ) : (
                          <>
                            <Trash2 size={14} />
                            Eliminar {idsToDelete.size} Sobrantes Repetidos
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </motion.div>
  </div>
  );

};
