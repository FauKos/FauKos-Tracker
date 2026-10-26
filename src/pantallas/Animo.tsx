import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { DIAS_CORTOS, ddmmaaaa, lunesDe, sumarDias } from '../logica/fechas'

const SEMANAS = 8
const promedio = (xs: (number | undefined)[]) => {
  const v = xs.filter((x): x is number => x != null)
  return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1).replace('.', ',') : '–'
}

export function Animo({ hoy }: { hoy: string }) {
  const desde = sumarDias(lunesDe(hoy), -7 * (SEMANAS - 1))
  const regs = useLiveQuery(() => db.registrosAnimo.where('fecha').aboveOrEqual(desde).toArray(), [desde], [])
  const porFecha = new Map(regs.map((r) => [r.fecha, r]))
  const semanas = Array.from({ length: SEMANAS }, (_, i) => sumarDias(lunesDe(hoy), -7 * i))

  return (
    <div className="pantalla">
      <header className="barra"><h1>Ánimo y energía</h1></header>
      <p className="ayuda">Cada cuadro es un día, coloreado por tu ánimo. Se carga desde Hoy.</p>

      <table className="animo">
        <thead>
          <tr>
            <th scope="col">Semana</th>
            {DIAS_CORTOS.map((d) => <th key={d} scope="col">{d[0]}</th>)}
            <th scope="col">Ánimo</th>
            <th scope="col">Energía</th>
          </tr>
        </thead>
        <tbody>
          {semanas.map((lunes) => {
            const dias = DIAS_CORTOS.map((_, i) => sumarDias(lunes, i))
            const rs = dias.map((f) => porFecha.get(f))
            return (
              <tr key={lunes}>
                <th scope="row">{ddmmaaaa(lunes).slice(0, 5)}</th>
                {dias.map((f, i) => (
                  <td key={f} data-nivel={rs[i]?.animo ?? (f > hoy ? 'futuro' : '')} title={ddmmaaaa(f)}>
                    {rs[i]?.animo ?? ''}
                  </td>
                ))}
                <td className="prom">{promedio(rs.map((r) => r?.animo))}</td>
                <td className="prom">{promedio(rs.map((r) => r?.energia))}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
