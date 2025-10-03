<!--
  Supernova.md — Guía maestra para agentes de IA en el proyecto Transcribe-summarize
  Última actualización: 3-oct-2025
-->

# Guía Supernova 🚀

Documento único de referencia para cualquier agente de IA (Gemini, Qwen, Claude, Grok, Copilot, etc.) que trabaje en el proyecto **Transcribe-summarize**.

---

## 1. Contexto rápido

- **Objetivo**: App web local que transcribe audio con Whisper y, en fases siguientes, generará resúmenes cortos y largos usando modelos locales (Ollama) o APIs (Groq, Gemini, Openrouter...).
- **Estado actual**: Transcripción local con Whisper y resumen corto orquestado desde el backend utilizando LM Studio (vía API OpenAI-compatible). El flujo funciona; el prompt del sistema aún debe pulirse para obtener resúmenes más consistentes.
- **Stack**:
  - Frontend: HTML + Tailwind vía CDN + JS vanilla.
  - Backend: Node.js + Express + TypeScript + Multer.
  - Procesamiento: Whisper CLI dentro de venv (`/home/pablo/IA/whisper_env`).
- **Puerto**: 3000 (`backend/src/index.ts`).
- **Repositorio**: `Transcribe-summarize` (rama principal `main`).

👉 **Regla de oro**: Mantén la experiencia local funcionando (transcripción básica). Todo cambio debe respetar esto.

---

## 2. Arquitectura de alto nivel

| Capa | Responsabilidad | Archivos clave |
|------|-----------------|----------------|
| UI | Cargar audio, mostrar progreso/resultado | `index.html`, `styles/styles.css`, `scripts/action.js` |
| Configuración | Gestionar API keys en el navegador | `settings.html`, `scripts/settings.js` |
| Backend | Servir UI, aceptar uploads, lanzar Whisper, exponer estado | `backend/src/index.ts`, `backend/package.json`, `backend/tsconfig.json` |
| Almacenamiento temporal | Ficheros subidos + jobs en memoria | `uploads/`, objeto `jobs` en memoria |

### Flujo actual (transcripción y resumen)
1. Usuario selecciona audio y pulsa un botón (`transcribe`, `shortSummaryBtn`, `longSummaryBtn`).
2. `scripts/action.js` sube el archivo a `POST /api/transcribe?action=<tipo>` donde `tipo` puede ser `transcribe`, `summarize_short` o `summarize_long`.
3. Backend responde `{ jobId }` y ejecuta `whisper <file>` asíncronamente.
4. El backend almacena la transcripción en memoria; si la acción es `summarize_short` o `summarize_long`, genera el resumen con LM Studio antes de marcar el job como completado.
5. Frontend hace polling a `GET /api/status/:jobId` cada 2 s.
6. Cuando `status === 'completed'`, muestra el resultado: `data.summary` si existe, o `data.transcription` en caso contrario.

### Flujo objetivo (próximas fases)
- Elegir motor (local/API) y acción (transcribir, resumen corto, resumen largo) desde el frontend.
- Backend delega en Whisper/Ollama o Groq/Gemini según configuración.
- Posibilidad de instalar modelos locales desde UI (e.g., `ollama pull`).

---

## 3. Backend detallado

| Tema | Detalle |
|------|---------|
| Servidor | Express; arranca con `npm run dev --prefix backend` (usa `ts-node-dev`). |
| Uploads | `multer` guarda archivos en `uploads/`; se eliminan tras terminar el job. |
| Jobs | `jobs[jobId] = { status, data?, error? }`. No hay persistencia; reiniciar el servidor limpia todo. |
| Whisper | Se ejecuta vía `exec` activando venv: `source /home/pablo/IA/whisper_env/bin/activate && whisper ... --model tiny`. Ajusta ruta si tu entorno difiere. |
| Sanitizado actual | Se usa `stdout.trim()` (eliminación básica de espacios); ajusta si necesitas limpiar metadatos adicionales. |
| Acciones | `POST /api/transcribe` lee `action` desde la query (`transcribe`, `summarize_short`, `summarize_long`), genera el resumen correspondiente si aplica y guarda `{ action, transcription, summary? }` en `jobs[jobId].data`. Ajusta el prompt en `generateShortSummary` o `generateLongSummary` si el output del LLM añade comentarios o no resume adecuadamente. |
| CORS | Permitidos orígenes `http://127.0.0.1:3000` y `http://localhost:3000`. Actualiza si usas otro host. |
| Archivos estáticos | Servidos desde raíz, `/scripts` y `/styles`. |

