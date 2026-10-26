// XP, niveles, comodines y logros. Todo se deriva de los registros: desmarcar algo resta solo,
// y lo registrado antes de que existieran los premios también suma.
import type { Datos, Habito, Objetivo, RegistroHabito } from '../db'
import { metaAlcanzada, tendencia, tendenciaInicial } from './cuerpo'
import { lunesDe, sumarDias } from './fechas'
import { diaPerfecto, diasCumplidos, pausaDe, rachaDiaria, rachaHabito, seEvalua, type EnPausa } from './habitos'
import { diaCompleto } from './nutricion'
import { desvioAcostarse } from './sueno'

export const XP = { habito: 10, perfecto: 50, sueno: 5, comidas: 15, peso: 5, animo: 5, semana: 100 }

const agrupar = <T, K>(xs: T[], clave: (x: T) => K) => {
  const m = new Map<K, T[]>()
  for (const x of xs) m.set(clave(x), [...(m.get(clave(x)) ?? []), x])
  return m
}

/** Días perfectos de verdad (sin comodines ni días en pausa) hasta hoy. */
export function diasPerfectos(d: Pick<Datos, 'habitos' | 'registrosHabito'>, hoy: string, enPausa: EnPausa) {
  const porDia = agrupar(d.registrosHabito, (r) => r.fecha)
  const res = new Set<string>()
  for (const [f, regs] of porDia)
    if (f <= hoy && !enPausa(f) && diaPerfecto(d.habitos, new Map(regs.map((r) => [r.habitoId, r.valor])), f)) res.add(f)
  return res
}

export function calcularXP(d: Datos, hoy: string, perfectos: Set<string>) {
  const porHabito = agrupar(d.registrosHabito.filter((r) => r.fecha <= hoy), (r) => r.habitoId)
  let habitos = 0, semanas = 0
  for (const h of d.habitos) {
    const ok = [...diasCumplidos(h, porHabito.get(h.id) ?? [])].filter((f) => seEvalua(h, f))
    habitos += ok.length * XP.habito
    if (h.frecuencia === 'x_por_semana')
      semanas += [...agrupar(ok, lunesDe).values()].filter((fs) => fs.length >= h.vecesPorSemana).length * XP.semana
  }
  const partes = {
    'Hábitos cumplidos': habitos,
    'Días perfectos': perfectos.size * XP.perfecto,
    'Semanas completas': semanas,
    'Sueño registrado': d.registrosSueno.filter((r) => !r.esSiesta && r.fecha <= hoy).length * XP.sueno,
    'Días con todas las comidas': [...agrupar(d.registrosComida.filter((c) => c.fecha <= hoy), (c) => c.fecha).values()].filter(diaCompleto).length * XP.comidas,
    'Pesajes': d.registrosPeso.length * XP.peso,
    'Ánimo registrado': d.registrosAnimo.filter((r) => r.animo || r.energia).length * XP.animo,
    'Logros': d.logros.reduce((s, l) => s + (LOGROS.find((x) => x.clave === l.clave)?.xp ?? 0), 0),
  }
  const total = Object.values(partes).reduce((a, b) => a + b, 0)
  return { total, saldo: total - d.canjes.reduce((s, c) => s + c.costo, 0), partes }
}

// ---------- Niveles ----------

/** XP para pasar del nivel n al n+1. */
export const costoNivel = (n: number) => Math.round(100 * n ** 1.5)
const TRAMOS: [number, string][] = [[35, 'Leyenda'], [20, 'Imparable'], [10, 'Disciplinado'], [5, 'Constante'], [1, 'Principiante']]

export function nivel(xp: number) {
  let n = 1, actual = Math.max(0, xp)
  while (actual >= costoNivel(n)) actual -= costoNivel(n++)
  return { n, actual, siguiente: costoNivel(n), nombre: TRAMOS.find(([desde]) => n >= desde)![1] }
}

// ---------- Comodines ----------

export const MAX_COMODINES = 3

/** Se gana 1 comodín por cada 7 días perfectos seguidos (máximo 3 guardados); los días en pausa no cortan la cuenta. */
export function comodinesDisponibles(perfectos: Set<string>, usos: { usadoEn: string }[], hoy: string, enPausa: EnPausa) {
  const inicio = [...perfectos, ...usos.map((u) => u.usadoEn)].sort()[0]
  let seguidos = 0, guardados = 0
  if (!inicio) return 0
  for (let f = inicio; f <= hoy; f = sumarDias(f, 1)) {
    guardados = Math.max(0, guardados - usos.filter((u) => u.usadoEn === f).length)
    if (perfectos.has(f)) {
      if (++seguidos % 7 === 0) guardados = Math.min(MAX_COMODINES, guardados + 1)
    } else if (!enPausa(f) && f !== hoy) seguidos = 0
  }
  return guardados
}

