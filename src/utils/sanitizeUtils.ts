/**
 * Utility functions for sanitizing text content
 */

/**
 * Strips HTML tags from a string in a secure manner.
 * This function uses a loop to repeatedly remove tags until no more are found,
 * preventing nested tag injection attacks.
 * 
 * @param html - The HTML string to sanitize
 * @returns The text content with all HTML tags removed
 */
export function stripHtmlTags(html: string): string {
  if (!html) {
    return '';
  }

  // Use a loop to handle nested or malformed HTML tags
  let result = html;
  let previousResult = '';
  
  // Keep stripping until no more changes occur (handles nested cases like <<script>script>)
  while (result !== previousResult) {
    previousResult = result;
    result = result.replace(/<[^>]*>/g, '');
  }

  // Decode common HTML entities (decode &amp; last to avoid double-decoding)
  result = result
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

  return result.trim();
}
