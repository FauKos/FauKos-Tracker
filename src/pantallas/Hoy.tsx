import { useLiveQuery } from 'dexie-react-hooks'
import { Fragment, useState, type CSSProperties, type ReactNode } from 'react'
import { db, diasRestantes, fijarValor, guardarAnimo, type BloqueId, type Habito, type Perfil, type RegistroHabito } from '../db'
import { diasEntre, duracion, fechaLarga, sumarDias } from '../logica/fechas'
import { cumple, diaPerfecto, hechosEnSemana, pideConfirmacion, rachaHabito, seEvalua } from '../logica/habitos'
import { horarioHabitual } from '../logica/sueno'
import { Escala, FormSueno } from '../ui'
import type { Tab } from '../App'

const color = (h: Habito) => ({ '--c': h.color }) as CSSProperties

function saludo() {
  const h = new Date().getHours()
  return h >= 5 && h < 13 ? 'Buen día' : h >= 13 && h < 20 ? 'Buenas tardes' : 'Buenas noches'
}

function FilaHabito({ h, valor, regs, fecha, onFijar }: { h: Habito; valor: number; regs: RegistroHabito[]; fecha: string; onFijar: (h: Habito, v: number | ((actual: number) => number)) => void }) {
  const hecho = cumple(h, valor)
  const racha = rachaHabito(h, regs, fecha)
  const semanal = h.frecuencia === 'x_por_semana'
  const detalle = [
    !seEvalua(h, fecha) && 'No toca este día',
    semanal && `${hechosEnSemana(h, regs, fecha)} de ${h.vecesPorSemana} esta semana`,
    h.tipo === 'cantidad' && `${valor} de ${h.meta} ${h.unidad}`,
    racha.actual > 1 && `${racha.actual} ${semanal ? 'semanas' : 'días'} seguidos`,
  ].filter(Boolean).join('. ')

  return (
    <li className={`habito${hecho ? ' hecho' : ''}${seEvalua(h, fecha) ? '' : ' no-toca'}`} style={color(h)}>
      <span className="icono" aria-hidden>{h.icono}</span>
      <div className="texto">
        <strong>{h.nombre}</strong>
        {detalle && <small>{detalle}</small>}
        {h.tipo === 'cantidad' && <progress max={h.meta} value={Math.min(valor, h.meta)} aria-hidden />}
      </div>
      {h.tipo === 'check' ? (
        <button className="check" aria-pressed={hecho} aria-label={`${h.nombre}: ${hecho ? 'hecho' : 'pendiente'}`} onClick={() => onFijar(h, hecho ? 0 : h.meta)}>
          <svg viewBox="0 0 24 24" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </button>
      ) : (
        <div className="cantidad">
          <button aria-label={`Restar a ${h.nombre}`} onClick={() => onFijar(h, (v) => v - h.incremento)}>−</button>
          <input
            key={valor}
            type="number"
            inputMode="decimal"
            aria-label={`${h.nombre} en ${h.unidad}`}
            defaultValue={valor}
            onBlur={(e) => Number(e.target.value) !== valor && onFijar(h, Number(e.target.value) || 0)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
          <button aria-label={`Sumar a ${h.nombre}`} onClick={() => onFijar(h, (v) => v + h.incremento)}>+</button>
        </div>
      )}
    </li>
  )
}

export function Hoy({ hoy, perfil, irA }: { hoy: string; perfil: Perfil; irA: (t: Tab) => void }) {
  const [fecha, setFecha] = useState(hoy)
  const [libre, setLibre] = useState<string>() // día viejo ya confirmado para editar
  const [editandoSueno, setEditandoSueno] = useState(false)
  const habitos = useLiveQuery(() => db.habitos.toArray())
  const regs = useLiveQuery(() => db.registrosHabito.toArray(), [], [])
  const suenos = useLiveQuery(() => db.registrosSueno.toArray(), [], [])
  const suplementos = useLiveQuery(() => db.suplementos.toArray(), [], [])
  const animo = useLiveQuery(() => db.registrosAnimo.where('fecha').equals(fecha).first(), [fecha])
  if (!habitos) return null // cargando

  const activos = habitos.filter((h) => !h.archivado).sort((a, b) => a.orden - b.orden)
  const valores = new Map(regs.filter((r) => r.fecha === fecha).map((r) => [r.habitoId, r.valor]))
  const regsDe = (h: Habito) => regs.filter((r) => r.habitoId === h.id)
  const agua = activos.find((h) => h.clave === 'agua')
  const obligatorios = activos.filter((h) => h.frecuencia !== 'x_por_semana' && seEvalua(h, fecha))
  const perfecto = diaPerfecto(activos, valores, fecha)
  const esHoy = fecha === hoy

  function puedeEditar() {
    if (!pideConfirmacion(fecha, hoy) || libre === fecha) return true
    if (!confirm(`Vas a editar el ${fechaLarga(fecha)}, hace más de una semana. ¿Seguir?`)) return false
    setLibre(fecha)
    return true
  }
  const fijar = (h: Habito, v: number | ((actual: number) => number)) => puedeEditar() && fijarValor(h, fecha, v)

  const primerRegistro = regs.reduce<string | undefined>((min, r) => (!min || r.fecha < min ? r.fecha : min), undefined)
  const desdeBackup = perfil.ultimoBackup ?? primerRegistro
  const avisos: ReactNode[] = []
  if (esHoy) {
    for (const s of suplementos.filter((s) => diasRestantes(s) <= s.avisarConDias)) {
      const d = diasRestantes(s)
      avisos.push(
        <li key={`s${s.id}`}>
          <span>{d === 0 ? `Se terminó la ${s.nombre.toLowerCase()}.` : `Te quedan ${d} ${d === 1 ? 'día' : 'días'} de ${s.nombre.toLowerCase()}.`}</span>
          <button onClick={() => db.suplementos.update(s.id, { stockActual: Math.max(0, s.stockActual) + s.cantidadEnvase })}>Compré un envase</button>
        </li>,
      )
    }
    if (desdeBackup && diasEntre(desdeBackup.slice(0, 10), hoy) > 7)
      avisos.push(
        <li key="backup">
          <span>Pasó más de una semana sin backup.</span>
          <button onClick={() => irA('ajustes')}>Hacer backup</button>
        </li>,
      )
  }

  const noche = suenos.find((s) => s.fecha === fecha && !s.esSiesta)
  const bloques: Record<BloqueId, ReactNode> = {
    habitos: (
      <section aria-labelledby="t-habitos">
        <h2 id="t-habitos">Hábitos</h2>
        {activos.some((h) => h !== agua) ? (
          <ul className="habitos">
            {activos.filter((h) => h !== agua).map((h) => (
              <FilaHabito key={h.id} h={h} valor={valores.get(h.id) ?? 0} regs={regsDe(h)} fecha={fecha} onFijar={fijar} />
            ))}
          </ul>
        ) : (
          <p className="vacio">Todavía no tenés hábitos. <button className="link" onClick={() => irA('habitos')}>Crear uno</button></p>
        )}
      </section>
    ),
    agua: agua && (() => {
      const v = valores.get(agua.id) ?? 0
      const paso = agua.incremento || 1
      return (
        <section aria-labelledby="t-agua" style={color(agua)}>
          <h2 id="t-agua">Agua <span>{v} de {agua.meta} {agua.unidad}</span></h2>
          <div className="vasos">
            {Array.from({ length: Math.ceil(Math.max(agua.meta, v) / paso) }, (_, i) => {
              const lleno = (i + 1) * paso <= v
              return <button key={i} className={lleno ? 'lleno' : ''} aria-label={`${(i + 1) * paso} ${agua.unidad}`} onClick={() => fijar(agua, (i + 1) * paso === v ? i * paso : (i + 1) * paso)} />
            })}
            <button className="mas" aria-label={`Sumar ${paso} ${agua.unidad}`} onClick={() => fijar(agua, (x) => x + paso)}>+</button>
          </div>
        </section>
      )
    })(),
    sueno: (
      <section aria-labelledby="t-sueno">
        <h2 id="t-sueno">{esHoy ? 'Sueño de anoche' : 'Sueño'}</h2>
        {noche && !editandoSueno ? (
          <p className="sueno-resumen">
            <strong className={noche.duracionMin >= perfil.metaSuenoMin ? 'ok' : ''}>{duracion(noche.duracionMin)}</strong>
            <span>De {noche.acostado.slice(11)} a {noche.levantado.slice(11)}, tu meta es {duracion(perfil.metaSuenoMin)}.</span>
            <button className="link" onClick={() => setEditandoSueno(true)}>Editar</button>
          </p>
        ) : (
          <FormSueno
            key={fecha + (noche?.id ?? '')}
            fecha={fecha}
            inicial={noche ? { acostado: noche.acostado.slice(11), levantado: noche.levantado.slice(11), calidad: noche.calidad } : horarioHabitual(suenos)}
            onListo={() => setEditandoSueno(false)}
          />
        )}
      </section>
    ),
    animo: (
      <section aria-labelledby="t-animo">
        <h2 id="t-animo">Ánimo y energía</h2>
        <Escala etiqueta="Ánimo" valor={animo?.animo} onChange={(n) => puedeEditar() && guardarAnimo(fecha, { animo: n })} />
        <Escala etiqueta="Energía" valor={animo?.energia} onChange={(n) => puedeEditar() && guardarAnimo(fecha, { energia: n })} />
      </section>
    ),
  }

  const ayer = sumarDias(hoy, -1)
  return (
    <div className="hoy">
      <header className="cabecera">
        <p className="saludo">{esHoy ? `${saludo()}${perfil.nombre ? `, ${perfil.nombre}` : ''}` : <button className="link" onClick={() => setFecha(hoy)}>Volver a hoy</button>}</p>
        <div className="fecha-nav">
          <button aria-label="Día anterior" onClick={() => { setFecha(sumarDias(fecha, -1)); setEditandoSueno(false) }}>‹</button>
          <div>
            <h1>{esHoy ? 'Hoy' : fecha === ayer ? 'Ayer' : fechaLarga(fecha).split(' ').slice(0, 2).join(' ')}</h1>
            <p>{fechaLarga(fecha)}</p>
          </div>
          <button aria-label="Día siguiente" disabled={esHoy} onClick={() => { setFecha(sumarDias(fecha, 1)); setEditandoSueno(false) }}>›</button>
        </div>
        {obligatorios.length > 0 && (
          <div className="bitacora" role="img" aria-label={`${obligatorios.filter((h) => cumple(h, valores.get(h.id))).length} de ${obligatorios.length} hábitos del día cumplidos`}>
            {obligatorios.map((h) => <span key={h.id} style={color(h)} className={cumple(h, valores.get(h.id)) ? 'hecho' : ''} />)}
          </div>
        )}
      </header>

      {perfecto && <p className="perfecto" role="status">Día perfecto. Cumpliste todos los hábitos del día.</p>}
      {avisos.length > 0 && <ul className="avisos">{avisos}</ul>}

      {perfil.bloques.filter((b) => b.visible).map((b) => <Fragment key={b.id}>{bloques[b.id]}</Fragment>)}
    </div>
  )
}
