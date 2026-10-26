import type { Habito } from '../db'
import { diaSemana, diasEntre, lunesDe, sumarDias } from './fechas'

export interface Racha { actual: number; mejor: number }
type Reg = { fecha: string; valor: number }

export const cumple = (h: Pick<Habito, 'meta'>, valor = 0) => valor >= h.meta

/** ¿Se evalúa ese día? Solo `dias_fijos` saltea días. */
export const seEvalua = (h: Habito, fecha: string) => h.frecuencia !== 'dias_fijos' || h.diasFijos.includes(diaSemana(fecha))

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

/** Semanas (lun-dom) consecutivas con al menos `porSemana` días cumplidos. La semana en curso no rompe. */
export function rachaSemanal(cumplidos: Set<string>, hoy: string, porSemana: number): Racha {
  const porLunes = new Map<string, number>()
  for (const f of cumplidos) if (f <= hoy) porLunes.set(lunesDe(f), (porLunes.get(lunesDe(f)) ?? 0) + 1)
  const inicio = [...porLunes.keys()].sort()[0]
  const lunesHoy = lunesDe(hoy)
  let actual = 0, mejor = 0
  if (!inicio) return { actual, mejor }
  for (let l = inicio; l <= lunesHoy; l = sumarDias(l, 7)) {
    if ((porLunes.get(l) ?? 0) >= porSemana) mejor = Math.max(mejor, ++actual)
    else if (l !== lunesHoy) actual = 0
  }
  return { actual, mejor }
}

export function rachaHabito(h: Habito, regs: Reg[], hoy: string): Racha {
  const ok = new Set(regs.filter((r) => cumple(h, r.valor)).map((r) => r.fecha))
  return h.frecuencia === 'x_por_semana' ? rachaSemanal(ok, hoy, h.vecesPorSemana) : rachaDiaria(ok, hoy, (f) => seEvalua(h, f))
}

/** Días cumplidos en la semana de `fecha` (para `x_por_semana`). */
export function hechosEnSemana(h: Habito, regs: Reg[], fecha: string): number {
  const lunes = lunesDe(fecha)
  return regs.filter((r) => lunesDe(r.fecha) === lunes && cumple(h, r.valor)).length
}

/**
 * Día perfecto: todos los hábitos diarios y de días fijos que tocan ese día, cumplidos.
 * Los `x_por_semana` no cuentan: no son una obligación diaria.
 */
export function diaPerfecto(habitos: Habito[], valores: Map<number, number>, fecha: string): boolean {
  const tocan = habitos.filter((h) => !h.archivado && h.frecuencia !== 'x_por_semana' && seEvalua(h, fecha))
  return tocan.length > 0 && tocan.every((h) => cumple(h, valores.get(h.id)))
}
