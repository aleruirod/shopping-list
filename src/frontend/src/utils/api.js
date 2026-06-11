const BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '/api'
const makeUrl = (path) => `${BASE}${path.startsWith('/') ? path : `/${path}`}`

export const api = {
  getItems: () => fetch(makeUrl('/items/')).then(r => {
    if (!r.ok) throw new Error('Failed to load items')
    return r.json()
  }),

  addItem: (item) => fetch(makeUrl('/items/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  }).then(r => {
    if (!r.ok) throw new Error('Failed to add item')
    return r.json()
  }),

  updateItem: (id, update) => fetch(makeUrl(`/items/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update)
  }).then(r => {
    if (!r.ok) throw new Error('Failed to update item')
    return r.json()
  }),

  deleteItem: (id) => fetch(makeUrl(`/items/${id}`), { method: 'DELETE' }),

  deleteChecked: () => fetch(makeUrl('/items/checked/all'), { method: 'DELETE' }),

  scanBarcode: (barcode) => fetch(makeUrl(`/scan/${barcode}`)).then(async r => {
    if (!r.ok) {
      let errorText = 'Product not found'
      try {
        const data = await r.json()
        if (data?.detail) errorText = data.detail
      } catch {}
      throw new Error(errorText)
    }
    return r.json()
  }),
}
