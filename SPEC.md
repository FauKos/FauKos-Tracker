# Rumbo — Especificación funcional

> App personal para organizar la vida en un solo lugar: hábitos, cuerpo, nutrición, sueño, entrenamiento, finanzas y objetivos, con un sistema de recompensas para que no sea monótono.
>
> "Rumbo" es un nombre de trabajo; se puede cambiar.
>
> Este documento define **qué hace la app y con qué reglas**. Las decisiones técnicas finales se toman al construir; la sección 17 trae una propuesta inicial.

---

## Índice

1. Principios
2. Conceptos globales
3. Pantalla Hoy
4. Hábitos (incluye agua, creatina, gimnasio)
5. Sueño
6. Peso y medidas
7. Nutrición (estilo Fitia)
8. Entrenamiento
9. Ánimo y energía
10. Stock de suplementos
11. Finanzas (ingresos, gastos, importación, ahorro)
12. Objetivos
13. Recompensas (XP, niveles, logros, tienda, desafíos)
14. Insights cruzados
15. Resúmenes (semanal, mensual, anual)
16. Ajustes, backup y privacidad
17. Propuesta técnica
18. Fases de desarrollo
19. Modelo de datos (resumen)

---

## 1. Principios

1. **Rápido de cargar.** Cualquier registro diario debe hacerse en 1-3 toques. Si algo es tedioso de cargar, no se va a usar.
2. **Todo en el celular.** Uso personal, un solo usuario, iPhone. Los datos viven en el dispositivo (local-first). Nada se sube a servidores salvo lo estrictamente necesario (cotización del dólar, búsqueda de códigos de barras).
3. **Solo suma, nunca castiga.** Un mal día no resta puntos ni muestra mensajes negativos; simplemente no suma.
4. **Todo conectado.** La gracia de tener todo junto es cruzar datos (insights, objetivos vinculados, logros).
5. **Argentina primero.** Pesos y dólares, inflación, aguinaldo, cuotas, Galicia, Mercado Pago, comidas argentinas.
6. **Crecer por fases.** Se construye de a partes y cada fase tiene que ser usable por sí misma.

---

## 2. Conceptos globales

### 2.1 Corte del día
- Configurable, por defecto **04:00**.
- Todo lo registrado entre 00:00 y 03:59 cuenta para el día anterior.
- Función central: `diaLogico(fechaHora) → fecha`. **Todos** los módulos la usan para asignar fechas.

### 2.2 Unidades y moneda
- Sistema métrico (kg, cm, g, ml).
- Moneda base: **ARS**. Moneda secundaria de referencia: **USD**.
- Formato argentino: `$ 12.345,67`, fechas `dd/mm/aaaa`, semana de lunes a domingo.

### 2.3 "Lo normal" (línea base)
- Para comparar ("gastaste menos de lo normal"), la línea base de cualquier métrica es el **promedio de los 3 meses calendario completos anteriores**.
- Si hay menos de 1 mes completo de datos, no se muestran comparaciones.
- Una diferencia se considera relevante si supera **±10%**.

### 2.4 Rachas (regla común)
- **Racha diaria:** cantidad de días lógicos consecutivos con el objetivo cumplido.
- El día de hoy **no rompe** la racha mientras no haya terminado; si hoy ya está cumplido, suma.
- **Racha semanal:** semanas consecutivas (lunes a domingo) con el objetivo semanal cumplido. La semana en curso no rompe la racha.
- Se guarda la **racha actual** y la **mejor racha histórica**.
- **Comodines** y **modo pausa**: ver sección 13.6.

---

## 3. Pantalla Hoy

Pantalla principal. Al abrir la app se ve esto.

**Arriba**
- Saludo + fecha + nivel y barra de XP.
- Aviso del día si corresponde ("Hoy cobrás el sueldo", "Te quedan 4 días de creatina", "Nuevo logro").

**Bloques (orden configurable, se pueden ocultar)**
1. **Hábitos de hoy:** lista de pendientes y hechos. Check con un toque; los de cantidad tienen `+` y `−`.
2. **Agua:** contador visual de vasos contra la meta.
3. **Sueño de anoche:** horas dormidas vs. meta. Si no está cargado, botón "Cargar sueño" con horarios habituales precargados.
4. **Nutrición:** barras de proteína, carbos, grasas y calorías vs. meta; botón "Agregar comida".
5. **Entrenamiento:** si hoy toca rutina, botón "Empezar entrenamiento".
6. **Ánimo y energía:** dos selectores 1-5.
7. **Peso:** botón rápido "Registrar peso" y tendencia actual.
8. **Plata del mes:** gastado / ingresado / disponible proyectado + botón "Agregar gasto".
9. **Desafío de la semana** con progreso.

**Indicador de día perfecto:** si todos los hábitos del día están cumplidos, se muestra una celebración breve y el bonus de XP.

---

## 4. Hábitos

