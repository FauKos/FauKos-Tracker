import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, type Datos, type Perfil } from '../db'
import { ddmmaaaa, diaSemana, duracion, lunesDe, num, signo, sumarDias } from '../logica/fechas'
import { pausaDe, rachaHabito } from '../logica/habitos'
import { LOGROS } from '../logica/recompensas'
import { resumenSemana } from '../logica/revision'

const sinDatos = 'Sin datos'

export function Revision({ hoy, datos, perfil }: { hoy: string; datos: Datos; perfil: Perfil }) {
  // El domingo se revisa la semana que termina; el resto de los días, la anterior.
  const [lunes, setLunes] = useState(diaSemana(hoy) === 6 ? lunesDe(hoy) : sumarDias(lunesDe(hoy), -7))
  const revisiones = useLiveQuery(() => db.revisiones.toArray(), [], [])
  const r = resumenSemana(datos, lunes, hoy, perfil.metaSuenoMin)
  const propia = revisiones.find((x) => x.semana === lunes)
  const anterior = revisiones.find((x) => x.semana === sumarDias(lunes, -7))
  const enPausa = pausaDe(datos.pausas)
  const rachas = datos.habitos
    .filter((h) => !h.archivado)
    .map((h) => ({
      h,
      r: rachaHabito(h, datos.registrosHabito.filter((x) => x.habitoId === h.id), r.fin, {
        cubiertos: datos.comodines.filter((c) => c.habitoId === h.id).map((c) => c.fecha), enPausa,
      }),
    }))
    .filter((x) => x.r.actual > 0)
    .sort((a, b) => b.r.actual - a.r.actual)

  return (
    <div className="pantalla">
      <header className="barra"><h1>Revisión semanal</h1></header>
      <div className="dia-nav">
        <button aria-label="Semana anterior" onClick={() => setLunes(sumarDias(lunes, -7))}>‹</button>
        <span>Del {ddmmaaaa(lunes).slice(0, 5)} al {ddmmaaaa(sumarDias(lunes, 6)).slice(0, 5)}</span>
        <button aria-label="Semana siguiente" disabled={lunes >= lunesDe(hoy)} onClick={() => setLunes(sumarDias(lunes, 7))}>›</button>
      </div>

      <section aria-labelledby="t-numeros">
        <h2 id="t-numeros">La semana en números</h2>
        <dl className="datos">
          <dt>Hábitos cumplidos</dt><dd>{r.pctHabitos == null ? sinDatos : `${r.pctHabitos}%`}</dd>
          <dt>Sueño promedio</dt><dd>{r.suenoMin == null ? sinDatos : duracion(r.suenoMin)}</dd>
          <dt>Noches con tu meta</dt><dd>{r.nochesConMeta}</dd>
          {r.entrenamientos != null && <><dt>Entrenamientos</dt><dd>{r.entrenamientos}</dd></>}
          {r.diasProteina != null && <><dt>Días con la meta de proteína</dt><dd>{r.diasProteina}</dd></>}
          <dt>Tendencia de peso</dt><dd>{r.cambioPeso == null ? sinDatos : `${signo(r.cambioPeso)} kg`}</dd>
        </dl>
      </section>

      {rachas.length > 0 && (
        <section aria-labelledby="t-rachas">
          <h2 id="t-rachas">Rachas en curso</h2>
          <dl className="datos">
            {rachas.map(({ h, r }) => (
              <div key={h.id} className="par">
                <dt>{h.nombre}</dt>
                <dd>{num(r.actual)} {h.frecuencia === 'x_por_semana' ? (r.actual === 1 ? 'semana' : 'semanas') : r.actual === 1 ? 'día' : 'días'}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section aria-labelledby="t-logros-semana">
        <h2 id="t-logros-semana">Logros de la semana</h2>
        {r.logros.length === 0 ? <p className="vacio">Esta semana no hubo logros nuevos.</p> : (
          <ul className="lista">
            {r.logros.map((l) => {
              const def = LOGROS.find((x) => x.clave === l.clave)
              return def && <li key={l.clave}><span className="texto"><strong>{def.nombre}</strong><small>{def.descripcion}</small></span></li>
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="t-mejorar">
        <h2 id="t-mejorar">Para la semana que viene</h2>
        {anterior?.texto && <p className="ayuda">La semana anterior te propusiste: “{anterior.texto}”</p>}
        <label>
          ¿Qué querés mejorar?
          <textarea key={lunes} rows={3} defaultValue={propia?.texto ?? ''}
            onBlur={(e) => db.revisiones.put({ semana: lunes, texto: e.target.value.trim(), creadoEn: propia?.creadoEn ?? new Date().toISOString() })} />
        </label>
      </section>
    </div>
  )
}
