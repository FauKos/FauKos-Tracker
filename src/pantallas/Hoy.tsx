import { useLiveQuery } from 'dexie-react-hooks'
import { Fragment, useState, type CSSProperties, type ReactNode } from 'react'
import type { Irse } from '../App'
import { bloquesDe, db, diasRestantes, fijarValor, guardarAnimo, guardarPeso, usarComodin, type BloqueId, type Datos, type Habito, type Perfil, type RegistroHabito } from '../db'
import { leerKg, tendencia } from '../logica/cuerpo'
import { ddmmaaaa, diasEntre, diaSemana, duracion, fechaLarga, lunesDe, num, signo, sumarDias } from '../logica/fechas'
import { cumple, diaPerfecto, hechosEnSemana, obligatorios, pideConfirmacion, rachaHabito, seEvalua, type EnPausa } from '../logica/habitos'
import { metasEn, sumar } from '../logica/nutricion'
import { LOGROS, XP, type Progreso } from '../logica/recompensas'
import { horarioHabitual } from '../logica/sueno'
import { Barra, Escala, FormSueno } from '../ui'

const color = (h: Habito) => ({ '--c': h.color }) as CSSProperties

function saludo() {
  const h = new Date().getHours()
  return h >= 5 && h < 13 ? 'Buen día' : h >= 13 && h < 20 ? 'Buenas tardes' : 'Buenas noches'
}

type Fijar = (h: Habito, v: number | ((actual: number) => number)) => void

