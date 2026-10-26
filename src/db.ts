import { Dexie, type EntityTable } from 'dexie'
import { cumple } from './logica/habitos'

export type Frecuencia = 'diaria' | 'x_por_semana' | 'dias_fijos'
export type BloqueId = 'habitos' | 'agua' | 'sueno' | 'animo'

export interface Habito {
  id: number
  clave?: 'agua' // el hábito que muestra el bloque de Agua
  nombre: string
  icono: string
  color: string
  tipo: 'check' | 'cantidad'
  meta: number
  unidad: string
  incremento: number
  frecuencia: Frecuencia
  diasFijos: number[] // 0 = lunes … 6 = domingo
  vecesPorSemana: number
  orden: number
  archivado: boolean
}

export interface RegistroHabito { id: number; habitoId: number; fecha: string; valor: number; nota?: string; creadoEn: string }

export interface RegistroSueno {
  id: number
  fecha: string // día en que te levantás
  acostado: string // 'YYYY-MM-DDTHH:MM'
  levantado: string
  duracionMin: number
  calidad?: number
  nota?: string
  esSiesta: boolean
}

export interface RegistroAnimo { id: number; fecha: string; animo?: number; energia?: number; nota?: string }

export interface Suplemento {
  id: number
  nombre: string
  presentacion: 'g' | 'cápsulas' | 'ml'
  cantidadEnvase: number
  dosisDiaria: number
  stockActual: number
  avisarConDias: number
  habitoId?: number
}

export interface Perfil {
  id: 'yo'
  nombre: string
  corteHora: number
  metaSuenoMin: number
  bloques: { id: BloqueId; visible: boolean }[]
  ultimoBackup?: string
}

export const db = new Dexie('rumbo') as Dexie & {
  habitos: EntityTable<Habito, 'id'>
  registrosHabito: EntityTable<RegistroHabito, 'id'>
  registrosSueno: EntityTable<RegistroSueno, 'id'>
  registrosAnimo: EntityTable<RegistroAnimo, 'id'>
  suplementos: EntityTable<Suplemento, 'id'>
  perfil: EntityTable<Perfil, 'id'>
}

db.version(1).stores({
  habitos: '++id',
  registrosHabito: '++id, &[habitoId+fecha], habitoId, fecha',
  registrosSueno: '++id, fecha',
  registrosAnimo: '++id, &fecha',
  suplementos: '++id, habitoId',
  perfil: 'id',
})

export const COLORES = ['#2f7d6d', '#3a5ba9', '#b8862f', '#b5473f', '#7a5aa6', '#3e8da8']
export const BLOQUES: Record<BloqueId, string> = { habitos: 'Hábitos', agua: 'Agua', sueno: 'Sueño', animo: 'Ánimo y energía' }

const base = { diasFijos: [], vecesPorSemana: 0, archivado: false }

db.on('populate', async (tx) => {
  const [, creatinaId] = await tx.table('habitos').bulkAdd([
    { ...base, clave: 'agua', nombre: 'Agua', icono: '💧', color: COLORES[5], tipo: 'cantidad', meta: 8, unidad: 'vasos', incremento: 1, frecuencia: 'diaria', orden: 0 },
    { ...base, nombre: 'Creatina', icono: '🥄', color: COLORES[1], tipo: 'check', meta: 1, unidad: '', incremento: 1, frecuencia: 'diaria', orden: 1 },
    { ...base, nombre: 'Gimnasio', icono: '🏋️', color: COLORES[3], tipo: 'check', meta: 1, unidad: '', incremento: 1, frecuencia: 'x_por_semana', vecesPorSemana: 4, orden: 2 },
    { ...base, nombre: 'Proteína', icono: '🥩', color: COLORES[2], tipo: 'cantidad', meta: 150, unidad: 'g', incremento: 25, frecuencia: 'diaria', orden: 3 },
  ], { allKeys: true })
  await tx.table('suplementos').add({ nombre: 'Creatina', presentacion: 'g', cantidadEnvase: 300, dosisDiaria: 5, stockActual: 0, avisarConDias: 5, habitoId: creatinaId })
  await tx.table('perfil').add({
    id: 'yo', nombre: '', corteHora: 4, metaSuenoMin: 450,
    bloques: (Object.keys(BLOQUES) as BloqueId[]).map((id) => ({ id, visible: true })),
  } satisfies Perfil)
})

