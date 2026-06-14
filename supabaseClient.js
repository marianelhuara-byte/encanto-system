/**
 * supabaseClient.js
 * Inicializa e exporta o cliente Supabase reutilizável.
 * Configuração via variáveis de ambiente (window.ENCANTO_CONFIG) ou fallback.
 */

const SUPA_URL = window.ENCANTO_CONFIG?.SUPA_URL || 'https://hvbcdxsagkjtfjwvnslo.supabase.co';
const SUPA_KEY = window.ENCANTO_CONFIG?.SUPA_KEY || 'sb_publishable_xww9VFLNrybDLbAdfTEdYA_8GaH1wct';

let _client = null;

export function getSupabaseClient() {
  if (_client) return _client;
  try {
    _client = window.supabase.createClient(SUPA_URL, SUPA_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
      global: {
        headers: {
          'apikey': SUPA_KEY,
          'Authorization': 'Bearer ' + SUPA_KEY,
        }
      }
    });
    console.log('[Encanto] ✅ Supabase conectado');
  } catch (e) {
    console.warn('[Encanto] ❌ Supabase init error:', e.message);
    _client = null;
  }
  return _client;
}

export const db = getSupabaseClient();
export { SUPA_URL, SUPA_KEY };
