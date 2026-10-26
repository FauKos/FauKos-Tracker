---
name: Rumbo
description: Tu día como un recorrido del Subte porteño; cada parte de la app es una línea con su color y su letra.
colors:
  anden: "#f2f3f5"
  cartel: "#ffffff"
  cartel-2: "#f6f7f9"
  tinta: "#1b1f24"
  tenue: "#4a515a"
  via: "#d5d9de"
  borde: "#e3e6ea"
  comida: "#00a651"
  comida-t: "#007a3d"
  habitos: "#e2231a"
  habitos-t: "#c21b13"
  agua: "#00aeef"
  agua-t: "#00739e"
  sueno: "#7b3fa0"
  sueno-t: "#6d2e8e"
  peso: "#0067b1"
  peso-t: "#0067b1"
  premios: "#ffd600"
  premios-t: "#6b5200"
  animo: "#f28c00"
  animo-t: "#9c5300"
  activo: "#0067b1"
  alerta: "#c21b13"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "56px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.035em"
    fontFeature: "tnum"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 800
    lineHeight: 1.35
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.35
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.35
rounded:
  radio: "16px"
  radio-ch: "12px"
  pill: "99px"
  circulo: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  cartel:
    backgroundColor: "{colors.cartel}"
    rounded: "{rounded.radio}"
    padding: "16px"
  button-primario:
    backgroundColor: "{colors.activo}"
    textColor: "{colors.cartel}"
    typography: "{typography.title}"
    rounded: "{rounded.radio-ch}"
    padding: "0 18px"
    height: "50px"
  button-secundario:
    backgroundColor: "{colors.cartel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.radio-ch}"
    padding: "0 18px"
    height: "50px"
  button-chico:
    rounded: "{rounded.radio-ch}"
    padding: "0 14px"
    height: "38px"
  input:
    backgroundColor: "{colors.cartel-2}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.radio-ch}"
    padding: "10px 12px"
    height: "48px"
  letra:
    textColor: "{colors.cartel}"
    rounded: "{rounded.circulo}"
    size: "26px"
  nivel-chip:
    backgroundColor: "{colors.cartel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.pill}"
    padding: "4px 12px 4px 4px"
  tab:
    textColor: "{colors.tenue}"
    height: "50px"
  tab-activa:
    textColor: "{colors.activo}"
---

# Design System: Rumbo

## Overview

**Creative North Star: "El recorrido del Subte"**

Rumbo es señalética de Subte porteño puesta en un teléfono. El fondo es el andén, gris claro y quieto; encima cuelgan carteles blancos con esquina generosa y una sombra corta, como chapas atornilladas a la pared. Cada parte de la app es una línea: tiene un color y una letra en círculo, y ese par es lo único que identifica al módulo. No hay ilustraciones, no hay degradés, no hay tarjetas decorativas: el color aparece donde hay información de esa línea y en ningún otro lado.

La densidad es de uso diario con una mano. Los números importantes son grandes, negros y tabulares; todo lo demás es texto de sistema en negrita moderada. Lo que registrás se ve como estaciones que se encienden sobre una vía: es la firma de la app y se repite igual en comidas del día y en la semana de cada hábito.

El modo oscuro no es otro mundo, es el mismo andén de noche: fondo casi negro, carteles grafito, y las versiones de texto de cada línea se aclaran para mantener contraste.

**Key Characteristics:**
- Andén gris, carteles blancos de 16 px con sombra corta.
- Una línea por módulo: color + letra en círculo de 26 px.
- El recorrido (estaciones sobre una vía) como única firma gráfica.
- Grotesca del sistema, pesos 600 a 800, números tabulares.
- Íconos dibujados a un solo trazo de 2 px, sin relleno.

## Colors

Neutros fríos de andén y una paleta de líneas saturadas tomada del Subte, cada una con su versión oscura para texto.

### Primary
- **Azul Línea P** (`activo`, igual a `peso`): el color de interacción de toda la app. Pestaña activa, links, "Volver", foco, selección, botón primario cuando el cartel no tiene línea propia. Comparte valor con la línea Peso a propósito: el azul es la línea que "manda".

### Secondary
Las líneas. Cada una tiene un color de línea (`--comida`, `--habitos`, …) para superficies, vías y letras, y un color de texto (`--comida-t`, `--habitos-t`, …) que cumple AA sobre blanco.
- **Verde Línea C** (`comida` / `comida-t`): Comida. Letra C, barras de macros, recorrido de las cuatro comidas, botón "Agregar …" y el botón redondo de sumar.
- **Rojo Línea H** (`habitos` / `habitos-t`): Hábitos. Letra H, check circular de 3 px, barra de progreso del hábito, selector de íconos elegido.
- **Celeste Línea A** (`agua` / `agua-t`): Agua. Los vasos y su contador.
- **Violeta Línea S** (`sueno` / `sueno-t`): Sueño. Botón "Guardar sueño", horas cumplidas.
- **Azul Línea P** (`peso` / `peso-t`): Peso. Trazo del gráfico de tendencia.
- **Amarillo Línea N** (`premios` / `premios-t`): Premios y nivel. Círculo del nivel en Hoy, barra de XP. Sobre amarillo el texto es siempre tinta, nunca blanco.
- **Naranja Línea Á** (`animo` / `animo-t`): Ánimo y avisos suaves (fondo al 14 %).

