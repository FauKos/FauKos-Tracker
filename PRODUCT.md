# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Una sola persona, el dueño de la app, en Argentina. La usa en su iPhone 17 Pro (unos 402 pt de ancho, con Dynamic Island), instalada en la pantalla de inicio. Varias veces por día carga en segundos lo que comió, el agua y sus hábitos; a la mañana, el sueño y el peso.

## Product Purpose

Organizar la vida personal en un solo lugar: hábitos, cuerpo, nutrición, sueño, entrenamiento, finanzas y objetivos, con recompensas para que no sea monótono. El éxito es que registrar algo tome de 1 a 3 toques y que la app se use todos los días.

## Positioning

Todo conectado y argentino: la nutrición estilo Fitia (metas calculadas con el perfil del usuario, macros, comidas frecuentes) convive con hábitos, rachas, peso y plata, y los cruces entre esos datos alimentan logros, objetivos e insights. Pesos y dólares, comidas y bancos argentinos.

## Operating Context

- Uso diario con una mano, en momentos cortos: después de comer, al tomar agua, al levantarse, antes de dormir.
- Lo que más se usa: primero comidas y macros, después hábitos y rachas (confirmado por el usuario).
- El perfil físico (sexo, edad, altura, peso, actividad, objetivo) es la base del cálculo de calorías y tiene que pedirse de entrada, no escondido.
- Datos solo en el teléfono (IndexedDB), con backup JSON manual.

## Capabilities and Constraints

- PWA local-first: React + TypeScript + Vite, Dexie, CSS plano. Publicada en GitHub Pages, sin servidor propio.
- Funciona offline después de la primera carga.
- Hecho hasta ahora (v1 y v2 de SPEC.md): Hoy, hábitos con rachas, agua, sueño, ánimo, suplementos, peso y medidas, metas de calorías (Mifflin-St Jeor), comidas, alimentos propios, recetas, XP, niveles, logros, tienda, comodines, pausa, revisión semanal.
- Pendiente por fases: finanzas (v3), entrenamiento y base de alimentos argentinos (v4), objetivos e insights (v5).
- El detalle funcional vive en SPEC.md.

## Brand Commitments

- Nombre de trabajo: Rumbo (se puede cambiar).
- Español rioplatense, voseo, formato argentino ($ 1.234,56, dd/mm/aaaa, semana de lunes a domingo).
- Principio del producto: solo suma, nunca castiga. Un mal día no resta ni muestra mensajes negativos.

## Evidence on Hand

- SPEC.md: especificación funcional completa.
- No hay logo final, fotos ni marca establecida. La v1/v2 tenía una estética "bitácora en tinta" que el usuario rechazó: "la estética es horrible", "anti-intuitiva", "se cruzan un montón de cosas".

## Product Principles

1. Registrar en 1 a 3 toques; si algo es tedioso, no se usa.
2. Lo diario primero: comidas y macros, después hábitos, a la vista y sin navegar.
3. Pedir lo necesario cuando hace falta (perfil al empezar) y decir siempre de dónde sale cada número.
4. Solo suma: el progreso se celebra, los huecos no se castigan.
5. Todo conectado: un dato cargado una vez alimenta todos los módulos.
