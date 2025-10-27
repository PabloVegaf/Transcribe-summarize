/**
 * @file Manages the functionality of the settings page (settings.html).
 * @summary This script handles loading the OpenAI API key from localStorage,
 * saving it when the user submits the form, and toggling the visibility
 * of the key in the input field.
 * @author Pablo Vega
 * @version 1.0.0
 */

import { validateApiKey } from './action.js';

document.addEventListener('DOMContentLoaded', () => {
    /** @type {HTMLFormElement} */
    const apiSettingsForm = document.getElementById('apiSettingsForm');
    /** @type {HTMLInputElement} */
    const openAiApiKeyInput = document.getElementById('openAiApiKey');
    /** @type {HTMLDivElement} */
    const feedbackDiv = document.getElementById('feedback');
    /** @type {HTMLButtonElement} */
    const toggleOpenAiApiKey = document.getElementById('toggleOpenAiApiKey');

    // Load the saved API key from localStorage into the input field on page load.
    if (openAiApiKeyInput) {
        openAiApiKeyInput.value = localStorage.getItem('openAiApiKey') || '';

        openAiApiKeyInput.setAttribute('maxlength', '56');
        openAiApiKeyInput.setAttribute('minlength', '45');
        openAiApiKeyInput.setAttribute('pattern', 'sk-[A-Za-z0-9_-]+');
        openAiApiKeyInput.setAttribute('placeholder', 'sk-...');
        openAiApiKeyInput.setAttribute('autocomplete', 'off');
        openAiApiKeyInput.setAttribute('spellcheck', 'false');
    }

    /**
     * Toggles the visibility of a password input field and updates the button icon.
     *
     * @param {HTMLInputElement} input - The input field to toggle (e.g., password/text).
     * @param {HTMLButtonElement} button - The button whose innerHTML (icon) will be updated.
     * @returns {void}
     */
    const toggleVisibility = (input, button) => {
        if (input.type === 'password') {
            input.type = 'text';
            // Icon for "visible" state
            button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clip-rule="evenodd" />
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                </svg>`;
        } else {
            input.type = 'password';
            // Icon for "hidden" state
            button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                    <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                                </svg>`;
        }
    };

    // Attach event listener to the visibility toggle button.
    if (toggleOpenAiApiKey) {
        toggleOpenAiApiKey.addEventListener('click', () => toggleVisibility(openAiApiKeyInput, toggleOpenAiApiKey));
    }

    // Attach event listener to the form submission.
    if (apiSettingsForm) {
        apiSettingsForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const openAiKey = openAiApiKeyInput.value.trim();
            const validation = validateApiKey(openAiKey);

            if (!validation.isValid) {
                feedbackDiv.textContent = validation.error;
                feedbackDiv.style.color = 'red';
                return;
            }

            // Save the key to localStorage only after passing validation.
            localStorage.setItem('openAiApiKey', openAiKey);

            feedbackDiv.textContent = 'Settings saved successfully!';
            feedbackDiv.style.color = 'green';

            setTimeout(() => {
                feedbackDiv.textContent = '';
            }, 3000);
        });
    }
});