// Fechas como día lógico 'YYYY-MM-DD' en hora de Argentina.

const TZ = 'America/Argentina/Buenos_Aires'
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

function partes(d: Date) {
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]))
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` }
}

/** Día al que pertenece un instante: lo anterior a `corteHora` cuenta para el día previo. */
export function diaLogico(d: Date = new Date(), corteHora = 4): string {
  return partes(new Date(d.getTime() - corteHora * 3600_000)).fecha
}

/** 'YYYY-MM-DDTHH:MM' en hora de Argentina (se guarda así, sin zona). */
export function ahoraLocal(d: Date = new Date()): string {
  const p = partes(d)
  return `${p.fecha}T${p.hora}`
}

const utc = (f: string) => new Date(f.slice(0, 10) + 'T00:00:00Z')

export function sumarDias(f: string, n: number): string {
  const d = utc(f)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const diasEntre = (a: string, b: string) => Math.round((utc(b).getTime() - utc(a).getTime()) / 86400_000)

/** 0 = lunes … 6 = domingo */
export const diaSemana = (f: string) => (utc(f).getUTCDay() + 6) % 7

export const lunesDe = (f: string) => sumarDias(f, -diaSemana(f))

/** Minutos entre dos 'YYYY-MM-DDTHH:MM' (Argentina no tiene horario de verano). */
export const minutosEntre = (a: string, b: string) => (Date.parse(b + 'Z') - Date.parse(a + 'Z')) / 60_000

export const DIAS_CORTOS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']
const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export const ddmmaaaa = (f: string) => f.split('-').reverse().join('/')
export const fechaLarga = (f: string) => `${DIAS[diaSemana(f)]} ${Number(f.slice(8))} de ${MESES[Number(f.slice(5, 7)) - 1]}`

export function duracion(min: number): string {
  const m = Math.round(Math.abs(min))
  return `${min < 0 ? '−' : ''}${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`
}

/** Número con formato argentino: 1.234,5 */
export const num = (x: number, decimales = 0) => x.toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
export const signo = (x: number, decimales = 1) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${num(Math.abs(x), decimales)}`