/**
 * Fija el valor de un hábito en un día (o lo calcula desde el actual, para toques rápidos seguidos).
 * Si el cumplimiento cambia, descuenta o devuelve la dosis de los suplementos vinculados.
 */
export async function fijarValor(h: Habito, fecha: string, nuevo: number | ((actual: number) => number)) {
  await db.transaction('rw', db.registrosHabito, db.suplementos, async () => {
    const reg = await db.registrosHabito.where({ habitoId: h.id, fecha }).first()
    const valor = Math.max(0, typeof nuevo === 'function' ? nuevo(reg?.valor ?? 0) : nuevo)
    const delta = Number(cumple(h, valor)) - Number(cumple(h, reg?.valor))
    if (reg) await db.registrosHabito.update(reg.id, { valor })
    else await db.registrosHabito.add({ habitoId: h.id, fecha, valor, creadoEn: new Date().toISOString() })
    if (!delta) return
    for (const s of await db.suplementos.where('habitoId').equals(h.id).toArray())
      await db.suplementos.update(s.id, { stockActual: s.stockActual - delta * s.dosisDiaria })
  })
}

export const diasRestantes = (s: Suplemento) => Math.floor(Math.max(0, s.stockActual) / s.dosisDiaria)

export async function guardarAnimo(fecha: string, cambios: Partial<Omit<RegistroAnimo, 'id' | 'fecha'>>) {
  await db.transaction('rw', db.registrosAnimo, async () => {
    const reg = await db.registrosAnimo.where('fecha').equals(fecha).first()
    if (reg) await db.registrosAnimo.update(reg.id, cambios)
    else await db.registrosAnimo.add({ fecha, ...cambios })
  })
}

/** Un solo sueño nocturno por día: guardar reemplaza el anterior. Las siestas se suman. */
export async function guardarSueno(r: Omit<RegistroSueno, 'id'>) {
  await db.transaction('rw', db.registrosSueno, async () => {
    if (!r.esSiesta) await db.registrosSueno.where('fecha').equals(r.fecha).filter((x) => !x.esSiesta).delete()
    await db.registrosSueno.add(r)
  })
}

// ---------- Backup ----------

export async function exportarBackup() {
  const data = Object.fromEntries(await Promise.all(db.tables.map(async (t) => [t.name, await t.toArray()])))
  return { app: 'rumbo', version: db.verno, exportadoEn: new Date().toISOString(), data }
}

/** Valida y restaura un backup. Devuelve cuántas filas no se pudieron fusionar. */
export async function importarBackup(json: unknown, modo: 'reemplazar' | 'fusionar'): Promise<number> {
  const b = json as { app?: unknown; version?: unknown; data?: Record<string, unknown> }
  if (!b || b.app !== 'rumbo' || typeof b.version !== 'number' || typeof b.data !== 'object' || !b.data)
    throw new Error('El archivo no es un backup de Rumbo.')
  // ponytail: sin migraciones de backups viejos; hacen falta cuando exista db.version(2).
  if (b.version > db.verno) throw new Error('El backup es de una versión más nueva de la app. Actualizala y probá de nuevo.')
  for (const [nombre, filas] of Object.entries(b.data)) {
    if (!db.tables.some((t) => t.name === nombre)) throw new Error(`Tabla desconocida en el backup: ${nombre}.`)
    if (!Array.isArray(filas) || filas.some((f) => typeof f !== 'object' || f === null))
      throw new Error(`Datos inválidos en la tabla ${nombre}.`)
  }
  let fallidas = 0
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) {
      if (modo === 'reemplazar') await t.clear()
      const filas = b.data![t.name] as object[] | undefined
      if (!filas?.length) continue
      try {
        await t.bulkPut(filas)
      } catch (e) {
        if (!(e instanceof Dexie.BulkError)) throw e
        fallidas += Object.keys(e.failuresByPos).length
      }
    }
  })
  return fallidas
}
