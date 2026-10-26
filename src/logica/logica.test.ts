import { describe, expect, it } from 'vitest'
import type { Habito, RegistroSueno } from '../db'
import { diaLogico, diaSemana, lunesDe, sumarDias } from './fechas'
import { diaPerfecto, rachaDiaria, rachaHabito, rachaSemanal } from './habitos'
import { armarSueno, horarioHabitual, metricasSueno } from './sueno'

const set = (...fs: string[]) => new Set(fs)
const habito = (h: Partial<Habito>): Habito => ({
  id: 1, nombre: 'x', icono: '', color: '', tipo: 'check', meta: 1, unidad: '', incremento: 1,
  frecuencia: 'diaria', diasFijos: [], vecesPorSemana: 0, orden: 0, archivado: false, ...h,
})

describe('fechas', () => {
  it('corta el día a las 04:00 de Argentina', () => {
    expect(diaLogico(new Date('2026-10-26T06:30:00Z'))).toBe('2026-10-25') // 03:30 AR
    expect(diaLogico(new Date('2026-10-26T07:30:00Z'))).toBe('2026-10-26') // 04:30 AR
    expect(diaLogico(new Date('2026-10-26T06:30:00Z'), 3)).toBe('2026-10-26')
  })
  it('suma días y ubica la semana de lunes a domingo', () => {
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01')
    expect(diaSemana('2026-10-26')).toBe(0)
    expect(lunesDe('2026-11-01')).toBe('2026-10-26')
  })
})

describe('rachas', () => {
  it('hoy no rompe; ayer sin cumplir sí', () => {
    const ok = set('2026-10-20', '2026-10-21', '2026-10-22')
    expect(rachaDiaria(ok, '2026-10-23')).toEqual({ actual: 3, mejor: 3 })
    expect(rachaDiaria(ok, '2026-10-24')).toEqual({ actual: 0, mejor: 3 })
    expect(rachaDiaria(set('2026-10-22', '2026-10-23'), '2026-10-23')).toEqual({ actual: 2, mejor: 2 })
  })
  it('días fijos saltean los días que no tocan', () => {
    const h = habito({ frecuencia: 'dias_fijos', diasFijos: [0, 2, 4] })
    const regs = ['2026-10-19', '2026-10-21', '2026-10-23', '2026-10-26'].map((fecha) => ({ fecha, valor: 1 }))
    expect(rachaHabito(h, regs, '2026-10-27')).toEqual({ actual: 4, mejor: 4 })
  })
  it('racha semanal: la semana en curso no rompe', () => {
    const ok = set('2026-10-13', '2026-10-15', '2026-10-20', '2026-10-21')
    expect(rachaSemanal(ok, '2026-10-26', 2)).toEqual({ actual: 2, mejor: 2 })
    expect(rachaSemanal(set('2026-10-13', '2026-10-15', '2026-10-20'), '2026-10-26', 2)).toEqual({ actual: 0, mejor: 1 })
  })
  it('cantidad: cumple recién al llegar a la meta', () => {
    const h = habito({ tipo: 'cantidad', meta: 8 })
    expect(rachaHabito(h, [{ fecha: '2026-10-25', valor: 7 }], '2026-10-26').actual).toBe(0)
  })
  it('día perfecto ignora los hábitos x por semana', () => {
    const hs = [habito({ id: 1 }), habito({ id: 2, frecuencia: 'x_por_semana', vecesPorSemana: 4 })]
    expect(diaPerfecto(hs, new Map([[1, 1]]), '2026-10-26')).toBe(true)
    expect(diaPerfecto(hs, new Map([[2, 1]]), '2026-10-26')).toBe(false)
  })
})

describe('sueño', () => {
  it('maneja el cruce de medianoche', () => {
    expect(armarSueno('2026-10-26', '23:30', '07:00')).toMatchObject({ acostado: '2026-10-25T23:30', duracionMin: 450 })
    expect(armarSueno('2026-10-26', '00:30', '08:00')).toMatchObject({ acostado: '2026-10-26T00:30', duracionMin: 450 })
  })
  it('horario habitual y regularidad alrededor de la medianoche', () => {
    const regs = [['23:30', '07:00'], ['00:30', '08:00'], ['00:00', '07:30']].map(([a, l], i) => ({
      id: i, esSiesta: false, ...armarSueno(sumarDias('2026-10-24', i), a, l),
    })) as RegistroSueno[]
    expect(horarioHabitual(regs)).toEqual({ acostado: '00:00', levantado: '07:30' })
    const m = metricasSueno(regs, '2026-10-26', 450)
    expect(m.regularidad).toBe('muy regular') // desvío ≈ 24 min
    expect(m.min7).toBe(450)
    expect(m.deudaMin).toBe(0)
  })
})
