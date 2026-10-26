import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, type Frecuencia, type Habito, type RegistroHabito } from '../db'
import { DIAS_CORTOS, lunesDe, sumarDias } from '../logica/fechas'
import { diasCumplidos, pausaDe, rachaHabito, seEvalua } from '../logica/habitos'
import { Icono, iconoDe, ICONOS_HABITO, linea, Recorrido, Volver } from '../ui'

type Borrador = Omit<Habito, 'id'> & { id?: number }

const NUEVO: Borrador = {
  nombre: '', icono: 'objetivo', color: '', tipo: 'check', meta: 1, unidad: '', incremento: 1,
  frecuencia: 'diaria', diasFijos: [], vecesPorSemana: 3, orden: 0, archivado: false,
}

function frecuenciaTexto(h: Habito) {
  if (h.frecuencia === 'diaria') return 'Todos los días'
  if (h.frecuencia === 'x_por_semana') return `${h.vecesPorSemana} ${h.vecesPorSemana === 1 ? 'vez' : 'veces'} por semana`
  return h.diasFijos.map((d) => DIAS_CORTOS[d]).join(', ')
}

/** La semana del hábito como recorrido de lunes a domingo. */
function Semana({ h, regs, hoy }: { h: Habito; regs: RegistroHabito[]; hoy: string }) {
  const lunes = lunesDe(hoy)
  const ok = diasCumplidos(h, regs)
  return (
    <Recorrido l={h.clave === 'agua' ? 'agua' : 'habitos'} compacto etiqueta={`${h.nombre} esta semana`}
      estaciones={DIAS_CORTOS.map((d, i) => {
        const f = sumarDias(lunes, i)
        return { nombre: d[0].toUpperCase(), hecho: ok.has(f), proxima: f === hoy && !ok.has(f) && seEvalua(h, f), fuera: !seEvalua(h, f) }
      })} />
  )
}

function FormHabito({ inicial, hoy, onListo }: { inicial: Borrador; hoy: string; onListo: () => void }) {
  const [b, setB] = useState({ ...inicial, icono: iconoDe(inicial.icono) as string })
  const [intento, setIntento] = useState(false)
  const set = (c: Partial<Borrador>) => setB({ ...b, ...c })
  const error =
    !b.nombre.trim() ? 'Ponele un nombre.'
    : b.tipo === 'cantidad' && !(b.meta > 0 && b.incremento > 0) ? 'La meta y lo que suma cada toque tienen que ser mayores a 0.'
    : b.frecuencia === 'x_por_semana' && !(b.vecesPorSemana >= 1 && b.vecesPorSemana <= 7) ? 'Elegí entre 1 y 7 veces por semana.'
    : b.frecuencia === 'dias_fijos' && !b.diasFijos.length ? 'Elegí al menos un día.'
    : null

  async function guardar() {
    setIntento(true)
    if (error) return
    const h = { ...b, nombre: b.nombre.trim(), ...(b.tipo === 'check' && { meta: 1, incremento: 1, unidad: '' }) }
    if (h.id) await db.habitos.put(h as Habito)
    else await db.habitos.add({ ...h, desde: hoy, orden: await db.habitos.count() })
    onListo()
  }

  async function archivar() {
    if (!b.id || !confirm(`¿Archivar ${b.nombre}? El historial se guarda y lo podés restaurar.`)) return
    await db.habitos.update(b.id, { archivado: true, archivadoEn: hoy })
    onListo()
  }

  return (
    <div className="pantalla form">
      <Volver titulo={b.id ? 'Editar hábito' : 'Nuevo hábito'} texto="Hábitos" onVolver={onListo} />

      <section>
        <label>Nombre<input value={b.nombre} onChange={(e) => set({ nombre: e.target.value })} placeholder="Leer, meditar, caminar" /></label>
        <fieldset>
          <legend>Ícono</legend>
          <div className="iconos" role="radiogroup" aria-label="Ícono">
            {ICONOS_HABITO.map((i) => (
              <button key={i} role="radio" aria-checked={b.icono === i} aria-label={i} onClick={() => set({ icono: i })}><Icono i={i} /></button>
            ))}
          </div>
        </fieldset>
      </section>

      <section>
        <fieldset>
          <legend>Cómo se registra</legend>
          <div className="segmentos">
            <button aria-pressed={b.tipo === 'check'} onClick={() => set({ tipo: 'check' })}>Hecho o no</button>
            <button aria-pressed={b.tipo === 'cantidad'} onClick={() => set({ tipo: 'cantidad', meta: b.tipo === 'check' ? 8 : b.meta })}>Con cantidad</button>
          </div>
        </fieldset>
        {b.tipo === 'cantidad' && (
          <div className="fila-campos">
            <label>Meta<input type="number" inputMode="decimal" value={b.meta} onChange={(e) => set({ meta: Number(e.target.value) })} /></label>
            <label>Unidad<input value={b.unidad} onChange={(e) => set({ unidad: e.target.value })} placeholder="vasos, páginas" /></label>
            <label>Cada toque suma<input type="number" inputMode="decimal" value={b.incremento} onChange={(e) => set({ incremento: Number(e.target.value) })} /></label>
          </div>
        )}
      </section>

      <section>
        <fieldset>
          <legend>Frecuencia</legend>
          <div className="segmentos">
            {([['diaria', 'Todos los días'], ['x_por_semana', 'Por semana'], ['dias_fijos', 'Días fijos']] as [Frecuencia, string][]).map(([f, t]) => (
              <button key={f} aria-pressed={b.frecuencia === f} onClick={() => set({ frecuencia: f })}>{t}</button>
            ))}
          </div>
          {b.frecuencia === 'x_por_semana' && (
            <label>Veces por semana<input type="number" inputMode="numeric" min={1} max={7} value={b.vecesPorSemana} onChange={(e) => set({ vecesPorSemana: Number(e.target.value) })} /></label>
          )}
          {b.frecuencia === 'dias_fijos' && (
            <div className="dias">
              {DIAS_CORTOS.map((d, i) => (
                <button key={d} aria-pressed={b.diasFijos.includes(i)} onClick={() => set({ diasFijos: b.diasFijos.includes(i) ? b.diasFijos.filter((x) => x !== i) : [...b.diasFijos, i].sort() })}>{d}</button>
              ))}
            </div>
          )}
        </fieldset>
      </section>

      {intento && error && <p className="error" role="alert">{error}</p>}
      <button className="primario" style={linea('habitos')} onClick={guardar}>Guardar hábito</button>
      {b.id && <button className="secundario peligro" onClick={archivar}>Archivar hábito</button>}
    </div>
  )
}