### 4.1 Definición de un hábito
| Campo | Detalle |
|---|---|
| nombre | "Creatina", "Agua", "Gimnasio", "Leer" |
| ícono / color | elegible |
| tipo | `check` (sí/no) o `cantidad` |
| meta | para `cantidad`: número (ej. 8). Para `check`: 1 |
| unidad | "vasos", "páginas", "min" |
| incremento | cuánto suma cada toque (ej. 1 vaso, 250 ml) |
| frecuencia | `diaria` / `x_por_semana` (ej. 4) / `dias_fijos` (ej. lun-mié-vie) |
| recordatorio | hora opcional |
| activo / archivado | archivar no borra el historial |
| vinculo | opcional: el hábito se completa solo desde otro módulo (ej. "Gimnasio" se marca al terminar un entrenamiento; "Creatina" descuenta stock) |

### 4.2 Registro
- `RegistroHabito { habitoId, fecha (día lógico), valor, nota?, creadoEn }`
- Un registro por hábito por día; los toques modifican el valor.
- Se puede editar días pasados (hasta 7 días atrás sin restricciones; más atrás, con confirmación).

### 4.3 Reglas de cumplimiento
- `diaria`: cumplido si `valor >= meta`.
- `dias_fijos`: solo se evalúa en los días elegidos; los demás días no cuentan ni rompen.
- `x_por_semana`: cada día con `valor >= meta` suma 1 a la semana; la semana se cumple al llegar a X. Racha semanal.

### 4.4 Hábitos precargados (editables)
- **Agua:** cantidad, meta 8 vasos (250 ml), diaria.
- **Creatina:** check, diaria, vinculada a stock de suplementos.
- **Gimnasio:** check, 4 por semana, vinculada a entrenamiento.

### 4.5 Recordatorios
- En v1 los recordatorios se resuelven con **Recordatorios del iPhone** (se configuran aparte).
- Si la tecnología lo permite, notificaciones propias más adelante (ver 17.4).

---

## 5. Sueño

### 5.1 Registro
| Campo | Detalle |
|---|---|
| acostado | fecha y hora |
| levantado | fecha y hora |
| duración | calculada: `levantado − acostado`, maneja cruce de medianoche (00:30 → 08:00 = 7 h 30 min) |
| calidad | opcional, 1-5 |
| nota | opcional |

- El registro se asigna a la **fecha del día en que te levantás**.
- Carga rápida: la app propone tu **horario habitual** (mediana de los últimos 14 registros) y solo se confirma o ajusta.
- Validaciones: duración entre 1 h y 16 h; si no, pedir confirmación.
- Siestas: registro opcional aparte, no cuenta para la meta nocturna.

### 5.2 Meta y racha
- Meta configurable (por defecto 7 h 30 min). Cumplido si `duración >= meta`. Tiene racha diaria.

### 5.3 Métricas
- Promedio de horas y de calidad (7 días, 30 días).
- **Regularidad:** desvío estándar de la hora de acostarse en los últimos 14 días. Se muestra como "muy regular" (< 30 min), "regular" (30-60 min) o "irregular" (> 60 min).
- Deuda de sueño de la semana: suma de `(meta − duración)` en los días por debajo de la meta.

### 5.4 Futuro
- Importar sueño desde Apple Salud (requiere app nativa).

---

## 6. Peso y medidas

### 6.1 Registro
- `RegistroPeso { fecha, kg, nota? }`. Recomendación en la app: pesarse a la mañana, en ayunas, después del baño.
- `RegistroMedidas { fecha, cintura?, cadera?, pecho?, brazo?, muslo?, grasaPct? }` (cm / %).

### 6.2 Tendencia
- El peso diario fluctúa 1-2 kg por agua y comida; la métrica principal es la **tendencia**:
  - **Media móvil de 7 días** sobre los registros existentes (si faltan días, se promedian los disponibles en la ventana, mínimo 3).
- Se muestran: peso del día, tendencia, cambio de tendencia en 7 y 30 días.

### 6.3 Meta
- Peso objetivo + ritmo semanal (ej. −0,5 kg/semana).
- Fecha estimada de llegada según el ritmo real de la tendencia.
- Aviso suave si el ritmo es muy agresivo: pérdida > 1% del peso por semana.

---

## 7. Nutrición (estilo Fitia)

### 7.1 Perfil
- Sexo, fecha de nacimiento, altura, nivel de actividad, objetivo (`definir`, `mantener`, `volumen`).

### 7.2 Cálculo inicial de calorías
**Metabolismo basal (Mifflin-St Jeor):**
- Hombre: `10 × kg + 6,25 × cm − 5 × edad + 5`
- Mujer: `10 × kg + 6,25 × cm − 5 × edad − 161`

**Gasto diario (TDEE) = basal × factor de actividad:**
| Nivel | Factor |
|---|---|
| Sedentario | 1,2 |
| Ligero (1-3 entrenamientos/semana) | 1,375 |
| Moderado (3-5) | 1,55 |
| Alto (6-7) | 1,725 |
| Muy alto (trabajo físico + entreno) | 1,9 |