// ---------- Logros ----------

export interface Contexto {
  mejorRachaDiaria: number
  gimnasio: { total: number; mejorRacha: number }
  diasConComidas: number
  proteina: { total: number; mejorRacha: number }
  aguaTotal: number
  semanaSuenoCompleta: boolean
  mesSuenoMuyRegular: boolean
  cambioPeso: number | null
  metaPesoAlcanzada: boolean
  objetivo?: Objetivo
  constancia: number
  mesPerfecto: boolean
}

interface DefLogro { clave: string; nombre: string; descripcion: string; icono: string; xp: number; cumple: (c: Contexto) => boolean }

const haciaObjetivo = (c: Contexto, kg: number) =>
  c.cambioPeso != null && c.objetivo !== 'mantener' && (c.objetivo === 'volumen' ? c.cambioPeso >= kg : -c.cambioPeso >= kg)

export const LOGROS: DefLogro[] = [
  ...([[7, 50], [30, 150], [100, 300], [365, 500]] as const).map(([n, xp]) => ({
    clave: `racha-${n}`, nombre: `${n} días de racha`, descripcion: `${n} días seguidos cumpliendo un mismo hábito.`, icono: '🔥', xp,
    cumple: (c: Contexto) => c.mejorRachaDiaria >= n,
  })),
  ...([[10, 50], [50, 150], [100, 300], [250, 500]] as const).map(([n, xp]) => ({
    clave: `gimnasio-${n}`, nombre: `${n} entrenamientos`, descripcion: `Marcar el gimnasio ${n} veces.`, icono: '🏋️', xp,
    cumple: (c: Contexto) => c.gimnasio.total >= n,
  })),
  { clave: 'gimnasio-4-semanas', nombre: 'Un mes de hierro', descripcion: '4 semanas seguidas cumpliendo la frecuencia del gimnasio.', icono: '📅', xp: 150, cumple: (c) => c.gimnasio.mejorRacha >= 4 },
  { clave: 'comidas-30', nombre: 'Bitácora de cocina', descripcion: '30 días registrando comidas.', icono: '🍽️', xp: 150, cumple: (c) => c.diasConComidas >= 30 },
  { clave: 'proteina-7', nombre: 'Semana proteica', descripcion: '7 días seguidos con la meta de proteína.', icono: '🥩', xp: 100, cumple: (c) => c.proteina.mejorRacha >= 7 },
  { clave: 'proteina-30', nombre: 'Proteína constante', descripcion: '30 días con la meta de proteína.', icono: '💪', xp: 200, cumple: (c) => c.proteina.total >= 30 },
  { clave: 'agua-30', nombre: 'Bien hidratado', descripcion: '30 días con la meta de agua.', icono: '💧', xp: 150, cumple: (c) => c.aguaTotal >= 30 },
  { clave: 'sueno-semana', nombre: 'Semana descansada', descripcion: 'Una semana entera, de lunes a domingo, durmiendo tu meta.', icono: '😴', xp: 100, cumple: (c) => c.semanaSuenoCompleta },
  { clave: 'sueno-regular', nombre: 'Reloj suizo', descripcion: 'Un mes con la hora de acostarte muy regular.', icono: '⏰', xp: 200, cumple: (c) => c.mesSuenoMuyRegular },
  ...([[2, 100], [5, 200], [10, 400]] as const).map(([kg, xp]) => ({
    clave: `peso-${kg}`, nombre: `Primeros ${kg} kg`, descripcion: `Mover tu tendencia ${kg} kg hacia tu objetivo.`, icono: '⚖️', xp,
    cumple: (c: Contexto) => haciaObjetivo(c, kg),
  })),
  { clave: 'peso-meta', nombre: 'Meta de peso', descripcion: 'Tu tendencia llegó al peso objetivo.', icono: '🎯', xp: 500, cumple: (c) => c.metaPesoAlcanzada },
  { clave: 'constancia-30', nombre: 'Constancia', descripcion: '30 días seguidos registrando algo.', icono: '📓', xp: 200, cumple: (c) => c.constancia >= 30 },
  { clave: 'mes-perfecto', nombre: 'Mes perfecto', descripcion: 'Todos los hábitos, todos los días de un mes.', icono: '🏆', xp: 500, cumple: (c) => c.mesPerfecto },
]

const diasDelMes = (mes: string) => {
  const dias: string[] = []
  for (let f = `${mes}-01`; f.startsWith(mes); f = sumarDias(f, 1)) dias.push(f)
  return dias
}

