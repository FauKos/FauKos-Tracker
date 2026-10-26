import { useState, type CSSProperties, type ReactNode } from 'react'
import { guardarSueno } from './db'
import { duracion, num } from './logica/fechas'
import { armarSueno, duracionDudosa } from './logica/sueno'

// ---------- Señalética: líneas e íconos ----------

/** Cada parte de la app es una línea, con su color y su letra (como el Subte). */
export type LineaId = 'comida' | 'habitos' | 'agua' | 'sueno' | 'peso' | 'premios' | 'animo'
export const LETRA: Record<LineaId, string> = { comida: 'C', habitos: 'H', agua: 'A', sueno: 'S', peso: 'P', premios: 'N', animo: 'Á' }
export const linea = (l: LineaId) => ({ '--l': `var(--${l})`, '--lt': `var(--${l}-t)` }) as CSSProperties

export function Letra({ l }: { l: LineaId }) {
  return <span className="letra" style={linea(l)} aria-hidden>{LETRA[l]}</span>
}

/** Título de cartel: la letra de la línea y el nombre. */
export function Titulo({ l, id, children, extra }: { l: LineaId; id?: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <h2 className="titulo" id={id}>
      <Letra l={l} />
      <span>{children}</span>
      {extra && <small>{extra}</small>}
    </h2>
  )
}

const TRAZOS = {
  hoy: 'M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z',
  comida: 'M7 3v18M4.5 3v5.5a2.5 2.5 0 0 0 5 0V3M17 21V3c-2.5 1.5-3.5 4.5-3.5 7.5 0 1.5 1 2.5 3.5 2.5',
  cuerpo: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8 10a5.5 5.5 0 0 1 8 0M12 13l1.5-3',
  premios: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5v1.5A2.5 2.5 0 0 0 7.5 10M16 6h3v1.5a2.5 2.5 0 0 1-2.5 2.5M12 13v3.5M8.5 20h7M9.5 16.5h5V20h-5z',
  mas: 'M5 12h.01M12 12h.01M19 12h.01',
  atras: 'M15 5l-7 7 7 7',
  siguiente: 'M9 5l7 7-7 7',
  arriba: 'M5 15l7-7 7 7',
  abajo: 'M5 9l7 7 7-7',
  sumar: 'M12 5v14M5 12h14',
  restar: 'M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  cerrar: 'M6 6l12 12M18 6 6 18',
  estrella: 'M12 4l2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z',
  regalo: 'M4 10.5h16V20H4zM3 7h18v3.5H3zM12 7v13M12 7C10.5 4 7 4 7 5.7S9.5 7 12 7c2.5 0 5 .4 5-1.3S13.5 4 12 7',
  // Hábitos
  gota: 'M12 3.5c3.2 4.2 6 7.4 6 10.6a6 6 0 0 1-12 0c0-3.2 2.8-6.4 6-10.6z',
  capsula: 'M10.6 19.8a4 4 0 0 1-5.6-5.7l8.4-8.4a4 4 0 0 1 5.7 5.7zM9.2 9.9l4.9 4.9',
  pesa: 'M7 6.5v11M17 6.5v11M4 9v6M20 9v6M7 12h10',
  proteina: 'M12 3.5c3.4 0 6 5.6 6 9.6a6 6 0 0 1-12 0c0-4 2.6-9.6 6-9.6z',
  libro: 'M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z',
  luna: 'M19.5 14.5A7.5 7.5 0 1 1 9.5 4.5a6 6 0 0 0 10 10z',
  pasos: 'M7 4c1.7 0 2.5 2 2.5 4.5S8.6 13 7 13s-2.5-1.8-2.5-4.5S5.3 4 7 4zM5 15.5h4M17 8c1.7 0 2.5 2 2.5 4.5S18.6 17 17 17s-2.5-1.8-2.5-4.5S15.3 8 17 8zM15 19.5h4',
  hoja: 'M5 19C5 11 11 5 19 5c0 8-6 14-14 14zM5 19l7-7',
  lapiz: 'M4 20l4-1L19 8l-3-3L5 16zM14 7l3 3',
  corazon: 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z',
  objetivo: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM8 12.5l3 3 5-6',
} as const
export type IconoId = keyof typeof TRAZOS

/** Íconos para elegir en cada hábito. */
export const ICONOS_HABITO = ['objetivo', 'gota', 'capsula', 'pesa', 'proteina', 'libro', 'luna', 'pasos', 'hoja', 'lapiz', 'corazon'] as const satisfies readonly IconoId[]
export type IconoHabito = (typeof ICONOS_HABITO)[number]
// Hábitos creados con la versión anterior guardaban un emoji.
const DE_EMOJI: Record<string, IconoHabito> = { '💧': 'gota', '🥄': 'capsula', '💊': 'capsula', '🏋️': 'pesa', '🥩': 'proteina', '📖': 'libro', '📚': 'libro' }
export const iconoDe = (icono: string): IconoHabito =>
  (ICONOS_HABITO as readonly string[]).includes(icono) ? (icono as IconoHabito) : DE_EMOJI[icono] ?? 'objetivo'

