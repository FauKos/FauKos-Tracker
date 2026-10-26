import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, type Perfil } from '../db'
import { ddmmaaaa, duracion } from '../logica/fechas'
import { rachaDiaria } from '../logica/habitos'
import { horarioHabitual, metricasSueno } from '../logica/sueno'
import { FormSueno, Titulo } from '../ui'

const horas = (min: number | null) => (min == null ? 'Sin datos' : duracion(min))
const nota = (n: number | null) => (n == null ? 'Sin datos' : n.toFixed(1).replace('.', ','))

export function Sueno({ hoy, perfil }: { hoy: string; perfil: Perfil }) {
  const regs = useLiveQuery(() => db.registrosSueno.toArray(), [], [])
  const [fecha, setFecha] = useState(hoy)
  const m = metricasSueno(regs, hoy, perfil.metaSuenoMin)
  const racha = rachaDiaria(m.cumplidos, hoy)
  const historial = [...regs].sort((a, b) => b.levantado.localeCompare(a.levantado)).slice(0, 30)

  return (
    <div className="pantalla">
      <header className="barra"><h1>Sueño</h1></header>

      <section aria-labelledby="t-cargar">
        <Titulo l="sueno" id="t-cargar">Cargar</Titulo>
        <label className="fecha-campo">Día en que te levantaste<input type="date" value={fecha} max={hoy} onChange={(e) => e.target.value && setFecha(e.target.value)} /></label>
        <FormSueno key={fecha + regs.length} fecha={fecha} inicial={horarioHabitual(regs)} conSiesta />
      </section>

      <section aria-labelledby="t-numeros">
        <Titulo l="sueno" id="t-numeros">Cómo venís</Titulo>
        <dl className="datos">
          <dt>Promedio 7 días</dt><dd>{horas(m.min7)}</dd>
          <dt>Promedio 30 días</dt><dd>{horas(m.min30)}</dd>
          <dt>Calidad 7 días</dt><dd>{nota(m.calidad7)}</dd>
          <dt>Calidad 30 días</dt><dd>{nota(m.calidad30)}</dd>
          <dt>Hora de acostarte</dt><dd>{m.regularidad ? `${m.regularidad[0].toUpperCase()}${m.regularidad.slice(1)}` : 'Sin datos'}</dd>
          <dt>Deuda de esta semana</dt><dd>{duracion(m.deudaMin)}</dd>
          <dt>Noches con la meta seguidas</dt><dd>{racha.actual} <small>(mejor {racha.mejor})</small></dd>
        </dl>
      </section>

      <section aria-labelledby="t-historial">
        <h2 id="t-historial">Historial</h2>
        {historial.length === 0 && <p className="vacio">Cargá tu primera noche arriba.</p>}
        <ul className="lista historial">
          {historial.map((r) => (
            <li key={r.id}>
              <span className="texto">
                <strong>{ddmmaaaa(r.fecha)}{r.esSiesta && ', siesta'}</strong>
                <small>De {r.acostado.slice(11)} a {r.levantado.slice(11)}{r.calidad && `, calidad ${r.calidad}`}</small>
              </span>
              <b className={!r.esSiesta && r.duracionMin >= perfil.metaSuenoMin ? 'ok' : ''}>{duracion(r.duracionMin)}</b>
              <button className="link peligro" aria-label={`Borrar registro del ${ddmmaaaa(r.fecha)}`} onClick={() => confirm('¿Borrar este registro?') && db.registrosSueno.delete(r.id)}>Borrar</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
