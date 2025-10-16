/**
 * @file Manages the primary user interactions on the main page (index.html).
 * @summary This script handles audio file selection, API key validation,
 * making requests to the backend for transcription/summarization, and
 * polling for results to display to the user.
 * @author Jules
 * @version 1.0.0
 */

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
        const res = await fetch(`http://localhost:3000/api/status/${jobId}`);
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

    const apiKey = localStorage.getItem('openAiApiKey');
    if (!apiKey) {
      responseDiv.textContent = 'OpenAI API Key not found. Please set it in the settings page.';
      responseDiv.style.color = 'red';
      return;
    }

    const formData = new FormData();
    formData.append('audio', file);

    responseDiv.style.color = '#555';

    try {
      const url = new URL('http://localhost:3000/api/transcribe');
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