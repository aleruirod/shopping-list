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
  const [photoName, setPhotoName] = useState('')
  const [photoCategory, setPhotoCategory] = useState('Other')
  const [photoQty, setPhotoQty] = useState(1)
  const fileRef = useRef()

  const [bucketPhotos, setBucketPhotos] = useState([])
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [photoZoom, setPhotoZoom] = useState(1)

  const refresh = async () => {
    try {
      const data = await api.getItems()
      setItems(Array.isArray(data) ? data : [])
    } catch (error) {
      msg(error.message || 'Could not load items', true)
      setItems([])
    }
  }

  const refreshBucketPhotos = async () => {
    try {
      const data = await api.getBucketPhotos()
      setBucketPhotos(Array.isArray(data) ? data : [])
    } catch (_) {
      setBucketPhotos([])
    }
  }

  const openPhoto = (src) => {
    setSelectedPhoto(src)
    setPhotoZoom(1)
  }

  const closePhoto = () => {
    setSelectedPhoto(null)
    setPhotoZoom(1)
  }

  const zoomIn = () => setPhotoZoom(z => Math.min(z + 0.25, 3))
  const zoomOut = () => setPhotoZoom(z => Math.max(z - 0.25, 0.5))
  const resetZoom = () => setPhotoZoom(1)

  useEffect(() => { refresh(); refreshBucketPhotos() }, [])

  const grouped = items.reduce((acc, item) => {
    const cat = item.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const orderedCategories = Object.keys(grouped).sort((a, b) => {
    const indexA = CATEGORIES.indexOf(a)
    const indexB = CATEGORIES.indexOf(b)
    if (indexA !== -1 || indexB !== -1) return (indexA === -1 ? 1 : indexA) - (indexB === -1 ? 1 : indexB)
    return a.localeCompare(b)
  })

  const msg = (text, err) => { setStatus({ text, err }); setTimeout(() => setStatus(''), 3000) }

  const addItem = async (name, cat, barcode, photo, quantity = qty) => {
    if (!name.trim()) return
    await api.addItem({ name: name.trim(), category: cat || category, quantity, barcode, photo })
    setInput(''); setQty(1); setPhotoName(''); setPhotoQty(1); setPhotoCategory('Other');
    await refresh()
    refreshBucketPhotos()
  }

  const handleBarcode = async (code) => {
    setScanning(false)
    setLoading(true)
    msg('Looking up barcode…')
    try {
      const p = await api.scanBarcode(code)
      await addItem(p.name, p.category || 'Other', code, null)
      msg(`Added: ${p.name}`)
    } catch (e) {
      msg(e.message || 'Product not found — enter name manually', true)
    } finally { setLoading(false) }
  }

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!photoName.trim()) {
      msg('Enter a name for the photo item', true)
      return
    }
    setLoading(true)
    msg('Uploading photo item…')
    try {
      const reader = new FileReader()
      const photoData = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      await addItem(photoName, photoCategory, null, photoData, photoQty)
      msg(`Added: ${photoName}`)
    } catch (e) {
      msg(e.message || 'Failed to upload photo item', true)
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
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
          {[['manual','✏️ Type'],['barcode','📷 Barcode'],['photo','🖼 Photo']].map(([id,label]) => (
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
          <div style={s.row}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <input value={photoName} onChange={e => setPhotoName(e.target.value)}
                placeholder="Item name…" style={s.textInput} />
              <select value={photoCategory} onChange={e => setPhotoCategory(e.target.value)} style={s.select}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <input type="number" min={1} value={photoQty} onChange={e => setPhotoQty(+e.target.value)} style={s.qtyInput} />
            </div>
            <div style={s.center}>
              <label style={s.bigBtn}>
                {loading ? 'Uploading…' : '🖼 Upload photo'}
                <input ref={fileRef} type="file" accept="image/*" capture="environment"
                  onChange={handlePhoto} style={{ display: 'none' }} />
              </label>
              <p style={s.hint}>Add a photo for the item you want on the list</p>
            </div>
          </div>
        )}
      </div>

      {/* Shopping list by category */}
      {orderedCategories.map(cat => (
        <div key={cat} style={s.card}>
          <h2 style={s.catTitle}>{cat} <span style={s.badge}>{grouped[cat].filter(i => !i.checked).length}</span></h2>
          {grouped[cat].map(item => (
            <div key={item.id} style={{ ...s.itemRow, opacity: item.checked ? 0.5 : 1 }}>
              <input type="checkbox" checked={item.checked} onChange={() => toggle(item)} style={s.checkbox} />
              <div style={s.itemContent}>
                <span style={{ ...s.itemName, textDecoration: item.checked ? 'line-through' : 'none' }}>
                  {item.name}
                  {item.quantity > 1 && <span style={s.qty}> ×{item.quantity}</span>}
                </span>
                {item.photo && (
                  <img
                    src={api.getPhotoUrl(item.photo)}
                    alt={item.name}
                    style={s.thumbnail}
                    onClick={() => openPhoto(api.getPhotoUrl(item.photo))}
                  />
                )}
              </div>
              <button onClick={() => remove(item.id)} style={s.removeBtn}>✕</button>
            </div>
          ))}
        </div>
      ))}

      {!items.length && <p style={s.empty}>Your list is empty. Add some items above!</p>}

      {bucketPhotos.length > 0 && (
        <div style={s.card}>
          <h2 style={s.catTitle}>Bucket photos</h2>
          <div style={s.photoGrid}>
            {bucketPhotos.map(key => (
              <img
                key={key}
                src={api.getPhotoUrl(key)}
                alt="Bucket photo"
                style={s.bucketThumbnail}
                onClick={() => openPhoto(api.getPhotoUrl(key))}
              />
            ))}
          </div>
        </div>
      )}

      {selectedPhoto && (
        <div style={s.lightboxOverlay} onClick={closePhoto}>
          <div style={s.lightboxContent} onClick={e => e.stopPropagation()}>
            <button onClick={closePhoto} style={s.lightboxClose}>✕</button>
            <div style={s.lightboxControls}>
              <button onClick={zoomOut} style={s.lightboxButton}>−</button>
              <span style={s.lightboxLabel}>{photoZoom.toFixed(2)}×</span>
              <button onClick={zoomIn} style={s.lightboxButton}>+</button>
              <button onClick={resetZoom} style={s.lightboxReset}>Reset</button>
            </div>
            <div style={s.lightboxImageWrapper}>
              <img src={selectedPhoto} alt="Enlarged" style={{ ...s.lightboxImage, transform: `scale(${photoZoom})` }} />
            </div>
          </div>
        </div>
      )}

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
  itemContent: { flex: 1, display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 },
  itemName: { flex: 1, fontSize: 15, minWidth: 0 },
  thumbnail: { width: 56, height: 56, objectFit: 'cover', borderRadius: 12, border: '1px solid #eee' },
  bucketThumbnail: { width: 100, height: 100, objectFit: 'cover', borderRadius: 12, border: '1px solid #eee', cursor: 'pointer' },
  photoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10 },
  lightboxOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  lightboxContent: { position: 'relative', maxWidth: '90vw', maxHeight: '90vh', width: '100%', background: '#111', borderRadius: 16, padding: 18, boxShadow: '0 12px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: 14 },
  lightboxClose: { position: 'absolute', top: 12, right: 12, border: 'none', background: '#fff', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16, fontWeight: 700 },
  lightboxControls: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  lightboxButton: { padding: '8px 14px', borderRadius: 10, border: 'none', background: '#1a73e8', color: '#fff', cursor: 'pointer' },
  lightboxReset: { padding: '8px 14px', borderRadius: 10, border: 'none', background: '#fff', color: '#1a73e8', cursor: 'pointer', fontWeight: 600 },
  lightboxLabel: { color: '#fff', fontWeight: 600 },
  lightboxImageWrapper: { flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  lightboxImage: { maxWidth: '100%', maxHeight: '80vh', transition: 'transform 0.2s ease', cursor: 'grab' },
  qty: { color: '#888', fontSize: 13 },
  removeBtn: { border: 'none', background: 'none', color: '#bbb', cursor: 'pointer', fontSize: 16, padding: '0 4px' },
  clearBtn: { padding: '6px 14px', borderRadius: 8, border: '1px solid #c00', background: '#fff', color: '#c00', cursor: 'pointer', fontSize: 13 },
  toast: { padding: '10px 16px', borderRadius: 8, marginBottom: 12, fontSize: 14 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40 }
}
