/**
 * @file Shared validation functions for the application.
 * @summary Contains reusable validation logic for API keys, files, and other inputs.
 * @author Pablo Vega
 * @version 1.0.0
 */

/**
 * Validates the format of an OpenAI API key.
 * 
 * @param {string} apiKey - The API key to validate.
 * @returns {{isValid: boolean, error: string|null}} Object with validation result.
 * @example
 * const result = validateApiKey('sk-abc123...');
 * if (!result.isValid) console.log(result.error);
 */
export const validateApiKey = (apiKey) => {
  const trimmedKey = apiKey.trim();

  if (trimmedKey.length === 0) {
    return {
      isValid: false,
      error: 'API key cannot be empty.',
    };
  }

  if (trimmedKey.length < 20) {
    return {
      isValid: false,
      error: 'API key is too short. OpenAI API keys must be at least 20 characters.',
    };
  }

  if (trimmedKey.length > 200) {
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

  if (!/^sk-[A-Za-z0-9_\-]+$/.test(trimmedKey)) {
    return {
      isValid: false,
      error: 'API key contains invalid characters. Only alphanumeric characters, hyphens, and underscores are allowed.',
    };
  }

  return { isValid: true, error: null };
};
