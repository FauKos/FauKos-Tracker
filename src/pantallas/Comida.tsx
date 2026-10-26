import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { agregarItems, borrarComida, db, guardarMetas, type Actividad, type Alimento, type Item, type Objetivo, type Perfil, type RegistroComida, type Sexo } from '../db'
import { calcularMetas, edad, RANGO_AJUSTE, tendencia } from '../logica/cuerpo'
import { ddmmaaaa, fechaLarga, num, sumarDias } from '../logica/fechas'
import { buscar, macrosDe, metasEn, MOMENTOS, NOMBRE_MOMENTO, normalizar, receta, recientes, sumar, type Macros, type Momento } from '../logica/nutricion'
import { Barra, Volver } from '../ui'

type Vista =
  | { tipo: 'dia' }
  | { tipo: 'agregar'; momento: Momento }
  | { tipo: 'alimento' | 'receta'; alimento?: Alimento; momento?: Momento }
  | { tipo: 'metas' }
  | { tipo: 'alimentos' }

const decimal = (s: string) => Number(s.replace(',', '.'))
const aItem = (c: RegistroComida): Item => ({ alimentoId: c.alimentoId, gramos: c.gramos, cantidad: c.cantidad, unidad: c.unidad })
const cantidadTexto = (c: Item) => (c.unidad === 'g' ? `${num(c.gramos)} g` : `${num(c.cantidad, c.cantidad % 1 ? 1 : 0)} ${c.unidad}`)

export function Comida({ hoy, perfil }: { hoy: string; perfil: Perfil }) {
  const [fecha, setFecha] = useState(hoy)
  const [vista, setVista] = useState<Vista>({ tipo: 'dia' })
  const alDia = () => setVista({ tipo: 'dia' })

  switch (vista.tipo) {
    case 'agregar':
      return <Agregar fecha={fecha} momento={vista.momento} onVolver={alDia} onCrear={(tipo) => setVista({ tipo, momento: vista.momento })} />
    case 'alimento':
    case 'receta': {
      const volver = () => setVista(vista.momento ? { tipo: 'agregar', momento: vista.momento } : { tipo: 'alimentos' })
      return vista.tipo === 'alimento' ? <FormAlimento inicial={vista.alimento} onVolver={volver} /> : <FormReceta inicial={vista.alimento} onVolver={volver} />
    }
    case 'metas':
      return <Metas hoy={hoy} perfil={perfil} onVolver={alDia} />
    case 'alimentos':
      return <MisAlimentos onVolver={alDia} onAbrir={(tipo, alimento) => setVista({ tipo, alimento })} />
    default:
      return <Dia hoy={hoy} fecha={fecha} setFecha={setFecha} setVista={setVista} />
  }
}

