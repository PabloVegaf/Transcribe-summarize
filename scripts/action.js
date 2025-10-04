console.log('action.js script loaded');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');

    const audioFile = document.getElementById('audioFile');
    const transcribeBtn = document.getElementById('transcribeBtn');
    const shortSummaryBtn = document.getElementById('shortSummaryBtn');
    const longSummaryBtn = document.getElementById('longSummaryBtn');
    const responseDiv = document.getElementById('response');

    const setButtonsDisabled = (disabled) => {
        if (transcribeBtn) transcribeBtn.disabled = disabled;
        if (shortSummaryBtn) shortSummaryBtn.disabled = disabled;
        if (longSummaryBtn) longSummaryBtn.disabled = disabled;
    };

    const pollForResult = (jobId, action) => {
        const isSummary = action === 'summarize_short' || action === 'summarize_long';
        const statusMessage = isSummary ? 'Transcribing and summarizing...' : 'Transcribing...';
        responseDiv.textContent = statusMessage;

        const intervalId = setInterval(async () => {
            try {
                const res = await fetch(`/api/status/${jobId}`);
                if (!res.ok) throw new Error(`Polling failed: ${res.statusText}`);
                const result = await res.json();

                if (result.status === 'completed') {
                    clearInterval(intervalId);
                    setButtonsDisabled(false);
                    const rawTranscription = result.data?.transcription || '';
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
                    setButtonsDisabled(false);
                    const errorMessage = result.error || 'Processing failed.';
                    responseDiv.textContent = `Transcription failed: ${errorMessage}`;
                    responseDiv.style.color = 'red';
                } else {
                    responseDiv.textContent = statusMessage; // Keep showing processing message
                }
            } catch (error) {
                clearInterval(intervalId);
                setButtonsDisabled(false);
                console.error('Error during polling:', error);
                responseDiv.textContent = `Error: ${error.message}`;
                responseDiv.style.color = 'red';
            }
        }, 2000);
    };

    const handleRequest = async (action) => {
        const file = audioFile.files[0];
        if (!file) {
            responseDiv.textContent = 'Please select an audio file.';
            responseDiv.style.color = 'red';
            return;
        }

        setButtonsDisabled(true);

        const formData = new FormData();
        formData.append('audio', file);

        responseDiv.style.color = '#555';

        try {
            const url = new URL('/api/transcribe', window.location.origin);
            url.searchParams.set('action', action);

            const res = await fetch(url, {
                method: 'POST',
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
            setButtonsDisabled(false);
            console.error('Error in initial request:', error);
            responseDiv.textContent = `Error: ${error.message}`;
            responseDiv.style.color = 'red';
        }
    };

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