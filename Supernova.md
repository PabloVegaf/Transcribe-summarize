<!--
   Supernova.md — Guía maestra para agentes de IA en el proyecto Transcribe-summarize
   Última actualización: 4-oct-2025 (Refactorización a API de OpenAI)
-->

# Guía Supernova 🚀

Documento único de referencia para cualquier agente de IA (Gemini, Qwen, Claude, Grok, Copilot, etc.) que trabaje en el proyecto **Transcribe-summarize**.

---

## 1. Contexto rápido

- **Objetivo**: App web que permite a los usuarios transcribir audio y generar resúmenes (cortos y largos) utilizando la API de OpenAI, a través de su propia API key.
- **Estado actual**: La aplicación ha sido refactorizada para eliminar las dependencias de modelos locales (Whisper CLI y LM Studio). Ahora, tanto la transcripción como los resúmenes se procesan a través de la API de OpenAI, utilizando una clave que el usuario proporciona en la página de configuración.
- **Stack**:
  - Frontend: HTML + Tailwind vía CDN + JS vanilla.
  - Backend: Node.js + Express + TypeScript + Multer.
  - Procesamiento: **API de OpenAI** (modelos `whisper-1` y `gpt-3.5-turbo`).
- **Puerto**: 3000 (`backend/src/index.ts`).
- **Repositorio**: `Transcribe-summarize` (rama principal `main`).

👉 **Regla de oro**: Toda la funcionalidad debe operar a través de la API de OpenAI. Asegurar que el flujo de subida, procesamiento y visualización de resultados sea robusto.

---

## 2. Arquitectura de alto nivel

| Capa | Responsabilidad | Archivos clave |
|------|-----------------|----------------|
| UI | Cargar audio, mostrar progreso/resultado | `index.html`, `styles/styles.css`, `scripts/action.js` |
| Configuración | Gestionar la API key de OpenAI del usuario | `settings.html`, `scripts/settings.js` |
| Backend | Servir UI, aceptar uploads, orquestar llamadas a la API de OpenAI | `backend/src/index.ts`, `backend/package.json`, `backend/tsconfig.json` |
| Almacenamiento temporal | Ficheros subidos + jobs en memoria | `uploads/`, objeto `jobs` en memoria |

### Flujo actual (basado en API de OpenAI)
1. El usuario introduce su API key de OpenAI en la página `settings.html`. La clave se guarda en `localStorage`.
2. En `index.html`, el usuario selecciona un archivo de audio y pulsa un botón de acción (`transcribe`, `shortSummaryBtn`, `longSummaryBtn`).
3. `scripts/action.js` lee la API key del `localStorage`, la adjunta como cabecera `Authorization: Bearer <key>` y sube el archivo a `POST /api/transcribe?action=<tipo>`.
4. El backend recibe la petición, valida la cabecera y extrae la clave.
5. El backend responde inmediatamente con un `{ jobId }` y comienza el procesamiento asíncrono.
6. Se realiza una llamada a la API de OpenAI con el modelo `whisper-1` para obtener la transcripción.
7. Si la acción es `summarize_short` o `summarize_long`, se realiza una segunda llamada a la API de Chat Completions de OpenAI (`gpt-3.5-turbo`) con la transcripción para generar el resumen.
8. El estado del job se actualiza a `completed` con los datos resultantes.
9. El frontend, que está haciendo polling a `GET /api/status/:jobId`, recibe el estado completado y muestra el resultado (`summary` o `transcription`) en la UI.

---

## 3. Backend detallado

