import type { Habito } from '../db'
import { diaSemana, diasEntre, lunesDe, sumarDias } from './fechas'

export interface Racha { actual: number; mejor: number }
type Reg = { fecha: string; valor: number }
export type EnPausa = (fecha: string) => boolean

export const cumple = (h: Pick<Habito, 'meta'>, valor = 0) => valor >= h.meta

/** ¿Se evalúa ese día? Solo `dias_fijos` saltea días. */
export const seEvalua = (h: Habito, fecha: string) => h.frecuencia !== 'dias_fijos' || h.diasFijos.includes(diaSemana(fecha))

/** ¿El hábito existía ese día? (creado antes y no archivado todavía) */
export const existe = (h: Habito, fecha: string) =>
  (h.desde ?? '') <= fecha && !(h.archivado && (!h.archivadoEn || fecha >= h.archivadoEn))

export const pausaDe = (pausas: { desde: string; hasta: string }[]): EnPausa => (f) => pausas.some((p) => p.desde <= f && f <= p.hasta)

/** Editar más de 7 días atrás pide confirmación. */
export const pideConfirmacion = (fecha: string, hoy: string) => diasEntre(fecha, hoy) > 7

/** Días evaluables consecutivos cumplidos. Hoy no rompe la racha mientras no termine. */
export function rachaDiaria(cumplidos: Set<string>, hoy: string, evalua: (f: string) => boolean = () => true): Racha {
  const inicio = [...cumplidos].filter((f) => f <= hoy).sort()[0]
  let actual = 0, mejor = 0
  if (!inicio) return { actual, mejor }
  for (let f = inicio; f <= hoy; f = sumarDias(f, 1)) {
    if (!evalua(f)) continue
    if (cumplidos.has(f)) mejor = Math.max(mejor, ++actual)
    else if (f !== hoy) actual = 0
  }
  return { actual, mejor }
}

/** Semanas (lun-dom) consecutivas con al menos `porSemana` días cumplidos. La semana en curso y las salteadas no rompen. */
export function rachaSemanal(cumplidos: Set<string>, hoy: string, porSemana: number, saltar: (lunes: string) => boolean = () => false): Racha {
  const porLunes = new Map<string, number>()
  for (const f of cumplidos) if (f <= hoy) porLunes.set(lunesDe(f), (porLunes.get(lunesDe(f)) ?? 0) + 1)
  const inicio = [...porLunes.keys()].sort()[0]
  const lunesHoy = lunesDe(hoy)
  let actual = 0, mejor = 0
  if (!inicio) return { actual, mejor }
  for (let l = inicio; l <= lunesHoy; l = sumarDias(l, 7)) {
    if (saltar(l) && (porLunes.get(l) ?? 0) < porSemana) continue
    if ((porLunes.get(l) ?? 0) >= porSemana) mejor = Math.max(mejor, ++actual)
    else if (l !== lunesHoy) actual = 0
  }
  return { actual, mejor }
}

/** Días cumplidos de verdad (sin comodines). */
export const diasCumplidos = (h: Habito, regs: Reg[]) => new Set(regs.filter((r) => cumple(h, r.valor)).map((r) => r.fecha))

/**
 * Racha de un hábito. Los días cubiertos con comodín cuentan como cumplidos;
 * los días en pausa no se evalúan (y una semana con pausa no rompe la racha semanal).
 */
export function rachaHabito(h: Habito, regs: Reg[], hoy: string, extras: { cubiertos?: Iterable<string>; enPausa?: EnPausa } = {}): Racha {
  const ok = new Set([...diasCumplidos(h, regs), ...(extras.cubiertos ?? [])])
  const enPausa = extras.enPausa ?? (() => false)
  if (h.frecuencia === 'x_por_semana')
    return rachaSemanal(ok, hoy, h.vecesPorSemana, (l) => Array.from({ length: 7 }, (_, i) => sumarDias(l, i)).some(enPausa))
  return rachaDiaria(ok, hoy, (f) => seEvalua(h, f) && !enPausa(f))
}

/** Días cumplidos en la semana de `fecha` (para `x_por_semana`). */
export function hechosEnSemana(h: Habito, regs: Reg[], fecha: string): number {
  const lunes = lunesDe(fecha)
  return regs.filter((r) => lunesDe(r.fecha) === lunes && cumple(h, r.valor)).length
}

/** Hábitos que son obligación ese día: los diarios y los de días fijos que tocan. Los `x_por_semana` no cuentan. */
export const obligatorios = (habitos: Habito[], fecha: string) =>
  habitos.filter((h) => existe(h, fecha) && h.frecuencia !== 'x_por_semana' && seEvalua(h, fecha))

/** Día perfecto: todos los hábitos obligatorios de ese día, cumplidos. */
export function diaPerfecto(habitos: Habito[], valores: Map<number, number>, fecha: string): boolean {
  const tocan = obligatorios(habitos, fecha)
  return tocan.length > 0 && tocan.every((h) => cumple(h, valores.get(h.id)))
}
