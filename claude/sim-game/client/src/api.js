const BASE = '/api';

function token() { return localStorage.getItem('token'); }

async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...opts.headers,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  login:         (username, password) => req('/auth/login',  { method: 'POST', body: { username, password } }),
  signup:        (username, password) => req('/auth/signup', { method: 'POST', body: { username, password } }),
  me:            ()                   => req('/users/me'),
  updateMe:      (data)               => req('/users/me', { method: 'PATCH', body: data }),
  deleteMe:      ()                   => req('/users/me', { method: 'DELETE' }),
  searchUsers:   (q)                  => req(`/users/search?q=${encodeURIComponent(q)}`),
  myGames:       ()                   => req('/games/mine'),
  createGame:    (opponentId)         => req('/games', { method: 'POST', body: { opponentId } }),
  createBotGame: ()                   => req('/games/bot', { method: 'POST' }),
  getGame:       (id)                 => req(`/games/${id}`),
  acceptGame:    (id)                 => req(`/games/${id}/accept`, { method: 'POST' }),
  makeMove:      (id, dotA, dotB)     => req(`/games/${id}/move`, { method: 'POST', body: { dotA, dotB } }),
};