export function Habitos({ hoy }: { hoy: string }) {
  const habitos = useLiveQuery(() => db.habitos.toArray())
  const regs = useLiveQuery(() => db.registrosHabito.toArray(), [], [])
  const comodines = useLiveQuery(() => db.comodines.toArray(), [], [])
  const pausas = useLiveQuery(() => db.pausas.toArray(), [], [])
  const [editando, setEditando] = useState<Borrador | null>(null)

  if (!habitos) return null // cargando
  if (editando) return <FormHabito inicial={editando} hoy={hoy} onListo={() => setEditando(null)} />

  const activos = habitos.filter((h) => !h.archivado).sort((a, b) => a.orden - b.orden)
  const archivados = habitos.filter((h) => h.archivado)

  async function mover(i: number, d: -1 | 1) {
    const nuevo = [...activos]
    ;[nuevo[i], nuevo[i + d]] = [nuevo[i + d], nuevo[i]]
    await db.transaction('rw', db.habitos, () => Promise.all(nuevo.map((h, j) => db.habitos.update(h.id, { orden: j }))))
  }

  return (
    <div className="pantalla">
      <header className="barra">
        <h1>Hábitos</h1>
        <button className="secundario chico" onClick={() => setEditando(NUEVO)}><Icono i="sumar" tam={18} />Nuevo</button>
      </header>

      {activos.length === 0 && <p className="vacio">Creá tu primer hábito para empezar a sumar rachas.</p>}
      <ul className="lista cartel habitos-semana">
        {activos.map((h, i) => {
          const rs = regs.filter((x) => x.habitoId === h.id)
          // Igual que en Hoy: los comodines y las pausas sostienen la racha
          const r = rachaHabito(h, rs, hoy, { cubiertos: comodines.filter((c) => c.habitoId === h.id).map((c) => c.fecha), enPausa: pausaDe(pausas) })
          const unidad = h.frecuencia === 'x_por_semana' ? (r.actual === 1 ? 'semana' : 'semanas') : r.actual === 1 ? 'día' : 'días'
          return (
            <li key={h.id}>
              <div className="habito-cabeza">
                <button className="fila" onClick={() => setEditando(h)}>
                  <span className="icono"><Icono i={iconoDe(h.icono)} /></span>
                  <span className="texto">
                    <strong>{h.nombre}</strong>
                    <small>{frecuenciaTexto(h)}{h.tipo === 'cantidad' && `, meta ${h.meta} ${h.unidad}`}</small>
                  </span>
                  <span className="racha"><b>{r.actual}</b>{unidad}<small>mejor {r.mejor}</small></span>
                </button>
                <span className="orden">
                  <button aria-label={`Subir ${h.nombre}`} disabled={i === 0} onClick={() => mover(i, -1)}><Icono i="arriba" tam={18} /></button>
                  <button aria-label={`Bajar ${h.nombre}`} disabled={i === activos.length - 1} onClick={() => mover(i, 1)}><Icono i="abajo" tam={18} /></button>
                </span>
              </div>
              <Semana h={h} regs={rs} hoy={hoy} />
            </li>
          )
        })}
      </ul>

      {archivados.length > 0 && (
        <section aria-labelledby="t-archivados">
          <h2 id="t-archivados">Archivados</h2>
          <ul className="lista">
            {archivados.map((h) => (
              <li key={h.id} className="archivado">
                <span className="icono"><Icono i={iconoDe(h.icono)} /></span>
                <span className="texto"><strong>{h.nombre}</strong></span>
                <button className="link" onClick={() => db.habitos.update(h.id, { archivado: false, archivadoEn: undefined, orden: activos.length })}>Restaurar</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
