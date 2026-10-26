import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from './db'
import { diaLogico } from './logica/fechas'
import { Ajustes } from './pantallas/Ajustes'
import { Animo } from './pantallas/Animo'
import { Habitos } from './pantallas/Habitos'
import { Hoy } from './pantallas/Hoy'
import { Sueno } from './pantallas/Sueno'

const TABS = [
  ['hoy', 'Hoy'],
  ['habitos', 'Hábitos'],
  ['sueno', 'Sueño'],
  ['animo', 'Ánimo'],
  ['ajustes', 'Ajustes'],
] as const
export type Tab = (typeof TABS)[number][0]

export default function App() {
  const [tab, setTab] = useState<Tab>('hoy')
  const perfil = useLiveQuery(() => db.perfil.get('yo'))
  const [, refrescar] = useState(0)

  // Al volver a la app (iOS la deja suspendida), recalcular el día.
  useEffect(() => {
    const f = () => document.visibilityState === 'visible' && refrescar((n) => n + 1)
    document.addEventListener('visibilitychange', f)
    return () => document.removeEventListener('visibilitychange', f)
  }, [])

  if (!perfil) return null
  const hoy = diaLogico(new Date(), perfil.corteHora)
  const irA = (t: Tab) => {
    setTab(t)
    window.scrollTo(0, 0)
  }

  return (
    <>
      <main>
        {tab === 'hoy' && <Hoy key={hoy} hoy={hoy} perfil={perfil} irA={irA} />}
        {tab === 'habitos' && <Habitos hoy={hoy} />}
        {tab === 'sueno' && <Sueno hoy={hoy} perfil={perfil} />}
        {tab === 'animo' && <Animo hoy={hoy} />}
        {tab === 'ajustes' && <Ajustes perfil={perfil} />}
      </main>
      <nav className="tabs">
        {TABS.map(([id, nombre]) => (
          <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => irA(id)}>{nombre}</button>
        ))}
      </nav>
    </>
  )
}
