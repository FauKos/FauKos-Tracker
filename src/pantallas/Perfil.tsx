import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type ReactNode } from 'react'
import { BLOQUES, db, guardarMetas, guardarPeso, type Actividad, type BloqueId, type Objetivo, type Perfil as TPerfil, type Sexo } from '../db'
import { basal, calcularMetas, edad, FACTORES, leerKg, RANGO_AJUSTE, tendencia } from '../logica/cuerpo'
import { num } from '../logica/fechas'
import { metasEn } from '../logica/nutricion'

export const ACTIVIDADES: [Actividad, string, string][] = [
  ['sedentario', 'Sedentaria', 'Trabajo sentado y casi sin entrenar'],
  ['ligero', 'Liviana', '1 a 3 entrenamientos por semana'],
  ['moderado', 'Moderada', '3 a 5 entrenamientos por semana'],
  ['alto', 'Alta', '6 a 7 entrenamientos por semana'],
  ['muy_alto', 'Muy alta', 'Trabajo físico y además entrenás'],
]
const OBJETIVOS: [Objetivo, string, string][] = [
  ['definir', 'Bajar grasa', 'Comer un poco menos de lo que gastás'],
  ['mantener', 'Mantenerme', 'Comer lo mismo que gastás'],
  ['volumen', 'Ganar músculo', 'Comer un poco más de lo que gastás'],
]

interface Datos { nombre: string; sexo?: Sexo; nacimiento?: string; alturaCm?: number; kg?: number; actividad?: Actividad; objetivo?: Objetivo }
type Fino = Pick<TPerfil, 'ajusteKcal' | 'proteinaGKg' | 'grasasGKg'>

const leerAltura = (s: string) => {
  const n = Number(s.replace(',', '.'))
  return n >= 120 && n <= 230 ? Math.round(n) : undefined
}
const edadValida = (nacimiento: string | undefined, hoy: string) => {
  if (!nacimiento) return null
  const a = edad(nacimiento, hoy)
  return a >= 14 && a <= 100 ? a : null
}

/** Las metas y de dónde sale cada número. Null si falta algún dato. */
export function calculo(d: Datos, hoy: string, fino: Fino = {}) {
  const años = edadValida(d.nacimiento, hoy)
  if (!d.sexo || años == null || !d.alturaCm || !d.kg || !d.actividad || !d.objetivo) return null
  const m = calcularMetas({ sexo: d.sexo, años, kg: d.kg, cm: d.alturaCm, actividad: d.actividad, objetivo: d.objetivo, ...fino })
  return { ...m, años, basal: Math.round(basal(d.sexo, d.kg, d.alturaCm, años)), factor: FACTORES[d.actividad], objetivo: d.objetivo, kg: d.kg }
}
type Calculo = NonNullable<ReturnType<typeof calculo>>

/** Lo que falta para poder calcular, en palabras. */
export function faltantes(p: TPerfil, kg?: number) {
  return [!p.sexo && 'sexo', !p.nacimiento && 'edad', !p.alturaCm && 'altura', !kg && 'peso', !p.actividad && 'actividad', !p.objetivo && 'objetivo'].filter(Boolean) as string[]
}

export function Plan({ c }: { c: Calculo }) {
  const diferencia = Math.abs(c.tdee - c.kcal)
  return (
    <div className="plan">
      <p className="plan-kcal"><strong>{num(c.kcal)}</strong> kcal por día</p>
      <div className="plan-macros">
        <span><b>{c.proteinaG} g</b>proteína</span>
        <span><b>{c.carbosG} g</b>carbohidratos</span>
        <span><b>{c.grasasG} g</b>grasas</span>
      </div>
      <p className="ayuda">
        En reposo tu cuerpo gasta {num(c.basal)} kcal: sale de tu sexo, tus {c.años} años, tu altura y tus {num(c.kg, 1)} kg.
        Con tu actividad, eso sube a {num(c.tdee)} kcal por día.
        {c.objetivo === 'definir' && ` Para bajar grasa te quedás ${num(diferencia)} kcal abajo.`}
        {c.objetivo === 'volumen' && ` Para ganar músculo te ponés ${num(diferencia)} kcal arriba.`}
        {' '}La proteína es de {num(c.proteinaG / c.kg, 1)} g por cada kilo que pesás.
      </p>
    </div>
  )
}

