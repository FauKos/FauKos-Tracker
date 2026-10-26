import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { cargarTodo, db, usarComodin } from './db'
import { diaLogico, sumarDias } from './logica/fechas'
import { cumple, obligatorios, rachaHabito } from './logica/habitos'
import { calcularProgreso, logrosNuevos } from './logica/recompensas'
import { Ajustes } from './pantallas/Ajustes'
import { Animo } from './pantallas/Animo'
import { Comida } from './pantallas/Comida'
import { Cuerpo } from './pantallas/Cuerpo'
import { Habitos } from './pantallas/Habitos'
import { Hoy } from './pantallas/Hoy'
import { Bienvenida, PerfilPantalla } from './pantallas/Perfil'
import { Premios } from './pantallas/Premios'
import { Revision } from './pantallas/Revision'
import { Sueno } from './pantallas/Sueno'
import type { Momento } from './logica/nutricion'
import { Icono } from './ui'

const TABS = [
  ['hoy', 'Hoy'],
  ['comida', 'Comida'],
  ['cuerpo', 'Cuerpo'],
  ['premios', 'Premios'],
  ['mas', 'Más'],
] as const
export type Tab = (typeof TABS)[number][0]

const SUBS = [
  ['perfil', 'Mi perfil', 'Edad, altura, peso y tu plan diario'],
  ['habitos', 'Hábitos', 'Crear, ordenar y archivar'],
  ['sueno', 'Sueño', 'Cargar noches y siestas, promedios'],
  ['animo', 'Ánimo y energía', 'Las últimas 8 semanas'],
  ['revision', 'Revisión semanal', 'Tu semana en números'],
  ['ajustes', 'Ajustes', 'Pausa, suplementos, pantalla Hoy y backup'],
] as const
export type Sub = (typeof SUBS)[number][0]
export type Irse = (t: Tab, sub?: Sub, momento?: Momento) => void

export default function App() {
  const [vista, setVista] = useState<{ tab: Tab; sub?: Sub; momento?: Momento }>({ tab: 'hoy' })
  const perfil = useLiveQuery(() => db.perfil.get('yo'))
  const datos = useLiveQuery(cargarTodo)
  const [, refrescar] = useState(0)

  // Al volver a la app (iOS la deja suspendida), recalcular el día.
  useEffect(() => {
    const f = () => document.visibilityState === 'visible' && refrescar((n) => n + 1)
    document.addEventListener('visibilitychange', f)
    return () => document.removeEventListener('visibilitychange', f)
  }, [])

  const hoy = perfil ? diaLogico(new Date(), perfil.corteHora) : ''
  const progreso = useMemo(() => (perfil && datos ? calcularProgreso(datos, hoy, perfil) : null), [datos, hoy, perfil])

  // Los logros se guardan la primera vez que se cumplen y ya no se pierden.
  useEffect(() => {
    if (!progreso || !datos) return
    const nuevos = logrosNuevos(progreso.contexto, datos.logros)
    if (nuevos.length) db.logros.bulkPut(nuevos.map((clave) => ({ clave, desbloqueadoEn: hoy })))
  }, [progreso, datos, hoy])

  // Comodín automático: una vez por día, cubre lo que ayer quedó sin cumplir si eso salva una racha.
  useEffect(() => {
    if (!perfil?.comodinAuto || !datos || !progreso || perfil.ultimoComodinAuto === hoy) return
    const ayer = sumarDias(hoy, -1)
    let quedan = progreso.comodines
    const usar: number[] = []
    if (!progreso.enPausa(ayer))
      for (const h of obligatorios(datos.habitos.filter((h) => !h.archivado), ayer)) {
        if (quedan <= 0) break
        const regs = datos.registrosHabito.filter((r) => r.habitoId === h.id)
        const cubiertos = datos.comodines.filter((c) => c.habitoId === h.id).map((c) => c.fecha)
        if (cumple(h, regs.find((r) => r.fecha === ayer)?.valor) || cubiertos.includes(ayer)) continue
        if (rachaHabito(h, regs, ayer, { cubiertos: [...cubiertos, ayer], enPausa: progreso.enPausa }).actual <= 1) continue // no hay racha que salvar
        usar.push(h.id)
        quedan--
      }
    db.transaction('rw', db.comodines, db.perfil, async () => {
      for (const id of usar) await usarComodin(id, ayer, hoy)
      await db.perfil.update('yo', { ultimoComodinAuto: hoy })
    })
  }, [perfil, datos, progreso, hoy])

  if (!perfil || !datos || !progreso) return null
  if (!perfil.perfilListo) {
    const ultimo = [...datos.registrosPeso].sort((a, b) => b.fecha.localeCompare(a.fecha))[0]
    return <main><Bienvenida hoy={hoy} perfil={perfil} kgActual={ultimo?.kg} /></main>
  }
  const irA: Irse = (tab, sub, momento) => {
    setVista({ tab, sub, momento })
    window.scrollTo(0, 0)
  }
  const { tab, sub, momento } = vista

  return (
    <>
      <main>
        {tab === 'hoy' && <Hoy key={hoy} hoy={hoy} perfil={perfil} datos={datos} progreso={progreso} irA={irA} />}
        {tab === 'comida' && <Comida key={hoy + (momento ?? '')} hoy={hoy} perfil={perfil} momentoInicial={momento} onPerfil={() => irA('mas', 'perfil')} />}
        {tab === 'cuerpo' && <Cuerpo hoy={hoy} perfil={perfil} />}
        {tab === 'premios' && <Premios hoy={hoy} datos={datos} progreso={progreso} />}
        {tab === 'mas' && !sub && (
          <div className="pantalla">
            <header className="barra"><h1>Más</h1></header>
            <ul className="lista cartel">
              {SUBS.map(([id, nombre, detalle]) => (
                <li key={id}>
                  <button className="fila" onClick={() => irA('mas', id)}>
                    <span className="texto"><strong>{nombre}</strong><small>{detalle}</small></span>
                    <Icono i="siguiente" tam={20} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {tab === 'mas' && sub && (
          <>
            <button className="volver" onClick={() => irA('mas')}><Icono i="atras" tam={20} />Más</button>
            {sub === 'perfil' && <PerfilPantalla hoy={hoy} perfil={perfil} />}
            {sub === 'habitos' && <Habitos hoy={hoy} />}
            {sub === 'sueno' && <Sueno hoy={hoy} perfil={perfil} />}
            {sub === 'animo' && <Animo hoy={hoy} />}
            {sub === 'revision' && <Revision hoy={hoy} datos={datos} perfil={perfil} />}
            {sub === 'ajustes' && <Ajustes perfil={perfil} hoy={hoy} />}
          </>
        )}
      </main>
      <nav className="tabs">
        {TABS.map(([id, nombre]) => (
          <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => irA(id)}><Icono i={id} />{nombre}</button>
        ))}
      </nav>
    </>
  )
}
