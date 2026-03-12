const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');
const fs = require('fs');

const animals = [
  'cat', 'dog', 'fox', 'bear', 'wolf', 'owl', 'deer', 'frog', 'crow', 'lynx',
  'moose', 'panda', 'koala', 'otter', 'hawk', 'mole', 'newt', 'crab', 'swan',
  'toad', 'viper', 'bison', 'hyena', 'lemur', 'gecko', 'quail', 'raven', 'stoat',
  'tapir', 'dingo', 'finch', 'heron', 'ibis',  'kite', 'llama', 'macaw', 'narwhal'
];

const symbols = ['_', '.', '-', '!', '#'];

function generateUsername() {
  const animal   = faker.helpers.arrayElement(animals);
  const number   = faker.number.int({ min: 0, max: 9999 });
  const symbol   = faker.helpers.maybe(() => faker.helpers.arrayElement(symbols), { probability: 0.4 });
  const prefix   = faker.helpers.maybe(() => faker.word.adjective(), { probability: 0.5 });

  return prefix
    ? `${prefix}${symbol ?? ''}${animal}${number}`
    : `${animal}${symbol ?? ''}${number}`;
}

async function generateUsers(count = 1000) {
  const users = [];

  for (let i = 0; i < count; i++) {
    const passwordHash = await bcrypt.hash(faker.internet.password(), 6);
    const memberSince  = faker.date.past({ years: 2 });
    const gamesPlayed  = faker.number.int({ min: 0, max: 400 });
    const wins         = faker.number.int({ min: 0, max: gamesPlayed });
    const losses       = faker.number.int({ min: 0, max: gamesPlayed - wins });
    const draws        = gamesPlayed - wins - losses;

    users.push({
      _id:         { $oid: faker.database.mongodbObjectId() },
      username:    generateUsername(),
      passwordHash,
      memberSince: { $date: memberSince.toISOString() },
      lastPlayed:  { $date: faker.date.between({ from: memberSince, to: new Date() }).toISOString() },
      stats:       { wins, losses, draws, gamesPlayed },
      friends:     [],
    });

    if (i % 100 === 0) console.log(`Generated ${i} users...`);
  }

  // Assign each user 0–10 random friends
  const allIds = users.map(u => u._id);
  for (const user of users) {
    const friendCount = faker.number.int({ min: 0, max: 10 });
    user.friends = [...allIds]
      .filter(id => id.$oid !== user._id.$oid)
      .sort(() => Math.random() - 0.5)
      .slice(0, friendCount);
  }

  fs.writeFileSync('db/users.json', JSON.stringify(users, null, 2));
  console.log('Done! db/users.json is ready to import into MongoDB Compass.');
}

generateUsers();