function Dia({ hoy, fecha, setFecha, setVista }: { hoy: string; fecha: string; setFecha: (f: string) => void; setVista: (v: Vista) => void }) {
  const ayer = sumarDias(fecha, -1)
  const comidas = useLiveQuery(() => db.registrosComida.where('fecha').anyOf(fecha, ayer).toArray(), [fecha])
  const metas = useLiveQuery(() => db.metasNutricion.toArray(), [], [])
  if (!comidas) return null

  const delDia = comidas.filter((c) => c.fecha === fecha)
  const deAyer = comidas.filter((c) => c.fecha === ayer)
  const total = sumar(delDia)
  const m = metasEn(metas, fecha)

  async function copiar(rs: RegistroComida[]) {
    for (const mo of MOMENTOS) {
      const items = rs.filter((c) => c.momento === mo).map(aItem)
      if (items.length) await agregarItems(fecha, mo, items)
    }
  }
  async function guardarFrecuente(momento: Momento, rs: RegistroComida[]) {
    const nombre = prompt('Nombre de la comida frecuente', `${NOMBRE_MOMENTO[momento]} de siempre`)?.trim()
    if (nombre) await db.comidasFrecuentes.add({ nombre, momento, items: rs.map(aItem) })
  }

  return (
    <div className="pantalla">
      <header className="barra">
        <h1>Comida</h1>
        <button className="link" onClick={() => setVista({ tipo: 'metas' })}>Metas</button>
      </header>
      <div className="dia-nav">
        <button aria-label="Día anterior" onClick={() => setFecha(ayer)}>‹</button>
        <span>{fecha === hoy ? 'Hoy' : fechaLarga(fecha)}</span>
        <button aria-label="Día siguiente" disabled={fecha >= hoy} onClick={() => setFecha(sumarDias(fecha, 1))}>›</button>
      </div>

      <section aria-label="Totales del día" className="totales">
        <Barra etiqueta="Calorías" valor={total.kcal} meta={m?.kcal} unidad="kcal" />
        <Barra etiqueta="Proteína" valor={total.p} meta={m?.proteinaG} unidad="g" />
        <Barra etiqueta="Carbohidratos" valor={total.c} meta={m?.carbosG} unidad="g" />
        <Barra etiqueta="Grasas" valor={total.g} meta={m?.grasasG} unidad="g" />
        {!m && <p className="ayuda">Definí tus metas para ver cuánto te falta. <button className="link" onClick={() => setVista({ tipo: 'metas' })}>Calcular metas</button></p>}
      </section>

      {MOMENTOS.map((mo) => {
        const rs = delDia.filter((c) => c.momento === mo)
        const previas = deAyer.filter((c) => c.momento === mo)
        return (
          <section key={mo} aria-labelledby={`t-${mo}`}>
            <h2 id={`t-${mo}`}>{NOMBRE_MOMENTO[mo]} {rs.length > 0 && <span>{num(sumar(rs).kcal)} kcal</span>}</h2>
            {rs.length > 0 && (
              <ul className="lista comidas">
                {rs.map((c) => (
                  <li key={c.id}>
                    <span className="texto"><strong>{c.nombre}</strong><small>{cantidadTexto(c)}, {num(c.p)} g de proteína</small></span>
                    <b>{num(c.kcal)}</b>
                    <button className="quitar" aria-label={`Quitar ${c.nombre}`} onClick={() => borrarComida(c)}>×</button>
                  </li>
                ))}
              </ul>
            )}
            <div className="acciones">
              <button className="secundario" onClick={() => setVista({ tipo: 'agregar', momento: mo })}>Agregar</button>
              {!rs.length && previas.length > 0 && <button className="link" onClick={() => copiar(previas)}>Copiar de ayer</button>}
              {rs.length > 0 && <button className="link" onClick={() => guardarFrecuente(mo, rs)}>Guardar como frecuente</button>}
            </div>
          </section>
        )
      })}

      <section>
        {!delDia.length && deAyer.length > 0 && <button className="secundario" onClick={() => copiar(deAyer)}>Copiar todo el día anterior</button>}
        <button className="link" onClick={() => setVista({ tipo: 'alimentos' })}>Mis alimentos y recetas</button>
      </section>
    </div>
  )
}