| Tema | Detalle |
|------|---------|
| Servidor | Express; arranca con `npm run dev --prefix backend` (usa `ts-node-dev`). |
| API Key | Se recibe en cada petición a `/api/transcribe` a través de la cabecera `Authorization: Bearer <API_KEY>`. |
| Uploads | `multer` guarda archivos en `uploads/`; se eliminan tras terminar el job. |
| Jobs | `jobs[jobId] = { status, data?, error? }`. No hay persistencia; reiniciar el servidor limpia todo. |
| Whisper | Se utiliza la API de OpenAI a través de la librería `openai`, llamando al modelo `whisper-1`. **Ya no se usa el CLI local.** |
| Resúmenes | Se utiliza la API de Chat Completions de OpenAI (`gpt-3.5-turbo`). La lógica está unificada en la función `generateSummary`. **Ya no se usa LM Studio.** |
| CORS | Permitidos orígenes `*` y las cabeceras `Content-Type` y `Authorization`. |
| Archivos estáticos | Servidos desde raíz, `/scripts` y `/styles`. |

⚠️ **Limitaciones**:
- El almacenamiento de jobs en memoria impide escalado o reintentos tras un reinicio.
- Sin validación de formato/tamaño de audio.
- La validez de la API key solo se comprueba al realizar la primera llamada a OpenAI.

---

## 4. Frontend detallado

- `index.html`: interfaz principal con tres botones (`transcribeBtn`, `shortSummaryBtn`, `longSummaryBtn`).
- `scripts/action.js`:
  - `handleRequest` lee la `openAiApiKey` de `localStorage`. Si no existe, muestra un error.
  - Añade la clave a la cabecera `Authorization` en la petición `fetch` a `/api/transcribe`.
  - Realiza polling para obtener el estado del job y muestra el resultado final.
- `settings.html` + `scripts/settings.js`:
  - **Formulario simplificado** con un único campo para la `openAiApiKey`.
  - Guarda la clave en `localStorage`. Toggle para mostrar/ocultar la clave.
- `styles/styles.css`: sin cambios, define tipografía global.

---

## 5. Dependencias externas & claves

| Herramienta | Uso | Estado |
|-------------|-----------|--------|
| OpenAI API (Whisper) | Transcripción remota | ✅ **En uso** (modelo `whisper-1`). |
| OpenAI API (Chat) | Resúmenes remotos | ✅ **En uso** (modelo `gpt-3.5-turbo`). |
| Whisper CLI | Transcripción local | ❌ **Eliminado**. |
| LM Studio | Resúmenes locales | ❌ **Eliminado**. |

- La API key de OpenAI se guarda en `localStorage` y se transmite al backend en cada petición.

---

## 6. Puesta en marcha & comandos útiles

```bash
# Instalar dependencias del backend
npm install --prefix backend

# Levantar servidor en desarrollo (puerto 3000)
npm run dev --prefix backend
```

**Requisitos previos**:
- Node.js instalado.
- Una API key de OpenAI válida para configurar en la aplicación.
- Directorio `uploads/` con permisos de escritura.

---

## 7. Estado funcional y roadmap

| Feature | Estado | Notas |
|---------|--------|-------|
| Transcripción (API OpenAI) | ✅ | Funciona con el modelo `whisper-1`. |
| Resumen corto / largo (API OpenAI) | ✅ | Integrado con el modelo `gpt-3.5-turbo`. |
| Configuración de API Key | ✅ | El usuario puede introducir su propia clave de OpenAI. |
| Transcripción local | ❌ | **Eliminada**. |
| Validación de audio | ❌ | Añadir filtros en Multer + frontend. |
| Tests / lint | ❌ | Scripts placeholder; definir convenciones. |

**Próximos pasos sugeridos**:
1. Implementar validación de formato y tamaño de los archivos de audio.
2. Añadir un feedback más granular en la UI (ej. "Transcribiendo...", "Generando resumen...").
3. Considerar añadir soporte para otros proveedores de modelos (Gemini, Claude, etc.) si se solicita en el futuro.
4. Añadir una suite de tests para validar la lógica del backend.

---

## 8. Playbook para agentes de IA

1. **Lee esta guía completa** antes de tocar código.
2. **Confirma requisitos** con el solicitante.
3. **Toma contexto del código**: revisa `scripts/action.js` y `backend/src/index.ts` para entender el flujo de API.
4. **Traza un plan corto** y ejecútalo.
5. **Valida localmente** levantando el backend y haciendo una prueba con un audio y una API key válida.
6. **Actualiza esta documentación** si realizas cambios en la arquitectura.
7. **Entrega** un resumen claro de cambios + instrucciones de prueba.

