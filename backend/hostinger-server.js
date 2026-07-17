/*
 * Hostinger Node.js hosting entry file.
 *
 * Some managed Node hosts start the app from an entry file instead of running
 * npm start. This wrapper loads all production route patches before server.js,
 * matching backend/package.json's npm start behavior.
 */

require("./hostinger-entry.js");
