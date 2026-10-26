import { useState, type ReactNode } from 'react'
import { guardarSueno } from './db'
import { duracion } from './logica/fechas'
import { armarSueno, duracionDudosa } from './logica/sueno'

export function Escala({ etiqueta, valor, onChange }: { etiqueta: string; valor?: number; onChange: (v: number) => void }) {
  return (
    <div className="escala">
      <span id={`escala-${etiqueta}`}>{etiqueta}</span>
      <div role="radiogroup" aria-labelledby={`escala-${etiqueta}`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} role="radio" aria-checked={valor === n} onClick={() => onChange(n)}>{n}</button>
        ))}
      </div>
    </div>
  )
}

type Inicial = { acostado: string; levantado: string; calidad?: number }

export function FormSueno({ fecha, inicial, conSiesta, onListo }: { fecha: string; inicial: Inicial; conSiesta?: boolean; onListo?: () => void }) {
  const [acostado, setAcostado] = useState(inicial.acostado)
  const [levantado, setLevantado] = useState(inicial.levantado)
  const [calidad, setCalidad] = useState(inicial.calidad)
  const [siesta, setSiesta] = useState(false)
  const completo = Boolean(acostado && levantado)
  const r = completo ? armarSueno(fecha, acostado, levantado) : null

  async function guardar() {
    if (!r) return
    if (duracionDudosa(r.duracionMin) && !confirm(`Son ${duracion(r.duracionMin)} de sueño. ¿Guardar igual?`)) return
    await guardarSueno({ ...r, calidad, esSiesta: siesta })
    onListo?.()
  }

  return (
    <div className="form-sueno">
      <div className="horas">
        <label>{siesta ? 'Me dormí' : 'Me acosté'}<input type="time" value={acostado} onChange={(e) => setAcostado(e.target.value)} /></label>
        <label>{siesta ? 'Me desperté' : 'Me levanté'}<input type="time" value={levantado} onChange={(e) => setLevantado(e.target.value)} /></label>
        <output>{r ? duracion(r.duracionMin) : '—'}</output>
      </div>
      <Escala etiqueta="Calidad" valor={calidad} onChange={(n) => setCalidad(calidad === n ? undefined : n)} />
      {conSiesta && (
        <label className="interruptor"><input type="checkbox" checked={siesta} onChange={(e) => setSiesta(e.target.checked)} /> Es una siesta</label>
      )}
      <button className="primario" disabled={!completo} onClick={guardar}>{siesta ? 'Guardar siesta' : 'Guardar sueño'}</button>
    </div>
  )
}

/** Barra de progreso contra una meta, con la cifra a la derecha. */
export function Barra({ etiqueta, valor, meta, unidad = '' }: { etiqueta: string; valor: number; meta?: number; unidad?: string }) {
  return (
    <div className="barra-meta">
      <span>{etiqueta}</span>
      <span className="cifra">{Math.round(valor).toLocaleString('es-AR')}{meta ? ` de ${Math.round(meta).toLocaleString('es-AR')}` : ''} {unidad}</span>
      <progress max={meta || 1} value={meta ? Math.min(valor, meta) : 0} aria-hidden />
    </div>
  )
}

/** Línea simple de una serie (tendencia de peso). */
export function Linea({ valores, etiqueta }: { valores: number[]; etiqueta: string }) {
  if (valores.length < 2) return null
  const min = Math.min(...valores), max = Math.max(...valores), rango = max - min || 1
  const puntos = valores.map((v, i) => `${(i / (valores.length - 1)) * 100},${28 - ((v - min) / rango) * 26}`).join(' ')
  return (
    <svg className="linea" viewBox="0 0 100 30" preserveAspectRatio="none" role="img" aria-label={etiqueta}>
      <polyline points={puntos} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** Encabezado de una subpantalla con vuelta atrás. */
export function Volver({ titulo, onVolver, accion }: { titulo: string; onVolver: () => void; accion?: ReactNode }) {
  return (
    <header className="barra">
      <div>
        <button className="link volver" onClick={onVolver}>‹ Volver</button>
        <h1>{titulo}</h1>
      </div>
      {accion}
    </header>
  )
}
