import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type CSSProperties } from 'react'
import { COLORES, db, type Frecuencia, type Habito } from '../db'
import { DIAS_CORTOS } from '../logica/fechas'
import { rachaHabito } from '../logica/habitos'

type Borrador = Omit<Habito, 'id'> & { id?: number }

const NUEVO: Borrador = {
  nombre: '', icono: '✅', color: COLORES[0], tipo: 'check', meta: 1, unidad: '', incremento: 1,
  frecuencia: 'diaria', diasFijos: [], vecesPorSemana: 3, orden: 0, archivado: false,
}

function frecuenciaTexto(h: Habito) {
  if (h.frecuencia === 'diaria') return 'Todos los días'
  if (h.frecuencia === 'x_por_semana') return `${h.vecesPorSemana} ${h.vecesPorSemana === 1 ? 'vez' : 'veces'} por semana`
  return h.diasFijos.map((d) => DIAS_CORTOS[d]).join(', ')
}

function FormHabito({ inicial, hoy, onListo }: { inicial: Borrador; hoy: string; onListo: () => void }) {
  const [b, setB] = useState(inicial)
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
      <header className="barra">
        <h1>{b.id ? 'Editar hábito' : 'Nuevo hábito'}</h1>
        <button className="link" onClick={onListo}>Cancelar</button>
      </header>

      <label>Nombre<input value={b.nombre} onChange={(e) => set({ nombre: e.target.value })} placeholder="Leer, Meditar, Caminar" /></label>
      <label>Ícono<input value={b.icono} onChange={(e) => set({ icono: e.target.value })} className="icono-input" /></label>

      <fieldset>
        <legend>Color</legend>
        <div className="colores">
          {COLORES.map((c) => (
            <button key={c} style={{ '--c': c } as CSSProperties} aria-label={`Color ${c}`} aria-pressed={b.color === c} onClick={() => set({ color: c })} />
          ))}
        </div>
      </fieldset>

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
          <label>Unidad<input value={b.unidad} onChange={(e) => set({ unidad: e.target.value })} placeholder="vasos, páginas, min" /></label>
          <label>Cada toque suma<input type="number" inputMode="decimal" value={b.incremento} onChange={(e) => set({ incremento: Number(e.target.value) })} /></label>
        </div>
      )}

      <fieldset>
        <legend>Frecuencia</legend>
        <div className="segmentos">
          {([['diaria', 'Todos los días'], ['x_por_semana', 'Veces por semana'], ['dias_fijos', 'Días fijos']] as [Frecuencia, string][]).map(([f, t]) => (
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

      {intento && error && <p className="error" role="alert">{error}</p>}
      <button className="primario" onClick={guardar}>Guardar hábito</button>
      {b.id && <button className="secundario" onClick={archivar}>Archivar hábito</button>}
    </div>
  )
}

export function Habitos({ hoy }: { hoy: string }) {
  const habitos = useLiveQuery(() => db.habitos.toArray())
  const regs = useLiveQuery(() => db.registrosHabito.toArray(), [], [])
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
        <button className="link" onClick={() => setEditando(NUEVO)}>Nuevo hábito</button>
      </header>

      {activos.length === 0 && <p className="vacio">Creá tu primer hábito para empezar a sumar rachas.</p>}
      <ul className="lista">
        {activos.map((h, i) => {
          const r = rachaHabito(h, regs.filter((x) => x.habitoId === h.id), hoy)
          const unidad = h.frecuencia === 'x_por_semana' ? 'semanas' : 'días'
          return (
            <li key={h.id} style={{ '--c': h.color } as CSSProperties}>
              <button className="fila" onClick={() => setEditando(h)}>
                <span className="icono" aria-hidden>{h.icono}</span>
                <span className="texto">
                  <strong>{h.nombre}</strong>
                  <small>{frecuenciaTexto(h)}{h.tipo === 'cantidad' && `, meta ${h.meta} ${h.unidad}`}</small>
                </span>
                <span className="racha">
                  <b>{r.actual}</b> {unidad}
                  <small>mejor {r.mejor}</small>
                </span>
              </button>
              <span className="orden">
                <button aria-label={`Subir ${h.nombre}`} disabled={i === 0} onClick={() => mover(i, -1)}>↑</button>
                <button aria-label={`Bajar ${h.nombre}`} disabled={i === activos.length - 1} onClick={() => mover(i, 1)}>↓</button>
              </span>
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
                <span className="texto"><strong>{h.icono} {h.nombre}</strong></span>
                <button className="link" onClick={() => db.habitos.update(h.id, { archivado: false, archivadoEn: undefined, orden: activos.length })}>Restaurar</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
