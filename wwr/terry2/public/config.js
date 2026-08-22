/* Terry configuration -------------------------------------------------------
 *
 * You only need this file for static hosting (GitHub Pages), where there is no
 * server.js running to hide the key for you.
 *
 * Get a free key at https://www.themoviedb.org/settings/api
 *   - "API Read Access Token" (long, starts with eyJ) -> paste as tmdbToken
 *   - or the shorter v3 "API Key"                      -> paste as tmdbKey
 *
 * Leave both blank and Terry will simply ask the visitor for a key and keep it
 * in their own browser. Anything you paste here is public once you push it, so
 * only use a key you're happy to expose, and keep it read-only.
 */
window.TERRY_CONFIG = {
  tmdbKey: '',        // v3 API key, e.g. '8f1c...'
  tmdbToken: '',      // v4 read access token, e.g. 'eyJhbGciOi...'
  region: 'UG',       // used for "where to watch" and release dates
  language: 'en-US',
};
