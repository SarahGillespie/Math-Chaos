const router       = require('express').Router();
const { ObjectId } = require('mongodb');
const bcrypt       = require('bcrypt');
const requireAuth  = require('../middleware/auth');
const { getDB }    = require('../db');

router.get('/me', requireAuth, async (req, res) => {
  const user = await getDB().collection('users').findOne(
    { _id: new ObjectId(req.user.id) },
    { projection: { passwordHash: 0 } }
  );
  res.json(user);
});

router.patch('/me', requireAuth, async (req, res) => {
  const { username, password } = req.body;
  const update = {};
  if (username) {
    const taken = await getDB().collection('users').findOne({ username });
    if (taken) return res.status(409).json({ error: 'Username already taken' });
    update.username = username;
  }
  if (password) {
    update.passwordHash = await bcrypt.hash(password, 6);
  }
  if (!Object.keys(update).length)
    return res.status(400).json({ error: 'Nothing to update' });

  await getDB().collection('users').updateOne(
    { _id: new ObjectId(req.user.id) },
    { $set: update }
  );
  res.json({ ok: true });
});

router.delete('/me', requireAuth, async (req, res) => {
  await getDB().collection('users').deleteOne({ _id: new ObjectId(req.user.id) });
  res.json({ ok: true });
});

router.get('/search', requireAuth, async (req, res) => {
  const q = req.query.q?.trim();
  if (!q) return res.json([]);
  const users = await getDB().collection('users')
    .find(
      { username: { $regex: `^${q}`, $options: 'i' } },
      { projection: { username: 1, stats: 1 } }
    )
    .limit(10).toArray();
  res.json(users);
});

module.exports = router;
