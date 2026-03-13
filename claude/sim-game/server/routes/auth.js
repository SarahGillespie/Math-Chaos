const router  = require('express').Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const { getDB } = require('../db');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });
  const user = await getDB().collection('users').findOne({ username });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign(
    { id: user._id.toString(), username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({ token, username: user.username, id: user._id });
});

router.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });
  const existing = await getDB().collection('users').findOne({ username });
  if (existing) return res.status(409).json({ error: 'Username already taken' });
  const passwordHash = await bcrypt.hash(password, 6);
  const user = {
    username,
    passwordHash,
    memberSince: new Date(),
    lastPlayed:  new Date(),
    stats: { wins: 0, losses: 0, draws: 0, gamesPlayed: 0 },
    friends: [],
  };
  const { insertedId } = await getDB().collection('users').insertOne(user);
  const token = jwt.sign(
    { id: insertedId.toString(), username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.status(201).json({ token, username, id: insertedId });
});

module.exports = router;