**Meta de calorías según objetivo:**
- Definir: TDEE − 400 (rango configurable 300-500)
- Mantener: TDEE
- Volumen: TDEE + 250 (rango configurable 200-300)

**Reparto de macros (por defecto, editable):**
- Proteína: **2,0 g/kg** (rango 1,6-2,2)
- Grasas: **0,8 g/kg** (mínimo 0,6)
- Carbos: el resto de las calorías
- Calorías por gramo: proteína 4, carbos 4, grasas 9

### 7.3 TDEE adaptativo
Después de 14 días con datos, el gasto se recalibra con datos reales:

```
ventana        = últimos 21 días (mínimo 14)
requisito      = ≥ 80% de los días con comidas registradas y ≥ 8 pesajes en la ventana
kcalPromedio   = promedio de calorías de los días registrados
deltaTendencia = tendencia(final) − tendencia(inicio)   [kg]
tdeeObservado  = kcalPromedio − (deltaTendencia × 7700 / días)
tdeeNuevo      = 0,7 × tdeeAnterior + 0,3 × tdeeObservado   (suavizado)
```
- Se recalcula una vez por semana (lunes).
- Cambio máximo por recálculo: ±150 kcal.
- Se le muestra al usuario: "Tu gasto real parece ser 2.640 kcal (antes 2.500). ¿Actualizar tus metas?". Nunca se cambia sin confirmar.

### 7.4 Alimentos
| Campo | Detalle |
|---|---|
| nombre, marca? | |
| base | macros cada 100 g (o 100 ml) |
| porciones caseras | lista: "1 unidad = 120 g", "1 plato = 300 g", "1 cda = 15 g" |
| origen | `propio`, `base_argentina`, `open_food_facts` |
| codigoBarras? | |
| favorito | |

- **Base argentina precargada:** milanesa (de carne, de pollo), empanada (carne, jamón y queso, pollo), medialuna, dulce de leche, mate cocido, choripán, tarta, ñoquis, pizza (porción), asado (cortes comunes), facturas, alfajor, etc., con porciones caseras.
- **Recetas:** alimento compuesto por ingredientes + cantidades; macros calculados solos; se define en cuántas porciones rinde.

### 7.5 Registro de comidas
- `RegistroComida { fecha, momento (desayuno/almuerzo/merienda/cena/snack), alimentoId, cantidad, unidad }`
- **Carga rápida:**
  - Buscador con resultados priorizados: recientes > favoritos > propios > base.
  - **Comidas frecuentes:** combos guardados ("desayuno de siempre") que se cargan con un toque.
  - **Copiar comida/día anterior.**
  - **Escáner de código de barras** (cámara) contra Open Food Facts; si no existe el producto, se carga a mano desde la etiqueta y queda guardado.
- Vista del día: totales por momento y del día vs. metas, con barras.

### 7.6 Plan de comidas sugerido (v4)
- Genera un día que cierre las metas de macros usando **alimentos que ya comés** (frecuentes y favoritos).
- Algoritmo simple: elegir comidas frecuentes por momento y ajustar porciones para minimizar la diferencia con las metas (proteína primero).

### 7.7 Foto de comida con IA (futuro)
- Foto → estimación de alimentos y macros → el usuario confirma o corrige. Depende de una API paga; última fase.

---

## 8. Entrenamiento

### 8.1 Ejercicios
- `Ejercicio { nombre, grupoMuscular, tipo (peso/peso corporal/tiempo/distancia), notas? }`
- Lista inicial con los ejercicios más comunes de gimnasio; se pueden agregar propios.

### 8.2 Rutinas
- `Rutina { nombre ("Push", "Piernas"), ejercicios: [{ ejercicioId, seriesObjetivo, repsObjetivo (ej. "8-10"), descansoSeg }] }`
- Plan semanal opcional: qué rutina toca cada día. La pantalla Hoy muestra la del día.

### 8.3 Sesión de entrenamiento
- Al empezar: se muestra la rutina con **lo que hiciste la última vez** en cada ejercicio (peso × reps).
- Por cada serie: peso, repeticiones, check. Temporizador de descanso automático al completar una serie.
- Se pueden agregar, quitar o reordenar ejercicios en la sesión.
- Al terminar: duración, volumen total (Σ peso × reps), récords nuevos. Marca automáticamente el hábito **Gimnasio**.

### 8.4 Progresión
- Regla de sugerencia (doble progresión): si en la última sesión se completaron **todas** las series en el **tope** del rango de reps, sugerir **+2,5 kg** (ejercicios de tren inferior: +5 kg). Si no, mantener el peso y buscar más reps.

### 8.5 Récords personales
- Por ejercicio: máximo peso levantado, máximas reps con un peso dado y **1RM estimado** (fórmula de Epley: `peso × (1 + reps / 30)`).
- Un récord nuevo dispara celebración + logro.

### 8.6 Historial
- Gráfico por ejercicio (1RM estimado en el tiempo), volumen semanal por grupo muscular, sesiones por semana.

---

## 9. Ánimo y energía