function Opciones<T extends string>({ valor, opciones, onElegir }: { valor?: T; opciones: [T, string, string?][]; onElegir: (v: T) => void }) {
  return (
    <div className={`opciones${opciones.length === 2 ? ' dos' : ''}`} role="radiogroup">
      {opciones.map(([v, titulo, detalle]) => (
        <button key={v} role="radio" aria-checked={valor === v} onClick={() => onElegir(v)}>
          <strong>{titulo}</strong>
          {detalle && <small>{detalle}</small>}
        </button>
      ))}
    </div>
  )
}

function Medida({ etiqueta, unidad, valor, onCambio, ejemplo }: { etiqueta: string; unidad: string; valor: string; onCambio: (s: string) => void; ejemplo: string }) {
  return (
    <label className="medida">
      <span className="sr-only">{etiqueta}</span>
      <input inputMode="decimal" value={valor} placeholder={ejemplo} onChange={(e) => onCambio(e.target.value)} />
      <span aria-hidden>{unidad}</span>
    </label>
  )
}

/** Primera vez: pide el perfil de a una pregunta y muestra el plan calculado. */
export function Bienvenida({ hoy, perfil, kgActual }: { hoy: string; perfil: TPerfil; kgActual?: number }) {
  const [paso, setPaso] = useState(0)
  const [d, setD] = useState<Datos>({ nombre: perfil.nombre, sexo: perfil.sexo, nacimiento: perfil.nacimiento, alturaCm: perfil.alturaCm, kg: kgActual, actividad: perfil.actividad, objetivo: perfil.objetivo })
  const [altura, setAltura] = useState(perfil.alturaCm ? String(perfil.alturaCm) : '')
  const [peso, setPeso] = useState(kgActual ? num(kgActual, 1) : '')
  const [pesoTocado, setPesoTocado] = useState(false)
  const set = (c: Partial<Datos>) => setD({ ...d, ...c })
  const años = edadValida(d.nacimiento, hoy)
  const c = calculo(d, hoy, perfil)

  const pasos: { titulo: string; ayuda?: string; ok: boolean; cuerpo: ReactNode }[] = [
    {
      titulo: '¿Cómo te llamás?', ayuda: 'Para saludarte. Podés dejarlo vacío.', ok: true,
      cuerpo: <input className="grande" value={d.nombre} placeholder="Tu nombre" onChange={(e) => set({ nombre: e.target.value })} />,
    },
    {
      titulo: 'Sexo', ayuda: 'Cambia cuánto gasta tu cuerpo en reposo.', ok: !!d.sexo,
      cuerpo: <Opciones valor={d.sexo} opciones={[['hombre', 'Hombre'], ['mujer', 'Mujer']]} onElegir={(sexo) => set({ sexo })} />,
    },
    {
      titulo: '¿Cuándo naciste?', ayuda: años != null ? `Tenés ${años} años.` : 'Con tu edad se calcula tu metabolismo.', ok: años != null,
      cuerpo: <input className="grande" type="date" aria-label="Fecha de nacimiento" value={d.nacimiento ?? ''} max={hoy} onChange={(e) => set({ nacimiento: e.target.value || undefined })} />,
    },
    {
      titulo: '¿Cuánto medís?', ayuda: 'En centímetros, por ejemplo 178.', ok: !!d.alturaCm,
      cuerpo: <Medida etiqueta="Altura" unidad="cm" ejemplo="178" valor={altura} onCambio={(s) => { setAltura(s); set({ alturaCm: leerAltura(s) }) }} />,
    },
    {
      titulo: '¿Cuánto pesás hoy?', ayuda: 'Mejor a la mañana, en ayunas. Queda como tu primer pesaje.', ok: !!d.kg,
      cuerpo: <Medida etiqueta="Peso" unidad="kg" ejemplo="80,5" valor={peso} onCambio={(s) => { setPeso(s); setPesoTocado(true); set({ kg: leerKg(s) ?? undefined }) }} />,
    },
    {
      titulo: '¿Cuánto te movés?', ok: !!d.actividad,
      cuerpo: <Opciones valor={d.actividad} opciones={ACTIVIDADES} onElegir={(actividad) => set({ actividad })} />,
    },
    {
      titulo: '¿Qué querés lograr?', ok: !!d.objetivo,
      cuerpo: <Opciones valor={d.objetivo} opciones={OBJETIVOS} onElegir={(objetivo) => set({ objetivo })} />,
    },
    { titulo: d.nombre.trim() ? `Listo, ${d.nombre.trim()}` : 'Tu plan', ok: !!c, cuerpo: c ? <Plan c={c} /> : null },
  ]
  const actual = pasos[paso]
  const irAPaso = (n: number) => { setPaso(n); window.scrollTo(0, 0) }
  const ultimo = paso === pasos.length - 1

  async function terminar() {
    if (!c) return
    await db.transaction('rw', [db.perfil, db.registrosPeso, db.metasNutricion, db.habitos], async () => {
      await db.perfil.update('yo', {
        nombre: d.nombre.trim(), sexo: d.sexo, nacimiento: d.nacimiento, alturaCm: d.alturaCm, actividad: d.actividad, objetivo: d.objetivo, perfilListo: true,
        bloques: (Object.keys(BLOQUES) as BloqueId[]).map((id) => ({ id, visible: perfil.bloques.find((b) => b.id === id)?.visible ?? true })), // comida primero
      })
      if (pesoTocado || !kgActual) await guardarPeso(hoy, d.kg!)
      await guardarMetas({ desde: hoy, kcal: c.kcal, proteinaG: c.proteinaG, carbosG: c.carbosG, grasasG: c.grasasG, tdee: c.tdee, origen: 'formula' })
    })
  }

  return (
    <div className="bienvenida">
      <div className="pasos" aria-label={`Paso ${paso + 1} de ${pasos.length}`}>
        {pasos.map((_, i) => <span key={i} className={i <= paso ? 'hecho' : ''} />)}
      </div>
      {paso === 0 && <p className="bienvenida-intro">Bienvenido a Rumbo. Con 7 preguntas calculo cuánto comer por día.</p>}
      <h1>{actual.titulo}</h1>
      {actual.ayuda && <p className="ayuda">{actual.ayuda}</p>}
      <div className="paso-cuerpo">{actual.cuerpo}</div>
      <div className="paso-acciones">
        {paso > 0 && <button className="secundario" onClick={() => irAPaso(paso - 1)}>Atrás</button>}
        <button className="primario" disabled={!actual.ok} onClick={() => (ultimo ? terminar() : irAPaso(paso + 1))}>
          {ultimo ? 'Empezar' : 'Siguiente'}
        </button>
      </div>
    </div>
  )
}