### Neutral
- **Andén** (`anden`): fondo de la app y de `html`.
- **Cartel** (`cartel`): superficie de cada sección, botones secundarios, opciones.
- **Cartel 2** (`cartel-2`): fondo de campos, segmentos, cifras de macros, botones redondos de quitar.
- **Tinta** (`tinta`): texto principal y números.
- **Tenue** (`tenue`): texto secundario, etiquetas, íconos de fila, pestañas inactivas.
- **Vía** (`via`): vía y estaciones apagadas del recorrido, pistas de barras, logros bloqueados.
- **Borde** (`borde`): separadores de filas (1 px), bordes de controles (1.5 px).
- **Alerta** (`alerta`): errores y acciones destructivas. Mismo rojo que el texto de la línea H.

### Named Rules
**The Una Línea Un Color Rule.** Un color de línea solo aparece dentro de su módulo. Un hábito no tiene color propio: usa el rojo de H, salvo Agua, que usa A.

**The Texto Con -t Rule.** Para texto o fondo con texto blanco se usa la variante `-t` (`var(--lt)`); el color de línea pleno queda para vías, letras, rellenos y bordes gruesos. En oscuro, el botón primario invierte: fondo de línea pleno con texto `#0e1114`.

**The Solo Suma Rule.** No hay rojo de castigo. `alerta` marca errores de carga y acciones destructivas, nunca un día malo.

## Typography

**Display Font:** la grotesca del sistema (SF Pro en iPhone), con `system-ui`, Helvetica Neue y Arial de respaldo.
**Body Font:** la misma.

**Character:** tipografía de cartel: una sola familia, mucho peso (700–800) en lo que se lee de lejos y 600 en etiquetas. Los números siempre tabulares.

### Hierarchy
- **Display** (800, 56px, 1, -0.035em): la cifra protagonista de un cartel (kcal que quedan). Variantes en la misma voz: 44px en el plan, 40px en la medida de la bienvenida, 34px en horas de sueño.
- **Headline** (800, 34px, 1.05, -0.025em): "Hoy". Las subpantallas usan 30px / 1.1 / -0.02em y la bienvenida 32px.
- **Title** (800, 17px): título de cartel junto a la letra. Los h2 sin letra van a 700.
- **Body** (400–500, 17px, 1.35): texto y campos. La ayuda y los vacíos bajan a 15px / 1.45 en tenue.
- **Label** (600, 13px): etiquetas de campos, leyendas, subtítulos de fila. Por debajo: 12px / 700 para estaciones y nombres de macro, 11px / 600 en pestañas.

### Named Rules
**The Cifra Tabular Rule.** Todo número que se compara o cambia (kcal, macros, rachas, peso, XP, horas) lleva `font-variant-numeric: tabular-nums`.

**The Sin Mayúsculas Rule.** No hay texto en versalitas ni con tracking abierto. La jerarquía sale de tamaño y peso.

## Layout

Columna única de hasta 520px centrada, con 16px a los lados y el respeto del safe area arriba (más 12px) y abajo (más 100px para la barra de pestañas). Los carteles se apilan con 12px entre sí y 16px de padding interno. Dentro del cartel, las filas se separan con 1px de `borde` y 10–12px de aire; las grillas internas usan columnas `minmax(0, 1fr)` para que nada desborde en 402pt (macros en 3, campos en 2, días en 7, íconos en 6). La barra de pestañas es fija abajo, cinco columnas iguales, con fondo de cartel al 94 % y desenfoque.

El ritmo de espacio es 4 / 8 / 12 / 16 / 24px; 12px es el valor por defecto entre controles.

Objetivos táctiles: 44px mínimo en filas y checks, 50px en botones y pestañas, 36px en botones redondos secundarios.

## Elevation & Depth

Casi plano. Una sola sombra estructural (`--sombra`) separa los carteles del andén; en oscuro se reduce a un borde de luz mínimo porque el contraste ya lo da el tono. Fuera de eso, la profundidad es tonal: `cartel-2` dentro de `cartel`.

### Shadow Vocabulary
- **Cartel** (`box-shadow: 0 1px 2px rgb(27 31 36 / 6%), 0 6px 16px -6px rgb(27 31 36 / 10%)`): carteles, lista de avisos y el chip de nivel. En oscuro: `0 1px 2px rgb(0 0 0 / 30%)`.
- **Segmento elegido** (`box-shadow: 0 1px 3px rgb(27 31 36 / 15%)`): solo el segmento activo del control segmentado.

### Named Rules
**The Una Sombra Rule.** Solo cuelgan con sombra los carteles, la lista de avisos, el chip de nivel y el segmento elegido. Botones, campos y opciones se distinguen con borde de 1.5px, no con sombra.

## Shapes