- `RegistroAnimo { fecha, animo (1-5), energia (1-5), nota? }`
- Carga en 5 segundos desde Hoy. Uno por día (se puede editar).
- Vista: calendario coloreado por ánimo y promedios semanales.
- Su valor principal es alimentar los **insights** (sección 14).

---

## 10. Stock de suplementos

- `Suplemento { nombre, presentacion (g/cápsulas/ml), cantidadEnvase, dosisDiaria, stockActual, avisarConDias (por defecto 5), habitoId? }`
- Si está vinculado a un hábito (ej. Creatina), **cada check descuenta la dosis** del stock; desmarcar la devuelve.
- `diasRestantes = floor(stockActual / dosisDiaria)`.
- Aviso en Hoy cuando `diasRestantes <= avisarConDias`.
- Botón "Compré un envase nuevo": suma `cantidadEnvase` al stock y, opcionalmente, crea el gasto en Finanzas (categoría Suplementos).

---

## 11. Finanzas

### 11.1 Cuentas
- `Cuenta { nombre ("Galicia caja de ahorro", "Mercado Pago", "Visa Galicia", "Efectivo"), tipo (banco/billetera/tarjeta_credito/efectivo), moneda (ARS/USD) }`

### 11.2 Movimientos
| Campo | Detalle |
|---|---|
| fecha | |
| cuentaId | |
| tipo | `gasto`, `ingreso`, `transferencia_propia`, `pago_tarjeta` |
| monto, moneda | |
| montoUsd | calculado con la cotización del día (11.8) |
| categoriaId | |
| descripcion, nota | |
| origen | `manual`, `importado`, `fijo_automatico`, `cuota` |
| compraEnCuotasId? | si es una cuota |

- **Solo `gasto` e `ingreso` cuentan** en los totales. Las transferencias entre cuentas propias y el pago del resumen de la tarjeta **no** son gastos.
- Carga manual rápida: monto → categoría (las más usadas primero) → listo. Cuenta y fecha por defecto: la última usada y hoy.

### 11.3 Categorías
- Editables, con ícono y color. Iniciales:
  - **Gastos:** Supermercado, Comida afuera/Delivery, Transporte, Alquiler/Expensas, Servicios, Gimnasio, Suplementos, Salud, Ropa, Salidas, Suscripciones, Educación, Regalos, Otros.
  - **Ingresos:** Sueldo, Aguinaldo, Freelance/Extras, Ventas, Reintegros, Otros.
- **Presupuesto mensual** opcional por categoría. Aviso al llegar al 80% y al 100%.

### 11.4 Ingresos
- **Fijos (sueldo):** monto esperado y día de cobro. Se genera un ingreso "esperado" cada mes; el usuario confirma el monto real (o se confirma solo al importar un resumen que lo contenga).
- **Aguinaldo (SAC):** activable. Se espera en **junio** y **diciembre** por el 50% del mejor sueldo del semestre. Se confirma igual que el sueldo.
- **Variables:** freelance, extras, ventas; se cargan a mano o se detectan al importar.
- **En dólares:** se registran en USD con la cotización del día; se ven también en pesos.
- **Métricas:**
  - Ingreso del mes: cobrado + por cobrar.
  - Evolución del ingreso en USD y en pesos ajustados por inflación ("tu sueldo real subió/bajó X% en el año").
  - Proporción por fuente (sueldo vs. extras).

### 11.5 Gastos fijos y suscripciones
- `GastoFijo { descripcion, monto, categoriaId, cuentaId, diaDelMes, activo }` → genera el gasto cada mes (confirmable).
- **Detección automática** en datos importados: misma descripción normalizada, monto similar (±15%) en ≥ 3 meses seguidos → se propone como gasto fijo.
- Vista de suscripciones con el total mensual y anual ("Suscripciones: $X/mes = $Y/año").

### 11.6 Compras en cuotas
- `CompraEnCuotas { descripcion, montoTotal, cantidadCuotas, montoCuota, primeraCuota (mes), cuentaId, categoriaId }`
- Genera un movimiento `gasto` por mes con `origen: cuota` ("Zapatillas 2/6").
- Vista de **cuotas pendientes**: cuánto tenés comprometido en los próximos meses.
- Al importar resúmenes de tarjeta, una línea del tipo "CUOTA 02/06" se vincula con la cuota ya generada (no se duplica).

### 11.7 Proyección del mes
```
disponibleProyectado = ingresosCobrados + ingresosPorCobrar
                     − gastosRealizados − gastosFijosPendientes − cuotasPendientesDelMes
```

### 11.8 Doble moneda e inflación
- Cotización diaria del dólar desde una fuente pública (a definir en la implementación, ej. una API de cotizaciones argentinas). El usuario elige la referencia: **oficial, MEP o blue**.
- Se guarda la cotización usada en cada movimiento (no cambia retroactivamente).
- Si no hay conexión, se usa la última cotización guardada.
- Inflación: índice mensual (IPC) para ajustar comparaciones en pesos. Fuente a definir; si no hay fuente automática, carga manual mensual.
- En los gráficos de evolución se puede alternar entre **pesos nominales, pesos ajustados y dólares**.

