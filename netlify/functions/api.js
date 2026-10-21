import serverless from 'serverless-http';
import app from '../../backend/src/app.js';

const handleExpressRequest = serverless(app);

export default async function handler(request) {
  const url = new URL(request.url);
  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text();
  const result = await handleExpressRequest({
    version: '2.0',
    routeKey: '$default',
    rawPath: url.pathname,
    rawQueryString: url.searchParams.toString(),
    headers: Object.fromEntries(request.headers),
    requestContext: {
      http: {
        method: request.method,
        path: url.pathname,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
      },
      requestId: crypto.randomUUID(),
      routeKey: '$default',
      stage: '$default',
    },
    body,
    isBase64Encoded: false,
  }, {});

  const responseBody = result.isBase64Encoded
    ? Uint8Array.from(atob(result.body), (character) => character.charCodeAt(0))
    : result.body;

  return new Response(responseBody, {
    status: result.statusCode,
    headers: result.headers,
  });
}

export const config = {
  path: '/api/*',
};
