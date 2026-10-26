import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { BLOQUES, db, diasRestantes, exportarBackup, importarBackup, type Perfil, type Suplemento } from '../db'
import { ahoraLocal, ddmmaaaa } from '../logica/fechas'

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

/** Campo numérico que guarda al salir; ignora valores fuera de rango. */
function Numero({ etiqueta, valor, min = 0, onGuardar }: { etiqueta: string; valor: number; min?: number; onGuardar: (n: number) => void }) {
  return (
    <label>
      {etiqueta}
      <input
        key={valor}
        type="number"
        inputMode="decimal"
        defaultValue={valor}
        onBlur={(e) => {
          const n = Number(e.target.value)
          if (e.target.value !== '' && n >= min && n !== valor) onGuardar(n)
          else e.target.value = String(valor)
        }}
      />
    </label>
  )
}

function FichaSuplemento({ s, habitos }: { s: Suplemento; habitos: { id: number; nombre: string }[] }) {
  const up = (c: Partial<Suplemento>) => db.suplementos.update(s.id, c)
  const d = diasRestantes(s)
  return (
    <li className="ficha">
      <div className="ficha-cabeza">
        <input className="titulo-input" aria-label="Nombre del suplemento" defaultValue={s.nombre} onBlur={(e) => e.target.value.trim() && up({ nombre: e.target.value.trim() })} />
        <span className={d <= s.avisarConDias ? 'alerta' : ''}>{d} {d === 1 ? 'día' : 'días'}</span>
      </div>
      <div className="fila-campos">
        <Numero etiqueta={`Stock (${s.presentacion})`} valor={Math.max(0, s.stockActual)} onGuardar={(n) => up({ stockActual: n })} />
        <Numero etiqueta="Dosis diaria" valor={s.dosisDiaria} min={0.001} onGuardar={(n) => up({ dosisDiaria: n })} />
        <Numero etiqueta="Envase" valor={s.cantidadEnvase} min={0.001} onGuardar={(n) => up({ cantidadEnvase: n })} />
        <Numero etiqueta="Avisar con días" valor={s.avisarConDias} onGuardar={(n) => up({ avisarConDias: Math.round(n) })} />
        <label>
          Presentación
          <select value={s.presentacion} onChange={(e) => up({ presentacion: e.target.value as Suplemento['presentacion'] })}>
            <option value="g">gramos</option>
            <option value="cápsulas">cápsulas</option>
            <option value="ml">ml</option>
          </select>
        </label>
        <label>
          Descuenta al marcar
          <select value={s.habitoId ?? ''} onChange={(e) => up({ habitoId: e.target.value ? Number(e.target.value) : undefined })}>
            <option value="">Ningún hábito</option>
            {habitos.map((h) => <option key={h.id} value={h.id}>{h.nombre}</option>)}
          </select>
        </label>
      </div>
      <div className="acciones">
        <button className="secundario" onClick={() => up({ stockActual: Math.max(0, s.stockActual) + s.cantidadEnvase })}>Compré un envase</button>
        <button className="link peligro" onClick={() => confirm(`¿Borrar ${s.nombre}?`) && db.suplementos.delete(s.id)}>Borrar</button>
      </div>
    </li>
  )
}

