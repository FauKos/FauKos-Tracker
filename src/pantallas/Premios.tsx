import { useLiveQuery } from 'dexie-react-hooks'
import { Fragment, useState } from 'react'
import { canjear, db, type Datos, type Recompensa } from '../db'
import { ddmmaaaa, num } from '../logica/fechas'
import { LOGROS, MAX_COMODINES, type Progreso } from '../logica/recompensas'

type Borrador = Omit<Recompensa, 'id'> & { id?: number }
const NUEVA: Borrador = { nombre: '', icono: '🎁', costo: 500, repetible: true }

function FormRecompensa({ inicial, onListo }: { inicial: Borrador; onListo: () => void }) {
  const [r, setR] = useState(inicial)
  const valido = r.nombre.trim() && r.costo > 0
  async function guardar() {
    if (!valido) return
    const limpio = { ...r, nombre: r.nombre.trim() }
    if (limpio.id) await db.recompensas.put(limpio as Recompensa)
    else await db.recompensas.add(limpio)
    onListo()
  }
  return (
    <div className="confirmar">
      <div className="fila-campos">
        <label>Premio<input value={r.nombre} placeholder="Cena afuera" onChange={(e) => setR({ ...r, nombre: e.target.value })} /></label>
        <label>Ícono<input className="icono-input" value={r.icono} onChange={(e) => setR({ ...r, icono: e.target.value })} /></label>
        <label>Cuesta (puntos)<input type="number" inputMode="numeric" min={1} value={r.costo} onChange={(e) => setR({ ...r, costo: Number(e.target.value) })} /></label>
      </div>
      <label className="interruptor"><input type="checkbox" checked={r.repetible} onChange={(e) => setR({ ...r, repetible: e.target.checked })} /> Se puede canjear más de una vez</label>
      <button className="primario" disabled={!valido} onClick={guardar}>Guardar premio</button>
      <div className="acciones">
        <button className="link" onClick={onListo}>Cancelar</button>
        {r.id && <button className="link peligro" onClick={async () => { if (confirm(`¿Borrar ${r.nombre}?`)) { await db.recompensas.delete(r.id!); onListo() } }}>Borrar</button>}
      </div>
    </div>
  )
}

export function Premios({ hoy, datos, progreso }: { hoy: string; datos: Datos; progreso: Progreso }) {
  const recompensas = useLiveQuery(() => db.recompensas.toArray(), [], [])
  const [editando, setEditando] = useState<Borrador | null>(null)
  const { nivel: nv, xp, comodines } = progreso
  const desbloqueados = new Map(datos.logros.map((l) => [l.clave, l.desbloqueadoEn]))
  const canjes = [...datos.canjes].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)

  return (
    <div className="pantalla">
      <header className="barra"><h1>Premios</h1></header>

      <section className="nivel" aria-labelledby="t-nivel">
        <h2 id="t-nivel">Nivel {nv.n} <span>{nv.nombre}</span></h2>
        <progress max={nv.siguiente} value={nv.actual} aria-label={`${nv.actual} de ${nv.siguiente} XP`} />
        <p className="ayuda">{num(nv.actual)} de {num(nv.siguiente)} XP para el nivel {nv.n + 1}. Llevás {num(xp.total)} XP en total.</p>
        <dl className="datos">
          <dt>Puntos para canjear</dt><dd>{num(xp.saldo)}</dd>
          <dt>Comodines</dt><dd>{comodines} de {MAX_COMODINES}</dd>
        </dl>
        <p className="ayuda">Ganás un comodín cada 7 días perfectos seguidos. Sirve para que un día sin cumplir no corte la racha de un hábito: se usa desde Hoy, yendo a ese día.</p>
      </section>

      <section aria-labelledby="t-tienda">
        <h2 id="t-tienda">Tienda</h2>
        {recompensas.length === 0 && !editando && <p className="vacio">Cargá premios reales que te quieras dar: una cena afuera, una salida, algo que tenías ganas de comprar.</p>}
        <ul className="lista">
          {recompensas.map((r) => {
            const usada = !r.repetible && datos.canjes.some((c) => c.recompensaId === r.id)
            return (
              <li key={r.id}>
                <button className="fila-simple" onClick={() => setEditando(r)}>
                  <strong>{r.icono} {r.nombre}</strong>
                  <small>{num(r.costo)} puntos{r.repetible ? '' : usada ? ', ya canjeado' : ', una sola vez'}</small>
                </button>
                <button className="secundario chico" disabled={usada || xp.saldo < r.costo} onClick={() => confirm(`¿Canjear ${r.nombre} por ${num(r.costo)} puntos?`) && canjear(r, hoy)}>Canjear</button>
              </li>
            )
          })}
        </ul>
        {editando ? <FormRecompensa key={editando.id ?? 'nueva'} inicial={editando} onListo={() => setEditando(null)} /> : <button className="secundario" onClick={() => setEditando(NUEVA)}>Agregar premio</button>}
        {canjes.length > 0 && (
          <>
            <h3>Canjeados</h3>
            <ul className="lista historial">
              {canjes.slice(0, 10).map((c) => (
                <li key={c.id}><span className="texto"><strong>{c.nombre}</strong><small>{ddmmaaaa(c.fecha)}</small></span><b>{num(c.costo)}</b></li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section aria-labelledby="t-logros">
        <h2 id="t-logros">Logros <span>{desbloqueados.size} de {LOGROS.length}</span></h2>
        <ul className="logros">
          {[...LOGROS].sort((a, b) => Number(desbloqueados.has(b.clave)) - Number(desbloqueados.has(a.clave))).map((l) => {
            const fecha = desbloqueados.get(l.clave)
            return (
              <li key={l.clave} className={fecha ? '' : 'bloqueado'}>
                <span className="icono" aria-hidden>{l.icono}</span>
                <span className="texto">
                  <strong>{l.nombre}</strong>
                  <small>{l.descripcion}</small>
                </span>
                <small className="xp">{fecha ? ddmmaaaa(fecha).slice(0, 5) : `+${l.xp} XP`}</small>
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="t-xp">
        <h2 id="t-xp">De dónde sale tu XP</h2>
        <dl className="datos">
          {Object.entries(xp.partes).filter(([, v]) => v > 0).map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{num(v)}</dd></Fragment>)}
        </dl>
        {xp.total === 0 && <p className="vacio">Todavía no sumaste XP. Cada hábito cumplido suma 10.</p>}
      </section>
    </div>
  )
}
