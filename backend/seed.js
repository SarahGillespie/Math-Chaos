import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const client = new MongoClient(process.env.MONGO_URI);

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(0, daysAgo));
  date.setHours(randomInt(0, 23), randomInt(0, 59), randomInt(0, 59));
  return date;
}

function getAllEdges() {
  const edges = [];
  for (let i = 0; i < 6; i++) {
    for (let j = i + 1; j < 6; j++) {
      edges.push([i, j]);
    }
  }
  return edges;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateMoves(redUsername, blueUsername) {
  const allEdges = shuffle(getAllEdges());
  const moves = [];
  const moveCount = randomInt(6, 12);

  for (let i = 0; i < moveCount && i < allEdges.length; i++) {
    const color = i % 2 === 0 ? "red" : "blue";
    moves.push({
      edge: allEdges[i],
      color,
      username: color === "red" ? redUsername : blueUsername,
      timestamp: new Date(),
    });
  }
  return moves;
}

function generatePlayers(count) {
  const firstNames = [
    "Alex",
    "Jordan",
    "Taylor",
    "Morgan",
    "Casey",
    "Riley",
    "Quinn",
    "Avery",
    "Blake",
    "Cameron",
    "Drew",
    "Emery",
    "Finley",
    "Harper",
    "Jamie",
    "Kendall",
    "Logan",
    "Mason",
    "Parker",
    "Reese",
    "Sage",
    "Skyler",
    "Tanner",
    "Hayden",
    "Peyton",
    "Robin",
    "Shawn",
    "Dana",
    "Jesse",
    "Kai",
    "Luca",
    "Nova",
    "Orion",
    "Phoenix",
    "River",
  ];
  const suffixes = ["_plays", "_wins", "42", "_gg", "99", "_pro", "123", "_x"];
  const players = [];
  const usedNames = new Set();

  while (players.length < count) {
    const base = randomItem(firstNames);
    const suffix =
      Math.random() > 0.5 ? randomItem(suffixes) : randomInt(1, 999).toString();
    const username = `${base}${suffix}`;
    if (usedNames.has(username)) continue;
    usedNames.add(username);

    const wins = randomInt(0, 60);
    const losses = randomInt(0, 60);
    const winStreak = randomInt(0, Math.min(wins, 8));

    players.push({
      username,
      wins,
      losses,
      totalGames: wins + losses,
      winStreak,
      bestStreak: winStreak + randomInt(0, 5),
      createdAt: randomDate(180),
      updatedAt: randomDate(30),
    });
  }
  return players;
}

function generateGames(players, count) {
  const games = [];
  const usernames = players.map((p) => p.username);
  const modes = ["ai", "ai", "ai", "multiplayer"];
  const difficulties = ["easy", "hard", "hard"];
  const triangleOptions = [
    [0, 1, 2],
    [0, 1, 3],
    [1, 2, 4],
    [2, 3, 5],
    [0, 4, 5],
  ];

  for (let i = 0; i < count; i++) {
    const mode = randomItem(modes);
    const playerUsername = randomItem(usernames);
    const playerColor = randomItem(["red", "blue"]);
    const opponentColor = playerColor === "red" ? "blue" : "red";

    const opponentUsername =
      mode === "ai"
        ? "AI"
        : randomItem(usernames.filter((u) => u !== playerUsername));

    const playersArr = [
      { username: playerUsername, color: playerColor },
      { username: opponentUsername, color: opponentColor },
    ];

    const winnerColor = randomItem(["red", "blue"]);
    const winnerPlayer = playersArr.find((p) => p.color === winnerColor);
    const winner = winnerPlayer ? winnerPlayer.username : null;

    const redUsername = playersArr.find((p) => p.color === "red")?.username;
    const blueUsername = playersArr.find((p) => p.color === "blue")?.username;
    const moves = generateMoves(redUsername, blueUsername);

    const createdAt = randomDate(180);
    const durationSeconds = randomInt(30, 600);

    games.push({
      gameName: "sim",
      mode,
      players: playersArr,
      difficulty: mode === "ai" ? randomItem(difficulties) : null,
      moves,
      currentTurn: randomItem(["red", "blue"]),
      winner,
      status: "finished",
      losingTriangle: randomItem(triangleOptions),
      durationSeconds,
      createdAt,
      updatedAt: new Date(createdAt.getTime() + durationSeconds * 1000),
    });
  }
  return games;
}

async function seed() {
  try {
    await client.connect();
    const db = client.db("mathchaos");
    console.log("Connected to MongoDB. Starting seed...\n");

    await db.collection("players").deleteMany({});
    await db.collection("games").deleteMany({});
    console.log("Cleared existing players and games\n");

    const players = generatePlayers(50);
    await db.collection("players").insertMany(players);
    console.log(`Inserted ${players.length} players`);

    const games = generateGames(players, 1000);
    await db.collection("games").insertMany(games);
    console.log(`Inserted ${games.length} games`);

    const playerCount = await db.collection("players").countDocuments();
    const gameCount = await db.collection("games").countDocuments();
    console.log(`\n Database summary:`);
    console.log(`   players: ${playerCount}`);
    console.log(`   games:   ${gameCount}`);
    console.log("\n Seed complete!");
  } catch (err) {
    console.error("Seed failed:", err);
  } finally {
    await client.close();
  }
}

seed();