🔐 **Buenas prácticas**:
- Nunca expongas API keys en repositorio o logs.
- Sanitiza entradas de usuario.
- Maneja errores de API (ej. clave inválida, rate limits) con mensajes útiles para el usuario.
- Evita bloquear el event loop (la lógica asíncrona actual cumple con esto).

---

## 9. Prompts & plantillas útiles

- **Resumen corto**:
  > "Tu tarea es actuar como un narrador que explica brevemente de qué trata el contenido del audio. El texto es una transcripción y puede incluir información adicional como el idioma detectado. No hagas un resumen tradicional, sino que explica en un solo párrafo qué tipo de contenido tiene el audio, cuál es su propósito o temática principal, y qué puede esperar un oyente. Tu explicación debe ser concisa y enfocarse en la naturaleza del contenido, no en los detalles específicos de la transcripción."
- **Resumen largo**:
  > "Como narrador experto, proporciona directamente una explicación detallada sobre el contenido del audio que se te proporciona. No saludes ni hagas referencias a la transcripción que se te ha compartido. No digas "gracias por tu mensaje" ni "parece que estás compartiendo". Simplemente analiza el contenido del audio y explica en profundidad de qué se trata: su propósito, temática principal, estilo, contexto, objetivos, características especiales y cualquier elemento que defina el contenido. Estructura tu explicación en varios párrafos narrativos y detallados en español, enfocándote exclusivamente en explicar qué tipo de contenido tiene el audio y qué puede esperar un oyente."

---

## 10. Troubleshooting

| Problema | Causa probable | Qué hacer |
|----------|----------------|-----------|
| Error 401 Unauthorized | API Key inválida, mal formateada o no proporcionada. | Verificar la clave en la página de `Settings` y asegurarse de que tiene créditos en OpenAI. |
| Error de API (429, 500) | Rate limits de OpenAI excedidos o problemas en su servicio. | Esperar y reintentar. Consultar el estado de la API de OpenAI. |
| CORS bloquea peticiones | La cabecera `Authorization` no está permitida. | Verificar la configuración de CORS en `backend/src/index.ts`. |
| Jobs desaparecen | Reinicio del servidor. | Es el comportamiento esperado, ya que no hay persistencia. |

---

## 11. Gobernanza del documento

- Mantén este archivo como **fuente única de verdad** para agentes.
- Cuando completes una tarea relevante, actualiza la fecha del encabezado y las secciones pertinentes.

---

## 12. Revisión de código y hallazgos (2025-10-03 -> 2025-10-04)

### Hallazgos y Acciones
- **Vulnerabilidades**: Ninguna detectada.
- **Backend**:
  - **CORS**: Se ha actualizado la configuración para permitir la cabecera `Authorization`. **(Solucionado)**
  - **Código duplicado**: Las funciones de resumen se han refactorizado en una única función `generateSummary`. **(Solucionado)**
  - **Typo en prompt**: Corregido typo "estenxor" por "extenso" en la versión anterior. **(Solucionado)**
  - **Dependencias locales**: Se ha eliminado toda la lógica de ejecución de `whisper` local y la conexión con LM Studio. **(Solucionado)**
- **Frontend**:
  - **Configuración de claves**: La UI se ha simplificado para aceptar una única clave de OpenAI. **(Solucionado)**
  - **Envío de clave**: Se implementó el envío seguro de la clave vía cabecera `Authorization`. **(Solucionado)**

---

En caso que el agente tenga acceso al mcp de chrome-devtools, puede usar el archivo de audio /home/pablo/Música/prueba-whisper2.wav para hacer pruebas. Es un audio de prueba corto para probar la transcripción.

¡Listo! Con este documento deberías tener todo lo necesario para contribuir con confianza al proyecto.