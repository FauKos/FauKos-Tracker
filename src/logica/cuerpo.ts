import type { Actividad, Objetivo, Perfil, Sexo } from '../db'
import { sumarDias } from './fechas'

type Pesaje = { fecha: string; kg: number }

/** Lee un peso escrito con coma o punto; null si no es un peso razonable. */
export const leerKg = (s: string) => {
  const n = Number(s.replace(',', '.'))
  return n > 20 && n < 400 ? n : null
}

/** Media móvil de 7 días hasta `fecha`, con al menos 3 pesajes en la ventana. */
export function tendencia(regs: Pesaje[], fecha: string): number | null {
  const desde = sumarDias(fecha, -6)
  const v = regs.filter((r) => r.fecha >= desde && r.fecha <= fecha)
  return v.length >= 3 ? v.reduce((s, r) => s + r.kg, 0) / v.length : null
}

/** Tendencia día por día en los últimos `dias`, para el gráfico. */
export const serieTendencia = (regs: Pesaje[], hoy: string, dias: number) =>
  Array.from({ length: dias }, (_, i) => sumarDias(hoy, i - dias + 1)).flatMap((f) => {
    const t = tendencia(regs, f)
    return t == null ? [] : [{ fecha: f, kg: t }]
  })

/** Primera tendencia calculable: el punto de partida para los logros de peso. */
export function tendenciaInicial(regs: Pesaje[]): number | null {
  for (const r of [...regs].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const t = tendencia(regs, r.fecha)
    if (t != null) return t
  }
  return null
}

export const metaAlcanzada = (t: number, objetivoKg: number, objetivo: Objetivo | undefined) =>
  objetivo === 'volumen' ? t >= objetivoKg : t <= objetivoKg

export function resumenPeso(regs: Pesaje[], hoy: string, perfil: Pick<Perfil, 'pesoObjetivo' | 'ritmoSemanal' | 'objetivo'>) {
  const t = tendencia(regs, hoy)
  const cambio = (dias: number) => {
    const antes = tendencia(regs, sumarDias(hoy, -dias))
    return t != null && antes != null ? t - antes : null
  }
  const c28 = cambio(28), c14 = cambio(14)
  const ritmoReal = c28 != null ? c28 / 4 : c14 != null ? c14 / 2 : null // kg por semana

  let fechaEstimada: string | null = null
  const falta = t != null && perfil.pesoObjetivo ? perfil.pesoObjetivo - t : null
  const alcanzada = t != null && !!perfil.pesoObjetivo && metaAlcanzada(t, perfil.pesoObjetivo, perfil.objetivo)
  if (falta != null && !alcanzada && ritmoReal && Math.sign(ritmoReal) === Math.sign(falta) && Math.abs(ritmoReal) >= 0.02)
    fechaEstimada = sumarDias(hoy, Math.ceil((falta / ritmoReal) * 7))

  // Aviso suave: bajar más del 1% del peso por semana.
  const agresivo = t != null && [perfil.ritmoSemanal, ritmoReal].some((r) => r != null && r < -0.01 * t)

  return { ultimo: [...regs].sort((a, b) => b.fecha.localeCompare(a.fecha))[0], tendencia: t, cambio7: cambio(7), cambio30: cambio(30), ritmoReal, falta, alcanzada, fechaEstimada, agresivo }
}

// ---------- Calorías ----------

export const FACTORES: Record<Actividad, number> = { sedentario: 1.2, ligero: 1.375, moderado: 1.55, alto: 1.725, muy_alto: 1.9 }

export function edad(nacimiento: string, hoy: string) {
  const a = Number(hoy.slice(0, 4)) - Number(nacimiento.slice(0, 4))
  return hoy.slice(5) < nacimiento.slice(5) ? a - 1 : a
}

/** Mifflin-St Jeor. */
export const basal = (sexo: Sexo, kg: number, cm: number, años: number) => 10 * kg + 6.25 * cm - 5 * años + (sexo === 'hombre' ? 5 : -161)

export const RANGO_AJUSTE: Record<Exclude<Objetivo, 'mantener'>, [number, number, number]> = { definir: [300, 500, 400], volumen: [200, 300, 250] }

export function calcularMetas(p: { sexo: Sexo; años: number; kg: number; cm: number; actividad: Actividad; objetivo: Objetivo; ajusteKcal?: number; proteinaGKg?: number; grasasGKg?: number }) {
  const tdee = basal(p.sexo, p.kg, p.cm, p.años) * FACTORES[p.actividad]
  let kcal = tdee
  if (p.objetivo !== 'mantener') {
    const [min, max, def] = RANGO_AJUSTE[p.objetivo]
    const ajuste = Math.min(max, Math.max(min, p.ajusteKcal ?? def))
    kcal = p.objetivo === 'definir' ? tdee - ajuste : tdee + ajuste
  }
  kcal = Math.round(kcal)
  const proteinaG = Math.round(p.kg * Math.min(2.2, Math.max(1.6, p.proteinaGKg ?? 2)))
  const grasasG = Math.round(p.kg * Math.max(0.6, p.grasasGKg ?? 0.8))
  const carbosG = Math.max(0, Math.round((kcal - proteinaG * 4 - grasasG * 9) / 4))
  return { tdee: Math.round(tdee), kcal, proteinaG, carbosG, grasasG }
}
