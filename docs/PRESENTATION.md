# CanTrack

## Slide 1 — CanTrack

Coordinación y seguimiento de paseos caninos

Proyecto de Estructuras de Datos · UCC · 2026-2

CanTrack conecta a dueños de perros con paseadores y ayuda a coordinar solicitudes, organizar recogidas y registrar el paseo.

---

## Slide 2 — Caso de estudio

### El reto

Coordinar los datos del perro, los horarios, la ubicación de recogida y el registro del paseo requiere información clara para el dueño y el paseador.

### Usuarios

- Dueño: registra a su perro, explora paseadores y solicita un paseo.
- Paseador: publica su perfil, gestiona solicitudes y organiza su jornada.

### Alcance honesto

CanTrack es una demostración funcional. La demanda no se ha validado con usuarios reales.

---

## Slide 3 — Flujo principal

1. El dueño registra un perro y sus datos.
2. El dueño selecciona un paseador, indica horario y ubicación, y envía una solicitud.
3. El paseador revisa las solicitudes pendientes y acepta o rechaza una.
4. CanTrack sugiere un orden de recogidas para las solicitudes aceptadas del día.
5. Durante la ruta, el paseador puede registrar un check-in con una foto. La API compara la foto con las referencias del perro; si no confirma automáticamente, permite elegir entre candidatos.
6. Al finalizar, el paseador crea un checkout con fotos, revisa la nota sugerida por IA y la envía al dueño.

---

## Slide 4 — Arquitectura

### Cuatro capas

- Frontend: React, TypeScript, Vite y PWA. Presenta las pantallas y envía solicitudes autenticadas.
- Backend: FastAPI en Python. Valida entradas, autentica al usuario y aplica permisos.
- Datos: Supabase, PostgreSQL, Auth y pgvector. Supabase Storage guarda fotos de checkout en un bucket privado.
- IA: CLIP genera embeddings de imágenes en el backend; Ollama aporta una observación visual para el checkout.

El navegador se comunica con la API. Las credenciales privilegiadas y las llamadas a los modelos permanecen en el backend.

---

## Slide 5 — Modelo de datos

### Entidades principales

- AUTH_USERS: cuentas y roles de dueño o paseador.
- DOGS: dueño, datos del perro y embedding de referencia.
- WALKER_PROFILES: perfil y precio por paseo.
- WALK_REQUESTS: dueño, paseador, perro, horario, ubicación, precio y estado.
- ROUTES y CHECKINS: rutas del paseador y registros de perros en la ruta.
- CHECKOUTS: fotos y notas del paseo enviadas al dueño.
- AI_USAGE: registro de uso de IA por paseador.

### Relaciones

Un dueño puede registrar varios perros y crear solicitudes. Un paseador tiene un perfil y puede recibir muchas solicitudes. Una solicitud conecta un dueño, un paseador y un perro; puede producir un checkout. Las rutas contienen check-ins asociados a perros.

---

## Slide 6 — Las 11 estructuras de datos

| Estructura | Uso en CanTrack | Estado |
|---|---|---|
| Stack | Deshacer el check-in más reciente | Implementada e integrada |
| Queue | Ordenar solicitudes pendientes por antigüedad | Implementada e integrada |
| Lista simplemente enlazada | Mantener y cambiar el orden de paradas de una ruta | Implementada e integrada |
| Lista doblemente enlazada | Recorrer la cronología del perro hacia adelante y atrás | Implementada e integrada |
| Lista circular | Rotar rutas recurrentes | Implementada; uso en producto pendiente |
| AVL | Ordenar recogidas por hora en rutas y planes | Implementada e integrada |
| Grafo ponderado + Dijkstra | Encontrar el camino de menor costo entre puntos del grafo | Implementada (endpoint, sin pantalla) |
| Union-Find | Agrupar perros compatibles en la sugerencia de plan | Implementada e integrada |
| Interval Tree | Detectar solapamientos de horario | Implementada e integrada |
| Trie | Buscar paseadores por nombre | Planeada; aún no implementada |
| Quadtree | Buscar paseadores cercanos a una ubicación | Planeada; aún no implementada |

La lista circular está implementada como estructura, pero su rotación de rutas aún no está integrada al flujo del producto. El buffer de posiciones GPS con Queue también está planeado, no debe presentarse como una función disponible.

---

## Slide 7 — Modelo de negocio

### Comisión por paseo: 10 % a 15 %

Con un precio supuesto de 5.000 a 15.000 COP por paseo, la comisión sería aproximadamente:

- 500 a 750 COP por un paseo de 5.000 COP.
- 1.500 a 2.250 COP por un paseo de 15.000 COP.

La comisión por transacción es pequeña, así que el modelo dependería del volumen de paseos. Estos valores son supuestos para analizar el modelo, no ingresos observados ni una proyección validada.

En el mercado local, Wakypet ya opera en Medellín y Bogotá con comisiones alrededor del 25 %, lo que sugiere una referencia real de la industria y también muestra por qué el modelo debe validarse antes de escalar.

CanTrack no procesa pagos. El modelo de negocio se presenta como análisis conceptual, no como una función del producto.

---

## Slide 8 — Demostración

### Plan en vivo

1. Mostrar los roles de dueño y paseador.
2. Registrar un perro y sus fotos de referencia.
3. Crear una solicitud con horario y ubicación, hoy en la versión actual se escribe la latitud y longitud manualmente; el selector de punto en mapa queda pendiente como mejora del flujo.
4. Revisar la solicitud desde la cuenta del paseador y aceptarla.
5. Mostrar la sugerencia de orden de recogidas.
6. Hacer un check-in y enseñar la confirmación o selección manual.
7. Crear y enviar un checkout; mostrarlo desde la vista del dueño.

### Video de respaldo

El video de respaldo forma parte del entregable de la presentación y será grabado por el equipo del proyecto para la fecha de entrega final, como evidencia visual del flujo principal de CanTrack.

---

## Slide 9 — Conclusión

CanTrack presenta una base sólida para coordinar paseos caninos con lógica de rutas, validación visual y flujo de aprobación del paseador. La propuesta es útil como demostración funcional, pero el modelo de negocio y la demanda real requieren validación adicional antes de considerarlo producto listo para producción.