### 11.9 Importación de resúmenes (Galicia y Mercado Pago)

**Formatos soportados (prioridad)**
1. Excel / CSV (más confiable).
2. PDF (requiere extraer texto; parser específico por banco y tipo de resumen).

Fuentes iniciales:
- **Galicia:** movimientos de cuenta y resúmenes de tarjeta de crédito.
- **Mercado Pago:** reporte de actividad / movimientos.

Se pedirán archivos reales de ejemplo para escribir y probar cada parser.

**Flujo**
1. El usuario elige el archivo y la cuenta a la que corresponde.
2. **Parseo:** se extraen fecha, descripción, monto (y cuotas si las hay).
3. **Normalización:** descripción en mayúsculas sin números de operación ni espacios repetidos.
4. **Clasificación del tipo:**
   - Pago del resumen de tarjeta ("PAGO TARJETA", "PAGO VISA"…) → `pago_tarjeta`.
   - **Transferencia propia:** misma cifra con signo opuesto en otra cuenta del usuario con ±2 días de diferencia, o descripción con el nombre/CUIT del propio usuario → `transferencia_propia`.
   - Créditos → `ingreso`; débitos → `gasto`.
5. **Categorización automática** por reglas: `{ patron (texto contenido), categoriaId }`. Reglas iniciales (RAPPI, PEDIDOSYA → Delivery; SUBE, UBER, CABIFY → Transporte; COTO, CARREFOUR, DIA, JUMBO → Supermercado; NETFLIX, SPOTIFY → Suscripciones; etc.). Cuando el usuario corrige una categoría, se ofrece "¿Aplicar a todos los movimientos de este comercio y a los futuros?" y se crea la regla.
6. **Deduplicación:** clave = cuenta + fecha + monto + descripción normalizada. Si ya existe, se omite. Permite reimportar el mismo período sin duplicar.
7. **Revisión previa:** pantalla con totales detectados, movimientos sin categoría y transferencias detectadas, para confirmar antes de guardar.
8. **Guardado** y, si es la primera importación con varios meses, se abre directamente el **resumen anual** (15.3).

Todo el procesamiento ocurre en el celular. Los archivos no se suben a ningún servidor.

### 11.10 Ahorro

**Cálculos base (últimos 3-6 meses completos disponibles)**
```
ingresoPromedio  = promedio mensual de ingresos
gastoFijo        = promedio mensual de gastos fijos + cuotas
gastoVariable    = promedio mensual del resto de los gastos
ahorroReal       = ingreso − gastos (por mes)
tasaActual       = promedio(ahorroReal) / ingresoPromedio
```

**Sugerencia de ahorro (progresiva)**
- Si `tasaActual < 0`: el primer objetivo es **llegar a equilibrio** (gastar ≤ lo que entra). La app muestra en qué categorías te pasaste respecto de tu propio promedio.
- Si `tasaActual >= 0`: `tasaSugerida = min(tasaActual + 5 puntos, 30%)`.
- Cuando se cumple la tasa sugerida 2 meses seguidos, se propone subir otros 2-5 puntos.
- **Ingresos extraordinarios** (aguinaldo, extras que superen el 20% del ingreso promedio): se sugiere separar el **50%** de ese excedente.

**Prioridades sugeridas**
1. **Fondo de emergencia:** meta = 3 meses de `gastoFijo + gastoVariable` (configurable hasta 6). Se muestra el progreso.
2. **Alcancías:** metas propias.

**Alcancías**
- `Alcancia { nombre ("Viaje", "Auto"), meta, moneda (ARS/USD), fechaObjetivo?, saldo }`
- Aporte manual ("separé $X para el viaje"). Cuánto hay que aportar por mes para llegar a la fecha.

**De dónde sacar el ahorro**
- Detecta categorías con gasto por encima de tu línea base y lo traduce a plata: "Si bajás Delivery a tu promedio de marzo, ahorrás $X por mes".

> La app sugiere **cuánto** separar, no **en qué invertir**.

---

## 12. Objetivos

- `Objetivo { nombre, tipo (vinculado/manual), metrica?, meta, desde, hasta, progreso, estado }`
- **Vinculados** (se actualizan solos):
  - Hábitos: "Ir 16 veces al gimnasio en noviembre", "30 días de creatina".
  - Sueño: "Promedio de 7,5 h este mes".
  - Peso: "Llegar a 78 kg (tendencia)".
  - Entrenamiento: "Press de banca 100 kg (1RM estimado)".
  - Finanzas: "Ahorrar $X este mes", "Completar fondo de emergencia", "Gastar menos de $X en Delivery".
  - Nutrición: "Meta de proteína 25 de 30 días".
- **Manuales:** progreso actualizado a mano ("Leer 12 libros").
- Muestra progreso %, ritmo necesario ("te faltan 6 idas en 9 días") y estado: `en curso`, `cumplido`, `vencido`.
- Cumplir un objetivo da XP y celebración.

