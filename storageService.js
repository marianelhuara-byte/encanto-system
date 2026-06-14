/**
 * storageService.js
 * Gerencia upload, leitura e exclusão de imagens no Supabase Storage.
 *
 * REGRAS CRÍTICAS:
 * - NUNCA armazenar base64
 * - SEMPRE armazenar URL pública
 * - NÃO sobrescrever image_url se nenhuma nova imagem for enviada
 * - Imagem existente deve ser preservada na edição do produto
 */

import { db } from './supabaseClient.js';

const BUCKET = 'product-images'; // ✅ CORRIGIDO
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?w=400&q=80&auto=format&fm=webp&fit=crop';

/**
 * Gera nome de arquivo único com timestamp + UUID parcial
 */
function generateFileName(file) {
  const ext  = file.name.split('.').pop().toLowerCase() || 'jpg';
  const ts   = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `product_${ts}_${rand}.${ext}`;
}

/**
 * Valida se uma URL de imagem é válida
 */
export function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return trimmed.length > 0 && (trimmed.startsWith('http://') || trimmed.startsWith('https://'));
}

/**
 * Retorna URL válida ou fallback
 */
export function safeImageUrl(url) {
  return isValidImageUrl(url) ? url : FALLBACK_IMAGE;
}

/**
 * Upload de imagem para Supabase Storage
 */
export async function uploadImage(file) {
  if (!db) {
    console.warn('[storageService] Supabase não disponível');
    return null;
  }

  if (!file || !(file instanceof File)) {
    console.warn('[storageService] Arquivo inválido');
    return null;
  }

  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_SIZE) {
    throw new Error('Imagem muito grande (máx 5MB)');
  }

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Formato inválido (use JPG, PNG, WEBP ou GIF)');
  }

  const fileName = generateFileName(file);
  const filePath = `products/${fileName}`;

  try {
    // 🔼 Upload
    const { error } = await db.storage
      .from(BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      console.error('[storageService] Erro upload:', error.message);
      throw error;
    }

    // 🔗 URL pública
    const { data } = db.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    const publicUrl = data?.publicUrl;

    if (!publicUrl) {
      throw new Error('Falha ao gerar URL pública');
    }

    console.log('[storageService] ✅ Upload OK:', publicUrl);

    return publicUrl;

  } catch (err) {
    console.error('[storageService] uploadImage falhou:', err);
    throw err;
  }
}

/**
 * Retorna URL pública
 */
export function getPublicUrl(path) {
  if (!db) return null;

  try {
    const { data } = db.storage.from(BUCKET).getPublicUrl(path);
    return data?.publicUrl || null;
  } catch (err) {
    console.error('[storageService] getPublicUrl erro:', err);
    return null;
  }
}

/**
 * Deleta imagem pelo URL
 */
export async function deleteImage(publicUrl) {
  if (!db || !isValidImageUrl(publicUrl)) return false;

  try {
    const storagePrefix = `/storage/v1/object/public/${BUCKET}/`;
    const url = new URL(publicUrl);

    const path = url.pathname.includes(storagePrefix)
      ? url.pathname.slice(url.pathname.indexOf(storagePrefix) + storagePrefix.length)
      : null;

    if (!path) {
      console.warn('[storageService] Path inválido');
      return false;
    }

    const { error } = await db.storage
      .from(BUCKET)
      .remove([path]);

    if (error) {
      console.error('[storageService] Erro delete:', error.message);
      return false;
    }

    console.log('[storageService] 🗑️ Imagem removida:', path);

    return true;

  } catch (err) {
    console.error('[storageService] deleteImage falhou:', err);
    return false;
  }
}

export { FALLBACK_IMAGE };