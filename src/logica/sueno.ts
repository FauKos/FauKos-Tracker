import type { RegistroSueno } from '../db'
import { diasEntre, lunesDe, minutosEntre, sumarDias } from './fechas'

const aMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
const aHora = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
/** Hora de acostarse en minutos, con la madrugada después de la medianoche (00:30 → 1470). */
const minNoche = (fechaHora: string) => {
  const m = aMin(fechaHora.slice(11))
  return m < 720 ? m + 1440 : m
}
const mediana = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b), k = s.length >> 1
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2
}
const promedio = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

/** Arma acostado/levantado a partir de horas sueltas. Si la hora de acostarse es mayor, fue el día anterior. */
export function armarSueno(fecha: string, horaAcostado: string, horaLevantado: string) {
  const diaAcostado = aMin(horaAcostado) > aMin(horaLevantado) ? sumarDias(fecha, -1) : fecha
  const acostado = `${diaAcostado}T${horaAcostado}`
  const levantado = `${fecha}T${horaLevantado}`
  return { fecha, acostado, levantado, duracionMin: minutosEntre(acostado, levantado) }
}

export const duracionDudosa = (min: number) => min < 60 || min > 960

const noches = (regs: RegistroSueno[]) => regs.filter((r) => !r.esSiesta)

/** Mediana de los últimos 14 registros nocturnos. */
export function horarioHabitual(regs: RegistroSueno[]) {
  const ult = noches(regs).sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 14)
  if (!ult.length) return { acostado: '00:00', levantado: '08:00' }
  return {
    acostado: aHora(mediana(ult.map((r) => minNoche(r.acostado)))),
    levantado: aHora(mediana(ult.map((r) => aMin(r.levantado.slice(11))))),
  }
}

export function metricasSueno(regs: RegistroSueno[], hoy: string, metaMin: number) {
  const ns = noches(regs).filter((r) => r.fecha <= hoy)
  const ultimos = (n: number) => ns.filter((r) => diasEntre(r.fecha, hoy) < n)
  const calidad = (rs: RegistroSueno[]) => promedio(rs.flatMap((r) => (r.calidad ? [r.calidad] : [])))
  const u7 = ultimos(7), u30 = ultimos(30), u14 = ultimos(14)

  let desvioMin: number | null = null
  if (u14.length >= 3) {
    const xs = u14.map((r) => minNoche(r.acostado)), m = promedio(xs)!
    desvioMin = Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length)
  }
  const lunes = lunesDe(hoy)
  return {
    min7: promedio(u7.map((r) => r.duracionMin)),
    min30: promedio(u30.map((r) => r.duracionMin)),
    calidad7: calidad(u7),
    calidad30: calidad(u30),
    desvioMin,
    regularidad: desvioMin == null ? null : desvioMin < 30 ? 'muy regular' : desvioMin <= 60 ? 'regular' : 'irregular',
    deudaMin: ns.filter((r) => r.fecha >= lunes).reduce((s, r) => s + Math.max(0, metaMin - r.duracionMin), 0),
    cumplidos: new Set(ns.filter((r) => r.duracionMin >= metaMin).map((r) => r.fecha)),
  }
}
