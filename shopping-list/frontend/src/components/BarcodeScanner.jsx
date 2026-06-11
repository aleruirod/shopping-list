import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/library'

export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader

    reader.decodeFromVideoDevice(null, videoRef.current, (result, err) => {
      if (result) {
        reader.reset()
        onDetected(result.getText())
      }
    }).catch(e => setError('Camera access denied. Please allow camera permissions.'))

    return () => reader.reset()
  }, [])

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <p style={styles.hint}>Point camera at barcode</p>
        {error ? (
          <p style={styles.error}>{error}</p>
        ) : (
          <video ref={videoRef} style={styles.video} />
        )}
        <button onClick={onClose} style={styles.close}>Cancel</button>
      </div>
    </div>
  )
}

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#fff', borderRadius: 16, padding: 24, width: 340, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' },
  hint: { margin: 0, fontSize: 14, color: '#555' },
  video: { width: '100%', borderRadius: 8, background: '#000' },
  error: { color: '#c00', fontSize: 14 },
  close: { padding: '8px 24px', borderRadius: 8, border: 'none', background: '#eee', cursor: 'pointer', fontSize: 14 }
}