---

## 13. Recompensas

### 13.1 XP
| Acción | XP |
|---|---|
| Hábito cumplido | 10 |
| Día perfecto (todos los hábitos del día) | +50 |
| Registrar sueño | 5 |
| Registrar todas las comidas del día | 15 |
| Meta de proteína cumplida | 10 |
| Registrar peso | 5 |
| Entrenamiento completado | 30 |
| Récord personal | 50 |
| Registro de ánimo | 5 |
| Semana de gimnasio completa | +100 |
| Mes por debajo del gasto normal | +200 |
| Ahorro sugerido cumplido en el mes | +200 |
| Desafío semanal completado | +150 |
| Objetivo cumplido | +300 |
| Logro desbloqueado | según el logro (50-500) |

- Desmarcar algo resta el XP que había sumado (corrección, no castigo).
- Los puntos de la tienda (13.4) son los mismos XP acumulados, separados en **XP total** (nivel) y **saldo canjeable** (se descuenta al canjear).

### 13.2 Niveles
- XP necesario para pasar del nivel `n` al `n+1`: `100 × n^1,5` (redondeado).
- Nombre por tramos opcional (Principiante, Constante, Disciplinado, Imparable, Leyenda).

### 13.3 Logros
Se evalúan en segundo plano después de cada registro. Ejemplos iniciales:
- **Rachas:** 7, 30, 100, 365 días de cualquier hábito.
- **Gimnasio:** 10, 50, 100, 250 entrenamientos; 4 semanas seguidas cumpliendo la frecuencia.
- **Fuerza:** primer récord personal; 10 récords.
- **Nutrición:** 30 días registrando comidas; proteína cumplida 7 días seguidos / 30 días.
- **Agua:** 30 días con la meta de agua.
- **Sueño:** una semana entera con la meta; un mes "muy regular".
- **Peso:** primeros −2 kg / −5 kg / −10 kg (o +, según el objetivo); meta de peso alcanzada.
- **Plata:** "Mes austero" (gasto < línea base −10%); fondo de emergencia completo; 3 meses seguidos con el ahorro sugerido; primera alcancía completa.
- **Constancia:** 30 días seguidos abriendo la app y registrando algo.
- **Raros:** "Mes perfecto" (todos los hábitos todos los días del mes).

Cada logro: nombre, descripción, ícono, XP, fecha de desbloqueo. Los no desbloqueados se ven como bloqueados con su condición.

### 13.4 Tienda de recompensas reales
- `Recompensa { nombre ("Cena afuera"), costo (puntos), ícono, repetible }`
- El usuario carga sus propios premios. Al tener saldo, "Canjear" descuenta los puntos y queda en el historial.
- Opcional: al canjear, crear el gasto en Finanzas.

### 13.5 Desafíos semanales
- Cada lunes la app propone **1 desafío** basado en el punto más débil de la semana anterior (el hábito o métrica con menor cumplimiento). Ejemplos: "Meta de agua los 7 días", "3 noches con 7,5 h", "Proteína 5 de 7 días", "Gastar menos de $X en Delivery".
- El usuario puede aceptarlo, cambiarlo por otro (1 vez) o ignorarlo.

### 13.6 Comodines y modo pausa
- **Comodín:** se gana 1 por cada 7 días de racha (máximo 3 acumulados). Si un día no se cumple un hábito, se puede usar un comodín para que la racha no se corte. Se usa manualmente (o automáticamente, configurable).
- **Modo pausa** (vacaciones/enfermedad): se activa por un rango de fechas; durante la pausa las rachas y metas no se evalúan y nada se rompe.

---

## 14. Insights cruzados

### 14.1 Cómo se calculan
- Para cada par de métricas diarias definidas, se separan los días en dos grupos y se comparan los promedios.
- Pares iniciales:
  - Entrenó (sí/no) → horas de sueño esa noche, energía al día siguiente.
  - Durmió < 6 h (sí/no) → calorías del día siguiente, ánimo, energía.
  - Cumplió proteína (sí/no) → energía.
  - Día de semana → gasto total, gasto en Delivery/Salidas.
  - Agua cumplida → energía.
  - Tendencia de peso → calorías promedio (ya cubierto por TDEE).
- **Condiciones para mostrar un insight:**
  - Al menos **8 días en cada grupo** (últimos 60 días).
  - Diferencia relativa ≥ **10%** (o ≥ 20 min en sueño).
- Lenguaje: siempre como **relación**, no causa ("Los días que entrenás dormís 35 min más").

### 14.2 Dónde se ven
- Pantalla **Insights** con la lista ordenada por tamaño de la diferencia.
- 1 insight destacado en la revisión semanal y en el resumen mensual.

---

## 15. Resúmenes

### 15.1 Revisión semanal (domingos)
- Semana en números: hábitos cumplidos (%), rachas, sueño promedio, entrenamientos, peso (cambio de tendencia), proteína cumplida (días), gasto de la semana vs. promedio.
- Logros de la semana e insight destacado.
- Desafío propuesto para la semana siguiente.
- Campo de texto: "¿Qué querés mejorar?". Se guarda y se muestra el domingo siguiente.