⚠️ **Limitaciones**:
- El prompt actual del resumen corto puede generar textos demasiado literales o con explicaciones extra.
- El almacenamiento en memoria impide escalado o reintentos tras un reinicio.
- Sin validación de formato/tamaño de audio.

---

## 4. Frontend detallado

- `index.html`: interfaz principal con tres botones (`transcribeBtn`, `shortSummaryBtn`, `longSummaryBtn`).
- `scripts/action.js`:
  - `handleRequest` acepta un parámetro `action` y lo añade como querystring en la petición a `/api/transcribe`.
  - Tras recibir el `jobId`, realiza polling cada 2 s hasta completar.
  - La variable `isSummary` ahora reconoce tanto `summarize_short` como `summarize_long` para mostrar el estado correcto.
  - Cuando llega la respuesta, muestra `result.data.summary` (si existe) o la transcripción limpia en `#response`.
- `settings.html` + `scripts/settings.js`:
  - Formulario para guardar en `localStorage` las API keys de Groq y Google.
  - Toggle para mostrar/ocultar contenidos sensibles.
- `styles/styles.css`: actualmente sólo define tipografía global (Inter y Noto Sans); la mayoría de estilos llegan desde Tailwind.

🎯 **Oportunidades inmediatas**:
- Afinar el prompt del resumen corto y validar la salida con varios audios.
- Mostrar feedback diferenciado (progreso de transcripción vs. resumen) y logs de errores más descriptivos en la UI.
- Validar tamaño/tipo antes de subir.

---

## 5. Dependencias externas & claves

| Herramienta | Uso actual | Estado |
|-------------|-----------|--------|
| Whisper CLI | Transcripción local | ✅ En uso (modelo `tiny`). |
| LM Studio | Resúmenes locales | ✅ En uso para resumen corto y largo. |
| Groq Whisper API | Transcripción remota | ⏳ Planificado. |
| Google Gemini 2.5 Flash Lite | Resúmenes remotos | ⏳ Planificado. |

- Las API keys se guardan en `localStorage`; no hay backend para almacenarlas.
- Cuando implementes llamadas externas, respeta este almacenamiento y pasa las claves mediante cabeceras o payload seguro.

---

## 6. Puesta en marcha & comandos útiles

```bash
# Instalar dependencias del backend
npm install --prefix backend

# Levantar servidor en desarrollo (puerto 3000)
npm run dev --prefix backend

# (Pendiente) Descargar modelo Ollama
# ollama pull <modelo>
```

**Requisitos previos**:
- Node.js instalado.
- Python venv con Whisper disponible en `/home/pablo/IA/whisper_env`. Si usas otra ruta, actualiza `backend/src/index.ts`.
- Directorio `uploads/` con permisos de escritura (Multer lo crea automáticamente, pero revisa permisos en despliegues).

---

## 7. Estado funcional y roadmap

| Feature | Estado | Notas |
|---------|--------|-------|
| Transcripción local | ✅ | Funciona con Whisper tiny. |
| Resumen corto / largo | ✅ | Resumen corto y largo integrados en `/api/transcribe` con LM Studio. El prompt de resumen largo está definido. |
| Motores externos (Groq/Gemini) | ⏳ | Añadir configuración y llamadas API. |
| Selector de motor | ⏳ | Usar configuración guardada en `settings.html`. |
| Instalación automática de modelos | ⏳ | Endpoint para ejecutar comandos (`ollama pull`). |
| Validación de audio | ❌ | Añadir filtros en Multer + frontend. |
| Tests / lint | ❌ | Scripts placeholder; definir convenciones. |

**Próximos pasos sugeridos**:
1. Afinar y probar el prompt de `generateShortSummary` para obtener resúmenes consistentes y sin comentarios meta.
2. Separar la lógica de transcripción local vs. remota en `backend/src/index.ts`.
3. Implementar resúmenes locales con Ollama (prompt definido aquí mismo).
4. Añadir soporte para Groq/Gemini aprovechando las keys de `settings.html`.
5. Documentar cada nueva integración en este archivo (sección 7/8) y en `README.md` si impacta al usuario final.

---

## 8. Playbook para agentes de IA

