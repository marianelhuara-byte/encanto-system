/**
 * cartStore.js
 * Gerenciamento do carrinho com persistência em localStorage.
 * Hook useCart para uso em componentes React.
 */

const CART_KEY = 'encanto_cart_v2';

// ── Helpers de persistência ──────────────────────────────────
function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(items) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn('[cartStore] localStorage save failed:', err);
  }
}

function clearCartStorage() {
  try {
    localStorage.removeItem(CART_KEY);
  } catch {}
}

// ── Chave única por item (produto + adicionais + obs) ────────
function makeKey(prod, adicionais = [], obs = '') {
  const adIds = (adicionais || []).map(a => a.id).sort().join(',');
  return `${prod.id}::${adIds}::${(obs || '').slice(0, 40)}`;
}

// ── Hook principal ───────────────────────────────────────────
export function useCart() {
  const [items, setItems] = React.useState(() => loadCart());

  // Persiste sempre que items mudar
  React.useEffect(() => {
    saveCart(items);
  }, [items]);

  /**
   * Adiciona item ao carrinho.
   * Se já existe item idêntico (mesmo produto + adicionais + obs), incrementa qty.
   */
  function addItem(prod, qty = 1, adicionais = [], obs = '') {
    const key = makeKey(prod, adicionais, obs);
    setItems(prev => {
      const existing = prev.find(i => i._key === key);
      if (existing) {
        return prev.map(i =>
          i._key === key ? { ...i, qty: i.qty + qty } : i
        );
      }
      return [...prev, {
        _key: key,
        id:         prod.id,
        nome:       prod.nome,
        preco:      prod.preco,
        preco_promo: prod.preco_promo,
        imagem_url: prod.imagem_url || null,
        categoria_id: prod.categoria_id,
        adicionais: adicionais || [],
        obs:        obs || '',
        qty,
      }];
    });
  }

  /**
   * Remove item pelo _key único.
   */
  function removeItem(key) {
    setItems(prev => prev.filter(i => i._key !== key));
  }

  /**
   * Ajusta quantidade. Se qty chegar a 0, remove o item.
   * @param {string} key
   * @param {number} delta - +1 ou -1
   */
  function updateQty(key, delta) {
    setItems(prev => {
      return prev
        .map(i => i._key === key ? { ...i, qty: i.qty + delta } : i)
        .filter(i => i.qty > 0);
    });
  }

  /**
   * Limpa o carrinho completamente.
   */
  function clearCart() {
    setItems([]);
    clearCartStorage();
  }

  // ── Derivados ────────────────────────────────────────────────
  const count = items.reduce((acc, i) => acc + i.qty, 0);

  const total = items.reduce((acc, i) => {
    const base  = Number(i.preco_promo || i.preco) || 0;
    const adTot = (i.adicionais || []).reduce((s, a) => s + Number(a.preco || 0), 0);
    return acc + (base + adTot) * i.qty;
  }, 0);

  return {
    items,
    count,
    total,
    add:       addItem,
    remove:    removeItem,
    updateQty,
    clear:     clearCart,
  };
}
