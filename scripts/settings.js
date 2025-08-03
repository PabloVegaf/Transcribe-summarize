
document.addEventListener('DOMContentLoaded', () => {
    const apiSettingsForm = document.getElementById('apiSettingsForm');
    const groqApiKeyInput = document.getElementById('groqApiKey');
    const googleApiKeyInput = document.getElementById('googleApiKey');
    const feedbackDiv = document.getElementById('feedback');
    const toggleGroqApiKey = document.getElementById('toggleGroqApiKey');
    const toggleGoogleApiKey = document.getElementById('toggleGoogleApiKey');

    // Load saved keys on page load
    if (groqApiKeyInput) {
        groqApiKeyInput.value = localStorage.getItem('groqApiKey') || '';
    }
    if (googleApiKeyInput) {
        googleApiKeyInput.value = localStorage.getItem('googleApiKey') || '';
    }

    const toggleVisibility = (input, button) => {
        if (input.type === 'password') {
            input.type = 'text';
            button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clip-rule="evenodd" />
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                </svg>`;
        } else {
            input.type = 'password';
            button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                    <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                                </svg>`;
        }
    };

    if (toggleGroqApiKey) {
        toggleGroqApiKey.addEventListener('click', () => toggleVisibility(groqApiKeyInput, toggleGroqApiKey));
    }

    if (toggleGoogleApiKey) {
        toggleGoogleApiKey.addEventListener('click', () => toggleVisibility(googleApiKeyInput, toggleGoogleApiKey));
    }

    if (apiSettingsForm) {
        apiSettingsForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const groqKey = groqApiKeyInput.value.trim();
            const googleKey = googleApiKeyInput.value.trim();

            localStorage.setItem('groqApiKey', groqKey);
            localStorage.setItem('googleApiKey', googleKey);

            feedbackDiv.textContent = 'Settings saved successfully!';
            feedbackDiv.style.color = 'green';

            setTimeout(() => {
                feedbackDiv.textContent = '';
            }, 3000);
        });
    }
});
