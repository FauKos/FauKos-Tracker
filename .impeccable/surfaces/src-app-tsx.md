---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/index.css"]
---

# App Rumbo (todas las pantallas)

Modo: Operate. Una sola persona, iPhone 17 Pro (402 × 874 pt), uso diario en momentos cortos. Lo primero: comidas y macros; después hábitos y rachas. El perfil (sexo, edad, altura, peso, actividad, objetivo) se pide en la bienvenida y vive en Más > Mi perfil.

## Direction contract

THESIS: Tu día como un recorrido del Subte porteño: cada parte de la app es una línea con su color y su letra, y lo que registrás enciende estaciones. Rechaza el tablero genérico de tarjetas iguales con anillos.

OWN-WORLD: Andén gris claro (#F4F5F7) con carteles blancos de esquina 16 px y sombra corta. Cada módulo tiene color de línea y una letra en círculo: Comida C verde (#00A651, texto #007A3D), Hábitos H rojo (#E2231A, texto #C21B13), Agua A celeste (#00AEEF, texto #00739E), Sueño S violeta (#6D2E8E), Peso P azul (#0067B1), Premios N amarillo (#FFD600, texto oscuro), Ánimo Á naranja (#F28C00; texto y selección #9C5300). Los hábitos no tienen color propio: usan el rojo de la línea H, salvo Agua, que usa su línea A. En el recorrido, la vía se ilumina solo entre dos estaciones hechas, y los días que un hábito no toca son estaciones cerradas. Tipografía de cartel: la grotesca del sistema (SF Pro), negrita, números tabulares; tinta #1B1F24. Íconos dibujados, un solo trazo de 2 px.

STORY: Al abrir sabés cuánto te queda por comer y cuál es la próxima comida; un toque la agrega. Debajo, los hábitos de hoy con su check. Cada número dice de dónde sale.

FIRST VIEWPORT: Arriba, fecha chica y "Hoy" a 34 px a la izquierda; a la derecha, el nivel en un círculo amarillo. Cartel de Comida: letra C, kcal que quedan a 56 px, tres macros con barra fina, el recorrido de cuatro estaciones (desayuno, almuerzo, merienda, cena) y el botón verde "Agregar merienda". Cartel de Hábitos: letra H, racha, filas con check rojo y contador de agua. Barra de pestañas con íconos; la activa en azul.

FORM: dirección propia, puesto 1 de mi lista (elegida por el usuario como pick). seed:271797902567769c

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Firma

El recorrido: una línea horizontal con estaciones en círculo que se encienden con el color del módulo. Se usa en las comidas del día y en la semana de cada hábito (lunes a domingo), siempre igual.

## Pendiente

- El usuario reportó elementos que se cruzan en su iPhone; sin capturas todavía. Arreglo aplicado en CSS, sin verificar en Safari de iOS.
