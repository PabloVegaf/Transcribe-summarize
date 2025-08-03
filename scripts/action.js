console.log('action.js script loaded');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded and parsed');

  const audioFile = document.getElementById('audioFile');
  const transcribeBtn = document.getElementById('transcribeBtn');
  const shortSummaryBtn = document.getElementById('shortSummaryBtn');
  const longSummaryBtn = document.getElementById('longSummaryBtn');
  const responseDiv = document.getElementById('response');

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

    try {
      const res = await fetch('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log('Data received from backend:', data);

      if (data.text) {
        responseDiv.textContent = data.text;
      } else {
        responseDiv.textContent = JSON.stringify(data, null, 2);
      }
      responseDiv.style.color = 'black';
    } catch (error) {
      console.error('Error in handleRequest:', error);
      responseDiv.textContent = 'Error processing request. See console for details.';
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