1. **Lee esta guía completa** antes de tocar código.
2. **Confirma requisitos** con el solicitante (botones afectados, modos esperado, etc.).
3. **Toma contexto del código**: revisa `scripts/action.js` y `backend/src/index.ts` para entender patrones existentes.
4. **Traza un plan corto** (2-4 pasos) y ejecútalo siguiendo este orden:
   - Si es frontend+backend, empieza por la API y termina en la UI.
   - Añade tests si introduces lógica crítica (aunque todavía no exista suite, considera crearlos).
5. **Valida localmente** levantando el backend y haciendo una prueba con un audio pequeño.
6. **Actualiza documentación**:
   - Cambios menores: anota en sección correspondiente.
   - Cambios mayores: actualiza `README.md` y añade notas de migración si rompes compatibilidad.
7. **Entrega** un resumen claro de cambios + instrucciones de prueba. Mantén este archivo alineado.

🔐 **Buenas prácticas**:
- Nunca expongas API keys en repositorio o logs.
- Sanitiza entradas antes de pasar a comandos shell.
- Maneja errores de procesos (`exec`) con mensajes útiles.
- Evita bloquear el event loop (usa procesos asíncronos, streams si es necesario).

---

## 9. Prompts & plantillas útiles

- **Resumen corto (actual)**:
  > "Tu tarea es crear un resumen muy breve, en un solo párrafo, del texto proporcionado. El texto es una transcripción de un audio y puede contener información adicional al principio, como el idioma detectado. Ignora por completo cualquier metadato o información sobre el proceso de transcripción y céntrate únicamente en el contenido del diálogo o el discurso. El resumen debe capturar la idea principal del audio de forma concisa."
- **Resumen largo (actual)**:
  > "Tu tarea es crear un resumen más extenso y detallado del texto proporcionado. El texto es una transcripción de un audio y puede contener información adicional al principio, como el idioma detectado. Ignora por completo cualquier metadato o información sobre el proceso de transcripción y céntrate únicamente en el contenido del diálogo o el discurso. El resumen debe ser profundo, capturando no solo los puntos principales sino también los matices, ideas secundarias y conexiones entre conceptos. Escribe el resumen como un texto continuo coherente, sin títulos ni puntos de lista, desarrollando cada aspecto importante del contenido en párrafos estructurados que mantengan el flujo lógico del tema tratado. Haz el resumen en español y si es muy estenxor, divídelo en varios párrafos para mejorar la legibilidad."
- **Mensaje de fallback para UI**: "Transcripción vacía." (ya implementado cuando no se detectan líneas válidas).

Adapta estos prompts cuando integres Ollama/Gemini y documenta variaciones aquí.

---

## 10. Troubleshooting

| Problema | Causa probable | Qué hacer |
|----------|----------------|-----------|
| Respuesta vacía | Whisper escribe en `stderr` | Verifica logs del backend; el sanitizado ya combina ambos streams. |
| `whisper` no encontrado | Ruta del venv incorrecta | Actualiza la cadena del comando o instala el venv. |
| CORS bloquea peticiones | Host distinto a 127.0.0.1/localhost | Añade el nuevo origen en `corsOptions`. |
| Jobs desaparecen | Reinicio del servidor | Implementa persistencia si necesitas conservar estados. |
| Archivos quedan en `uploads/` | Fallo antes de `fs.unlink` | Revisa logs y añade manejo en casos de error temprano. |

---

## 11. Gobernanza del documento

- Mantén este archivo como **fuente única de verdad** para agentes.
- Cuando completes una tarea relevante, añade un registro breve en la sección correspondiente y actualiza la fecha del encabezado.
- Si este archivo crece demasiado, crea sub-secciones enlazadas pero mantén aquí la visión global.

---

### Resumen para agentes con prisa

1. Transcripción local funciona; no rompas ese flujo.
2. Frontend ahora diferencia acciones (`transcribe`, `summarize_short`, `summarize_long`).
3. Backend ejecuta Whisper y opcionalmente resume con LM Studio.
4. Guarda cambios de arquitectura aquí mismo.
5. Toda nueva funcionalidad debe incluir instrucciones de prueba.

---

En caso que el agente tenga acceso al mcp de chrome-devtools, puede usar el archivo de audio /home/pablo/Música/prueba-whisper2.wav para hacer pruebas. Es un audio de prueba corto para probar la transcripción.

¡Listo! Con este documento deberías tener todo lo necesario para contribuir con confianza al proyecto.