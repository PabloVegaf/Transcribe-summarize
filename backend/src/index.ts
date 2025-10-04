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
  origin: '*',
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
const upload = multer({ dest: 'uploads/' });

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

  const lang = 'es';
  const command = `bash -c "source /home/pablo/IA/whisper_env/bin/activate && whisper \"${filePath}\" --model tiny --output_dir /tmp --output_format txt --language ${lang} > /dev/null 2>&1 && cat \"/tmp/$(basename \"${filePath}\").txt\""`; // Para mejores resultados, usar modelos más grandes como base, small, medium, large o turbo.
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
      // Sanitize stdout before sending - remove timestamps, language detection, and other metadata
      const cleanTranscription = cleanWhisperOutput(stdout);
      if (action === 'summarize_short') {
        try {
          const summary = await generateShortSummary(cleanTranscription);
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
      } else if (action === 'summarize_long') {
        try {
          const summary = await generateLongSummary(cleanTranscription);
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
  baseURL: 'http://127.0.0.1:1234/v1', // Instancia local de LM Studio
  apiKey: 'not-needed', // Necesaria si se usara una api externa
});

  const llm = "qwen/qwen3-4b-2507";
  
async function generateShortSummary(transcription: string): Promise<string> {
  try {
    const systemPrompt =
      'Tu tarea es actuar como un narrador que explica brevemente de qué trata el contenido del audio. El texto es una transcripción y puede incluir información adicional como el idioma detectado. No hagas un resumen tradicional, sino que explica en un solo párrafo qué tipo de contenido tiene el audio, cuál es su propósito o temática principal, y qué puede esperar un oyente. Tu explicación debe ser concisa y enfocarse en la naturaleza del contenido, no en los detalles específicos de la transcripción.';
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
      : 'Resumen no disponible.'; // Devuelve solo el contenido del mensaje, si no recibe nada, lo indica.
  } catch (error) {
    console.error('Error connecting to LM Studio:', error);
    throw new Error('Error generating summary.');
  }
}

async function generateLongSummary(transcription: string): Promise<string> {
  try {
    const systemPrompt =
      'Como narrador experto, proporciona directamente una explicación detallada sobre el contenido del audio que se te proporciona. No saludes ni hagas referencias a la transcripción que se te ha compartido. No digas \"gracias por tu mensaje\" ni \"parece que estás compartiendo\". Simplemente analiza el contenido del audio y explica en profundidad de qué se trata: su propósito, temática principal, estilo, contexto, objetivos, características especiales y cualquier elemento que defina el contenido. Estructura tu explicación en varios párrafos narrativos y detallados en español, enfocándote exclusivamente en explicar qué tipo de contenido tiene el audio y qué puede esperar un oyente.';
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
      : 'Resumen no disponible.'; // Devuelve solo el contenido del mensaje, si no recibe nada, lo indica.
  } catch (error) {
    console.error('Error connecting to LM Studio:', error);
    throw new Error('Error generating summary.');
  }
}

// Function to clean Whisper output by removing timestamps, language detection, and other metadata
function cleanWhisperOutput(output: string): string {
  // Split the output into lines
  const lines = output.split('\n');
  
  // Regular expression to match timestamps in formats like:
  // [00:00.000 --> 00:05.000] or 0:00:00.000 --> 0:00:05.000
  const timestampRegex = /^[\d:\[\].\-> ]+$/;
  
  // Filter out lines that contain only timestamps, language detection, or are empty
  const filteredLines = lines.filter(line => {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) return false;
    
    // Skip language detection lines
    if (/^Detected language:/i.test(trimmedLine)) return false;
    
    // Skip lines that contain only timestamps
    if (timestampRegex.test(trimmedLine)) return false;
    
    // Skip lines that look like file metadata like "Saving [format] to [filename]"
    if (/^Saving.*to.*\.(txt|json|srt|vtt|tsv)$/i.test(trimmedLine)) return false;
    
    // Keep the actual transcription text
    return true;
  });
  
  // Join the filtered lines and clean up any remaining whitespace
  return filteredLines.join(' ').trim();
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});