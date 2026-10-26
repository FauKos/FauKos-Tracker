import { Dexie, type EntityTable } from 'dexie'
import { cumple } from './logica/habitos'
import { macrosDe, normalizar, type Macros, type Momento } from './logica/nutricion'

export type Frecuencia = 'diaria' | 'x_por_semana' | 'dias_fijos'
export type BloqueId = 'habitos' | 'agua' | 'sueno' | 'nutricion' | 'animo' | 'peso'
export type ClaveHabito = 'agua' | 'gimnasio' | 'proteina'
export type Sexo = 'hombre' | 'mujer'
export type Actividad = 'sedentario' | 'ligero' | 'moderado' | 'alto' | 'muy_alto'
export type Objetivo = 'definir' | 'mantener' | 'volumen'

export interface Habito {
  id: number
  clave?: ClaveHabito // hábitos con comportamiento propio (bloque de Agua, proteína desde las comidas, logros de gimnasio)
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
  desde?: string // día en que se creó; sin dato = desde siempre
  archivadoEn?: string
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
  sexo?: Sexo
  nacimiento?: string
  alturaCm?: number
  actividad?: Actividad
  objetivo?: Objetivo
  ajusteKcal?: number // déficit o superávit
  proteinaGKg?: number
  grasasGKg?: number
  pesoObjetivo?: number
  ritmoSemanal?: number // kg por semana, negativo para bajar
  comodinAuto?: boolean
  perfilListo?: boolean // ya pasó por la bienvenida
  ultimoComodinAuto?: string
}

export interface RegistroPeso { id: number; fecha: string; kg: number; nota?: string }
export interface RegistroMedidas { id: number; fecha: string; cintura?: number; cadera?: number; pecho?: number; brazo?: number; muslo?: number; grasaPct?: number }

export interface Porcion { nombre: string; gramos: number }
export interface Alimento {
  id: number
  nombre: string
  marca?: string
  por100: Macros
  porciones: Porcion[]
  origen: 'propio' | 'receta'
  favorito: boolean
  receta?: { ingredientes: { alimentoId: number; gramos: number }[]; porciones: number }
}
export interface Item { alimentoId: number; gramos: number; cantidad: number; unidad: string }
export interface RegistroComida extends Item, Macros { id: number; fecha: string; momento: Momento; nombre: string }
export interface ComidaFrecuente { id: number; nombre: string; momento: Momento; items: Item[] }
export interface MetasNutricion { id: number; desde: string; kcal: number; proteinaG: number; carbosG: number; grasasG: number; tdee?: number; origen: 'formula' | 'manual' }

export interface Recompensa { id: number; nombre: string; costo: number; icono: string; repetible: boolean }
export interface Canje { id: number; recompensaId: number; nombre: string; fecha: string; costo: number }
export interface Logro { clave: string; desbloqueadoEn: string }
export interface UsoComodin { id: number; habitoId: number; fecha: string; usadoEn: string } // fecha = día que cubre
export interface Pausa { id: number; desde: string; hasta: string; motivo?: string }
export interface RevisionSemanal { semana: string; texto: string; creadoEn: string } // semana = su lunes

export const db = new Dexie('rumbo') as Dexie & {
  habitos: EntityTable<Habito, 'id'>
  registrosHabito: EntityTable<RegistroHabito, 'id'>
  registrosSueno: EntityTable<RegistroSueno, 'id'>
  registrosAnimo: EntityTable<RegistroAnimo, 'id'>
  suplementos: EntityTable<Suplemento, 'id'>
  perfil: EntityTable<Perfil, 'id'>
  registrosPeso: EntityTable<RegistroPeso, 'id'>
  registrosMedidas: EntityTable<RegistroMedidas, 'id'>
  alimentos: EntityTable<Alimento, 'id'>
  comidasFrecuentes: EntityTable<ComidaFrecuente, 'id'>
  registrosComida: EntityTable<RegistroComida, 'id'>
  metasNutricion: EntityTable<MetasNutricion, 'id'>
  recompensas: EntityTable<Recompensa, 'id'>
  canjes: EntityTable<Canje, 'id'>
  logros: EntityTable<Logro, 'clave'>
  comodines: EntityTable<UsoComodin, 'id'>
  pausas: EntityTable<Pausa, 'id'>
  revisiones: EntityTable<RevisionSemanal, 'semana'>
}

