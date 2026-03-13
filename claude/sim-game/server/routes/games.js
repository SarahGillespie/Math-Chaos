const router       = require('express').Router();
const { ObjectId } = require('mongodb');
const requireAuth  = require('../middleware/auth');
const { getDB }    = require('../db');

function edgeKey(a, b) { return [Math.min(a,b), Math.max(a,b)].join('-'); }

function detectTriangle(edges, player) {
  for (let a = 0; a < 6; a++)
    for (let b = a+1; b < 6; b++)
      for (let c = b+1; c < 6; c++) {
        if (
          edges[edgeKey(a,b)] === player &&
          edges[edgeKey(b,c)] === player &&
          edges[edgeKey(a,c)] === player
        ) return [a, b, c];
      }
  return null;
}

async function updateStats(db, winnerId, loserId) {
  const col = db.collection('users');
  await col.updateOne({ _id: new ObjectId(winnerId) },
    { $inc: { 'stats.wins': 1, 'stats.gamesPlayed': 1 } });
  await col.updateOne({ _id: new ObjectId(loserId) },
    { $inc: { 'stats.losses': 1, 'stats.gamesPlayed': 1 } });
}

// POST /api/games/bot — instant game vs random AI
router.post('/bot', requireAuth, async (req, res) => {
  const game = {
    players:        { 1: req.user.id, 2: 'bot' },
    edges:          {},
    currentTurn:    1,
    status:         'active',
    isBot:          true,
    winner:         null,
    losingTriangle: null,
    createdAt:      new Date(),
    updatedAt:      new Date(),
  };
  const { insertedId } = await getDB().collection('games').insertOne(game);
  res.json({ gameId: insertedId });
});

// POST /api/games — challenge a human opponent
router.post('/', requireAuth, async (req, res) => {
  const { opponentId } = req.body;
  if (!opponentId) return res.status(400).json({ error: 'opponentId required' });
  const game = {
    players:        { 1: req.user.id, 2: opponentId },
    edges:          {},
    currentTurn:    1,
    status:         'pending',
    isBot:          false,
    winner:         null,
    losingTriangle: null,
    createdAt:      new Date(),
    updatedAt:      new Date(),
  };
  const { insertedId } = await getDB().collection('games').insertOne(game);
  res.json({ gameId: insertedId });
});

// GET /api/games/mine
router.get('/mine', requireAuth, async (req, res) => {
  const uid = req.user.id;
  const games = await getDB().collection('games')
    .find({ $or: [{ 'players.1': uid }, { 'players.2': uid }] })
    .sort({ updatedAt: -1 })
    .limit(20).toArray();
  res.json(games);
});

// GET /api/games/:id
router.get('/:id', requireAuth, async (req, res) => {
  const game = await getDB().collection('games')
    .findOne({ _id: new ObjectId(req.params.id) });
  if (!game) return res.status(404).json({ error: 'Not found' });
  res.json(game);
});

// POST /api/games/:id/accept
router.post('/:id/accept', requireAuth, async (req, res) => {
  const db   = getDB();
  const game = await db.collection('games').findOne({ _id: new ObjectId(req.params.id) });
  if (!game) return res.status(404).json({ error: 'Not found' });
  if (game.players[2] !== req.user.id)
    return res.status(403).json({ error: 'Not your game' });
  if (game.status !== 'pending')
    return res.status(400).json({ error: 'Already started' });
  await db.collection('games').updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { status: 'active', updatedAt: new Date() } }
  );
  res.json({ ok: true });
});

// POST /api/games/:id/move
router.post('/:id/move', requireAuth, async (req, res) => {
  const db   = getDB();
  const game = await db.collection('games').findOne({ _id: new ObjectId(req.params.id) });
  if (!game) return res.status(404).json({ error: 'Not found' });
  if (game.status !== 'active')
    return res.status(400).json({ error: 'Game not active' });

  const playerNum = game.players[1] === req.user.id ? 1
                  : game.players[2] === req.user.id ? 2
                  : null;
  if (!playerNum)
    return res.status(403).json({ error: 'Not a player' });
  if (playerNum !== game.currentTurn)
    return res.status(400).json({ error: 'Not your turn' });

  const { dotA, dotB } = req.body;
  if (dotA === undefined || dotB === undefined || dotA === dotB)
    return res.status(400).json({ error: 'Invalid dots' });

  const key = edgeKey(dotA, dotB);
  if (game.edges[key]) return res.status(400).json({ error: 'Edge already drawn' });

  const newEdges = { ...game.edges, [key]: playerNum };
  const tri      = detectTriangle(newEdges, playerNum);
  const finished = !!tri;
  const winner   = finished ? (playerNum === 1 ? 2 : 1) : null;

  await db.collection('games').updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: {
      edges:       newEdges,
      currentTurn: playerNum === 1 ? 2 : 1,
      updatedAt:   new Date(),
      ...(finished && { status: 'finished', winner, losingTriangle: tri }),
    }}
  );

  if (finished && !game.isBot) {
    await updateStats(db, game.players[winner], game.players[playerNum]);
  }

  // bot takes its turn immediately after the human moves
  if (!finished && game.isBot && playerNum === 1) {
    const available = [];
    for (let a = 0; a < 6; a++)
      for (let b = a+1; b < 6; b++)
        if (!newEdges[edgeKey(a,b)]) available.push([a, b]);

    if (available.length) {
      const [ba, bb]  = available[Math.floor(Math.random() * available.length)];
      const botKey    = edgeKey(ba, bb);
      const botEdges  = { ...newEdges, [botKey]: 2 };
      const botTri    = detectTriangle(botEdges, 2);
      const botDone   = !!botTri;
      const botWinner = botDone ? 1 : null; // bot made triangle = human wins

      await db.collection('games').updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: {
          edges:       botEdges,
          currentTurn: 1,
          updatedAt:   new Date(),
          ...(botDone && { status: 'finished', winner: botWinner, losingTriangle: botTri }),
        }}
      );

      if (botDone) await updateStats(db, game.players[1], 'bot');
    }
  }

  res.json({ ok: true, finished, winner });
});

module.exports = router;