const BASE = import.meta.env.VITE_API_URL || ''

export const api = {
  getItems: () => fetch(`${BASE}/items/`).then(r => r.json()),

  addItem: (item) => fetch(`${BASE}/items/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  }).then(r => r.json()),

  updateItem: (id, update) => fetch(`${BASE}/items/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update)
  }).then(r => r.json()),

  deleteItem: (id) => fetch(`${BASE}/items/${id}`, { method: 'DELETE' }),

  deleteChecked: () => fetch(`${BASE}/items/checked/all`, { method: 'DELETE' }),

  scanBarcode: (barcode) => fetch(`${BASE}/scan/${barcode}`).then(r => {
    if (!r.ok) throw new Error('Product not found')
    return r.json()
  }),

  recognizeObject: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return fetch(`${BASE}/vision/recognize`, { method: 'POST', body: fd }).then(r => {
      if (!r.ok) throw new Error('Recognition failed')
      return r.json()
    })
  },

  transcribeHandwriting: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return fetch(`${BASE}/vision/handwriting`, { method: 'POST', body: fd }).then(r => {
      if (!r.ok) throw new Error('Transcription failed')
      return r.json()
    })
  }
}