Dos radios hacen todo el trabajo: 16px para carteles y bloques que ocupan el ancho, 12px para lo que se toca (botones, campos, opciones, segmentos). Todo lo que es estación, letra, check, contador o día es un círculo perfecto. El chip de nivel y los botones de aviso son píldoras. Los bordes de control van a 1.5px; los separadores a 1px. Los vasos de agua son la única silueta figurativa (borde de 3px sin tapa, base redondeada a 10px).

## Components

### Buttons
Grandes, llenos, de una sola intención.
- **Shape:** esquina suave (12px), alto mínimo 50px, ancho completo por defecto.
- **Primario:** fondo del color `-t` de la línea del cartel (`var(--lt, var(--activo))`), texto blanco 17px / 700. En oscuro, fondo de línea pleno con texto `#0e1114`.
- **Secundario:** fondo `cartel`, borde 1.5px `borde`, texto tinta. Con `.peligro` el texto pasa a `alerta`.
- **Chico:** 38px de alto, 15px, ancho automático.
- **Link:** texto azul `activo` 15px / 600, sin fondo.
- **Deshabilitado:** opacidad 0.4.
- **Foco:** contorno 2px `activo` con 2px de separación, en todo elemento.

### Chips
- **Nivel:** píldora blanca con sombra de cartel, círculo amarillo de 30px con el número y texto 13px / 700.
- **Segmentos:** riel `cartel-2` con 3px de padding; el elegido sube a `cartel` con la sombra de segmento.
- **Opciones grandes:** borde 1.5px, 12px de radio; la elegida toma borde y anillo interior `activo` y fondo `activo` al 10 %.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** `cartel`.
- **Shadow Strategy:** la sombra de cartel (ver Elevation & Depth).
- **Border:** ninguno. Las fichas internas de Ajustes usan borde 1.5px y 12px.
- **Internal Padding:** 16px.

### Inputs / Fields
- **Style:** fondo `cartel-2`, borde 1.5px `borde`, 12px de radio, 48px de alto, 17px / 500. La etiqueta va arriba en 13px / 600 tenue.
- **Focus:** el borde pasa a `activo`, sin contorno extra.
- **Medida grande:** 72px de alto con la cifra a 40px / 800.

### Navigation
Barra de pestañas fija abajo con cinco destinos (ícono de 24px sobre texto de 11px / 600). Inactivas en tenue, la activa en `activo`. Las subpantallas abren con "Volver" (chevron + texto azul) sobre un título de 30px.

### Letra de línea
Círculo de 26px con el color de la línea y la letra en blanco 14px / 800 (en Premios, tinta). Precede al título de cada cartel de módulo. Logro bloqueado: círculo `via` con letra tenue.

### El recorrido (firma)
Una lista horizontal de estaciones en grilla de N columnas iguales. Cada estación es un anillo de 28px con borde de 6px sobre `cartel`; la vía es una barra de 6px en `via`.
- **Hecha:** anillo en el color de la línea, escala 1.
- **Próxima:** anillo punteado en el color de la línea.
- **Pendiente:** anillo `via`, escala 0.82.
- **Fuera (día que no toca):** estación cerrada, punto `via` al 45 %.
- **Vía:** se ilumina con el color de la línea solo entre dos estaciones hechas.
- **Compacto:** anillo 18px / borde 4px, vía 4px, rótulo 11px (semana de un hábito).
- **Movimiento:** la estación crece con `cubic-bezier(0.16, 1, 0.3, 1)` en 500ms; la vía cambia de color en 300ms.
La barra de pasos de la bienvenida usa la misma gramática en azul `activo` con anillos de 16px.

### Check de hábito
Círculo de 44px con borde de 3px en rojo H; marcado se llena de rojo con tilde blanca.

### Barra de meta
Nombre 12px / 700 tenue, cifra en tinta 17px tabular sobre "/ meta", pista de 6px en `via` con relleno del color de la línea.

### Íconos
SVG 24×24 en un solo trazo de 2px, `currentColor`, extremos y uniones redondeados, sin relleno (la estrella de favorito es la única que se rellena). El "+" de sumar usa 3.2px.

## Do's and Don'ts

### Do:
- **Do** poner cada sección en un cartel blanco de 16px con la sombra de cartel sobre el andén.
- **Do** abrir cada cartel de módulo con su letra en círculo de 26px y el título a 17px / 800.
- **Do** usar el recorrido para cualquier secuencia de registros del día o de la semana, con la vía encendida solo entre estaciones hechas.
- **Do** usar la variante `-t` de la línea para texto y botones primarios; el color pleno para vías, letras y rellenos.
- **Do** dibujar íconos nuevos a un trazo de 2px en caja de 24px.
- **Do** mantener 44px mínimos de área táctil y números tabulares.

### Don't:
- **Don't** darle a un hábito un color propio fuera de la línea H (salvo Agua, línea A).
- **Don't** usar emojis ni glifos tipográficos como íconos.
- **Don't** usar un color de línea fuera de su módulo ni como decoración.
- **Don't** usar rojo para marcar un día incumplido; los huecos no se castigan.
- **Don't** elevar botones, campos u opciones con sombra; se distinguen con borde de 1.5px.
- **Don't** usar texto en versalitas con tracking abierto como rótulo sobre los títulos.
