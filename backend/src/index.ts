import express from 'express';
import multer from 'multer';
import { exec } from 'child_process';
import fs from 'fs';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';

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

  const jobId = crypto.randomBytes(16).toString('hex');
  jobs[jobId] = { status: 'processing' };

  // Immediately respond with the jobId
  res.status(202).json({ jobId });

  const filePath = req.file.path;
  console.log(`[${jobId}] File received: ${filePath}`);

  const command = `bash -c "source /home/pablo/IA/whisper_env/bin/activate && whisper ${filePath} --model tiny"`;
  console.log(`[${jobId}] Executing command: ${command}`);

  exec(command, (error, stdout, stderr) => {
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
      // Sanitize stdout before sending
      const cleanTranscription = stdout.trim();
      jobs[jobId] = { status: 'completed', data: { transcription: cleanTranscription } };

    }
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});
