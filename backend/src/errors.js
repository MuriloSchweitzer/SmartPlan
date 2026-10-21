export function asyncRoute(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

export function notFound(_request, response) {
  response.status(404).json({ error: 'Rota não encontrada.' });
}

export function errorHandler(error, _request, response, _next) {
  if (error.code === '23505') return response.status(409).json({ error: 'Já existe um registro com estes dados.' });
  if (error.code === '23503') return response.status(409).json({ error: 'Este registro está vinculado a outros dados.' });
  if (error.code === '23514') return response.status(400).json({ error: 'Os dados informados violam uma regra do sistema.' });
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  return response.status(status).json({ error: status >= 500 ? 'Erro interno do servidor.' : error.message });
}

export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}
