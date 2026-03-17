import { getDB } from "../db.js";
import { ObjectId } from "mongodb";
import { checkGameOver } from "../utils/triangleDetector.js";
import { getBestMove } from "../ai/minimax.js";

function getUsernameByColor(players, color) {
  const player = players.find((p) => p.color === color);
  return player ? player.username : color;
}

/**
 * Creates a new game session.
 */
export async function createGame(req, res) {
  try {
    const { mode, players, difficulty = "hard", gameName = "sim" } = req.body;

    if (!mode || !players || players.length < 1) {
      return res.status(400).json({ error: "mode and players are required" });
    }

    const db = getDB();

    const fullPlayers = [...players];
    if (mode === "ai") {
      const humanColor = players[0].color;
      const aiColor = humanColor === "red" ? "blue" : "red";
      fullPlayers.push({ username: "AI", color: aiColor });
    }

    const game = {
      gameName,
      mode,
      players: fullPlayers,
      difficulty,
      moves: [],
      currentTurn: "red",
      winner: null,
      status: mode === "multiplayer" ? "waiting" : "active",
      losingTriangle: null,
      durationSeconds: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("games").insertOne(game);
    res.status(201).json({ ...game, _id: result.insertedId });
  } catch (err) {
    console.error("createGame error:", err);
    res.status(500).json({ error: "Failed to create game" });
  }
}

/**
 * Get games
 */
export async function getGames(req, res) {
  try {
    const { status, mode, username, gameName, limit = 20 } = req.query;
    const db = getDB();
    const filter = {};

    if (status) filter.status = status;
    if (mode) filter.mode = mode;
    if (username) filter["players.username"] = username;
    if (gameName) filter.gameName = gameName;

    const games = await db
      .collection("games")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .toArray();

    res.json(games);
  } catch (err) {
    console.error("getGames error:", err);
    res.status(500).json({ error: "Failed to fetch games" });
  }
}

/**
 * Get game by ID
 */
export async function getGameById(req, res) {
  try {
    const db = getDB();
    const game = await db
      .collection("games")
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!game) return res.status(404).json({ error: "Game not found" });
    res.json(game);
  } catch (err) {
    console.error("getGameById error:", err);
    res.status(500).json({ error: "Failed to fetch game" });
  }
}

/**
 * Update game by adding a move
 */
export async function addMove(req, res) {
  try {
    const { edge, color, username } = req.body;
    const db = getDB();

    const game = await db
      .collection("games")
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!game) return res.status(404).json({ error: "Game not found" });
    if (game.status === "finished") {
      return res.status(400).json({ error: "Game is already finished" });
    }

    const playerMove = { edge, color, username, timestamp: new Date() };
    const updatedMoves = [...game.moves, playerMove];

    // Check if the player who just moved lost
    const gameOver = checkGameOver(updatedMoves, color);

    let status = game.status;
    let winner = game.winner;
    let losingTriangle = game.losingTriangle;
    let aiMove = null;

    if (gameOver) {
      status = "finished";
      winner = getUsernameByColor(game.players, gameOver.winner);
      losingTriangle = gameOver.triangle;
    } else if (game.mode === "ai") {
      const aiColor = color === "red" ? "blue" : "red";
      const aiResult = getBestMove(updatedMoves, aiColor, game.difficulty);

      if (aiResult) {
        aiMove = {
          edge: aiResult.edge,
          color: aiColor,
          username: "AI",
          timestamp: new Date(),
        };
        updatedMoves.push(aiMove);

        const aiGameOver = checkGameOver(updatedMoves, aiColor);
        if (aiGameOver) {
          status = "finished";
          winner = getUsernameByColor(game.players, aiGameOver.winner);
          losingTriangle = aiGameOver.triangle;
        }
      }
    }
    const durationSeconds =
      status === "finished"
        ? Math.round((new Date() - new Date(game.createdAt)) / 1000)
        : null;

    await db.collection("games").updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          moves: updatedMoves,
          currentTurn: color === "red" ? "blue" : "red",
          status,
          winner,
          losingTriangle,
          durationSeconds,
          updatedAt: new Date(),
        },
      }
    );

    res.json({
      moves: updatedMoves,
      status,
      winner,
      losingTriangle,
      aiMove,
      durationSeconds,
    });
  } catch (err) {
    console.error("addMove error:", err);
    res.status(500).json({ error: "Failed to add move" });
  }
}

/**
 * Updates game status
 */
export async function updateGameStatus(req, res) {
  try {
    const { status, winner, blueUsername, roomCode } = req.body;
    const db = getDB();

    const update = { updatedAt: new Date() };
    if (status !== undefined) update.status = status;
    if (winner !== undefined) update.winner = winner;
    if (roomCode !== undefined) update.roomCode = roomCode;
    if (blueUsername !== undefined) update.blueUsername = blueUsername;

    if (status === "finished") {
      const game = await db
        .collection("games")
        .findOne({ _id: new ObjectId(req.params.id) });
      if (game) {
        update.durationSeconds = Math.round(
          (new Date() - new Date(game.createdAt)) / 1000
        );
      }
    }
    const result = await db.collection("games").updateOne(
      {
        _id: new ObjectId(req.params.id),
        "players.color": { $ne: "blue" },
      },
      {
        $set: update,
        ...(blueUsername
          ? {
              $addToSet: {
                players: { username: blueUsername, color: "blue" },
              },
            }
          : {}),
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Game not found" });
    }
    res.json({ success: true, status, winner });
  } catch (err) {
    console.error("updateGameStatus error:", err);
    res.status(500).json({ error: "Failed to update game status" });
  }
}

/**
 * Delete a game session
 */
export async function deleteGame(req, res) {
  try {
    const db = getDB();
    const result = await db
      .collection("games")
      .deleteOne({ _id: new ObjectId(req.params.id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Game not found" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("deleteGame error:", err);
    res.status(500).json({ error: "Failed to delete game" });
  }
}