function FilaHabito({ h, valor, regs, fecha, hoy, cubiertos, enPausa, comodines, onFijar }: {
  h: Habito; valor: number; regs: RegistroHabito[]; fecha: string; hoy: string; cubiertos: string[]; enPausa: EnPausa; comodines: number; onFijar: Fijar
}) {
  const hecho = cumple(h, valor)
  const toca = seEvalua(h, fecha)
  const cubierto = cubiertos.includes(fecha)
  const racha = rachaHabito(h, regs, fecha, { cubiertos, enPausa })
  const semanal = h.frecuencia === 'x_por_semana'
  const puedeComodin = fecha < hoy && !hecho && !cubierto && toca && !semanal && !enPausa(fecha) && comodines > 0
  const detalle = [
    !toca && 'No toca este día',
    cubierto && !hecho && 'Cubierto con comodín',
    semanal && `${hechosEnSemana(h, regs, fecha)} de ${h.vecesPorSemana} esta semana`,
    h.tipo === 'cantidad' && `${num(valor)} de ${num(h.meta)} ${h.unidad}`,
    racha.actual > 1 && `${racha.actual} ${semanal ? 'semanas' : 'días'} seguidos`,
  ].filter(Boolean).join('. ')

  return (
    <li className={`habito${hecho ? ' hecho' : ''}${toca ? '' : ' no-toca'}`} style={color(h)}>
      <span className="icono" aria-hidden>{h.icono}</span>
      <div className="texto">
        <strong>{h.nombre}</strong>
        {detalle && <small>{detalle}</small>}
        {h.tipo === 'cantidad' && <progress max={h.meta} value={Math.min(valor, h.meta)} aria-hidden />}
        {puedeComodin && (
          <button className="link comodin" onClick={() => confirm(`¿Usar un comodín para que ${h.nombre} no corte la racha? Te quedan ${comodines}.`) && usarComodin(h.id, fecha, hoy)}>
            Usar comodín
          </button>
        )}
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

export function Hoy({ hoy, perfil, datos, progreso, irA }: { hoy: string; perfil: Perfil; datos: Datos; progreso: Progreso; irA: Irse }) {
  const [fecha, setFecha] = useState(hoy)
  const [libre, setLibre] = useState<string>() // día viejo ya confirmado para editar
  const [editandoSueno, setEditandoSueno] = useState(false)
  const [peso, setPeso] = useState('')
  const suplementos = useLiveQuery(() => db.suplementos.toArray(), [], [])
  const revisionHecha = useLiveQuery(() => db.revisiones.get(lunesDe(hoy)), [hoy])

  const { habitos, registrosHabito: regs, registrosSueno: suenos } = datos
  const { enPausa, comodines, nivel: nv } = progreso
  const activos = habitos.filter((h) => !h.archivado).sort((a, b) => a.orden - b.orden)
  const valores = new Map(regs.filter((r) => r.fecha === fecha).map((r) => [r.habitoId, r.valor]))
  const regsDe = (h: Habito) => regs.filter((r) => r.habitoId === h.id)
  const cubiertosDe = (h: Habito) => datos.comodines.filter((c) => c.habitoId === h.id).map((c) => c.fecha)
  const agua = activos.find((h) => h.clave === 'agua')
  const tocan = obligatorios(activos, fecha)
  const perfecto = diaPerfecto(activos, valores, fecha) && !enPausa(fecha)
  const esHoy = fecha === hoy
  const animo = datos.registrosAnimo.find((r) => r.fecha === fecha)

  function puedeEditar() {
    if (!pideConfirmacion(fecha, hoy) || libre === fecha) return true
    if (!confirm(`Vas a editar el ${fechaLarga(fecha)}, hace más de una semana. ¿Seguir?`)) return false
    setLibre(fecha)
    return true
  }
  const fijar: Fijar = (h, v) => puedeEditar() && fijarValor(h, fecha, v)

  // ---------- Avisos del día ----------
  const avisos: ReactNode[] = []
  if (esHoy) {
    const pausa = datos.pausas.find((p) => p.desde <= hoy && hoy <= p.hasta)
    if (pausa)
      avisos.push(<li key="pausa"><span>Estás en pausa hasta el {ddmmaaaa(pausa.hasta).slice(0, 5)}. Las rachas no se cortan.</span></li>)
    for (const l of datos.logros.filter((l) => l.desbloqueadoEn === hoy)) {
      const def = LOGROS.find((x) => x.clave === l.clave)
      if (def) avisos.push(<li key={l.clave} className="logro"><span>Nuevo logro: {def.icono} {def.nombre}. +{def.xp} XP.</span><button onClick={() => irA('premios')}>Ver</button></li>)
    }
    for (const s of suplementos.filter((s) => diasRestantes(s) <= s.avisarConDias)) {
      const d = diasRestantes(s)
      avisos.push(
        <li key={`s${s.id}`}>
          <span>{d === 0 ? `Se terminó la ${s.nombre.toLowerCase()}.` : `Te quedan ${d} ${d === 1 ? 'día' : 'días'} de ${s.nombre.toLowerCase()}.`}</span>
          <button onClick={() => db.suplementos.update(s.id, { stockActual: Math.max(0, s.stockActual) + s.cantidadEnvase })}>Compré un envase</button>
        </li>,
      )
    }
    if (diaSemana(hoy) === 6 && !revisionHecha?.texto)
      avisos.push(<li key="revision"><span>Es domingo: mirá cómo te fue en la semana.</span><button onClick={() => irA('mas', 'revision')}>Ver la semana</button></li>)
    const primerRegistro = regs.reduce<string | undefined>((min, r) => (!min || r.fecha < min ? r.fecha : min), undefined)
    const desdeBackup = perfil.ultimoBackup ?? primerRegistro
    if (desdeBackup && diasEntre(desdeBackup.slice(0, 10), hoy) > 7)
      avisos.push(<li key="backup"><span>Pasó más de una semana sin backup.</span><button onClick={() => irA('mas', 'ajustes')}>Hacer backup</button></li>)
  }

  // ---------- Bloques ----------
  const noche = suenos.find((s) => s.fecha === fecha && !s.esSiesta)
  const comidas = datos.registrosComida.filter((c) => c.fecha === fecha)
  const total = sumar(comidas)
  const metas = metasEn(datos.metasNutricion, fecha)
  const pesoDelDia = datos.registrosPeso.find((p) => p.fecha === fecha)
  const t = tendencia(datos.registrosPeso, fecha), t7 = tendencia(datos.registrosPeso, sumarDias(fecha, -7))
  const kgNuevo = leerKg(peso)

  const bloques: Record<BloqueId, ReactNode> = {
    habitos: (
      <section aria-labelledby="t-habitos">
        <h2 id="t-habitos">Hábitos</h2>
        {activos.some((h) => h !== agua) ? (
          <ul className="habitos">
            {activos.filter((h) => h !== agua).map((h) => (
              <FilaHabito key={h.id} h={h} valor={valores.get(h.id) ?? 0} regs={regsDe(h)} fecha={fecha} hoy={hoy}
                cubiertos={cubiertosDe(h)} enPausa={enPausa} comodines={comodines} onFijar={fijar} />
            ))}
          </ul>
        ) : (
          <p className="vacio">Todavía no tenés hábitos. <button className="link" onClick={() => irA('mas', 'habitos')}>Crear uno</button></p>
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
    nutricion: (
      <section aria-labelledby="t-nutricion">
        <h2 id="t-nutricion">Nutrición</h2>
        <Barra etiqueta="Calorías" valor={total.kcal} meta={metas?.kcal} unidad="kcal" />
        <Barra etiqueta="Proteína" valor={total.p} meta={metas?.proteinaG} unidad="g" />
        <Barra etiqueta="Carbohidratos" valor={total.c} meta={metas?.carbosG} unidad="g" />
        <Barra etiqueta="Grasas" valor={total.g} meta={metas?.grasasG} unidad="g" />
        <button className="secundario" onClick={() => irA('comida')}>{metas ? 'Agregar comida' : 'Agregar comida o definir metas'}</button>
      </section>
    ),
    animo: (
      <section aria-labelledby="t-animo">
        <h2 id="t-animo">Ánimo y energía</h2>
        <Escala etiqueta="Ánimo" valor={animo?.animo} onChange={(n) => puedeEditar() && guardarAnimo(fecha, { animo: n })} />
        <Escala etiqueta="Energía" valor={animo?.energia} onChange={(n) => puedeEditar() && guardarAnimo(fecha, { energia: n })} />
      </section>
    ),
    peso: (
      <section aria-labelledby="t-peso">
        <h2 id="t-peso">Peso {t != null && <span>Tendencia {num(t, 1)} kg</span>}</h2>
        {pesoDelDia ? (
          <p className="ayuda">
            {esHoy ? 'Hoy' : 'Ese día'} pesaste {num(pesoDelDia.kg, 1)} kg.
            {t != null && t7 != null && ` En 7 días la tendencia cambió ${signo(t - t7)} kg.`}
          </p>
        ) : (
          <div className="peso-rapido">
            <input inputMode="decimal" aria-label="Peso en kg" placeholder="Peso en kg" value={peso} onChange={(e) => setPeso(e.target.value)} />
            <button className="primario" disabled={kgNuevo == null} onClick={async () => { await guardarPeso(fecha, kgNuevo!); setPeso('') }}>Registrar peso</button>
          </div>
        )}
      </section>
    ),
  }

  const ayer = sumarDias(hoy, -1)
  return (
    <div className="hoy">
      <header className="cabecera">
        <div className="saludo">
          {esHoy ? <span>{saludo()}{perfil.nombre ? `, ${perfil.nombre}` : ''}</span> : <button className="link" onClick={() => setFecha(hoy)}>Volver a hoy</button>}
          <button className="nivel-hoy" onClick={() => irA('premios')} aria-label={`Nivel ${nv.n}, ${nv.actual} de ${nv.siguiente} XP. Ver premios`}>
            Nivel {nv.n}
            <progress max={nv.siguiente} value={nv.actual} aria-hidden />
          </button>
        </div>
        <div className="fecha-nav">
          <button aria-label="Día anterior" onClick={() => { setFecha(sumarDias(fecha, -1)); setEditandoSueno(false) }}>‹</button>
          <div>
            <h1>{esHoy ? 'Hoy' : fecha === ayer ? 'Ayer' : fechaLarga(fecha).split(' ').slice(0, 2).join(' ')}</h1>
            <p>{fechaLarga(fecha)}</p>
          </div>
          <button aria-label="Día siguiente" disabled={esHoy} onClick={() => { setFecha(sumarDias(fecha, 1)); setEditandoSueno(false) }}>›</button>
        </div>
        {tocan.length > 0 && (
          <div className="bitacora" role="img" aria-label={`${tocan.filter((h) => cumple(h, valores.get(h.id))).length} de ${tocan.length} hábitos del día cumplidos`}>
            {tocan.map((h) => <span key={h.id} style={color(h)} className={cumple(h, valores.get(h.id)) ? 'hecho' : ''} />)}
          </div>
        )}
      </header>

      {perfecto && <p className="perfecto" role="status">Día perfecto: +{XP.perfecto} XP. Cumpliste todos los hábitos del día.</p>}
      {avisos.length > 0 && <ul className="avisos">{avisos}</ul>}

      {bloquesDe(perfil).filter((b) => b.visible).map((b) => <Fragment key={b.id}>{bloques[b.id]}</Fragment>)}
    </div>
  )
}
