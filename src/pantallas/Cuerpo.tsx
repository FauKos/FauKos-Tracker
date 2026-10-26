import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, guardarPeso, type Perfil, type RegistroMedidas } from '../db'
import { leerKg, resumenPeso, serieTendencia } from '../logica/cuerpo'
import { ddmmaaaa, num, signo } from '../logica/fechas'
import { Linea } from '../ui'

const kg = (x: number | null | undefined) => (x == null ? 'Sin datos' : `${num(x, 1)} kg`)
const MEDIDAS: [keyof Omit<RegistroMedidas, 'id' | 'fecha'>, string][] = [
  ['cintura', 'Cintura (cm)'], ['cadera', 'Cadera (cm)'], ['pecho', 'Pecho (cm)'], ['brazo', 'Brazo (cm)'], ['muslo', 'Muslo (cm)'], ['grasaPct', 'Grasa (%)'],
]

export function Cuerpo({ hoy, perfil }: { hoy: string; perfil: Perfil }) {
  const pesos = useLiveQuery(() => db.registrosPeso.toArray())
  const medidas = useLiveQuery(() => db.registrosMedidas.orderBy('fecha').reverse().limit(10).toArray(), [], [])
  const [fecha, setFecha] = useState(hoy)
  const [texto, setTexto] = useState('')
  const [medida, setMedida] = useState<Partial<RegistroMedidas>>({})
  if (!pesos) return null

  const r = resumenPeso(pesos, hoy, perfil)
  const serie = serieTendencia(pesos, hoy, 90)
  const valor = leerKg(texto)
  const historial = [...pesos].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 20)

  async function guardar() {
    if (valor == null) return
    await guardarPeso(fecha, valor)
    setTexto('')
  }

  return (
    <div className="pantalla">
      <header className="barra"><h1>Cuerpo</h1></header>

      <section aria-labelledby="t-pesar">
        <h2 id="t-pesar">Registrar peso</h2>
        <p className="ayuda">Pesate a la mañana, en ayunas y después del baño. Lo que importa es la tendencia, no el número de un día.</p>
        <div className="fila-campos">
          <label>Peso (kg)<input inputMode="decimal" value={texto} placeholder={r.ultimo ? num(r.ultimo.kg, 1) : '80,0'} onChange={(e) => setTexto(e.target.value)} /></label>
          <label>Día<input type="date" value={fecha} max={hoy} onChange={(e) => e.target.value && setFecha(e.target.value)} /></label>
        </div>
        <button className="primario" disabled={valor == null} onClick={guardar}>Guardar peso</button>
      </section>

      <section aria-labelledby="t-tendencia">
        <h2 id="t-tendencia">Tendencia <span>{kg(r.tendencia)}</span></h2>
        <Linea valores={serie.map((s) => s.kg)} etiqueta="Tendencia de peso de los últimos 90 días" />
        <dl className="datos">
          <dt>Último pesaje</dt><dd>{r.ultimo ? `${kg(r.ultimo.kg)} (${ddmmaaaa(r.ultimo.fecha).slice(0, 5)})` : 'Sin datos'}</dd>
          <dt>Cambio en 7 días</dt><dd>{r.cambio7 == null ? 'Sin datos' : `${signo(r.cambio7)} kg`}</dd>
          <dt>Cambio en 30 días</dt><dd>{r.cambio30 == null ? 'Sin datos' : `${signo(r.cambio30)} kg`}</dd>
          <dt>Ritmo real</dt><dd>{r.ritmoReal == null ? 'Sin datos' : `${signo(r.ritmoReal, 2)} kg por semana`}</dd>
        </dl>
        {r.tendencia == null && <p className="ayuda">La tendencia aparece con 3 pesajes en una semana.</p>}
      </section>

      <section aria-labelledby="t-meta">
        <h2 id="t-meta">Meta</h2>
        <div className="fila-campos">
          <label>
            Peso objetivo (kg)
            <input key={perfil.pesoObjetivo} inputMode="decimal" defaultValue={perfil.pesoObjetivo ? num(perfil.pesoObjetivo, 1) : ''}
              onBlur={(e) => db.perfil.update('yo', { pesoObjetivo: leerKg(e.target.value) ?? undefined })} />
          </label>
          <label>
            Ritmo por semana
            <select value={perfil.ritmoSemanal ?? ''} onChange={(e) => db.perfil.update('yo', { ritmoSemanal: e.target.value ? Number(e.target.value) : undefined })}>
              <option value="">Sin definir</option>
              {[-1, -0.75, -0.5, -0.25, 0.25, 0.5].map((x) => <option key={x} value={x}>{signo(x, 2)} kg</option>)}
            </select>
          </label>
        </div>
        {perfil.pesoObjetivo && r.tendencia != null && (
          <p className="ayuda">
            {r.alcanzada ? 'Tu tendencia ya llegó a la meta.'
              : `Te faltan ${num(Math.abs(r.falta!), 1)} kg. ` +
                (r.fechaEstimada ? `Con tu ritmo real llegarías el ${ddmmaaaa(r.fechaEstimada)}.` : 'Con el ritmo de las últimas semanas todavía no hay fecha estimada.')}
          </p>
        )}
        {r.agresivo && <p className="aviso-suave">Bajar más del 1% de tu peso por semana es muy rápido. Un ritmo más suave es más fácil de sostener.</p>}
      </section>

      <section aria-labelledby="t-medidas">
        <h2 id="t-medidas">Medidas</h2>
        <div className="fila-campos">
          {MEDIDAS.map(([k, nombre]) => (
            <label key={k}>{nombre}<input inputMode="decimal" value={medida[k] ?? ''} onChange={(e) => setMedida({ ...medida, [k]: e.target.value === '' ? undefined : Number(e.target.value.replace(',', '.')) || undefined })} /></label>
          ))}
        </div>
        <button className="secundario" disabled={!Object.values(medida).some(Boolean)} onClick={async () => { await db.registrosMedidas.add({ fecha: hoy, ...medida }); setMedida({}) }}>
          Guardar medidas de hoy
        </button>
        {medidas.length > 0 && (
          <ul className="lista historial">
            {medidas.map((m) => (
              <li key={m.id}>
                <span className="texto">
                  <strong>{ddmmaaaa(m.fecha)}</strong>
                  <small>{MEDIDAS.filter(([k]) => m[k] != null).map(([k, n]) => `${n.split(' ')[0]} ${num(m[k]!, 1)}`).join(', ')}</small>
                </span>
                <button className="link peligro" aria-label={`Borrar medidas del ${ddmmaaaa(m.fecha)}`} onClick={() => confirm('¿Borrar estas medidas?') && db.registrosMedidas.delete(m.id)}>Borrar</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="t-pesajes">
        <h2 id="t-pesajes">Pesajes</h2>
        {historial.length === 0 && <p className="vacio">Todavía no registraste tu peso.</p>}
        <ul className="lista historial">
          {historial.map((p) => (
            <li key={p.id}>
              <span className="texto"><strong>{ddmmaaaa(p.fecha)}</strong></span>
              <b>{kg(p.kg)}</b>
              <button className="link peligro" aria-label={`Borrar pesaje del ${ddmmaaaa(p.fecha)}`} onClick={() => confirm('¿Borrar este pesaje?') && db.registrosPeso.delete(p.id)}>Borrar</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
