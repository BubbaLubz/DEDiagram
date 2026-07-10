/**
 * Extracts the first complete JSON object from a string.
 * Strips markdown code fences, preamble text, and trailing commentary
 * that the language model may prepend or append to its output.
 *
 * @param {string} text - Raw text from the model
 * @returns {string | null} JSON substring or null if not found
 */
function extractJSON(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

module.exports = { extractJSON };
