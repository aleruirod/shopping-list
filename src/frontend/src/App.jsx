import { useState, useEffect, useRef } from 'react'
import { api } from './utils/api'
import BarcodeScanner from './components/BarcodeScanner'

const CATEGORIES = ['Dairy','Bakery','Meat & Fish','Fruit & Veg','Frozen','Drinks','Snacks','Household','Personal Care','Other']

export default function App() {
  const [items, setItems] = useState([])
  const [input, setInput] = useState('')
  const [category, setCategory] = useState('Other')
  const [qty, setQty] = useState(1)
  const [scanning, setScanning] = useState(false)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('manual')
  const fileRef = useRef()

  const refresh = async () => {
    try {
      const data = await api.getItems()
      setItems(Array.isArray(data) ? data : [])
    } catch (error) {
      msg(error.message || 'Could not load items', true)
      setItems([])
    }
  }
  useEffect(() => { refresh() }, [])

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const cat_items = items.filter(i => i.category === cat)
    if (cat_items.length) acc[cat] = cat_items
    return acc
  }, {})

  const msg = (text, err) => { setStatus({ text, err }); setTimeout(() => setStatus(''), 3000) }

  const addItem = async (name, cat, barcode) => {
    if (!name.trim()) return
    await api.addItem({ name: name.trim(), category: cat || category, quantity: qty, barcode })
    setInput(''); setQty(1); refresh()
  }

  const handleBarcode = async (code) => {
    setScanning(false)
    setLoading(true)
    msg('Looking up barcode…')
    try {
      const p = await api.scanBarcode(code)
      await addItem(p.name, p.category || 'Other', code)
      msg(`Added: ${p.name}`)
    } catch {
      msg('Product not found — enter name manually', true)
    } finally { setLoading(false) }
  }

  const handlePhoto = async (e, mode) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    msg(mode === 'object' ? 'Identifying product…' : 'Reading handwriting…')
    try {
      if (mode === 'object') {
        const p = await api.recognizeObject(file)
        await addItem(p.name, p.category, null)
        msg(`Added: ${p.name}`)
      } else {
        const r = await api.transcribeHandwriting(file)
        for (const item of r.items) {
          await api.addItem({ name: item.name, category: item.category, quantity: 1 })
        }
        await refresh()
        msg(`Added ${r.items.length} items from your list`)
      }
    } catch (e) {
      msg(e.message || 'Failed — try again', true)
    } finally { setLoading(false); e.target.value = '' }
  }

  const toggle = async (item) => {
    await api.updateItem(item.id, { checked: !item.checked })
    refresh()
  }

  const remove = async (id) => { await api.deleteItem(id); refresh() }
  const clearChecked = async () => { await api.deleteChecked(); refresh() }

  return (
    <div style={s.app}>
      <header style={s.header}>
        <h1 style={s.title}>🛒 Shopping List</h1>
        {items.some(i => i.checked) && (
          <button onClick={clearChecked} style={s.clearBtn}>Remove checked</button>
        )}
      </header>

      {status && (
        <div style={{ ...s.toast, background: status.err ? '#fee' : '#efe', color: status.err ? '#c00' : '#060' }}>
          {status.text}
        </div>
      )}

      {/* Input tabs */}
      <div style={s.card}>
        <div style={s.tabs}>
          {[['manual','✏️ Type'],['barcode','📷 Barcode'],['photo','🖼 Photo'],['handwriting','✍️ Handwriting']].map(([id,label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{ ...s.tab, ...(activeTab === id ? s.tabActive : {}) }}>{label}</button>
          ))}
        </div>

        {activeTab === 'manual' && (
          <div style={s.row}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem(input)}
              placeholder="Item name…" style={s.textInput} />
            <select value={category} onChange={e => setCategory(e.target.value)} style={s.select}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <input type="number" min={1} value={qty} onChange={e => setQty(+e.target.value)} style={s.qtyInput} />
            <button onClick={() => addItem(input)} style={s.addBtn}>Add</button>
          </div>
        )}

        {activeTab === 'barcode' && (
          <div style={s.center}>
            <button onClick={() => setScanning(true)} style={s.bigBtn} disabled={loading}>
              {loading ? 'Looking up…' : '📷 Start scanning'}
            </button>
          </div>
        )}

        {activeTab === 'photo' && (
          <div style={s.center}>
            <label style={s.bigBtn}>
              {loading ? 'Identifying…' : '🖼 Take / upload photo'}
              <input ref={fileRef} type="file" accept="image/*" capture="environment"
                onChange={e => handlePhoto(e, 'object')} style={{ display: 'none' }} />
            </label>
            <p style={s.hint}>Takes a photo of a product and identifies it automatically</p>
          </div>
        )}

        {activeTab === 'handwriting' && (
          <div style={s.center}>
            <label style={s.bigBtn}>
              {loading ? 'Reading…' : '✍️ Photo of handwritten list'}
              <input type="file" accept="image/*" capture="environment"
                onChange={e => handlePhoto(e, 'handwriting')} style={{ display: 'none' }} />
            </label>
            <p style={s.hint}>Reads a handwritten shopping list and adds all items at once</p>
          </div>
        )}
      </div>

      {/* Shopping list by category */}
      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat} style={s.card}>
          <h2 style={s.catTitle}>{cat} <span style={s.badge}>{catItems.filter(i => !i.checked).length}</span></h2>
          {catItems.map(item => (
            <div key={item.id} style={{ ...s.itemRow, opacity: item.checked ? 0.5 : 1 }}>
              <input type="checkbox" checked={item.checked} onChange={() => toggle(item)} style={s.checkbox} />
              <span style={{ ...s.itemName, textDecoration: item.checked ? 'line-through' : 'none' }}>
                {item.name}
                {item.quantity > 1 && <span style={s.qty}> ×{item.quantity}</span>}
              </span>
              <button onClick={() => remove(item.id)} style={s.removeBtn}>✕</button>
            </div>
          ))}
        </div>
      ))}

      {!items.length && <p style={s.empty}>Your list is empty. Add some items above!</p>}

      {scanning && <BarcodeScanner onDetected={handleBarcode} onClose={() => setScanning(false)} />}
    </div>
  )
}