/** Perfil editable siempre a mano, con el plan recalculado en vivo. */
export function PerfilPantalla({ hoy, perfil }: { hoy: string; perfil: TPerfil }) {
  const pesos = useLiveQuery(() => db.registrosPeso.toArray(), [], [])
  const metas = useLiveQuery(() => db.metasNutricion.toArray(), [], [])
  const ultimo = [...pesos].sort((a, b) => b.fecha.localeCompare(a.fecha))[0]
  const kg = tendencia(pesos, hoy) ?? ultimo?.kg
  const up = (c: Partial<TPerfil>) => db.perfil.update('yo', c)
  const c = calculo({ ...perfil, kg }, hoy, perfil)
  const actuales = metasEn(metas, hoy)
  const desactualizadas = c && actuales && (actuales.kcal !== c.kcal || actuales.proteinaG !== c.proteinaG)
  const rango = perfil.objetivo && perfil.objetivo !== 'mantener' ? RANGO_AJUSTE[perfil.objetivo] : null
  const años = edadValida(perfil.nacimiento, hoy)

  return (
    <div className="pantalla">
      <header className="barra"><h1>Mi perfil</h1></header>

      <section aria-labelledby="t-yo">
        <h2 id="t-yo">Tus datos</h2>
        <label>Nombre<input key={perfil.nombre} defaultValue={perfil.nombre} onBlur={(e) => up({ nombre: e.target.value.trim() })} /></label>
        <fieldset><legend>Sexo</legend><Opciones valor={perfil.sexo} opciones={[['hombre', 'Hombre'], ['mujer', 'Mujer']]} onElegir={(sexo) => up({ sexo })} /></fieldset>
        <div className="fila-campos">
          <label>{años != null ? `Nacimiento (${años} años)` : 'Nacimiento'}<input type="date" value={perfil.nacimiento ?? ''} max={hoy} onChange={(e) => up({ nacimiento: e.target.value || undefined })} /></label>
          <label>Altura (cm)<input key={perfil.alturaCm} inputMode="numeric" defaultValue={perfil.alturaCm ?? ''} placeholder="178" onBlur={(e) => up({ alturaCm: leerAltura(e.target.value) })} /></label>
        </div>
        <p className="ayuda">{kg ? `Peso usado: ${num(kg, 1)} kg (${tendencia(pesos, hoy) != null ? 'tu tendencia' : 'tu último pesaje'}). Se actualiza cuando te pesás en Cuerpo.` : 'Falta tu peso: registralo en Cuerpo.'}</p>
      </section>

      <section aria-labelledby="t-actividad">
        <h2 id="t-actividad">Actividad</h2>
        <Opciones valor={perfil.actividad} opciones={ACTIVIDADES} onElegir={(actividad) => up({ actividad })} />
      </section>

      <section aria-labelledby="t-objetivo">
        <h2 id="t-objetivo">Objetivo</h2>
        <Opciones valor={perfil.objetivo} opciones={OBJETIVOS} onElegir={(objetivo) => up({ objetivo, ajusteKcal: undefined })} />
      </section>

      <section aria-labelledby="t-plan">
        <h2 id="t-plan">Tu plan diario</h2>
        {c ? <Plan c={c} /> : <p className="vacio">Para calcularlo falta: {faltantes(perfil, kg).join(', ')}.</p>}
        {c && (!actuales || desactualizadas) && (
          <button className="primario" onClick={() => guardarMetas({ desde: hoy, kcal: c.kcal, proteinaG: c.proteinaG, carbosG: c.carbosG, grasasG: c.grasasG, tdee: c.tdee, origen: 'formula' })}>
            {actuales ? 'Actualizar mis metas' : 'Usar este plan'}
          </button>
        )}
        {c && actuales && !desactualizadas && <p className="ok">Tus metas de Comida están al día con este plan.</p>}
      </section>

      <section aria-labelledby="t-fino">
        <h2 id="t-fino">Ajuste fino</h2>
        <div className="fila-campos">
          {rango && (
            <label>
              {perfil.objetivo === 'definir' ? 'Déficit (kcal)' : 'Superávit (kcal)'}
              <input key={`${perfil.objetivo}${perfil.ajusteKcal}`} type="number" inputMode="numeric" min={rango[0]} max={rango[1]} step={25} defaultValue={perfil.ajusteKcal ?? rango[2]}
                onBlur={(e) => up({ ajusteKcal: Math.min(rango[1], Math.max(rango[0], Number(e.target.value) || rango[2])) })} />
            </label>
          )}
          <label>
            Proteína (g por kg)
            <input key={perfil.proteinaGKg} type="number" inputMode="decimal" min={1.6} max={2.2} step={0.1} defaultValue={perfil.proteinaGKg ?? 2}
              onBlur={(e) => up({ proteinaGKg: Math.min(2.2, Math.max(1.6, Number(e.target.value.replace(',', '.')) || 2)) })} />
          </label>
          <label>
            Grasas (g por kg)
            <input key={perfil.grasasGKg} type="number" inputMode="decimal" min={0.6} step={0.1} defaultValue={perfil.grasasGKg ?? 0.8}
              onBlur={(e) => up({ grasasGKg: Math.max(0.6, Number(e.target.value.replace(',', '.')) || 0.8) })} />
          </label>
        </div>
      </section>
    </div>
  )
}
