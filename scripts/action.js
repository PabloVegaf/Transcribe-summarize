console.log('action.js script loaded');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded and parsed');

  const audioFile = document.getElementById('audioFile');
  const transcribeBtn = document.getElementById('transcribeBtn');
  const shortSummaryBtn = document.getElementById('shortSummaryBtn');
  const longSummaryBtn = document.getElementById('longSummaryBtn');
  const responseDiv = document.getElementById('response');

  const pollForResult = (jobId) => {
    responseDiv.textContent = `Transcribing...`;
    const intervalId = setInterval(async () => {
      try {
        console.log(`Polling for job: ${jobId}`);
        const res = await fetch(`http://localhost:3000/api/status/${jobId}`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const result = await res.json();

        if (result.status === 'completed') {
          clearInterval(intervalId);
          const transcription = result.data.transcription;
          const trimmedTranscription = transcription ? transcription.trim() : '';

          const debugMessage = `DEBUG INFO: Job Complete. Raw Text: [${transcription}]. Length: ${transcription ? transcription.length : 'N/A'}. Trimmed Length: ${trimmedTranscription.length}.`;

          if (trimmedTranscription !== '') {
            const startIndex = transcription.lastIndexOf(']') + 1;
            const cleanTranscription = transcription.substring(startIndex).trim();
            responseDiv.textContent = cleanTranscription;
          } else {
            responseDiv.textContent = debugMessage + ' (Result appears to be empty). Please check the generated files in the backend for the transcription.';
          }
          responseDiv.style.color = 'black';
          console.log(debugMessage);

        } else if (result.status === 'failed') {
          clearInterval(intervalId);
          responseDiv.textContent = `Transcription failed: ${result.error}`;
          responseDiv.style.color = 'red';
          console.error('Job failed:', result);
        } else {
          // Still processing, update visual feedback
          responseDiv.textContent = `Transcribing...`;
          console.log('Job status:', result.status);
        }
      } catch (error) {
        clearInterval(intervalId);
        console.error('Error during polling:', error);
        responseDiv.textContent = `Polling failed: ${error.message}`;
        responseDiv.style.color = 'red';
      }
    }, 2000); // Poll every 2 seconds
  };

  const handleRequest = async (event) => {
    console.log('handleRequest function called');
    event.preventDefault();

    const file = audioFile.files[0];
    if (!file) {
      responseDiv.textContent = 'Please select an audio file.';
      responseDiv.style.color = 'red';
      return;
    }

    const formData = new FormData();
    formData.append('audio', file);

    responseDiv.style.color = '#555';

    try {
      const res = await fetch('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      if (data.jobId) {
        console.log(`Job started with ID: ${data.jobId}`);
        pollForResult(data.jobId);
      } else {
        throw new Error('Did not receive a valid Job ID.');
      }
    } catch (error) {
      console.error('Error in initial request:', error);
      responseDiv.textContent = `Error starting transcription: ${error.message}`;
      responseDiv.style.color = 'red';
    }
  };

  if (transcribeBtn) {
    transcribeBtn.addEventListener('click', handleRequest);
  }
  if (shortSummaryBtn) {
    shortSummaryBtn.addEventListener('click', handleRequest);
  }
  if (longSummaryBtn) {
    longSummaryBtn.addEventListener('click', handleRequest);
  }
});
