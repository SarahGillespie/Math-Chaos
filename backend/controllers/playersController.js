import { getDB } from "../db.js";

/** Create Player */
export async function createPlayer(req, res) {
  try {
    const { username } = req.body;

    if (!username || username.trim() === "") {
      return res.status(400).json({ error: "Username is required" });
    }

    const db = getDB();
    const clean = username.trim().toLowerCase();

    const existing = await db
      .collection("players")
      .findOne({ username: clean });
    if (existing) {
      return res.status(200).json(existing);
    }

    const player = {
      username: clean,
      wins: 0,
      losses: 0,
      totalGames: 0,
      winStreak: 0,
      bestStreak: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("players").insertOne(player);
    res.status(201).json({ ...player, _id: result.insertedId });
  } catch (err) {
    console.error("createPlayer error:", err);
    res.status(500).json({ error: "Failed to create player" });
  }
}

/**
 * GET all players
 */
export async function getPlayers(req, res) {
  try {
    const { sort = "wins", limit = 20 } = req.query;
    const db = getDB();

    const validSorts = ["wins", "winStreak", "totalGames"];
    const sortField = validSorts.includes(sort) ? sort : "wins";

    const players = await db
      .collection("players")
      .find({})
      .sort({ [sortField]: -1 })
      .limit(parseInt(limit))
      .toArray();

    res.json(players);
  } catch (err) {
    console.error("getPlayers error:", err);
    res.status(500).json({ error: "Failed to fetch players" });
  }
}

/**
 * GET player by username
 */
export async function getPlayerByUsername(req, res) {
  try {
    const db = getDB();
    const player = await db
      .collection("players")
      .findOne({ username: req.params.username.toLowerCase() });

    if (!player) return res.status(404).json({ error: "Player not found" });
    res.json(player);
  } catch (err) {
    console.error("getPlayerByUsername error:", err);
    res.status(500).json({ error: "Failed to fetch player" });
  }
}

/**
 * Update player results after a game ends
 */
export async function updatePlayerResult(req, res) {
  try {
    const { won } = req.body;
    const db = getDB();
    const username = req.params.username.toLowerCase();

    const player = await db.collection("players").findOne({ username });
    if (!player) return res.status(404).json({ error: "Player not found" });

    const newWins = won ? player.wins + 1 : player.wins;
    const newLosses = won ? player.losses : player.losses + 1;
    const newStreak = won ? player.winStreak + 1 : 0;
    const newBestStreak = Math.max(player.bestStreak, newStreak);

    await db.collection("players").updateOne(
      { username },
      {
        $set: {
          wins: newWins,
          losses: newLosses,
          totalGames: newWins + newLosses,
          winStreak: newStreak,
          bestStreak: newBestStreak,
          updatedAt: new Date(),
        },
      }
    );

    res.json({
      username,
      wins: newWins,
      losses: newLosses,
      totalGames: newWins + newLosses,
      winStreak: newStreak,
      bestStreak: newBestStreak,
    });
  } catch (err) {
    console.error("updatePlayerResult error:", err);
    res.status(500).json({ error: "Failed to update player result" });
  }
}

/**
 * Update player profile (general updates, not just results)
 */
export async function updatePlayer(req, res) {
  try {
    const db = getDB();
    const username = req.params.username.toLowerCase();

    const {
      _id,
      wins,
      losses,
      totalGames,
      winStreak,
      bestStreak,
      createdAt,
      ...allowed
    } = req.body;

    if (Object.keys(allowed).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    allowed.updatedAt = new Date();

    const result = await db
      .collection("players")
      .updateOne({ username }, { $set: allowed });

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Player not found" });
    }

    res.json({ success: true, updated: allowed });
  } catch (err) {
    console.error("updatePlayer error:", err);
    res.status(500).json({ error: "Failed to update player" });
  }
}

/**
 * Delete a player profile
 */
export async function deletePlayer(req, res) {
  try {
    const db = getDB();
    const result = await db
      .collection("players")
      .deleteOne({ username: req.params.username.toLowerCase() });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Player not found" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("deletePlayer error:", err);
    res.status(500).json({ error: "Failed to delete player" });
  }
}