export function Ajustes({ perfil }: { perfil: Perfil }) {
  const suplementos = useLiveQuery(() => db.suplementos.toArray(), [], [])
  const habitos = useLiveQuery(() => db.habitos.filter((h) => !h.archivado).toArray(), [], [])
  const [pendiente, setPendiente] = useState<{ json: unknown; exportadoEn?: string } | null>(null)
  const [mensaje, setMensaje] = useState<{ texto: string; error?: boolean } | null>(null)
  const up = (c: Partial<Perfil>) => db.perfil.update('yo', c)

  function moverBloque(i: number, d: -1 | 1) {
    const b = [...perfil.bloques]
    ;[b[i], b[i + d]] = [b[i + d], b[i]]
    up({ bloques: b })
  }

  async function exportar() {
    const nombre = `rumbo-backup-${ahoraLocal().slice(0, 10)}.json`
    const archivo = new File([JSON.stringify(await exportarBackup())], nombre, { type: 'application/json' })
    if (navigator.canShare?.({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo] })
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
        throw e
      }
    } else {
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(archivo), download: nombre })
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    }
    await up({ ultimoBackup: new Date().toISOString() })
    setMensaje({ texto: 'Backup exportado.' })
  }

  async function leerArchivo(f: File) {
    try {
      const json = JSON.parse(await f.text())
      setPendiente({ json, exportadoEn: typeof json?.exportadoEn === 'string' ? json.exportadoEn : undefined })
      setMensaje(null)
    } catch {
      setMensaje({ texto: 'No se pudo leer el archivo. Elegí un backup .json exportado desde Rumbo.', error: true })
    }
  }

  async function importar(modo: 'reemplazar' | 'fusionar') {
    if (!pendiente) return
    if (modo === 'reemplazar' && !confirm('Se borran todos tus datos actuales y se reemplazan por los del backup. ¿Seguir?')) return
    try {
      const fallidas = await importarBackup(pendiente.json, modo)
      setMensaje({ texto: fallidas ? `Backup importado. ${fallidas} registros chocaban con los actuales y se dejaron como estaban.` : 'Backup importado.' })
    } catch (e) {
      setMensaje({ texto: (e as Error).message, error: true })
    }
    setPendiente(null)
  }

  return (
    <div className="pantalla">
      <header className="barra"><h1>Ajustes</h1></header>

      <section aria-labelledby="t-perfil">
        <h2 id="t-perfil">Perfil</h2>
        <label>Tu nombre<input key={perfil.nombre} defaultValue={perfil.nombre} onBlur={(e) => up({ nombre: e.target.value.trim() })} /></label>
        <label>
          El día termina a las
          <select value={perfil.corteHora} onChange={(e) => up({ corteHora: Number(e.target.value) })}>
            {[0, 1, 2, 3, 4, 5, 6].map((h) => <option key={h} value={h}>{hhmm(h * 60)}</option>)}
          </select>
          <small>Lo que registres antes de esa hora cuenta para el día anterior.</small>
        </label>
        <label>
          Meta de sueño
          <input type="time" value={hhmm(perfil.metaSuenoMin)} onChange={(e) => {
            const [h, m] = e.target.value.split(':').map(Number)
            if (h * 60 + m > 0) up({ metaSuenoMin: h * 60 + m })
          }} />
        </label>
      </section>

      <section aria-labelledby="t-bloques">
        <h2 id="t-bloques">Pantalla Hoy</h2>
        <ul className="lista bloques">
          {perfil.bloques.map((b, i) => (
            <li key={b.id}>
              <label className="interruptor">
                <input type="checkbox" checked={b.visible} onChange={(e) => up({ bloques: perfil.bloques.map((x) => (x.id === b.id ? { ...x, visible: e.target.checked } : x)) })} />
                {BLOQUES[b.id]}
              </label>
              <span className="orden">
                <button aria-label={`Subir ${BLOQUES[b.id]}`} disabled={i === 0} onClick={() => moverBloque(i, -1)}>↑</button>
                <button aria-label={`Bajar ${BLOQUES[b.id]}`} disabled={i === perfil.bloques.length - 1} onClick={() => moverBloque(i, 1)}>↓</button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="t-suplementos">
        <h2 id="t-suplementos">Suplementos</h2>
        <ul className="fichas">
          {suplementos.map((s) => <FichaSuplemento key={s.id} s={s} habitos={habitos} />)}
        </ul>
        <button className="secundario" onClick={() => db.suplementos.add({ nombre: 'Nuevo suplemento', presentacion: 'cápsulas', cantidadEnvase: 60, dosisDiaria: 1, stockActual: 0, avisarConDias: 5 })}>
          Agregar suplemento
        </button>
      </section>

      <section aria-labelledby="t-backup">
        <h2 id="t-backup">Backup</h2>
        <p className="ayuda">
          Tus datos viven solo en este iPhone. Exportá un backup y guardalo en Archivos o iCloud Drive.
          {perfil.ultimoBackup ? ` Último backup: ${ddmmaaaa(perfil.ultimoBackup.slice(0, 10))}.` : ' Todavía no hiciste ninguno.'}
        </p>
        <button className="primario" onClick={exportar}>Exportar backup</button>
        <label className="archivo secundario">
          Importar backup
          <input type="file" accept="application/json,.json" onChange={(e) => { const f = e.target.files?.[0]; if (f) leerArchivo(f); e.target.value = '' }} />
        </label>
        {pendiente && (
          <div className="confirmar" role="dialog" aria-label="Importar backup">
            <p>Backup{pendiente.exportadoEn ? ` del ${ddmmaaaa(pendiente.exportadoEn.slice(0, 10))}` : ''}. ¿Cómo lo importo?</p>
            <button className="primario" onClick={() => importar('fusionar')}>Sumar a mis datos</button>
            <button className="secundario" onClick={() => importar('reemplazar')}>Reemplazar todo</button>
            <button className="link" onClick={() => setPendiente(null)}>Cancelar</button>
          </div>
        )}
        {mensaje && <p className={mensaje.error ? 'error' : 'ok'} role="status">{mensaje.texto}</p>}
      </section>
    </div>
  )
}
