import { describe, expect, it } from 'vitest'
import type { Alimento, Datos, Habito, RegistroSueno } from '../db'
import { calcularMetas, edad, resumenPeso, tendencia } from './cuerpo'
import { diaLogico, diaSemana, lunesDe, sumarDias } from './fechas'
import { diaPerfecto, existe, pausaDe, rachaDiaria, rachaHabito, rachaSemanal } from './habitos'
import { buscar, receta } from './nutricion'
import { calcularXP, comodinesDisponibles, contexto, diasPerfectos, logrosNuevos, nivel } from './recompensas'
import { resumenSemana } from './revision'
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

// ---------- v2 ----------

const dias = (desde: string, n: number) => Array.from({ length: n }, (_, i) => sumarDias(desde, i))
const datos = (d: Partial<Datos>): Datos => ({
  habitos: [], registrosHabito: [], registrosSueno: [], registrosAnimo: [], registrosPeso: [], registrosComida: [],
  metasNutricion: [], canjes: [], logros: [], comodines: [], pausas: [], ...d,
})
const sinPausa = () => false

describe('peso y calorías', () => {
  const pesos = dias('2026-09-01', 56).map((fecha, i) => ({ fecha, kg: 90 - i * 0.1 })) // baja 0,7 kg por semana
  it('tendencia: media de 7 días con al menos 3 pesajes', () => {
    expect(tendencia([{ fecha: '2026-10-01', kg: 80 }, { fecha: '2026-10-02', kg: 81 }], '2026-10-02')).toBeNull()
    expect(tendencia([{ fecha: '2026-10-01', kg: 80 }, { fecha: '2026-10-03', kg: 81 }, { fecha: '2026-10-07', kg: 82 }], '2026-10-07')).toBe(81)
  })
  it('estima la fecha de la meta con el ritmo real y avisa si es muy agresivo', () => {
    const r = resumenPeso(pesos, '2026-10-26', { pesoObjetivo: 80, ritmoSemanal: -1, objetivo: 'definir' })
    expect(r.ritmoReal).toBeCloseTo(-0.7)
    expect(r.fechaEstimada! > '2026-11-01').toBe(true)
    expect(r.agresivo).toBe(true) // −1 kg/sem es más del 1% de ~85 kg
    expect(resumenPeso(pesos, '2026-10-26', { pesoObjetivo: 80, ritmoSemanal: -0.5, objetivo: 'definir' }).agresivo).toBe(false)
  })
  it('Mifflin-St Jeor, actividad, déficit y macros', () => {
    expect(edad('1996-05-10', '2026-05-09')).toBe(29)
    expect(calcularMetas({ sexo: 'hombre', años: 30, kg: 80, cm: 180, actividad: 'moderado', objetivo: 'definir' }))
      .toEqual({ tdee: 2759, kcal: 2359, proteinaG: 160, grasasG: 64, carbosG: 286 })
    expect(calcularMetas({ sexo: 'mujer', años: 30, kg: 60, cm: 165, actividad: 'sedentario', objetivo: 'volumen', ajusteKcal: 900 }).kcal).toBe(1884) // 1320,25 × 1,2 + 300 (ajuste topeado en 300)
  })
})

describe('nutrición', () => {
  it('receta: macros cada 100 g', () => {
    const r = receta([{ gramos: 200, por100: { kcal: 130, p: 2.7, c: 28, g: 0.3 } }, { gramos: 100, por100: { kcal: 165, p: 31, c: 0, g: 3.6 } }])
    expect(r.gramos).toBe(300)
    expect(r.por100.kcal).toBeCloseTo(141.67, 1)
  })
  it('buscador sin tildes y con recientes primero', () => {
    const a = (id: number, nombre: string, favorito = false) => ({ id, nombre, favorito, origen: 'propio', porciones: [], por100: { kcal: 0, p: 0, c: 0, g: 0 } }) as Alimento
    const lista = [a(1, 'Milanesa de carne'), a(2, 'Milanesa de pollo', true), a(3, 'Papas')]
    expect(buscar(lista, 'milanesa', []).map((x) => x.id)).toEqual([2, 1])
    expect(buscar(lista, 'MILANESÁ carne', []).map((x) => x.id)).toEqual([1])
    expect(buscar(lista, '', [3])[0].id).toBe(3)
  })
})

