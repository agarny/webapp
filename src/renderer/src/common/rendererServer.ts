// Note: this is a very simple HTTP server to serve the renderer files from out/renderer. This is needed so that we can
// authenticate with GitHub OAuth when running the packaged version of OpenCOR. This means that we can get away with not
// checking a lot of things (e.g., that a requested file is within our renderer distribution) since the server is only
// accessible from localhost and only serves our own files.

import { createReadStream } from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';

let rendererServer: http.Server | null = null;
let rendererBaseUrl: string | null = null;

export const startRendererServer = async (): Promise<string> => {
  // If we already have a base URL then return it.

  if (rendererBaseUrl) {
    return rendererBaseUrl;
  }

  // Create and start our HTTP server.
  // Note: we only support the MIME types that are needed by our renderer (check the files in out/renderer).

  const rendererDistPath = path.resolve(import.meta.dirname, '../../out/renderer');
  const rendererHost = 'localhost';
  const MIME_TYPES: Record<string, string> = {
    '.css': 'text/css',
    '.eot': 'application/vnd.ms-fontobject',
    '.html': 'text/html; charset=UTF-8',
    '.js': 'text/javascript',
    '.svg': 'image/svg+xml',
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
  };

  rendererServer = http.createServer((request: http.IncomingMessage, response: http.ServerResponse) => {
    // Retrieve the requested path or default to /index.html.

    const requestPath = request.url === '/' || !request.url ? '/index.html' : request.url;

    // Set the headers before streaming.

    const filePath = path.join(rendererDistPath, requestPath);
    const ext = path.extname(filePath).toLowerCase();

    response.setHeader('Content-Type', MIME_TYPES[ext] ?? 'application/octet-stream');
    response.setHeader('Cache-Control', ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable');

    // Create and pipe the read stream.

    createReadStream(filePath)
      .on('error', () => {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
        response.end('Not found');
      })
      .on('open', () => response.writeHead(200))
      .pipe(response);
  });

  // Optimise TCP for localhost connections by disabling Nagle's algorithm.

  rendererServer.on('connection', (socket) => socket.setNoDelay(true));

  // Start listening on a random available port.

  await new Promise<void>((resolve, reject) => {
    // Handle any errors that occur while starting the server.

    rendererServer?.once('error', reject);

    // Start the server listening.

    rendererServer?.listen(0, rendererHost, () => {
      const addressInfo = rendererServer?.address() as AddressInfo | null;

      if (addressInfo?.port) {
        rendererBaseUrl = `http://${rendererHost}:${addressInfo.port}`;

        resolve();
      } else {
        reject(new Error("Failed to determine the renderer server's port."));
      }
    });
  });

  if (!rendererBaseUrl) {
    throw new Error('Failed to initialise the renderer server.');
  }

  return rendererBaseUrl;
};

export const stopRendererServer = async (): Promise<void> => {
  // Make sure that we have a server to stop.

  if (!rendererServer) {
    return;
  }

  // Close the server.

  await new Promise<void>((resolve, reject) => {
    rendererServer?.close((error) => {
      if (error) {
        // An error occurred, so reject the promise.

        reject(error);
      } else {
        resolve();
      }
    });
  });

  // Clear our server and base URL references.

  rendererServer = null;
  rendererBaseUrl = null;
};
