import type { Datos, Habito } from '../db'
import { tendencia } from './cuerpo'
import { sumarDias } from './fechas'
import { diasCumplidos, existe, pausaDe, seEvalua } from './habitos'

/** La semana en números, de lunes a `hoy` (o a domingo si ya terminó). */
export function resumenSemana(d: Datos, lunes: string, hoy: string, metaSuenoMin: number) {
  const domingo = sumarDias(lunes, 6)
  const fin = domingo < hoy ? domingo : hoy
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i)).filter((f) => f <= fin)
  const enPausa = pausaDe(d.pausas)
  const okDe = (h: Habito) => diasCumplidos(h, d.registrosHabito.filter((r) => r.habitoId === h.id))

  let total = 0, hechos = 0
  for (const h of d.habitos) {
    const ok = okDe(h)
    if (h.frecuencia === 'x_por_semana') {
      if (!existe(h, fin)) continue
      total++
      if (dias.filter((f) => ok.has(f)).length >= h.vecesPorSemana) hechos++
    } else {
      for (const f of dias) if (existe(h, f) && seEvalua(h, f) && !enPausa(f)) { total++; if (ok.has(f)) hechos++ }
    }
  }

  const diasCon = (clave: Habito['clave']) => {
    const h = d.habitos.find((h) => h.clave === clave)
    if (!h) return null
    const ok = okDe(h)
    return dias.filter((f) => ok.has(f)).length
  }
  const noches = d.registrosSueno.filter((r) => !r.esSiesta && r.fecha >= lunes && r.fecha <= fin)
  const tFin = tendencia(d.registrosPeso, fin), tAntes = tendencia(d.registrosPeso, sumarDias(lunes, -1))

  return {
    fin,
    pctHabitos: total ? Math.round((hechos / total) * 100) : null,
    suenoMin: noches.length ? noches.reduce((s, r) => s + r.duracionMin, 0) / noches.length : null,
    nochesConMeta: noches.filter((r) => r.duracionMin >= metaSuenoMin).length,
    entrenamientos: diasCon('gimnasio'),
    diasProteina: diasCon('proteina'),
    cambioPeso: tFin != null && tAntes != null ? tFin - tAntes : null,
    logros: d.logros.filter((l) => l.desbloqueadoEn >= lunes && l.desbloqueadoEn <= domingo),
  }
}