describe('recompensas', () => {
  const agua = habito({ id: 1, clave: 'agua' })
  const regs = (fs: string[], habitoId = 1) => fs.map((fecha, id) => ({ id: id + habitoId * 1000, habitoId, fecha, valor: 1, creadoEn: '' }))

  it('niveles: 100 × n^1,5 por nivel', () => {
    expect(nivel(0)).toMatchObject({ n: 1, actual: 0, siguiente: 100, nombre: 'Principiante' })
    expect(nivel(383)).toMatchObject({ n: 3, actual: 0, siguiente: 520 })
  })
  it('XP: hábitos, días perfectos y semanas completas; desmarcar resta', () => {
    const gym = habito({ id: 2, frecuencia: 'x_por_semana', vecesPorSemana: 2 })
    const d = datos({ habitos: [agua, gym], registrosHabito: [...regs(['2026-10-19', '2026-10-20']), ...regs(['2026-10-19', '2026-10-21'], 2)] })
    const p = diasPerfectos(d, '2026-10-26', sinPausa)
    expect(p.size).toBe(2)
    expect(calcularXP(d, '2026-10-26', p).total).toBe(4 * 10 + 2 * 50 + 100)
    d.registrosHabito[0].valor = 0
    expect(calcularXP(d, '2026-10-26', diasPerfectos(d, '2026-10-26', sinPausa)).total).toBe(3 * 10 + 50 + 100)
  })
  it('un hábito nuevo no le quita el día perfecto a los días anteriores', () => {
    const nuevo = habito({ id: 2, desde: '2026-10-25' })
    expect(existe(nuevo, '2026-10-24')).toBe(false)
    const d = datos({ habitos: [agua, nuevo], registrosHabito: regs(['2026-10-24']) })
    expect(diasPerfectos(d, '2026-10-26', sinPausa).has('2026-10-24')).toBe(true)
  })
  it('comodines: 1 cada 7 días perfectos seguidos, máximo 3; usar uno descuenta', () => {
    const p = new Set(dias('2026-09-01', 28))
    expect(comodinesDisponibles(new Set(dias('2026-09-01', 6)), [], '2026-10-26', sinPausa)).toBe(0)
    expect(comodinesDisponibles(p, [], '2026-10-26', sinPausa)).toBe(3)
    expect(comodinesDisponibles(p, [{ usadoEn: '2026-10-20' }], '2026-10-26', sinPausa)).toBe(2)
    const conHueco = new Set([...dias('2026-09-01', 4), ...dias('2026-09-07', 3)]) // falta el 05 y el 06
    expect(comodinesDisponibles(conHueco, [], '2026-10-26', sinPausa)).toBe(0)
    expect(comodinesDisponibles(conHueco, [], '2026-10-26', pausaDe([{ desde: '2026-09-05', hasta: '2026-09-06' }]))).toBe(1)
  })
  it('la pausa y los comodines sostienen la racha', () => {
    const ok = regs(['2026-10-20', '2026-10-21', '2026-10-24'])
    expect(rachaHabito(agua, ok, '2026-10-24').actual).toBe(1)
    expect(rachaHabito(agua, ok, '2026-10-24', { enPausa: pausaDe([{ desde: '2026-10-22', hasta: '2026-10-23' }]) }).actual).toBe(3)
    expect(rachaHabito(agua, ok, '2026-10-24', { cubiertos: ['2026-10-22', '2026-10-23'] }).actual).toBe(5)
  })
  it('logros: se desbloquean una vez', () => {
    const d = datos({ habitos: [agua], registrosHabito: regs(dias('2026-10-01', 7)) })
    const c = contexto(d, '2026-10-26', { metaSuenoMin: 450 }, diasPerfectos(d, '2026-10-26', sinPausa), sinPausa)
    expect(logrosNuevos(c, [])).toContain('racha-7')
    expect(logrosNuevos(c, [{ clave: 'racha-7' }])).not.toContain('racha-7')
  })
  it('revisión semanal: porcentaje de hábitos cumplidos', () => {
    const d = datos({ habitos: [agua], registrosHabito: regs(['2026-10-19', '2026-10-20', '2026-10-22']) })
    expect(resumenSemana(d, '2026-10-19', '2026-10-26', 450).pctHabitos).toBe(43) // 3 de 7
  })
})
