/**
 * productService.js
 * CRUD completo de produtos com validação de image_url.
 *
 * REGRAS:
 * - image_url nunca pode ser undefined ou base64
 * - Na edição, se image_url não for fornecida, mantém a existente
 * - Sempre retorna string válida ou null para image_url
 */

import { db } from './supabaseClient.js';
import { isValidImageUrl } from './storageService.js';

const TABLE = 'products';

/**
 * Sanitiza os dados do produto antes de persistir.
 * Garante que image_url seja sempre string válida ou null.
 * NUNCA aceita base64 ou string vazia.
 */
function sanitizeProduct(data) {
  const sanitized = { ...data };

  // image_url: só aceita URL válida
  if ('image_url' in sanitized) {
    const url = sanitized.image_url;
    if (!url || typeof url !== 'string' || url.trim() === '' || url.startsWith('data:')) {
      sanitized.image_url = null;
    } else {
      sanitized.image_url = url.trim();
    }
  }

  // Garante tipos corretos
  if ('preco' in sanitized)      sanitized.preco      = Number(sanitized.preco)      || 0;
  if ('preco_promo' in sanitized) sanitized.preco_promo = sanitized.preco_promo ? Number(sanitized.preco_promo) : null;
  if ('adicionais_gratis' in sanitized) sanitized.adicionais_gratis = Number(sanitized.adicionais_gratis) || 0;
  if ('disponivel' in sanitized) sanitized.disponivel = Boolean(sanitized.disponivel);
  if ('destaque' in sanitized)   sanitized.destaque   = Boolean(sanitized.destaque);
  if ('badge' in sanitized)      sanitized.badge      = sanitized.badge || null;

  return sanitized;
}

/**
 * Busca todos os products ordenados por nome.
 * @returns {Promise<Array>}
 */
export async function getProducts() {
  if (!db) return null;
  try {
    const { data, error } = await db
      .from(TABLE)
      .select('*')
      .order('nome');

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[productService] getProducts error:', err);
    return null;
  }
}

/**
 * Cria um novo produto.
 * @param {Object} data - Dados do produto (sem id)
 * @returns {Promise<Object|null>}
 */
export async function createProduct(data) {
  if (!db) return null;
  if (!data.nome || !data.preco) {
    throw new Error('Nome e preço são obrigatórios.');
  }
  try {
    const payload = sanitizeProduct(data);
    const { data: created, error } = await db
      .from(TABLE)
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    console.log('[productService] ✅ Produto criado:', created.id);
    return created;
  } catch (err) {
    console.error('[productService] createProduct error:', err);
    throw err;
  }
}

/**
 * Atualiza um produto existente.
 *
 * REGRA CRÍTICA DE IMAGEM:
 * Se `data.image_url` não for fornecida (undefined), preserva a imagem existente.
 * Só substitui se uma nova URL válida for explicitamente passada.
 *
 * @param {string} id - ID do produto
 * @param {Object} data - Campos a atualizar
 * @returns {Promise<Object|null>}
 */
export async function updateProduct(id, data) {
  if (!db) return null;
  if (!id) throw new Error('ID do produto é obrigatório.');

  try {
    let payload = { ...data };

    // REGRA CRÍTICA: Se image_url não veio no payload, não inclui no UPDATE
    // para não sobrescrever a imagem existente com null
    if (!('image_url' in payload) || payload.image_url === undefined) {
      delete payload.image_url;
    }

    payload = sanitizeProduct(payload);

    const { data: updated, error } = await db
      .from(TABLE)
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    console.log('[productService] ✅ Produto atualizado:', id);
    return updated;
  } catch (err) {
    console.error('[productService] updateProduct error:', err);
    throw err;
  }
}

/**
 * Alterna disponibilidade de um produto.
 * @param {string} id
 * @param {boolean} disponivel
 */
export async function toggleProduct(id, disponivel) {
  if (!db) return null;
  try {
    const { error } = await db
      .from(TABLE)
      .update({ disponivel: Boolean(disponivel) })
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[productService] toggleProduct error:', err);
    return false;
  }
}

/**
 * Exclui um produto pelo ID.
 * @param {string} id
 */
export async function deleteProduct(id) {
  if (!db) return false;
  try {
    const { error } = await db.from(TABLE).delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[productService] deleteProduct error:', err);
    return false;
  }
}

/**
 * Upsert (cria ou atualiza) produto — mantém compatibilidade com DS.upsertProd.
 * @param {Object} data
 * @param {string|null} id - null = criar novo
 */
export async function upsertProduct(data, id = null) {
  if (id) return updateProduct(id, data);
  return createProduct(data);
}