### 15.2 Resumen mensual (día 1)
Pantalla tipo "Wrapped", en tarjetas deslizables:
- XP ganado y nivel.
- Récords del mes (mejor racha, más pesado levantado, mejor semana de sueño).
- Comparaciones contra la línea base ("gastaste 18% menos que lo normal", "dormiste 40 min más por noche").
- Logros nuevos.
- Plata: ingreso, gasto, ahorro, tasa de ahorro vs. sugerida.
- Título del mes según lo destacado: "Mes de hierro" (gimnasio), "Mes ahorrador" (gasto bajo), "Mes descansado" (sueño), "Mes perfecto".

### 15.3 Resumen anual ("Tu 2026")
Se puede abrir en cualquier momento y se abre automáticamente después de importar varios meses de resúmenes.
- **Plata:** ingreso, gasto y ahorro por mes (ARS / ajustado / USD), totales del año, mejor y peor mes, top categorías y su evolución, gastos hormiga ("$X en Delivery en el año"), suscripciones detectadas y su costo anual, cuotas pagadas.
- **Cuerpo y hábitos** (cuando haya datos): entrenamientos del año, récords, cambio de peso, horas de sueño promedio, mejores rachas, logros.

---

## 16. Ajustes, backup y privacidad

### 16.1 Ajustes
- Perfil (nombre, sexo, nacimiento, altura, actividad, objetivo).
- Corte del día, comienzo de semana (lunes).
- Hábitos: crear, editar, ordenar, archivar.
- Metas: agua, sueño, macros, peso.
- Finanzas: cuentas, categorías, presupuestos, gastos fijos, sueldo y aguinaldo, tipo de dólar de referencia.
- Recompensas: premios de la tienda, comodines automáticos o manuales.
- Bloques visibles en Hoy y su orden.
- Tema claro / oscuro / sistema.

### 16.2 Backup
- **Exportar todo** a un archivo JSON (con versión de esquema), para guardarlo en Archivos / iCloud Drive.
- **Importar backup** (reemplaza o fusiona, con confirmación).
- **Recordatorio de backup** semanal en Hoy si pasaron más de 7 días del último.
- Exportar finanzas a CSV.
- Futuro: backup automático a la nube.

### 16.3 Privacidad y seguridad
- Todo local. Sin cuentas ni servidores propios.
- Llamadas externas solo para: cotización del dólar, inflación (si es automática), Open Food Facts. Ninguna envía datos personales.
- Bloqueo opcional con Face ID o código (según lo que permita la tecnología elegida).

---

## 17. Propuesta técnica (a validar en Claude Code)

### 17.1 Opción recomendada: PWA local-first
- **Web app instalable** en el iPhone (Safari → Compartir → Agregar a inicio): ícono propio, pantalla completa, funciona sin conexión.
- **Stack sugerido:** React + TypeScript + Vite; estado con Zustand; base local **IndexedDB** con Dexie; gráficos con Recharts; parseo de Excel/CSV con SheetJS; PDFs con PDF.js; escáner de código de barras con ZXing.
- **Hosting:** estático y gratuito (Vercel, Netlify o GitHub Pages).

### 17.2 Ventajas y límites
- ✅ Sin App Store, sin Mac, gratis, rápido de iterar.
- ⚠️ iOS puede borrar datos de sitios web poco usados; al estar **instalada en la pantalla de inicio** es mucho más estable. Igual: pedir almacenamiento persistente (`navigator.storage.persist()`) y mantener el **backup** (16.2).
- ⚠️ Sin acceso a Apple Salud, widgets de pantalla de inicio ni Face ID nativo.

### 17.3 Alternativa futura: app nativa
- Si se necesitan Apple Salud (sueño, pasos), widgets o notificaciones confiables: React Native (Expo) reutilizando lógica y modelo de datos, o SwiftUI. Requiere cuenta de desarrollador de Apple para instalarla de forma permanente.

### 17.4 Notificaciones
- Las web apps instaladas en iOS (16.4+) pueden recibir notificaciones push, pero requieren un servidor que las envíe. En la v1 se usan **Recordatorios del iPhone**; se evalúa push más adelante.

### 17.5 Arquitectura de la lógica
- Toda la lógica de negocio (rachas, día lógico, TDEE, XP, logros, clasificación de movimientos, sugerencia de ahorro, insights) en **funciones puras** separadas de la UI, con **tests unitarios**.
- Fechas siempre como día lógico `YYYY-MM-DD` + zona horaria America/Argentina/Buenos_Aires.
- Montos en **centavos enteros** para evitar errores de redondeo.
- Esquema de base versionado con migraciones.

---

## 18. Fases de desarrollo

