/**
 * @file Manages the primary user interactions on the main page (index.html).
 * @summary This script handles audio file selection, API key validation,
 * making requests to the backend for transcription/summarization, and
 * polling for results to display to the user.
 * @author Pablo Vega
 * @version 1.0.0
 */

export const validateApiKey = (apiKey) => {
  const trimmedKey = apiKey.trim();

  if (trimmedKey.length === 0) {
    return {
      isValid: false,
      error: 'API key cannot be empty.',
    };
  }

  if (trimmedKey.length < 45) {
    return {
      isValid: false,
      error: 'API key is too short. OpenAI API keys are at least 45 characters.',
    };
  }

  if (trimmedKey.length > 56) {
    return {
      isValid: false,
      error: 'API key is too long. Please verify you copied the correct key.',
    };
  }

  if (!trimmedKey.startsWith('sk-')) {
    return {
      isValid: false,
      error: 'API key format is invalid. OpenAI API keys start with "sk-".',
    };
  }

  if (!/^sk-[A-Za-z0-9_-]+$/.test(trimmedKey)) {
    return {
      isValid: false,
      error: 'API key contains invalid characters. Only alphanumeric characters, hyphens, and underscores are allowed.',
    };
  }

  return { isValid: true, error: null };
};

console.log('action.js script loaded');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded and parsed');

  /** @type {HTMLInputElement} */
  const audioFile = document.getElementById('audioFile');
  /** @type {HTMLButtonElement} */
  const transcribeBtn = document.getElementById('transcribeBtn');
  /** @type {HTMLButtonElement} */
  const shortSummaryBtn = document.getElementById('shortSummaryBtn');
  /** @type {HTMLButtonElement} */
  const longSummaryBtn = document.getElementById('longSummaryBtn');
  /** @type {HTMLDivElement} */
  const responseDiv = document.getElementById('response');

  /**
   * Validates if a file is actually an audio file based on its MIME type and extension.
   * {@param {File} file - The file to validate.
   * @returns {boolean} True if the file is a valid audio file, false otherwise.}
   */

  const isValidAudioFile = (file) => {
    const validAudioMimeTypes = [
      'audio/mpeg',        // .mp3
      'audio/mp3',         // .mp3 (alternativo)
      'audio/wav',         // .wav
      'audio/wave',        // .wav (alternativo)
      'audio/x-wav',       // .wav (alternativo)
      'audio/mp4',         // .m4a
      'audio/x-m4a',       // .m4a (alternativo)
      'audio/aac',         // .aac
      'audio/ogg',         // .ogg
      'audio/flac',        // .flac
      'audio/webm',        // .webm
      'audio/3gpp',        // .3gp
      'audio/3gpp2',       // .3g2
      'audio/x-ms-wma',    // .wma
    ];

    const validAudioExtensions = [
      '.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.webm', '.3gp', '.3g2', '.wma'
    ];

    const isValidMymeType = validAudioMimeTypes.includes(file.type.toLowerCase());

    const isValidExtension = validAudioExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    return isValidMymeType && isValidExtension;
  };
  /**
   * Polls the backend for the status of a job and updates the UI accordingly.
   * The polling continues until the job is 'completed' or 'failed'.
   *
   * @param {string} jobId - The unique identifier for the job to poll.
   * @param {'transcribe' | 'summarize_short' | 'summarize_long'} action - The action being performed, used to display the correct status message.
   * @returns {void}
   * @effects
   * - Sets an interval that repeatedly fetches data from the `/api/status/:jobId` endpoint.
   * - Updates the `textContent` of `responseDiv` with the current status or final result.
   * - Clears the interval once the job is finished.
   */
  const pollForResult = (jobId, action) => {
    const isSummary = action === 'summarize_short' || action === 'summarize_long';
    const statusMessage = isSummary ? 'Transcribing and summarizing...' : 'Transcribing...';
    responseDiv.textContent = statusMessage;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`https://transcribe-summarize.onrender.com/api/status/${jobId}`);
        if (!res.ok) throw new Error(`Polling failed: ${res.statusText}`);
        const result = await res.json();

        if (result.status === 'completed') {
          clearInterval(intervalId);
          const rawTranscription = result.data?.transcription || '';
          // Basic cleaning of transcription metadata if any.
          const cleanTranscription = rawTranscription.replace(/\([^\)]+\)/g, '').trim();

          if (isSummary) {
            const summary = (result.data && result.data.summary) || 'Resumen no disponible.';
            responseDiv.textContent = summary;
          } else {
            responseDiv.textContent = cleanTranscription;
          }
          responseDiv.style.color = 'black';

        } else if (result.status === 'failed') {
          clearInterval(intervalId);
          const errorMessage = result.error || 'Processing failed.';
          responseDiv.textContent = `Transcription failed: ${errorMessage}`;
          responseDiv.style.color = 'red';
        } else {
          responseDiv.textContent = statusMessage; // Keep showing processing message
        }
      } catch (error) {
        clearInterval(intervalId);
        console.error('Error during polling:', error);
        responseDiv.textContent = `Error: ${error.message}`;
        responseDiv.style.color = 'red';
      }
    }, 2000);
  };

  /**
   * Handles the user's request to perform an action (transcribe or summarize).
   * It validates user input, retrieves the API key, and sends the request to the backend.
   *
   * @async
   * @param {'transcribe' | 'summarize_short' | 'summarize_long'} action - The specific action to be performed.
   * @returns {Promise<void>} A promise that resolves when the request has been sent.
   * @effects
   * - Reads the selected audio file from the input element.
   * - Reads the 'openAiApiKey' from `localStorage`.
   * - Displays error messages in `responseDiv` if the file or API key is missing.
   * - Makes a POST request to the `/api/transcribe` endpoint with the audio file and API key.
   * - Initiates polling for the result by calling `pollForResult`.
   */
  const handleRequest = async (action) => {
    const file = audioFile.files[0];
    if (!file) {
      responseDiv.textContent = 'Please select an audio file.';
      responseDiv.style.color = 'red';
      return;
    }

    if (!isValidAudioFile(file)) {
      responseDiv.textContent = 'Invalid audio file type. Please select a valid audio file.';
      responseDiv.style.color = 'red';
      return;
    }

    const maxFileSize = 25 * 1024 * 1024; // 25 MB
    if (file.size > maxFileSize) {
      responseDiv.textContent = 'File size exceeds the 25 MB limit. Please select a smaller file.';
      responseDiv.style.color = 'red';
      return;
    }

    const apiKey = localStorage.getItem('openAiApiKey');
    if (!apiKey) {
      responseDiv.textContent = 'OpenAI API Key not found. Please set it in the settings page.';
      responseDiv.style.color = 'red';
      return;
    }

    const apikeyValidation = validateApiKey(apiKey);
    if (!apikeyValidation.isValid) {
      responseDiv.textContent = `Invalid API Key: ${apikeyValidation.error}`;
      responseDiv.style.color = 'red';
      return;
    }

    const formData = new FormData();
    formData.append('audio', file);

    responseDiv.style.color = '#555';

    try {
      const url = new URL('https://transcribe-summarize.onrender.com/api/transcribe');
      url.searchParams.set('action', action);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error(`Transcription request failed: ${res.statusText}`);

      const data = await res.json();
      if (data.jobId) {
        pollForResult(data.jobId, action);
      } else {
        throw new Error('Did not receive a valid Job ID.');
      }
    } catch (error) {
      console.error('Error in initial request:', error);
      responseDiv.textContent = `Error: ${error.message}`;
      responseDiv.style.color = 'red';
    }
  };

  // Attach event listeners to the action buttons.
  if (transcribeBtn) {
    transcribeBtn.addEventListener('click', () => handleRequest('transcribe'));
  }
  if (shortSummaryBtn) {
    shortSummaryBtn.addEventListener('click', () => handleRequest('summarize_short'));
  }
  if (longSummaryBtn) {
    longSummaryBtn.addEventListener('click', () => handleRequest('summarize_long'));
  }
});