import express from 'express';
import multer from 'multer';
import { exec } from 'child_process';
import fs from 'fs';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import OpenAI from 'openai';

const app = express();
const port = 3000;

// In-memory store for job statuses
const jobs: { [key: string]: { status: string; data?: any; error?: any } } = {};

const corsOptions = {
  origin: ['http://127.0.0.1:3000', 'http://localhost:3000'],
  methods: ['POST', 'GET'],
  allowedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions));
app.use(express.json());

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '../../')));
app.use('/scripts', express.static(path.join(__dirname, '../../scripts')));
app.use('/styles', express.static(path.join(__dirname, '../../styles')));

// Endpoint to check the status of a job
app.get('/api/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs[jobId];

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.status(200).json(job);
});

// Set up multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  },
});

app.post('/api/transcribe', upload.single('audio'), (req, res) => {
  console.log('Request received to transcribe');
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const actionParam = typeof req.query.action === 'string' ? req.query.action : undefined;
  const action = actionParam === 'summarize_short' || actionParam === 'summarize_long' ? actionParam : 'transcribe';

  const jobId = crypto.randomBytes(16).toString('hex');
  jobs[jobId] = { status: 'processing', data: { action } };

  // Immediately respond with the jobId
  res.status(202).json({ jobId });

  const filePath = req.file.path;
  console.log(`[${jobId}] File received: ${filePath}`);

  const command = `whisper ${filePath} --model tiny`;
  console.log(`[${jobId}] Executing command: ${command}`);

  exec(command, async (error, stdout, stderr) => {
    console.log(`[${jobId}] Whisper process finished.`);

    // Clean up the uploaded file
    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr) {
        console.error(`[${jobId}] Error deleting file: ${unlinkErr}`);
      }
    });

    if (error) {
      console.error(`[${jobId}] Error executing whisper: ${error.message}`);
      jobs[jobId] = { status: 'failed', error: stderr };
    } else {
      console.log(`[${jobId}] Transcription successful.`);
      const cleanTranscription = stdout.trim();

      const isSummaryAction = action === 'summarize_short' || action === 'summarize_long';

      if (isSummaryAction) {
        const systemPrompt =
          action === 'summarize_short'
            ? 'Tu tarea es crear un resumen muy breve, en un solo párrafo, del texto proporcionado. El texto es una transcripción de un audio y puede contener información adicional al principio, como el idioma detectado. Ignora por completo cualquier metadato o información sobre el proceso de transcripción y céntrate únicamente en el contenido del diálogo o el discurso. El resumen debe capturar la idea principal del audio de forma concisa.'
            : 'Tu tarea es crear un resumen más extenso y detallado del texto proporcionado. El texto es una transcripción de un audio y puede contener información adicional al principio, como el idioma detectado. Ignora por completo cualquier metadato o información sobre el proceso de transcripción y céntrate únicamente en el contenido del diálogo o el discurso. El resumen debe ser profundo, capturando no solo los puntos principales sino también los matices, ideas secundarias y conexiones entre conceptos. Escribe el resumen como un texto continuo coherente, sin títulos ni puntos de lista, desarrollando cada aspecto importante del contenido en párrafos estructurados que mantengan el flujo lógico del tema tratado. Haz el resumen en español y si es muy extenso, divídelo en varios párrafos para mejorar la legibilidad.';

        try {
          const summary = await generateSummary(cleanTranscription, systemPrompt);
          jobs[jobId] = {
            status: 'completed',
            data: {
              action,
              transcription: cleanTranscription,
              summary,
            },
          };
        } catch (summaryError) {
          console.error(`[${jobId}] Error generating summary:`, summaryError);
          jobs[jobId] = {
            status: 'failed',
            error:
              summaryError instanceof Error
                ? summaryError.message
                : 'Error generating summary.',
          };
        }
      } else {
        jobs[jobId] = {
          status: 'completed',
          data: { action, transcription: cleanTranscription },
        };
      }
    }
  });
});

const lmstudio = new OpenAI({
  baseURL: 'http://127.0.0.1:1234/v1',
  apiKey: 'not-needed',
});

const llm = "qwen/qwen3-4b-2507";

async function generateSummary(transcription: string, systemPrompt: string): Promise<string> {
  try {
    const response = await lmstudio.chat.completions.create({
      model: llm,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcription },
      ],
      temperature: 0.7,
    });

    const message = response.choices?.[0]?.message;
    const rawContent = message?.content;

    let summaryText: string | undefined;

    if (typeof rawContent === 'string') {
      summaryText = rawContent.trim();
    } else if (Array.isArray(rawContent)) {
      const arrayContent = rawContent as Array<unknown>;
      summaryText = arrayContent
        .map((part: unknown) => {
          if (typeof part === 'string') {
            return part;
          }
          if (part && typeof part === 'object' && 'text' in part) {
            const textValue = (part as { text?: unknown }).text;
            return typeof textValue === 'string' ? textValue : '';
          }
          return '';
        })
        .join('')
        .trim();
    }

    return summaryText && summaryText.length > 0
      ? summaryText
      : 'Resumen no disponible.';
  } catch (error) {
    console.error('Error connecting to LM Studio:', error);
    throw new Error('Error generating summary.');
  }
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});