db.version(1).stores({
  habitos: '++id',
  registrosHabito: '++id, &[habitoId+fecha], habitoId, fecha',
  registrosSueno: '++id, fecha',
  registrosAnimo: '++id, &fecha',
  suplementos: '++id, habitoId',
  perfil: 'id',
})

db.version(2)
  .stores({
    registrosPeso: '++id, &fecha',
    registrosMedidas: '++id, fecha',
    alimentos: '++id, nombre',
    comidasFrecuentes: '++id',
    registrosComida: '++id, fecha, alimentoId',
    metasNutricion: '++id, desde',
    recompensas: '++id',
    canjes: '++id',
    logros: 'clave',
    comodines: '++id, &[habitoId+fecha]',
    pausas: '++id',
    revisiones: 'semana',
  })
  .upgrade((tx) => asignarClaves(tx.table('habitos')))

/** Marca Gimnasio y Proteína de la v1 por nombre, para que se conecten con logros y comidas. */
async function asignarClaves(t: EntityTable<Habito, 'id'>) {
  const hs = await t.toArray()
  for (const clave of ['gimnasio', 'proteina'] as const) {
    if (hs.some((h) => h.clave === clave)) continue
    const h = hs.find((h) => !h.clave && normalizar(h.nombre) === clave)
    if (h) await t.update(h.id, { clave })
  }
}

export const BLOQUES: Record<BloqueId, string> = {
  nutricion: 'Comida', habitos: 'Hábitos', agua: 'Agua', sueno: 'Sueño', animo: 'Ánimo y energía', peso: 'Peso',
}

/** Bloques de Hoy en el orden guardado, sumando al final los que agregó una versión nueva. */
export const bloquesDe = (p: Perfil) => [
  ...p.bloques.filter((b) => b.id in BLOQUES),
  ...(Object.keys(BLOQUES) as BloqueId[]).filter((id) => !p.bloques.some((b) => b.id === id)).map((id) => ({ id, visible: true })),
]

const base = { diasFijos: [], vecesPorSemana: 0, archivado: false }

db.on('populate', async (tx) => {
  const [, creatinaId] = await tx.table('habitos').bulkAdd([
    { ...base, clave: 'agua', nombre: 'Agua', icono: 'gota', color: '', tipo: 'cantidad', meta: 8, unidad: 'vasos', incremento: 1, frecuencia: 'diaria', orden: 0 },
    { ...base, nombre: 'Creatina', icono: 'capsula', color: '', tipo: 'check', meta: 1, unidad: '', incremento: 1, frecuencia: 'diaria', orden: 1 },
    { ...base, clave: 'gimnasio', nombre: 'Gimnasio', icono: 'pesa', color: '', tipo: 'check', meta: 1, unidad: '', incremento: 1, frecuencia: 'x_por_semana', vecesPorSemana: 4, orden: 2 },
    { ...base, clave: 'proteina', nombre: 'Proteína', icono: 'proteina', color: '', tipo: 'cantidad', meta: 150, unidad: 'g', incremento: 25, frecuencia: 'diaria', orden: 3 },
  ], { allKeys: true })
  await tx.table('suplementos').add({ nombre: 'Creatina', presentacion: 'g', cantidadEnvase: 300, dosisDiaria: 5, stockActual: 0, avisarConDias: 5, habitoId: creatinaId })
  await tx.table('perfil').add({
    id: 'yo', nombre: '', corteHora: 4, metaSuenoMin: 450,
    bloques: (Object.keys(BLOQUES) as BloqueId[]).map((id) => ({ id, visible: true })),
  } satisfies Perfil)
})