| Fase | Contenido | Resultado |
|---|---|---|
| **v1 — Base diaria** | Pantalla Hoy, hábitos (agua, creatina, gimnasio + propios), rachas, sueño, proteína simple, ánimo y energía, stock de suplementos, backup JSON | Uso diario desde el día 1 |
| **v2 — Cuerpo y motivación** | Peso y medidas, perfil y cálculo de calorías, macros completos, alimentos propios, recetas, comidas frecuentes, XP, niveles, logros, tienda, comodines, modo pausa, revisión semanal | La app ya "premia" |
| **v3 — Plata** | Cuentas, movimientos, categorías, ingresos (sueldo, aguinaldo, extras, USD), gastos fijos, cuotas, presupuestos, doble moneda e inflación, **importación Galicia y Mercado Pago**, resumen anual, ahorro, fondo de emergencia, alcancías | "Tu 2026" con todo el año cargado |
| **v4 — Entrenamiento y estilo Fitia** | Ejercicios, rutinas, sesiones, progresión, récords; base de alimentos argentinos, escáner de código de barras, plan de comidas sugerido; TDEE adaptativo | Registro completo del gimnasio y la comida |
| **v5 — Inteligencia** | Objetivos vinculados, insights cruzados, desafíos semanales, resumen mensual "Wrapped" | La app analiza y sugiere |
| **Futuro** | Foto de comida con IA, app nativa (Apple Salud, widgets), backup automático en la nube, atajos de Siri | |

---

## 19. Modelo de datos (resumen)

```
Perfil            { nombre, sexo, nacimiento, alturaCm, actividad, objetivo, corteDia, tipoDolar }

Habito            { id, nombre, icono, color, tipo, meta, unidad, incremento, frecuencia, diasFijos[], vecesPorSemana, recordatorio?, vinculo?, orden, archivado }
RegistroHabito    { id, habitoId, fecha, valor, nota?, creadoEn }

RegistroSueno     { id, fecha, acostado, levantado, duracionMin, calidad?, nota?, esSiesta }
RegistroPeso      { id, fecha, kg, nota? }
RegistroMedidas   { id, fecha, cintura?, cadera?, pecho?, brazo?, muslo?, grasaPct? }
RegistroAnimo     { id, fecha, animo, energia, nota? }

MetasNutricion    { desde, kcal, proteinaG, carbosG, grasasG, tdee, origen (formula/adaptativo/manual) }
Alimento          { id, nombre, marca?, por100: {kcal, p, c, g}, porciones[], origen, codigoBarras?, favorito }
Receta            { id, nombre, ingredientes[{alimentoId, gramos}], porciones }
ComidaFrecuente   { id, nombre, items[{alimentoId, cantidad, unidad}], momento }
RegistroComida    { id, fecha, momento, alimentoId, cantidad, unidad, kcal, p, c, g }

Ejercicio         { id, nombre, grupoMuscular, tipo }
Rutina            { id, nombre, ejercicios[{ejercicioId, series, reps, descansoSeg}] }
PlanSemanal       { diaSemana → rutinaId }
Sesion            { id, fecha, rutinaId?, inicio, fin, series[{ejercicioId, peso, reps, completada}] }
Record            { id, ejercicioId, tipo, valor, fecha, sesionId }

Suplemento        { id, nombre, presentacion, cantidadEnvase, dosisDiaria, stockActual, avisarConDias, habitoId? }

Cuenta            { id, nombre, tipo, moneda }
Categoria         { id, nombre, tipo (gasto/ingreso), icono, color, presupuestoMensual? }
Movimiento        { id, fecha, cuentaId, tipo, montoCentavos, moneda, cotizacion, categoriaId?, descripcion, descripcionNorm, nota?, origen, compraEnCuotasId?, importacionId?, claveDedup }
GastoFijo         { id, descripcion, montoCentavos, categoriaId, cuentaId, diaDelMes, activo }
IngresoFijo       { id, descripcion, montoCentavos, moneda, diaCobro, activo, aguinaldo }
CompraEnCuotas    { id, descripcion, totalCentavos, cuotas, primeraCuota, cuentaId, categoriaId }
ReglaCategoria    { id, patron, categoriaId, creadaPor (sistema/usuario) }
Importacion       { id, fecha, archivo, banco, cuentaId, desde, hasta, cantidad }
Cotizacion        { fecha, tipo, valor }
Inflacion         { mes, ipc }
Alcancia          { id, nombre, metaCentavos, moneda, fechaObjetivo?, saldoCentavos }
AporteAlcancia    { id, alcanciaId, fecha, montoCentavos }

Objetivo          { id, nombre, tipo, metrica?, meta, desde, hasta, progreso, estado }

EventoXP          { id, fecha, accion, xp, refId? }
Logro             { id, clave, desbloqueadoEn? }
Recompensa        { id, nombre, costo, icono, repetible }
Canje             { id, recompensaId, fecha, costo }
Desafio           { id, semana, tipo, meta, progreso, estado }
Comodin           { id, ganadoEn, usadoEn?, habitoId? }
Pausa             { id, desde, hasta, motivo }

RevisionSemanal   { semana, texto, creadoEn }
```
