import type { Alimento, MetasNutricion, RegistroComida } from '../db'

export interface Macros { kcal: number; p: number; c: number; g: number }
export const MOMENTOS = ['desayuno', 'almuerzo', 'merienda', 'cena', 'snack'] as const
export type Momento = (typeof MOMENTOS)[number]
export const NOMBRE_MOMENTO: Record<Momento, string> = { desayuno: 'Desayuno', almuerzo: 'Almuerzo', merienda: 'Merienda', cena: 'Cena', snack: 'Snack' }

export const normalizar = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

export const macrosDe = (por100: Macros, gramos: number): Macros => ({
  kcal: (por100.kcal * gramos) / 100, p: (por100.p * gramos) / 100, c: (por100.c * gramos) / 100, g: (por100.g * gramos) / 100,
})

export const sumar = (xs: Macros[]): Macros =>
  xs.reduce((t, x) => ({ kcal: t.kcal + x.kcal, p: t.p + x.p, c: t.c + x.c, g: t.g + x.g }), { kcal: 0, p: 0, c: 0, g: 0 })

/** Macros cada 100 g de una receta y su peso total. */
export function receta(ingredientes: { gramos: number; por100: Macros }[]) {
  const gramos = ingredientes.reduce((s, i) => s + i.gramos, 0)
  const total = sumar(ingredientes.map((i) => macrosDe(i.por100, i.gramos)))
  const k = gramos ? 100 / gramos : 0
  return { gramos, por100: { kcal: total.kcal * k, p: total.p * k, c: total.c * k, g: total.g * k } }
}

/** Metas vigentes ese día: las últimas definidas hasta esa fecha. */
export const metasEn = (metas: MetasNutricion[], fecha: string) =>
  metas.filter((m) => m.desde <= fecha).sort((a, b) => b.desde.localeCompare(a.desde))[0]

/** Buscador: recientes primero, después favoritos, propios y recetas. */
export function buscar(alimentos: Alimento[], texto: string, recientes: number[]) {
  const palabras = normalizar(texto).split(/\s+/).filter(Boolean)
  const rango = (a: Alimento) => {
    const r = recientes.indexOf(a.id)
    return r >= 0 ? r : 1000 + (a.favorito ? 0 : 1000) + (a.origen === 'propio' ? 0 : 500)
  }
  return alimentos
    .filter((a) => palabras.every((p) => normalizar(`${a.nombre} ${a.marca ?? ''}`).includes(p)))
    .sort((a, b) => rango(a) - rango(b) || a.nombre.localeCompare(b.nombre))
}

/** Ids de alimentos usados, del más reciente al más viejo, sin repetir. */
export const recientes = (comidas: RegistroComida[]) =>
  [...new Set([...comidas].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id).map((c) => c.alimentoId))]

/** "Todas las comidas del día": desayuno, almuerzo y cena con algo cargado. */
export const diaCompleto = (comidas: { momento: Momento }[]) =>
  (['desayuno', 'almuerzo', 'cena'] as const).every((m) => comidas.some((c) => c.momento === m))
