/**
 * PlaceGo frontend configuration
 * --------------------------------
 * API_BASE_URL: where the PlaceGo backend is running.
 *   - Local development:   http://localhost:5000/api
 *   - Production example:  https://api.placego.online/api
 *
 * If the backend is unreachable, the website still works using the
 * fallback content inside js/main.js (only the contact form needs the API).
 */
window.PLACEGO_CONFIG = {
  API_BASE_URL:
    location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.protocol === "file:"
      ? "http://localhost:5000/api"
      : "https://api.placego.online/api",
  REQUEST_TIMEOUT_MS: 8000
};