const s = {
  app: { maxWidth: 600, margin: '0 auto', padding: '16px', fontFamily: 'system-ui, sans-serif', background: '#f5f5f5', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { margin: 0, fontSize: 22, fontWeight: 700 },
  card: { background: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  tabs: { display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' },
  tab: { padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#f9f9f9', cursor: 'pointer', fontSize: 13 },
  tabActive: { background: '#1a73e8', color: '#fff', borderColor: '#1a73e8' },
  row: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  textInput: { flex: 2, padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, minWidth: 120 },
  select: { flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, minWidth: 100 },
  qtyInput: { width: 52, padding: '8px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, textAlign: 'center' },
  addBtn: { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#1a73e8', color: '#fff', cursor: 'pointer', fontSize: 14 },
  bigBtn: { display: 'inline-block', padding: '12px 24px', borderRadius: 10, border: 'none', background: '#1a73e8', color: '#fff', cursor: 'pointer', fontSize: 15, textAlign: 'center' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  hint: { margin: 0, fontSize: 12, color: '#888', textAlign: 'center' },
  catTitle: { margin: '0 0 10px', fontSize: 15, fontWeight: 600, color: '#444', display: 'flex', alignItems: 'center', gap: 8 },
  badge: { background: '#eee', borderRadius: 20, padding: '1px 8px', fontSize: 12, color: '#666' },
  itemRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: '1px solid #f0f0f0' },
  checkbox: { width: 18, height: 18, cursor: 'pointer', accentColor: '#1a73e8' },
  itemName: { flex: 1, fontSize: 15 },
  qty: { color: '#888', fontSize: 13 },
  removeBtn: { border: 'none', background: 'none', color: '#bbb', cursor: 'pointer', fontSize: 16, padding: '0 4px' },
  clearBtn: { padding: '6px 14px', borderRadius: 8, border: '1px solid #c00', background: '#fff', color: '#c00', cursor: 'pointer', fontSize: 13 },
  toast: { padding: '10px 16px', borderRadius: 8, marginBottom: 12, fontSize: 14 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40 }
}
