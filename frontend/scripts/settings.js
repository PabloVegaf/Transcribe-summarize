/**
 * @file Manages the functionality of the settings page (settings.html).
 * @summary This script handles loading the OpenAI API key from localStorage,
 * saving it when the user submits the form, toggling the visibility
 * of the key in the input field, and providing real-time validation feedback.
 * 
 * Security features:
 * - Validates API key format before saving (using imported validateApiKey function)
 * - Uses HTML5 validation attributes as first line of defense
 * - Prevents API key from appearing in URL by using preventDefault on form submission
 * - Stores API key only in localStorage (client-side storage)
 * - Provides clear error messages for invalid keys
 */

import { validateApiKey } from './validators.js';

document.addEventListener('DOMContentLoaded', () => {
    /** @type {HTMLFormElement} */
    const apiSettingsForm = document.getElementById('apiSettingsForm');
    /** @type {HTMLInputElement} */
    const openAiApiKeyInput = document.getElementById('openAiApiKey');
    /** @type {HTMLInputElement} */
    const transcriptorModelInput = document.getElementById('transcriptorModel');
    /** @type {HTMLInputElement} */
    const llmResumidorInput = document.getElementById('model');
    /** @type {HTMLDivElement} */
    const feedbackDiv = document.getElementById('feedback');
    /** @type {HTMLButtonElement} */
    const toggleOpenAiApiKey = document.getElementById('toggleOpenAiApiKey');
    /**
     * Displays a feedback message to the user with appropriate styling.
     * 
     * @param {string} message - The message to display
     * @param {'success' | 'error' | 'info'} type - The type of message
     * @param {number} [duration=3000] - How long to display the message (0 for persistent)
     */
    const showFeedback = (message, type, duration = 3000) => {
        feedbackDiv.textContent = message;
        feedbackDiv.style.color = type === 'success' ? 'green' : type === 'error' ? 'red' : '#555';
        feedbackDiv.style.fontWeight = type === 'error' ? 'bold' : 'normal';

        if (duration > 0) {
            setTimeout(() => {
                feedbackDiv.textContent = '';
            }, duration);
        }
    };

    /**
     * Sanitizes the API key by trimming whitespace.
     * This prevents accidental spaces from being stored.
     * 
     * @param {string} key - The API key to sanitize
     * @returns {string} The sanitized API key
     */
    const sanitizeApiKey = (key) => {
        return key.trim();
    };

    // Load the saved API key from localStorage into the input field on page load.
    if (openAiApiKeyInput) {
        const savedKey = localStorage.getItem('openAiApiKey');
        openAiApiKeyInput.value = savedKey ? sanitizeApiKey(savedKey) : '';
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

    /**
     * Handles form submission for saving the API key.
     * 
     * Security measures:
     * 1. Prevents default form submission to avoid API key appearing in URL
     * 2. Sanitizes input by trimming whitespace
     * 3. Validates API key format using validateApiKey function
     * 4. Only saves to localStorage after successful validation
     * 
     * @param {Event} event - The form submission event
     */
    const handleFormSubmit = (event) => {
        // CRITICAL: Prevent default form submission to avoid API key in URL
        event.preventDefault();

        // Sanitize the input
        const openAiKey = sanitizeApiKey(openAiApiKeyInput.value);
        const transcriptorModel = transcriptorModelInput.value.trim();
        const llmResumidor = llmResumidorInput.value.trim();

        // Add console.log to show the values of the inputs
        console.log('Transcriptor Model:', transcriptorModel);
        console.log('LLM Resumidor:', llmResumidor);

        // Validate the API key format
        const validation = validateApiKey(openAiKey);

        if (!validation.isValid) {
            // Display validation error
            showFeedback(validation.error, 'error', 0);

            // Add visual feedback to the input field
            openAiApiKeyInput.classList.add('border-red-500');
            setTimeout(() => {
                openAiApiKeyInput.classList.remove('border-red-500');
            }, 3000);

            return;
        }

        // Validation passed - save the sanitized key and models to localStorage
        localStorage.setItem('openAiApiKey', openAiKey);
        localStorage.setItem('transcriptorModel', transcriptorModel);
        localStorage.setItem('llmResumidor', llmResumidor);

        // Show success message
        showFeedback('Settings saved successfully!', 'success');

        // Add visual feedback to the input field
        openAiApiKeyInput.classList.add('border-green-500');
        setTimeout(() => {
            openAiApiKeyInput.classList.remove('border-green-500');
        }, 3000);
    };

    // Attach event listener to the form submission.
    if (apiSettingsForm) {
        apiSettingsForm.addEventListener('submit', handleFormSubmit);
    }

    /**
     * Provides real-time validation feedback as the user types.
     * This helps users catch errors before submitting the form.
     */
    if (openAiApiKeyInput) {
        openAiApiKeyInput.addEventListener('input', () => {
            const currentValue = openAiApiKeyInput.value.trim();

            // Only show validation feedback if user has typed something
            if (currentValue.length > 0) {
                const validation = validateApiKey(currentValue);

                if (!validation.isValid) {
                    // Show subtle error indication without being too intrusive
                    openAiApiKeyInput.classList.add('border-red-300');
                    openAiApiKeyInput.classList.remove('border-green-300');
                } else {
                    // Show success indication
                    openAiApiKeyInput.classList.add('border-green-300');
                    openAiApiKeyInput.classList.remove('border-red-300');
                }
            } else {
                // Clear validation styling if field is empty
                openAiApiKeyInput.classList.remove('border-red-300', 'border-green-300');
            }
        });
    }
});