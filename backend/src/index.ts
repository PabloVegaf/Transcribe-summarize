import express from 'express';
import multer from 'multer';
import { exec } from 'child_process';
import fs from 'fs';
import cors from 'cors';

const app = express();
const port = 3000;

const corsOptions = {
  origin: 'http://127.0.0.1:5500',
  methods: ['POST'],
  allowedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions));
app.options('/api/transcribe', cors(corsOptions)); // enable pre-flight request for POST

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

app.post('/api/transcribe', upload.single('audio'), (req, res) => {
  if (!req.file) {
    console.log('No file uploaded.');
    return res.status(400).send('No file uploaded.');
  }

  const filePath = req.file.path;
  console.log(`File received: ${filePath}`);

  const command = `bash -c "source /home/pablo/IA/whisper_env/bin/activate && whisper ${filePath} --model tiny"`;
  console.log(`Executing command: ${command}`);

  exec(command, (error, stdout, stderr) => {
    console.log('Whisper process finished.');

    // Clean up the uploaded file
    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr) {
        console.error(`Error deleting file: ${unlinkErr}`);
      }
    });

    if (error) {
      console.error(`Error executing whisper: ${error.message}`);
      console.error(`Stderr: ${stderr}`);
      return res.status(500).send({ error: 'Failed to transcribe audio.', details: stderr });
    }

    console.log(`Stdout: ${stdout}`);
    res.send({ transcription: stdout });
  });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
