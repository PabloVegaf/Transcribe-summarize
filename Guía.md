Guía para crear una WebApp de Transcripción y Resumen de Audio



El usuario podrá adjuntar un archivo de audio y tendrá varios botones (para transcribir, un resumen corto y un resumen largo). Al pulsar uno de los botones, se realizará la transcripción. En caso de pulsar Transcripción, se devolverá la transcripción sin más. Si el boton Resumen corto es pulsado, se realizará la transcipción y se enviará esa transcipción a un LLM (también ejecutado en local) junto con un prompt que indique que se debe hacer un resumen corto. Lo mismo con el resumen largo pero en vez de indicarle al llm que haga un resumen corto, le indicará que haga un resumen largo. Inicialmente se desarrollará la app para funcionar localmente, posteriormente se implementarán las opciones de APIs externas para ejecutar la transcipción y resumen del llm externamente.



Funcionalidades clave

1. Subida o grabación de audio.
2. Transcripción del audio (local o API de whisper en groq: [https://console.groq.com/docs/api-reference#audio-transcription](https://console.groq.com/docs/api-reference#audio-transcription)).
3. Resumen del texto transcrito (Local con ollama o API externa de Gemini 2.5 flash lite: [https://ai.google.dev/gemini-api/docs/models?hl=es-419#gemini-2.5-flash-lite](https://ai.google.dev/gemini-api/docs/models?hl=es-419#gemini-2.5-flash-lite)).
4. Selector de motor (local vs. API. En el apartado de configuración se adjuntarán las API keys).

Arquitectura general
Frontend:

- HTML, CSS, JS.

Backend:

- Node.js con TypeScript.

Backend: responsabilidades

- Recibir archivos de audio.
- Elegir motor de transcripción (local o API).
- Ejecutar transcripción y/o resumen.
- Devolver resultados al frontend.
- Permitir instalación automática de modelos locales.

Llamadas API: fetch.

Instalación automática de modelos

- Ejecutar comandos como 'ollama pull '
- Backend debe ejecutar procesos y mostrar progreso.



