import { useLiveQuery } from 'dexie-react-hooks'
import { Fragment, useState, type ReactNode } from 'react'
import type { Irse } from '../App'
import { bloquesDe, db, diasRestantes, fijarValor, guardarAnimo, guardarPeso, usarComodin, type BloqueId, type Datos, type Habito, type Perfil, type RegistroHabito } from '../db'
import { leerKg, tendencia } from '../logica/cuerpo'
import { DIAS_CORTOS, ddmmaaaa, diasEntre, diaSemana, duracion, fechaLarga, lunesDe, num, signo, sumarDias } from '../logica/fechas'
import { cumple, diaPerfecto, hechosEnSemana, obligatorios, pideConfirmacion, rachaHabito, seEvalua, type EnPausa } from '../logica/habitos'
import { metasEn, NOMBRE_MOMENTO, sumar, type Momento } from '../logica/nutricion'
import { LOGROS, XP, type Progreso } from '../logica/recompensas'
import { horarioHabitual } from '../logica/sueno'
import { Barra, Escala, FormSueno, Icono, iconoDe, linea, Recorrido, Titulo } from '../ui'

const PRINCIPALES = ['desayuno', 'almuerzo', 'merienda', 'cena'] as const

/** La próxima comida a cargar: la que toca por la hora, o la primera que falta. */
function proximaComida(hechas: Set<Momento>, esHoy: boolean): Momento {
  const h = new Date().getHours()
  const desde = esHoy ? (h < 11 ? 0 : h < 16 ? 1 : h < 19 ? 2 : 3) : 0
  return PRINCIPALES.slice(desde).find((m) => !hechas.has(m)) ?? PRINCIPALES.find((m) => !hechas.has(m)) ?? 'snack'
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
  const lunes = lunesDe(fecha)
  const hechosSemana = new Set(regs.filter((r) => cumple(h, r.valor)).map((r) => r.fecha))

  return (
    <li className={`habito${toca ? '' : ' no-toca'}`}>
      <span className="icono"><Icono i={iconoDe(h.icono)} /></span>
      <div className="texto">
        <strong>{h.nombre}</strong>
        {detalle && <small>{detalle}</small>}
        {semanal && (
          <Recorrido l="habitos" compacto etiqueta={`${h.nombre} esta semana`}
            estaciones={DIAS_CORTOS.map((d, i) => {
              const f = sumarDias(lunes, i)
              return { nombre: d[0].toUpperCase(), hecho: hechosSemana.has(f), proxima: f === fecha && !hechosSemana.has(f) }
            })} />
        )}
        {h.tipo === 'cantidad' && <span className="pista" aria-hidden><i style={{ width: `${Math.min(100, (valor / h.meta) * 100)}%` }} /></span>}
        {puedeComodin && (
          <button className="link comodin" onClick={() => confirm(`¿Usar un comodín para que ${h.nombre} no corte la racha? Te quedan ${comodines}.`) && usarComodin(h.id, fecha, hoy)}>
            Usar comodín
          </button>
        )}
      </div>
      {h.tipo === 'check' ? (
        <button className="check" aria-pressed={hecho} aria-label={`${h.nombre}: ${hecho ? 'hecho' : 'pendiente'}`} onClick={() => onFijar(h, hecho ? 0 : h.meta)}>
          <Icono i="check" />
        </button>
      ) : (
        <div className="cantidad">
          <button aria-label={`Restar ${h.incremento} a ${h.nombre}`} onClick={() => onFijar(h, (v) => v - h.incremento)}><Icono i="restar" tam={18} /></button>
          <input
            key={valor}
            type="number"
            inputMode="decimal"
            aria-label={`${h.nombre} en ${h.unidad}`}
            defaultValue={valor}
            onBlur={(e) => Number(e.target.value) !== valor && onFijar(h, Number(e.target.value) || 0)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
          <button aria-label={`Sumar ${h.incremento} a ${h.nombre}`} onClick={() => onFijar(h, (v) => v + h.incremento)}><Icono i="sumar" tam={18} /></button>
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
  const lista = activos.filter((h) => h !== agua)
  const tocan = obligatorios(activos, fecha)
  const perfecto = diaPerfecto(activos, valores, fecha) && !enPausa(fecha)
  const esHoy = fecha === hoy
  const ayer = sumarDias(hoy, -1)
  const animo = datos.registrosAnimo.find((r) => r.fecha === fecha)

  function puedeEditar() {
    if (!pideConfirmacion(fecha, hoy) || libre === fecha) return true
    if (!confirm(`Vas a editar el ${fechaLarga(fecha)}, hace más de una semana. ¿Seguir?`)) return false
    setLibre(fecha)
    return true
  }
  const fijar: Fijar = (h, v) => puedeEditar() && fijarValor(h, fecha, v)
  const irAFecha = (f: string) => { setFecha(f); setEditandoSueno(false) }

  // ---------- Avisos del día ----------
  const avisos: ReactNode[] = []
  if (esHoy) {
    const pausa = datos.pausas.find((p) => p.desde <= hoy && hoy <= p.hasta)
    if (pausa) avisos.push(<li key="pausa"><span>Estás en pausa hasta el {ddmmaaaa(pausa.hasta).slice(0, 5)}. Las rachas no se cortan.</span></li>)
    const nuevos = datos.logros.filter((l) => l.desbloqueadoEn === hoy).flatMap((l) => LOGROS.filter((x) => x.clave === l.clave))
    if (nuevos.length)
      avisos.push(
        <li key="logros">
          <span>{nuevos.length === 1 ? `Nuevo logro: ${nuevos[0].nombre}.` : `${nuevos.length} logros nuevos: ${nuevos.map((x) => x.nombre).join(', ')}.`}</span>
          <button onClick={() => irA('premios')}>Ver</button>
        </li>,
      )
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
  const comidas = datos.registrosComida.filter((c) => c.fecha === fecha)
  const total = sumar(comidas)
  const metas = metasEn(datos.metasNutricion, fecha)
  const hechas = new Set(comidas.map((c) => c.momento))
  const proxima = proximaComida(hechas, esHoy)
  const noche = suenos.find((s) => s.fecha === fecha && !s.esSiesta)
  const pesoDelDia = datos.registrosPeso.find((p) => p.fecha === fecha)
  const t = tendencia(datos.registrosPeso, fecha), t7 = tendencia(datos.registrosPeso, sumarDias(fecha, -7))
  const kgNuevo = leerKg(peso)
  const hechosHoy = tocan.filter((h) => cumple(h, valores.get(h.id))).length
  // La racha diaria más larga en curso entre tus hábitos
  const rachas = activos.filter((h) => h.frecuencia !== 'x_por_semana').map((h) => rachaHabito(h, regsDe(h), fecha, { cubiertos: cubiertosDe(h), enPausa }))
  const rachaActual = Math.max(0, ...rachas.map((r) => r.actual)), rachaMejor = Math.max(0, ...rachas.map((r) => r.mejor))
  const rachaTexto = rachaActual > 1 ? `racha de ${rachaActual} días` : rachaMejor > 1 ? `mejor racha ${rachaMejor} días` : null

  const bloques: Record<BloqueId, ReactNode> = {
    nutricion: (
      <section className="cartel" aria-labelledby="t-comida">
        <Titulo l="comida" id="t-comida" extra={metas ? `Meta ${num(metas.kcal)} kcal` : undefined}>Comida</Titulo>
        {metas ? (
          <p className="kcal">
            {total.kcal <= metas.kcal
              ? <><strong>{num(metas.kcal - total.kcal)}</strong><span>kcal te quedan</span></>
              : <><strong>{num(total.kcal)}</strong><span>kcal, ya llegaste a tu meta</span></>}
          </p>
        ) : (
          <p className="kcal"><strong>{num(total.kcal)}</strong><span>kcal comidas</span></p>
        )}
        <div className="macros">
          <Barra etiqueta="Proteína" valor={total.p} meta={metas?.proteinaG} unidad="g" />
          <Barra etiqueta="Carbos" valor={total.c} meta={metas?.carbosG} unidad="g" />
          <Barra etiqueta="Grasas" valor={total.g} meta={metas?.grasasG} unidad="g" />
        </div>
        <Recorrido l="comida" etiqueta="Comidas del día"
          estaciones={PRINCIPALES.map((m) => ({ nombre: NOMBRE_MOMENTO[m], hecho: hechas.has(m), proxima: m === proxima }))} />
        <button className="primario" style={linea('comida')} onClick={() => irA('comida', undefined, proxima)}>
          <Icono i="sumar" tam={20} />Agregar {NOMBRE_MOMENTO[proxima].toLowerCase()}
        </button>
        {!metas && <button className="link" onClick={() => irA('mas', 'perfil')}>Calcular mi meta de calorías</button>}
      </section>
    ),
    habitos: (
      <section className="cartel" aria-labelledby="t-habitos">
        <Titulo l="habitos" id="t-habitos" extra={[tocan.length && `${hechosHoy} de ${tocan.length} hoy`, rachaTexto].filter(Boolean).join(', ') || undefined}>Hábitos</Titulo>
        {lista.length ? (
          <ul className="habitos-lista">
            {lista.map((h) => (
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
        <section className="cartel" aria-labelledby="t-agua">
          <Titulo l="agua" id="t-agua" extra={`${num(v)} de ${num(agua.meta)} ${agua.unidad}`}>Agua</Titulo>
          <div className="vasos">
            {Array.from({ length: Math.ceil(Math.max(agua.meta, v) / paso) }, (_, i) => {
              const lleno = (i + 1) * paso <= v
              return (
                <button key={i} className={lleno ? 'lleno' : ''} aria-label={`${(i + 1) * paso} ${agua.unidad}`} aria-pressed={lleno} onClick={() => fijar(agua, (i + 1) * paso === v ? i * paso : (i + 1) * paso)}>
                  <svg viewBox="0 0 28 36" aria-hidden><path d="M3.5 3h21l-2.8 30H6.3z" /></svg>
                </button>
              )
            })}
            <button className="mas" aria-label={`Sumar ${paso} ${agua.unidad}`} onClick={() => fijar(agua, (x) => x + paso)}><Icono i="sumar" tam={18} /></button>
          </div>
        </section>
      )
    })(),
    sueno: (
      <section className="cartel" aria-labelledby="t-sueno">
        <Titulo l="sueno" id="t-sueno" extra={`Meta ${duracion(perfil.metaSuenoMin)}`}>{esHoy ? 'Sueño de anoche' : 'Sueño'}</Titulo>
        {noche && !editandoSueno ? (
          <p className="sueno-resumen">
            <strong className={noche.duracionMin >= perfil.metaSuenoMin ? 'cumple' : ''}>{duracion(noche.duracionMin)}</strong>
            <span>De {noche.acostado.slice(11)} a {noche.levantado.slice(11)}</span>
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
      <section className="cartel" aria-labelledby="t-animo" style={linea('animo')}>
        <Titulo l="animo" id="t-animo">Ánimo y energía</Titulo>
        <Escala etiqueta="Ánimo" valor={animo?.animo} onChange={(n) => puedeEditar() && guardarAnimo(fecha, { animo: n })} />
        <Escala etiqueta="Energía" valor={animo?.energia} onChange={(n) => puedeEditar() && guardarAnimo(fecha, { energia: n })} />
      </section>
    ),
    peso: (
      <section className="cartel" aria-labelledby="t-peso">
        <Titulo l="peso" id="t-peso" extra={t != null ? `Tendencia ${num(t, 1)} kg` : undefined}>Peso</Titulo>
        {pesoDelDia ? (
          <p className="ayuda">
            {esHoy ? 'Hoy' : 'Ese día'} pesaste <b>{num(pesoDelDia.kg, 1)} kg</b>.
            {t != null && t7 != null && ` En 7 días la tendencia cambió ${signo(t - t7)} kg.`}
          </p>
        ) : (
          <div className="peso-rapido">
            <input inputMode="decimal" aria-label="Peso en kg" placeholder="Peso en kg" value={peso} onChange={(e) => setPeso(e.target.value)} />
            <button className="primario" style={linea('peso')} disabled={kgNuevo == null} onClick={async () => { await guardarPeso(fecha, kgNuevo!); setPeso('') }}>Guardar</button>
          </div>
        )}
      </section>
    ),
  }

  return (
    <div className="hoy">
      <header className="hoy-cabecera">
        <div>
          <div className="fecha">
            <button aria-label="Día anterior" onClick={() => irAFecha(sumarDias(fecha, -1))}><Icono i="atras" tam={20} /></button>
            <span>{fechaLarga(fecha).replace(/^./, (c) => c.toUpperCase())}</span>
            {!esHoy && <button aria-label="Día siguiente" onClick={() => irAFecha(sumarDias(fecha, 1))}><Icono i="siguiente" tam={20} /></button>}
          </div>
          <h1>{esHoy ? 'Hoy' : fecha === ayer ? 'Ayer' : fechaLarga(fecha).split(' ').slice(0, 2).join(' ').replace(/^./, (c) => c.toUpperCase())}</h1>
        </div>
        {esHoy ? (
          <button className="nivel-chip" onClick={() => irA('premios')} aria-label={`Nivel ${nv.n}, ${nv.actual} de ${nv.siguiente} XP. Ver premios`}>
            <span className="letra">{nv.n}</span>Nivel {nv.n}
          </button>
        ) : (
          <button className="nivel-chip" onClick={() => irAFecha(hoy)}>Volver a hoy</button>
        )}
      </header>

      {perfecto && <p className="perfecto" role="status"><Icono i="check" />Día perfecto: sumaste {XP.perfecto} XP extra.</p>}
      {avisos.length === 1 && <ul className="avisos">{avisos}</ul>}
      {avisos.length > 1 && (
        <details className="avisos">
          <summary>Tenés {avisos.length} avisos<Icono i="siguiente" tam={20} /></summary>
          <ul>{avisos}</ul>
        </details>
      )}

      {bloquesDe(perfil).filter((b) => b.visible).map((b) => <Fragment key={b.id}>{bloques[b.id]}</Fragment>)}
    </div>
  )
}