function Agregar({ fecha, momento, onVolver, onCrear }: { fecha: string; momento: Momento; onVolver: () => void; onCrear: (tipo: 'alimento' | 'receta') => void }) {
  const alimentos = useLiveQuery(() => db.alimentos.toArray())
  const ultimas = useLiveQuery(() => db.registrosComida.reverse().limit(300).toArray(), [], [])
  const frecuentes = useLiveQuery(() => db.comidasFrecuentes.toArray(), [], [])
  const [texto, setTexto] = useState('')
  const [elegido, setElegido] = useState<Alimento | null>(null)
  if (!alimentos) return null

  if (elegido)
    return <Cantidad alimento={elegido} onCancelar={() => setElegido(null)} onAgregar={async (item) => { await agregarItems(fecha, momento, [item]); onVolver() }} />

  const resultados = buscar(alimentos, texto, recientes(ultimas)).slice(0, 40)
  const frecs = frecuentes.filter((f) => (texto ? normalizar(f.nombre).includes(normalizar(texto)) : f.momento === momento))

  return (
    <div className="pantalla">
      <Volver titulo={`Agregar a ${NOMBRE_MOMENTO[momento].toLowerCase()}`} onVolver={onVolver} />
      <input type="search" aria-label="Buscar alimento" placeholder="Buscar alimento" value={texto} onChange={(e) => setTexto(e.target.value)} />

      {frecs.length > 0 && (
        <section aria-labelledby="t-frecuentes">
          <h2 id="t-frecuentes">Comidas frecuentes</h2>
          <ul className="lista">
            {frecs.map((f) => (
              <li key={f.id}>
                <button className="fila-simple" onClick={async () => { await agregarItems(fecha, momento, f.items); onVolver() }}>
                  <strong>{f.nombre}</strong>
                  <small>{f.items.length} {f.items.length === 1 ? 'alimento' : 'alimentos'}, se carga con un toque</small>
                </button>
                <button className="link peligro" aria-label={`Borrar ${f.nombre}`} onClick={() => confirm(`¿Borrar la comida frecuente ${f.nombre}?`) && db.comidasFrecuentes.delete(f.id)}>Borrar</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="t-resultados">
        <h2 id="t-resultados">{texto ? 'Resultados' : 'Recientes y favoritos'}</h2>
        {resultados.length === 0 && (
          <p className="vacio">{alimentos.length ? 'No hay alimentos con ese nombre.' : 'Todavía no cargaste alimentos. Creá el primero con los datos de la etiqueta.'}</p>
        )}
        <ul className="lista">
          {resultados.map((a) => (
            <li key={a.id}>
              <button className="fila-simple" onClick={() => setElegido(a)}>
                <strong>{a.favorito ? '★ ' : ''}{a.nombre}</strong>
                <small>{a.marca ? `${a.marca}. ` : ''}{num(a.por100.kcal)} kcal y {num(a.por100.p, 1)} g de proteína cada 100 g</small>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <div className="acciones">
        <button className="secundario" onClick={() => onCrear('alimento')}>Crear alimento</button>
        <button className="secundario" onClick={() => onCrear('receta')}>Crear receta</button>
      </div>
    </div>
  )
}

function Cantidad({ alimento, onCancelar, onAgregar }: { alimento: Alimento; onCancelar: () => void; onAgregar: (i: Item) => void }) {
  const opciones = [...alimento.porciones, { nombre: 'g', gramos: 1 }]
  const [unidad, setUnidad] = useState(opciones[0].nombre)
  const [cantidad, setCantidad] = useState(opciones[0].nombre === 'g' ? '100' : '1')
  const porcion = opciones.find((o) => o.nombre === unidad)!
  const n = decimal(cantidad)
  const gramos = n > 0 ? n * porcion.gramos : 0
  const m = macrosDe(alimento.por100, gramos)

  return (
    <div className="pantalla">
      <Volver titulo={alimento.nombre} onVolver={onCancelar} />
      <div className="fila-campos">
        <label>Cantidad<input inputMode="decimal" value={cantidad} onChange={(e) => setCantidad(e.target.value)} /></label>
        <label>
          Unidad
          <select value={unidad} onChange={(e) => { setUnidad(e.target.value); setCantidad(e.target.value === 'g' ? '100' : '1') }}>
            {opciones.map((o) => <option key={o.nombre} value={o.nombre}>{o.nombre === 'g' ? 'gramos' : `${o.nombre} (${num(o.gramos)} g)`}</option>)}
          </select>
        </label>
      </div>
      <dl className="datos">
        <dt>Calorías</dt><dd>{num(m.kcal)} kcal</dd>
        <dt>Proteína</dt><dd>{num(m.p, 1)} g</dd>
        <dt>Carbohidratos</dt><dd>{num(m.c, 1)} g</dd>
        <dt>Grasas</dt><dd>{num(m.g, 1)} g</dd>
      </dl>
      <button className="primario" disabled={!gramos} onClick={() => onAgregar({ alimentoId: alimento.id, gramos, cantidad: n, unidad })}>Agregar</button>
    </div>
  )
}

const MACROS: [keyof Macros, string][] = [['kcal', 'Calorías (kcal)'], ['p', 'Proteína (g)'], ['c', 'Carbohidratos (g)'], ['g', 'Grasas (g)']]
type Borrador = Omit<Alimento, 'id'> & { id?: number }

function FormAlimento({ inicial, onVolver }: { inicial?: Alimento; onVolver: () => void }) {
  const [a, setA] = useState<Borrador>(inicial ?? { nombre: '', marca: '', por100: { kcal: 0, p: 0, c: 0, g: 0 }, porciones: [], origen: 'propio', favorito: false })
  const [intento, setIntento] = useState(false)
  const set = (c: Partial<Borrador>) => setA({ ...a, ...c })
  const estimadas = a.por100.p * 4 + a.por100.c * 4 + a.por100.g * 9
  const error =
    !a.nombre.trim() ? 'Ponele un nombre.'
    : !(a.por100.kcal > 0) ? 'Cargá las calorías cada 100 g.'
    : a.porciones.some((p) => !p.nombre.trim() || !(p.gramos > 0)) ? 'Cada porción necesita un nombre y sus gramos.'
    : null

  async function guardar() {
    setIntento(true)
    if (error) return
    const limpio = { ...a, nombre: a.nombre.trim(), marca: a.marca?.trim() || undefined, porciones: a.porciones.map((p) => ({ ...p, nombre: p.nombre.trim() })) }
    if (limpio.id) await db.alimentos.put(limpio as Alimento)
    else await db.alimentos.add(limpio)
    onVolver()
  }

  return (
    <div className="pantalla form">
      <Volver titulo={a.id ? 'Editar alimento' : 'Nuevo alimento'} onVolver={onVolver} />
      <label>Nombre<input value={a.nombre} onChange={(e) => set({ nombre: e.target.value })} placeholder="Yogur bebible, Pan lactal" /></label>
      <label>Marca (opcional)<input value={a.marca ?? ''} onChange={(e) => set({ marca: e.target.value })} /></label>

      <fieldset>
        <legend>Cada 100 g o 100 ml, como dice la etiqueta</legend>
        <div className="fila-campos">
          {MACROS.map(([k, nombre]) => (
            <label key={k}>{nombre}<input inputMode="decimal" defaultValue={a.por100[k] || ''} onChange={(e) => set({ por100: { ...a.por100, [k]: decimal(e.target.value) || 0 } })} /></label>
          ))}
        </div>
        {a.por100.kcal > 0 && estimadas > 0 && Math.abs(estimadas - a.por100.kcal) > a.por100.kcal * 0.2 && (
          <p className="ayuda">Revisá los números: con esos macros serían unas {num(estimadas)} kcal.</p>
        )}
      </fieldset>

      <fieldset>
        <legend>Porciones caseras</legend>
        {a.porciones.map((p, i) => (
          <div key={i} className="fila-porcion">
            <input aria-label="Nombre de la porción" value={p.nombre} placeholder="1 unidad" onChange={(e) => set({ porciones: a.porciones.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)) })} />
            <input aria-label="Gramos de la porción" inputMode="decimal" defaultValue={p.gramos || ''} placeholder="g" onChange={(e) => set({ porciones: a.porciones.map((x, j) => (j === i ? { ...x, gramos: decimal(e.target.value) || 0 } : x)) })} />
            <button className="quitar" aria-label="Quitar porción" onClick={() => set({ porciones: a.porciones.filter((_, j) => j !== i) })}>×</button>
          </div>
        ))}
        <button className="link" onClick={() => set({ porciones: [...a.porciones, { nombre: '', gramos: 0 }] })}>Agregar porción</button>
      </fieldset>

      <label className="interruptor"><input type="checkbox" checked={a.favorito} onChange={(e) => set({ favorito: e.target.checked })} /> Favorito</label>
      {intento && error && <p className="error" role="alert">{error}</p>}
      <button className="primario" onClick={guardar}>Guardar alimento</button>
      {a.id && <button className="secundario" onClick={async () => { if (confirm(`¿Borrar ${a.nombre}? Lo que ya registraste no cambia.`)) { await db.alimentos.delete(a.id!); onVolver() } }}>Borrar alimento</button>}
    </div>
  )
}

function FormReceta({ inicial, onVolver }: { inicial?: Alimento; onVolver: () => void }) {
  const alimentos = useLiveQuery(() => db.alimentos.filter((x) => x.origen === 'propio').toArray(), [], [])
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [porciones, setPorciones] = useState(inicial?.receta?.porciones ?? 1)
  const [ings, setIngs] = useState(inicial?.receta?.ingredientes ?? [])
  const [texto, setTexto] = useState('')
  const [intento, setIntento] = useState(false)

  const usados = ings.flatMap((i) => {
    const a = alimentos.find((x) => x.id === i.alimentoId)
    return a ? [{ ...i, a }] : []
  })
  const r = receta(usados.map((i) => ({ gramos: i.gramos, por100: i.a.por100 })))
  const porPorcion = macrosDe(r.por100, r.gramos / (porciones || 1))
  const error = !nombre.trim() ? 'Ponele un nombre.' : !usados.length ? 'Agregá al menos un ingrediente.' : !(porciones >= 1) ? 'La receta tiene que rendir al menos 1 porción.' : null

  async function guardar() {
    setIntento(true)
    if (error) return
    const datos = {
      nombre: nombre.trim(), origen: 'receta' as const, favorito: inicial?.favorito ?? false, por100: r.por100,
      porciones: [{ nombre: 'porción', gramos: r.gramos / porciones }], receta: { ingredientes: ings, porciones },
    }
    if (inicial) await db.alimentos.put({ ...inicial, ...datos })
    else await db.alimentos.add(datos)
    onVolver()
  }

  return (
    <div className="pantalla form">
      <Volver titulo={inicial ? 'Editar receta' : 'Nueva receta'} onVolver={onVolver} />
      <div className="fila-campos">
        <label>Nombre<input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tarta de verdura" /></label>
        <label>Rinde (porciones)<input type="number" inputMode="numeric" min={1} value={porciones} onChange={(e) => setPorciones(Number(e.target.value))} /></label>
      </div>

      <fieldset>
        <legend>Ingredientes</legend>
        {usados.length === 0 && <p className="vacio">Buscá abajo los alimentos que lleva.</p>}
        {usados.map((i, k) => (
          <div key={i.alimentoId} className="fila-porcion">
            <span>{i.a.nombre}</span>
            <input aria-label={`Gramos de ${i.a.nombre}`} inputMode="decimal" defaultValue={i.gramos} onChange={(e) => setIngs(ings.map((x, j) => (j === k ? { ...x, gramos: decimal(e.target.value) || 0 } : x)))} />
            <button className="quitar" aria-label={`Quitar ${i.a.nombre}`} onClick={() => setIngs(ings.filter((_, j) => j !== k))}>×</button>
          </div>
        ))}
        <input type="search" aria-label="Buscar ingrediente" placeholder="Buscar ingrediente" value={texto} onChange={(e) => setTexto(e.target.value)} />
        {texto && (
          <ul className="lista">
            {buscar(alimentos, texto, []).filter((a) => !ings.some((i) => i.alimentoId === a.id)).slice(0, 6).map((a) => (
              <li key={a.id}><button className="fila-simple" onClick={() => { setIngs([...ings, { alimentoId: a.id, gramos: 100 }]); setTexto('') }}><strong>{a.nombre}</strong></button></li>
            ))}
          </ul>
        )}
      </fieldset>

      {usados.length > 0 && (
        <p className="ayuda">Total {num(r.gramos)} g. Cada porción pesa {num(r.gramos / (porciones || 1))} g y tiene {num(porPorcion.kcal)} kcal y {num(porPorcion.p, 1)} g de proteína.</p>
      )}
      {intento && error && <p className="error" role="alert">{error}</p>}
      <button className="primario" onClick={guardar}>Guardar receta</button>
      {inicial && <button className="secundario" onClick={async () => { if (confirm(`¿Borrar ${inicial.nombre}?`)) { await db.alimentos.delete(inicial.id); onVolver() } }}>Borrar receta</button>}
    </div>
  )
}

function MisAlimentos({ onVolver, onAbrir }: { onVolver: () => void; onAbrir: (tipo: 'alimento' | 'receta', a?: Alimento) => void }) {
  const alimentos = useLiveQuery(() => db.alimentos.orderBy('nombre').toArray())
  if (!alimentos) return null
  return (
    <div className="pantalla">
      <Volver titulo="Mis alimentos" onVolver={onVolver} />
      {alimentos.length === 0 && <p className="vacio">Cargá los alimentos que comés seguido con los datos de la etiqueta. Después se buscan en un toque.</p>}
      <ul className="lista">
        {alimentos.map((a) => (
          <li key={a.id}>
            <button className="fila-simple" onClick={() => onAbrir(a.origen === 'receta' ? 'receta' : 'alimento', a)}>
              <strong>{a.nombre}</strong>
              <small>{a.origen === 'receta' ? 'Receta. ' : ''}{num(a.por100.kcal)} kcal cada 100 g</small>
            </button>
            <button className="estrella" aria-pressed={a.favorito} aria-label={`Favorito: ${a.nombre}`} onClick={() => db.alimentos.update(a.id, { favorito: !a.favorito })}>★</button>
          </li>
        ))}
      </ul>
      <div className="acciones">
        <button className="secundario" onClick={() => onAbrir('alimento')}>Crear alimento</button>
        <button className="secundario" onClick={() => onAbrir('receta')}>Crear receta</button>
      </div>
    </div>
  )
}

const ACTIVIDADES: [Actividad, string][] = [
  ['sedentario', 'Sedentario'], ['ligero', 'Ligero (1 a 3 entrenamientos por semana)'], ['moderado', 'Moderado (3 a 5)'],
  ['alto', 'Alto (6 a 7)'], ['muy_alto', 'Muy alto (trabajo físico y entreno)'],
]

function Metas({ hoy, perfil, onVolver }: { hoy: string; perfil: Perfil; onVolver: () => void }) {
  const metas = useLiveQuery(() => db.metasNutricion.toArray(), [], [])
  const pesos = useLiveQuery(() => db.registrosPeso.toArray(), [], [])
  const actuales = metasEn(metas, hoy)
  const [manual, setManual] = useState<{ p: number; c: number; g: number } | null>(null)
  const up = (c: Partial<Perfil>) => db.perfil.update('yo', c)

  const ultimo = [...pesos].sort((a, b) => b.fecha.localeCompare(a.fecha))[0]
  const kg = tendencia(pesos, hoy) ?? ultimo?.kg
  const { sexo, nacimiento, alturaCm, actividad, objetivo } = perfil
  const calc = sexo && nacimiento && alturaCm && actividad && objetivo && kg
    ? calcularMetas({ sexo, años: edad(nacimiento, hoy), kg, cm: alturaCm, actividad, objetivo, ajusteKcal: perfil.ajusteKcal, proteinaGKg: perfil.proteinaGKg, grasasGKg: perfil.grasasGKg })
    : null
  const rango = objetivo && objetivo !== 'mantener' ? RANGO_AJUSTE[objetivo] : null

  return (
    <div className="pantalla form">
      <Volver titulo="Metas de nutrición" onVolver={onVolver} />

      <section aria-labelledby="t-datos">
        <h2 id="t-datos">Tus datos</h2>
        <div className="segmentos" role="group" aria-label="Sexo">
          {(['hombre', 'mujer'] as Sexo[]).map((s) => <button key={s} aria-pressed={sexo === s} onClick={() => up({ sexo: s })}>{s === 'hombre' ? 'Hombre' : 'Mujer'}</button>)}
        </div>
        <div className="fila-campos">
          <label>Nacimiento<input type="date" value={nacimiento ?? ''} max={hoy} onChange={(e) => up({ nacimiento: e.target.value || undefined })} /></label>
          <label>Altura (cm)<input key={alturaCm} inputMode="numeric" defaultValue={alturaCm ?? ''} onBlur={(e) => up({ alturaCm: decimal(e.target.value) > 100 ? decimal(e.target.value) : undefined })} /></label>
        </div>
        <label>
          Actividad
          <select value={actividad ?? ''} onChange={(e) => up({ actividad: (e.target.value || undefined) as Actividad })}>
            <option value="">Elegí tu nivel</option>
            {ACTIVIDADES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </label>
        <fieldset>
          <legend>Objetivo</legend>
          <div className="segmentos">
            {([['definir', 'Definir'], ['mantener', 'Mantener'], ['volumen', 'Volumen']] as [Objetivo, string][]).map(([v, t]) => (
              <button key={v} aria-pressed={objetivo === v} onClick={() => up({ objetivo: v, ajusteKcal: undefined })}>{t}</button>
            ))}
          </div>
        </fieldset>
        <div className="fila-campos">
          {rango && (
            <label>
              {objetivo === 'definir' ? 'Déficit (kcal)' : 'Superávit (kcal)'}
              <input key={`${objetivo}${perfil.ajusteKcal}`} type="number" inputMode="numeric" min={rango[0]} max={rango[1]} step={25} defaultValue={perfil.ajusteKcal ?? rango[2]}
                onBlur={(e) => up({ ajusteKcal: Math.min(rango[1], Math.max(rango[0], Number(e.target.value) || rango[2])) })} />
            </label>
          )}
          <label>
            Proteína (g por kg)
            <input key={perfil.proteinaGKg} type="number" inputMode="decimal" min={1.6} max={2.2} step={0.1} defaultValue={perfil.proteinaGKg ?? 2}
              onBlur={(e) => up({ proteinaGKg: Math.min(2.2, Math.max(1.6, decimal(e.target.value) || 2)) })} />
          </label>
          <label>
            Grasas (g por kg)
            <input key={perfil.grasasGKg} type="number" inputMode="decimal" min={0.6} step={0.1} defaultValue={perfil.grasasGKg ?? 0.8}
              onBlur={(e) => up({ grasasGKg: Math.max(0.6, decimal(e.target.value) || 0.8) })} />
          </label>
        </div>
        <p className="ayuda">{kg ? `Se calcula con ${num(kg, 1)} kg, ${tendencia(pesos, hoy) != null ? 'tu tendencia de peso' : 'tu último pesaje'}.` : 'Registrá tu peso en Cuerpo para poder calcular.'}</p>
      </section>

      {calc && (
        <section aria-labelledby="t-calculo">
          <h2 id="t-calculo">Cálculo</h2>
          <dl className="datos">
            <dt>Gasto diario estimado</dt><dd>{num(calc.tdee)} kcal</dd>
            <dt>Meta de calorías</dt><dd>{num(calc.kcal)} kcal</dd>
            <dt>Proteína</dt><dd>{calc.proteinaG} g</dd>
            <dt>Carbohidratos</dt><dd>{calc.carbosG} g</dd>
            <dt>Grasas</dt><dd>{calc.grasasG} g</dd>
          </dl>
          <button className="primario" onClick={() => guardarMetas({ desde: hoy, ...calc, origen: 'formula' })}>Usar estas metas</button>
        </section>
      )}

      <section aria-labelledby="t-actuales">
        <h2 id="t-actuales">Metas actuales</h2>
        {actuales ? (
          <>
            <p className="ayuda">Desde el {ddmmaaaa(actuales.desde)}, {actuales.origen === 'formula' ? 'calculadas' : 'cargadas a mano'}: {num(actuales.kcal)} kcal, {actuales.proteinaG} g de proteína, {actuales.carbosG} g de carbohidratos y {actuales.grasasG} g de grasas.</p>
            {!manual && <button className="link" onClick={() => setManual({ p: actuales.proteinaG, c: actuales.carbosG, g: actuales.grasasG })}>Editar a mano</button>}
          </>
        ) : (
          <>
            <p className="vacio">Todavía no hay metas. Completá tus datos o cargalas a mano.</p>
            {!manual && <button className="link" onClick={() => setManual({ p: 150, c: 250, g: 70 })}>Cargar a mano</button>}
          </>
        )}
        {manual && (
          <>
            <div className="fila-campos">
              {(['p', 'c', 'g'] as const).map((k) => (
                <label key={k}>{{ p: 'Proteína (g)', c: 'Carbohidratos (g)', g: 'Grasas (g)' }[k]}<input type="number" inputMode="numeric" value={manual[k]} onChange={(e) => setManual({ ...manual, [k]: Number(e.target.value) })} /></label>
              ))}
            </div>
            <p className="ayuda">Son {num(manual.p * 4 + manual.c * 4 + manual.g * 9)} kcal.</p>
            <button className="primario" onClick={async () => {
              await guardarMetas({ desde: hoy, kcal: manual.p * 4 + manual.c * 4 + manual.g * 9, proteinaG: manual.p, carbosG: manual.c, grasasG: manual.g, origen: 'manual' })
              setManual(null)
            }}>Guardar metas</button>
          </>
        )}
      </section>
    </div>
  )
}
