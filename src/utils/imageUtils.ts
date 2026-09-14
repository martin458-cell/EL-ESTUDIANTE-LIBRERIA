import React from 'react';

/**
 * Normaliza y transforma URLs de imágenes comunes (Google Drive, Dropbox, OneDrive, etc.)
 * en URLs directas de imagen que los navegadores y etiquetas <img> pueden renderizar sin problemas.
 */
export function normalizeProductImageUrl(rawUrl?: string, category?: string, fallbackSeed?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return getCategoryFallbackImage(category, fallbackSeed);
  }

  let url = rawUrl.trim();

  // Eliminar comillas envolventes si el usuario las pegó
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1).trim();
  }

  if (!url) {
    return getCategoryFallbackImage(category, fallbackSeed);
  }

  // Si ya es un Base64 Data URL (data:image/...)
  if (url.startsWith('data:image/')) {
    return url;
  }

  // 1. GOOGLE DRIVE: Convierte enlaces de previsualización o compartidos a CDN directo de Google
  // Soporta:
  // - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  // - https://drive.google.com/file/d/FILE_ID/view
  // - https://drive.google.com/file/d/FILE_ID/edit
  // - https://drive.google.com/open?id=FILE_ID
  // - https://drive.google.com/uc?id=FILE_ID
  // - https://drive.google.com/uc?export=view&id=FILE_ID
  // - https://drive.google.com/thumbnail?id=FILE_ID
  // - https://docs.google.com/uc?id=FILE_ID
  if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
    let fileId: string | null = null;
    
    const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileDMatch && fileDMatch[1]) {
      fileId = fileDMatch[1];
    } else {
      const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
        fileId = idMatch[1];
      }
    }

    if (fileId) {
      // lh3.googleusercontent.com es el CDN público de Google para imágenes de Drive,
      // mucho más rápido, sin restricciones de sesión y sin páginas HTML intermedias.
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }

  // 2. DROPBOX: Convierte enlaces de página web a streaming directo
  // Soporta:
  // - https://www.dropbox.com/s/xyz/foto.jpg?dl=0
  // - https://dropbox.com/scl/fi/xyz/foto.jpg?rlkey=...&dl=0
  if (url.includes('dropbox.com')) {
    let directDropbox = url;
    if (directDropbox.includes('www.dropbox.com')) {
      directDropbox = directDropbox.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    } else if (directDropbox.includes('dropbox.com') && !directDropbox.includes('dl.dropboxusercontent.com')) {
      directDropbox = directDropbox.replace('dropbox.com', 'dl.dropboxusercontent.com');
    }
    directDropbox = directDropbox.replace(/[?&]dl=0/, '?raw=1');
    if (!directDropbox.includes('raw=1') && !directDropbox.includes('dl.dropboxusercontent.com')) {
      directDropbox += (directDropbox.includes('?') ? '&' : '?') + 'raw=1';
    }
    return directDropbox;
  }

  // 3. ONEDRIVE / 1DRV.MS:
  if (url.includes('onedrive.live.com') && !url.includes('download=1')) {
    url = url + (url.includes('?') ? '&' : '?') + 'download=1';
  }

  // 4. Mejorar protocolo HTTP no seguro a HTTPS para evitar bloqueo de Contenido Mixto en el navegador
  if (url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    url = 'https://' + url.slice(7);
  }

  // 5. Escapar espacios si vienen sin codificar en la URL
  if (url.includes(' ') && !url.includes('%20')) {
    try {
      url = encodeURI(url);
    } catch (_) {
      url = url.replace(/ /g, '%20');
    }
  }

  return url;
}

/**
 * Retorna una imagen de respaldo de alta calidad según la categoría del producto
 */
export function getCategoryFallbackImage(category?: string, seed?: string): string {
  const cat = (category || '').toLowerCase();
  if (cat.includes('libro') || cat.includes('text') || cat.includes('lect') || cat.includes('cuaderno') || cat.includes('obra')) {
    return 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80';
  } else if (cat.includes('tec') || cat.includes('comp') || cat.includes('elec') || cat.includes('audio') || cat.includes('cel') || cat.includes('mouse') || cat.includes('cable')) {
    return 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&auto=format&fit=crop&q=80';
  } else {
    return 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=600&auto=format&fit=crop&q=80';
  }
}

/**
 * Controlador de evento onError para elementos <img>
 * Si el servidor externo falla, devuelve 404 o rechaza la conexión,
 * sustituye de inmediato la imagen rota por un fallback elegante.
 */
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  category?: string,
  fallbackSeed?: string
) {
  const target = e.currentTarget;
  target.onerror = null; // Evita loop infinito si el fallback también fallara
  const fallback = getCategoryFallbackImage(category, fallbackSeed);
  if (target.src !== fallback) {
    target.src = fallback;
  }
}