/** Íconos dibujados en un solo trazo. */
export function Icono({ i, tam = 24 }: { i: IconoId; tam?: number }) {
  return (
    <svg className={`icono-svg i-${i}`} width={tam} height={tam} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path d={TRAZOS[i]} />
    </svg>
  )
}

/**
 * La firma: un recorrido con estaciones que se encienden en el color de la línea.
 * La vía se ilumina solo entre dos estaciones hechas; las estaciones "fuera" (días que no tocan) quedan cerradas.
 */
export function Recorrido({ l, estaciones, etiqueta, compacto }: { l: LineaId; estaciones: { nombre: string; hecho: boolean; proxima?: boolean; fuera?: boolean }[]; etiqueta: string; compacto?: boolean }) {
  return (
    <ol className={`recorrido${compacto ? ' compacto' : ''}`} style={{ ...linea(l), '--n': estaciones.length } as CSSProperties} aria-label={etiqueta}>
      {estaciones.map((e, i) => (
        <li key={i} className={`${e.hecho ? 'hecho' : ''}${e.proxima ? ' proxima' : ''}${e.fuera && !e.hecho ? ' fuera' : ''}`}>
          <i aria-hidden />
          <span>{e.nombre}<span className="sr-only">{e.hecho ? ': hecho' : e.fuera ? ': no toca' : ': pendiente'}</span></span>
        </li>
      ))}
    </ol>
  )
}

// ---------- Controles ----------

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
      </div>
      <p className="duracion">{r ? <>Dormiste <strong>{duracion(r.duracionMin)}</strong></> : 'Completá las dos horas'}</p>
      <Escala etiqueta="Calidad" valor={calidad} onChange={(n) => setCalidad(calidad === n ? undefined : n)} />
      {conSiesta && (
        <label className="interruptor"><input type="checkbox" checked={siesta} onChange={(e) => setSiesta(e.target.checked)} /> Es una siesta</label>
      )}
      <button className="primario" style={linea('sueno')} disabled={!completo} onClick={guardar}>{siesta ? 'Guardar siesta' : 'Guardar sueño'}</button>
    </div>
  )
}

/** Macro contra su meta: cifra arriba, barra fina abajo. Misma escala todos los días. */
export function Barra({ etiqueta, valor, meta, unidad = '', l = 'comida' }: { etiqueta: string; valor: number; meta?: number; unidad?: string; l?: LineaId }) {
  return (
    <div className="barra-meta" style={linea(l)}>
      <span className="nombre">{etiqueta}</span>
      <span className="cifra"><b>{num(valor)}</b>{meta ? ` / ${num(meta)}` : ''} {unidad}</span>
      <span className="pista" aria-hidden><i style={{ width: `${meta ? Math.min(100, (valor / meta) * 100) : 0}%` }} /></span>
    </div>
  )
}

/** Gráfico de una serie (tendencia de peso), con mínimo y máximo marcados. */
export function Linea({ valores, etiqueta, formato }: { valores: number[]; etiqueta: string; formato: (v: number) => string }) {
  if (valores.length < 2) return null
  const min = Math.min(...valores), max = Math.max(...valores), rango = max - min || 1
  const y = (v: number) => 54 - ((v - min) / rango) * 48
  const puntos = valores.map((v, i) => `${(i / (valores.length - 1)) * 100},${y(v)}`).join(' ')
  return (
    <figure className="grafico">
      <svg viewBox="0 0 100 60" preserveAspectRatio="none" role="img" aria-label={etiqueta}>
        <polyline points={puntos} vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption><span>Máx. {formato(max)}</span><span>Mín. {formato(min)}</span></figcaption>
    </figure>
  )
}

/** Encabezado de una subpantalla con vuelta atrás. */
export function Volver({ titulo, onVolver, accion, texto = 'Volver' }: { titulo: string; onVolver: () => void; accion?: ReactNode; texto?: string }) {
  return (
    <header className="barra">
      <div>
        <button className="volver" onClick={onVolver}><Icono i="atras" tam={20} />{texto}</button>
        <h1>{titulo}</h1>
      </div>
      {accion}
    </header>
  )
}

/** La línea a la que pertenece un logro, según su clave. */
export const lineaDeLogro = (clave: string): LineaId =>
  clave.startsWith('comidas') || clave.startsWith('proteina') ? 'comida'
  : clave.startsWith('agua') ? 'agua'
  : clave.startsWith('sueno') ? 'sueno'
  : clave.startsWith('peso') ? 'peso'
  : clave.startsWith('racha') || clave.startsWith('gimnasio') ? 'habitos'
  : 'premios'
