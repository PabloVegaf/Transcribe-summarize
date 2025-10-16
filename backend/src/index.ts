/**
 * @file Manages the backend server for the Transcribe-Summarize application.
 * @summary This file sets up an Express server to handle audio uploads,
 * process them using the OpenAI API for transcription and summarization,
 * and provide job status updates to the client.
 * @author Jules
 * @version 1.0.0
 */

import express from 'express';
import multer from 'multer';
import fs from 'fs';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import OpenAI from 'openai';

const app = express();
const port = 3000;

/**
 * Represents the state of a single processing job.
 * @property {'processing' | 'completed' | 'failed'} status - The current status of the job.
 * @property {any} [data] - The results of the job if completed (e.g., transcription, summary).
 * @property {string} [error] - Error message if the job failed.
 */
type Job = {
  status: 'processing' | 'completed' | 'failed';
  data?: any;
  error?: string;
};

/**
 * In-memory store for tracking the status of all active jobs.
 * Each key is a unique `jobId`, and the value is a `Job` object.
 * @type {Record<string, Job>}
 */
const jobs: Record<string, Job> = {};

/**
 * Configuration options for CORS (Cross-Origin Resource Sharing).
 * Allows requests from any origin and specifies permitted headers, including 'Authorization'.
 */
const corsOptions = {
  origin: 'https://transcribe-summarize.vercel.app/',
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

/**
 * Serves static files from the project's root, scripts, and styles directories.
 * This allows the frontend HTML, CSS, and JS files to be accessed by the browser.
 */
app.use(express.static(path.join(__dirname, '../../frontend')));

/**
 * @route GET /api/status/:jobId
 * @description Endpoint to check the status of a specific processing job.
 * @param {object} req - The Express request object.
 * @param {string} req.params.jobId - The unique identifier for the job.
 * @param {object} res - The Express response object.
 * @returns {void} Responds with the job object (200) or a not found error (404).
 */
app.get('/api/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs[jobId];

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.status(200).json(job);
});

/**
 * Multer instance configured to handle file uploads.
 * It saves uploaded files temporarily to the 'uploads/' directory,
 * preserving the original file extension to ensure compatibility with OpenAI API.
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const randomName = crypto.randomBytes(16).toString('hex');
    const extension = path.extname(file.originalname);
    cb(null, `${randomName}${extension}`);
  },
});

const upload = multer({ storage });

/**
 * @route POST /api/transcribe
 * @description Handles audio file uploads, initiates transcription and optional summarization jobs.
 * It requires the user's OpenAI API key to be sent in the 'Authorization' header.
 * @param {object} req - The Express request object, containing the uploaded file and headers.
 * @param {object} res - The Express response object.
 * @returns {void} Responds with a job ID (202) on success, or an error status (400, 401).
 * @effects Dispatches the job for asynchronous processing via `processJob`.
 */
app.post('/api/transcribe', upload.single('audio'), (req, res) => {
  console.log('Request received to transcribe');
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send('Authorization header with Bearer token is required.');
  }
  const apiKey = authHeader.split(' ')[1];

  const actionParam = typeof req.query.action === 'string' ? req.query.action : undefined;
  const action = actionParam === 'summarize_short' || actionParam === 'summarize_long' ? actionParam : 'transcribe';

  const jobId = crypto.randomBytes(16).toString('hex');
  jobs[jobId] = { status: 'processing', data: { action } };

  res.status(202).json({ jobId });

  const filePath = req.file.path;
  console.log(`[${jobId}] File received: ${filePath}`);

  processJob(jobId, filePath, action, apiKey);
});

/**
 * Asynchronously processes a job by transcribing an audio file and optionally generating a summary.
 * It handles the entire lifecycle of the job, including API calls, state updates, and error management.
 *
 * @async
 * @param {string} jobId - The unique identifier for the job.
 * @param {string} filePath - The local path to the uploaded audio file.
 * @param {string} action - The requested action ('transcribe', 'summarize_short', 'summarize_long').
 * @param {string} apiKey - The user's OpenAI API key.
 * @returns {Promise<void>} A promise that resolves when the job is processed.
 * @effects
 * - Creates an OpenAI client.
 * - Makes API calls to OpenAI for transcription and summarization.
 * - Updates the global `jobs` object with the job status and result.
 * - Deletes the temporary audio file from the `uploads/` directory.
 */
async function processJob(jobId: string, filePath: string, action: string, apiKey: string) {
  try {
    const openai = new OpenAI({ apiKey });

    console.log(`[${jobId}] Transcribing with OpenAI API...`);
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
      language: 'es',
    });
    const cleanTranscription = transcription.text;
    console.log(`[${jobId}] Transcription successful.`);

    if (action === 'summarize_short' || action === 'summarize_long') {
      const summary = await generateSummary(cleanTranscription, action, openai);
      jobs[jobId] = {
        status: 'completed',
        data: {
          action,
          transcription: cleanTranscription,
          summary,
        },
      };
    } else {
      jobs[jobId] = {
        status: 'completed',
        data: { action, transcription: cleanTranscription },
      };
    }
  } catch (error: any) {
    console.error(`[${jobId}] Error processing job:`, error);
    jobs[jobId] = {
      status: 'failed',
      error: error.message || 'An unknown error occurred during processing.',
    };
  } finally {
    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr) {
        console.error(`[${jobId}] Error deleting file: ${unlinkErr}`);
      }
    });
  }
}

/**
 * Generates a summary for a given transcription using the OpenAI Chat API.
 * It selects a system prompt based on whether a short or long summary is requested.
 *
 * @async
 * @param {string} transcription - The text content to be summarized.
 * @param {'summarize_short' | 'summarize_long'} action - The type of summary to generate.
 * @param {OpenAI} openai - An initialized OpenAI client instance to use for the API call.
 * @returns {Promise<string>} A promise that resolves to the generated summary text.
 * @throws {Error} If the API call fails or returns an unexpected response.
 */
async function generateSummary(
  transcription: string,
  action: 'summarize_short' | 'summarize_long',
  openai: OpenAI,
): Promise<string> {
  const prompts = {
    summarize_short:
      'Tu tarea es actuar como un narrador que explica brevemente de qué trata el contenido del audio. El texto es una transcripción y puede incluir información adicional como el idioma detectado. No hagas un resumen tradicional, sino que explica en un solo párrafo qué tipo de contenido tiene el audio, cuál es su propósito o temática principal, y qué puede esperar un oyente. Tu explicación debe ser concisa y enfocarse en la naturaleza del contenido, no en los detalles específicos de la transcripción.',
    summarize_long:
      'Como narrador experto, proporciona directamente una explicación detallada sobre el contenido del audio que se te proporciona. No saludes ni hagas referencias a la transcripción que se te ha compartido. No digas "gracias por tu mensaje" ni "parece que estás compartiendo". Simplemente analiza el contenido del audio y explica en profundidad de qué se trata: su propósito, temática principal, estilo, contexto, objetivos, características especiales y cualquier elemento que defina el contenido. Estructura tu explicación en varios párrafos narrativos y detallados en español, enfocándote exclusivamente en explicar qué tipo de contenido tiene el audio y qué puede esperar un oyente.',
  };

  const systemPrompt = prompts[action];
  const model = 'gpt-5-nano-2025-08-07';

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcription },
      ]
    });

    const summary = response.choices?.[0]?.message?.content?.trim();
    return summary || 'Resumen no disponible.';
  } catch (error) {
    console.error('Error generating summary with OpenAI:', error);
    throw new Error('Error generating summary.');
  }
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});