/** Todo lo que necesitan XP, logros y la revisión semanal. */
export async function cargarTodo() {
  const [habitos, registrosHabito, registrosSueno, registrosAnimo, registrosPeso, registrosComida, metasNutricion, canjes, logros, comodines, pausas] =
    await Promise.all([
      db.habitos.toArray(), db.registrosHabito.toArray(), db.registrosSueno.toArray(), db.registrosAnimo.toArray(),
      db.registrosPeso.toArray(), db.registrosComida.toArray(), db.metasNutricion.toArray(), db.canjes.toArray(),
      db.logros.toArray(), db.comodines.toArray(), db.pausas.toArray(),
    ])
  return { habitos, registrosHabito, registrosSueno, registrosAnimo, registrosPeso, registrosComida, metasNutricion, canjes, logros, comodines, pausas }
}
export type Datos = Awaited<ReturnType<typeof cargarTodo>>

// ---------- Hábitos ----------

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

export async function guardarPeso(fecha: string, kg: number) {
  await db.transaction('rw', db.registrosPeso, async () => {
    const reg = await db.registrosPeso.where('fecha').equals(fecha).first()
    if (reg) await db.registrosPeso.update(reg.id, { kg })
    else await db.registrosPeso.add({ fecha, kg })
  })
}

// ---------- Comidas ----------

const tablasComida = [db.registrosComida, db.alimentos, db.habitos, db.registrosHabito, db.suplementos]

/** El hábito de proteína toma el total de proteína de las comidas del día. */
async function sincronizarProteina(fecha: string) {
  const h = await db.habitos.filter((h) => h.clave === 'proteina' && !h.archivado).first()
  if (!h) return
  const comidas = await db.registrosComida.where('fecha').equals(fecha).toArray()
  await fijarValor(h, fecha, Math.round(comidas.reduce((s, c) => s + c.p, 0)))
}

export async function agregarItems(fecha: string, momento: Momento, items: Item[]) {
  await db.transaction('rw', tablasComida, async () => {
    const alimentos = await db.alimentos.bulkGet(items.map((i) => i.alimentoId))
    const filas = items.flatMap((it, k) => {
      const a = alimentos[k]
      return a ? [{ ...it, fecha, momento, nombre: a.nombre, ...macrosDe(a.por100, it.gramos) }] : []
    })
    await db.registrosComida.bulkAdd(filas)
    await sincronizarProteina(fecha)
  })
}

export async function borrarComida(r: RegistroComida) {
  await db.transaction('rw', tablasComida, async () => {
    await db.registrosComida.delete(r.id)
    await sincronizarProteina(r.fecha)
  })
}

/** Guarda metas nuevas desde `desde` y alinea la meta del hábito de proteína. */
export async function guardarMetas(m: Omit<MetasNutricion, 'id'>) {
  await db.transaction('rw', db.metasNutricion, db.habitos, async () => {
    await db.metasNutricion.where('desde').equals(m.desde).delete()
    await db.metasNutricion.add(m)
    const h = await db.habitos.filter((h) => h.clave === 'proteina').first()
    if (h) await db.habitos.update(h.id, { meta: m.proteinaG })
  })
}

// ---------- Recompensas ----------

export async function canjear(r: Recompensa, fecha: string) {
  await db.canjes.add({ recompensaId: r.id, nombre: r.nombre, fecha, costo: r.costo })
}

export async function usarComodin(habitoId: number, fecha: string, hoy: string) {
  await db.comodines.add({ habitoId, fecha, usadoEn: hoy })
}

// ---------- Backup ----------

export async function exportarBackup() {
  const data = Object.fromEntries(await Promise.all(db.tables.map(async (t) => [t.name, await t.toArray()])))
  return { app: 'rumbo', version: db.verno, exportadoEn: new Date().toISOString(), data }
}

/** Valida y restaura un backup (de esta versión o anteriores). Devuelve cuántas filas no se pudieron fusionar. */
export async function importarBackup(json: unknown, modo: 'reemplazar' | 'fusionar'): Promise<number> {
  const b = json as { app?: unknown; version?: unknown; data?: Record<string, unknown> }
  if (!b || b.app !== 'rumbo' || typeof b.version !== 'number' || typeof b.data !== 'object' || !b.data)
    throw new Error('El archivo no es un backup de Rumbo.')
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
    await asignarClaves(db.habitos) // un backup de la v1 no trae las claves
  })
  return fallidas
}