export function contexto(d: Datos, hoy: string, perfil: { metaSuenoMin: number; objetivo?: Objetivo; pesoObjetivo?: number }, perfectos: Set<string>, enPausa: EnPausa): Contexto {
  const porHabito = agrupar(d.registrosHabito.filter((r) => r.fecha <= hoy), (r) => r.habitoId)
  const cubiertos = agrupar(d.comodines, (c) => c.habitoId)
  const regsDe = (h: Habito): RegistroHabito[] => porHabito.get(h.id) ?? []
  const racha = (h: Habito) => rachaHabito(h, regsDe(h), hoy, { cubiertos: (cubiertos.get(h.id) ?? []).map((c) => c.fecha), enPausa })
  const conClave = (k: Habito['clave']) => d.habitos.find((h) => h.clave === k)
  const resumen = (h?: Habito) => (h ? { total: diasCumplidos(h, regsDe(h)).size, mejorRacha: racha(h).mejor } : { total: 0, mejorRacha: 0 })

  const mesActual = hoy.slice(0, 7)
  const noches = d.registrosSueno.filter((r) => !r.esSiesta && r.fecha <= hoy)
  const conMeta = new Set(noches.filter((r) => r.duracionMin >= perfil.metaSuenoMin).map((r) => r.fecha))
  const lunesCompletos = [...new Set([...conMeta].map(lunesDe))].filter((l) => sumarDias(l, 6) <= hoy)
  const nochesPorMes = agrupar(noches, (r) => r.fecha.slice(0, 7))

  const ultimoPeso = [...d.registrosPeso].sort((a, b) => b.fecha.localeCompare(a.fecha))[0]
  const inicial = tendenciaInicial(d.registrosPeso)
  const actual = ultimoPeso ? tendencia(d.registrosPeso, ultimoPeso.fecha) : null

  const conRegistro = new Set([
    ...d.registrosHabito.filter((r) => r.valor > 0).map((r) => r.fecha),
    ...d.registrosSueno.map((r) => r.fecha), ...d.registrosAnimo.map((r) => r.fecha),
    ...d.registrosPeso.map((r) => r.fecha), ...d.registrosComida.map((r) => r.fecha),
  ])
  const meses = [...new Set([...perfectos].map((f) => f.slice(0, 7)))].filter((m) => m < mesActual)

  return {
    mejorRachaDiaria: Math.max(0, ...d.habitos.filter((h) => h.frecuencia !== 'x_por_semana').map((h) => racha(h).mejor)),
    gimnasio: resumen(conClave('gimnasio')),
    diasConComidas: new Set(d.registrosComida.filter((c) => c.fecha <= hoy).map((c) => c.fecha)).size,
    proteina: resumen(conClave('proteina')),
    aguaTotal: resumen(conClave('agua')).total,
    semanaSuenoCompleta: lunesCompletos.some((l) => Array.from({ length: 7 }, (_, i) => sumarDias(l, i)).every((f) => conMeta.has(f))),
    mesSuenoMuyRegular: [...nochesPorMes].some(([m, rs]) => m < mesActual && rs.length >= 20 && (desvioAcostarse(rs) ?? 99) < 30),
    cambioPeso: inicial != null && actual != null ? actual - inicial : null,
    metaPesoAlcanzada: actual != null && !!perfil.pesoObjetivo && metaAlcanzada(actual, perfil.pesoObjetivo, perfil.objetivo),
    objetivo: perfil.objetivo,
    constancia: rachaDiaria(conRegistro, hoy).mejor,
    mesPerfecto: meses.some((m) => diasDelMes(m).every((f) => perfectos.has(f) || enPausa(f))),
  }
}

/** Claves de logros que se cumplen ahora y todavía no están guardados. */
export const logrosNuevos = (c: Contexto, guardados: { clave: string }[]) =>
  LOGROS.filter((l) => !guardados.some((g) => g.clave === l.clave) && l.cumple(c)).map((l) => l.clave)

/** Todo el progreso derivado, calculado una vez por cambio de datos. */
export function calcularProgreso(d: Datos, hoy: string, perfil: { metaSuenoMin: number; objetivo?: Objetivo; pesoObjetivo?: number }) {
  const enPausa = pausaDe(d.pausas)
  const perfectos = diasPerfectos(d, hoy, enPausa)
  const xp = calcularXP(d, hoy, perfectos)
  return {
    enPausa, perfectos, xp, nivel: nivel(xp.total),
    comodines: comodinesDisponibles(perfectos, d.comodines, hoy, enPausa),
    contexto: contexto(d, hoy, perfil, perfectos, enPausa),
  }
}
export type Progreso = ReturnType<typeof calcularProgreso>
