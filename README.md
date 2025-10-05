# 🎙️ Audio Transcribe & Summarize

Una aplicación web moderna para transcribir archivos de audio y generar resúmenes automáticos utilizando la API de OpenAI.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-ISC-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Tecnologías](#-tecnologías)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Uso](#-uso)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [API Endpoints](#-api-endpoints)
- [Desarrollo](#-desarrollo)
- [Solución de Problemas](#-solución-de-problemas)
- [Contribuir](#-contribuir)
- [Licencia](#-licencia)

## ✨ Características

- **Transcripción de Audio**: Convierte archivos de audio a texto usando el modelo Whisper de OpenAI
- **Resúmenes Inteligentes**: Genera resúmenes cortos o largos del contenido transcrito
- **Interfaz Moderna**: UI responsive construida con Tailwind CSS
- **Procesamiento Asíncrono**: Sistema de jobs con polling para manejar archivos grandes
- **Configuración Flexible**: Los usuarios proporcionan su propia API key de OpenAI
- **Múltiples Formatos**: Soporta diversos formatos de audio (mp3, wav, m4a, etc.)

## 🛠 Tecnologías

### Frontend
- HTML5
- CSS3 (Tailwind CSS vía CDN)
- JavaScript (ES6+ Vanilla)
- Google Fonts (Inter, Noto Sans)

### Backend
- Node.js
- TypeScript
- Express.js
- Multer (manejo de uploads)
- OpenAI API (Whisper + GPT-3.5-turbo)

## 📦 Requisitos Previos

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **API Key de OpenAI**: Necesaria para usar la aplicación ([Obtener aquí](https://platform.openai.com/api-keys))

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/PabloVegaf/Transcribe-summarize.git
cd Transcribe-summarize
```

### 2. Instalar dependencias del backend

```bash
npm install --prefix backend
```

### 3. Levantar el servidor

```bash
npm run dev --prefix backend
```

El servidor estará disponible en `http://localhost:3000`

## ⚙️ Configuración

### Configurar API Key de OpenAI

1. Abre tu navegador y ve a `http://localhost:3000/settings.html`
2. Introduce tu API Key de OpenAI en el campo correspondiente
3. Haz clic en "Save Settings"

La clave se guarda en el `localStorage` del navegador y se envía de forma segura al backend en cada petición.

### Estructura de Configuración

```javascript
// La API key se almacena en localStorage
localStorage.setItem('openAiApiKey', 'tu-api-key-aquí');
```

## 📖 Uso

### Transcripción Simple

1. Ve a `http://localhost:3000`
2. Selecciona un archivo de audio (arrastra y suelta o haz clic en "Select File")
3. Haz clic en **"Simple transcription"**
4. Espera a que se complete el procesamiento
5. La transcripción aparecerá en pantalla

### Generar Resumen Corto

1. Sigue los pasos 1-2 anteriores
2. Haz clic en **"Short Summary"**
3. El sistema transcribirá el audio y generará un resumen conciso en un solo párrafo

### Generar Resumen Largo

1. Sigue los pasos 1-2 anteriores
2. Haz clic en **"Long Summary"**
3. El sistema generará un resumen detallado y extenso del contenido

## 📁 Estructura del Proyecto

```
Transcribe-summarize/
├── backend/
│   ├── src/
│   │   └── index.ts          # Servidor Express principal
│   ├── uploads/              # Archivos temporales (auto-limpiados)
│   ├── package.json
│   └── tsconfig.json
├── scripts/
│   ├── action.js             # Lógica principal del frontend
│   └── settings.js           # Gestión de configuración
├── styles/
│   └── styles.css            # Estilos personalizados
├── index.html                # Página principal
├── settings.html             # Página de configuración
├── Supernova.md              # Guía completa para agentes IA
└── README.md                 # Este archivo
```

## 🔌 API Endpoints

### POST `/api/transcribe`

Inicia un trabajo de transcripción/resumen.

**Headers:**
```
Authorization: Bearer YOUR_OPENAI_API_KEY
Content-Type: multipart/form-data
```

**Query Parameters:**
- `action`: `transcribe` | `summarize_short` | `summarize_long`

**Body:**
- `audio`: Archivo de audio (FormData)

**Respuesta:**
```json
{
  "jobId": "a1b2c3d4e5f6..."
}
```

### GET `/api/status/:jobId`

Consulta el estado de un trabajo.

**Respuesta:**
```json
{
  "status": "completed",
  "data": {
    "action": "summarize_short",
    "transcription": "Texto transcrito...",
    "summary": "Resumen generado..."
  }
}
```

**Estados posibles:**
- `processing`: En proceso
- `completed`: Completado
- `failed`: Falló

## 👨‍💻 Desarrollo

### Ejecutar en modo desarrollo

```bash
# Desde la raíz del proyecto
npm run dev --prefix backend
```

El servidor se reiniciará automáticamente al detectar cambios en los archivos TypeScript.

### Compilar TypeScript (opcional)

```bash
cd backend
npx tsc --noEmit  # Solo verifica tipos sin compilar
```

### Estructura de Jobs

Los trabajos se almacenan en memoria:

```typescript
type Job = {
  status: 'processing' | 'completed' | 'failed';
  data?: {
    action: string;
    transcription: string;
    summary?: string;
  };
  error?: string;
};
```

### Flujo de Procesamiento

1. **Upload** → Usuario sube archivo
2. **Job Creation** → Backend genera `jobId` único
3. **Transcription** → OpenAI Whisper procesa el audio
4. **Summarization** (opcional) → GPT-3.5-turbo genera resumen
5. **Polling** → Frontend consulta cada 2s el estado
6. **Display** → Resultado mostrado al usuario
7. **Cleanup** → Archivo temporal eliminado

## 🐛 Solución de Problemas

### Error: "Authorization header with Bearer token is required"

**Causa:** No se ha configurado la API key o no se está enviando correctamente.

**Solución:**
1. Ve a `/settings.html`
2. Configura tu API key de OpenAI
3. Recarga la página principal

### Error 401: "Unauthorized"

**Causa:** API key inválida o sin créditos.

**Solución:**
- Verifica que tu API key sea correcta
- Comprueba que tengas créditos disponibles en tu cuenta de OpenAI
- Genera una nueva API key si es necesario

### Error 429: "Rate limit exceeded"

**Causa:** Has superado el límite de peticiones de OpenAI.

**Solución:**
- Espera unos minutos antes de reintentar
- Considera actualizar tu plan de OpenAI

### El archivo no se procesa

**Solución:**
1. Verifica que el formato de audio sea compatible
2. Comprueba el tamaño del archivo (límite recomendado: 25MB)
3. Revisa los logs del servidor en la consola

### CORS Error

**Causa:** Problema de origen cruzado.

**Solución:**
- Asegúrate de acceder desde `localhost:3000`
- Verifica la configuración de CORS en `backend/src/index.ts`

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Guía para Agentes IA

Si eres un agente de IA trabajando en este proyecto, consulta el archivo [`Supernova.md`](./Supernova.md) para obtener documentación completa sobre la arquitectura, flujos y mejores prácticas.

## 📄 Licencia

Este proyecto está bajo la licencia ISC.

## 👤 Autor

**Jules & Pablo Vega**

---

## 🔮 Roadmap Futuro

- [ ] Persistencia de jobs en base de datos
- [ ] Soporte para múltiples proveedores de IA (Gemini, Claude)
- [ ] Validación de formatos y tamaños de archivo
- [ ] Sistema de tests automatizados
- [ ] Descarga de transcripciones en diferentes formatos
- [ ] Modo oscuro
- [ ] Historial de transcripciones
- [ ] Soporte multiidioma en la UI

---

**⭐ Si este proyecto te fue útil, considera darle una estrella en GitHub!**