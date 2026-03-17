import { getDB } from "../db.js";
import { ObjectId } from "mongodb";

const rooms = new Map();

function send(ws, data) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(data));
  }
}

export function handleWebSocket(ws) {
  let currentGameId = null;
  let currentColor = null;

  ws.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return send(ws, { type: "error", message: "Invalid message format" });
    }

    const { type, gameId, username, color, edge } = msg;

    if (type === "join") {
      try {
        const db = getDB();
        const game = await db
          .collection("games")
          .findOne({ _id: new ObjectId(gameId) });

        if (!game) {
          return send(ws, { type: "error", message: "Game not found" });
        }

        currentGameId = gameId;
        currentColor = color;

        if (!rooms.has(gameId)) rooms.set(gameId, {});
        const room = rooms.get(gameId);
        room[color] = ws;
        if (color === "red") room.redUsername = username;
        if (color === "blue") room.blueUsername = username;

        send(ws, { type: "joined", gameId, color, username });
        console.log(`${username} (${color}) joined room ${gameId}`);

        if (room.red && room.blue) {
          await db
            .collection("games")
            .updateOne(
              { _id: new ObjectId(gameId) },
              { $set: { status: "active", updatedAt: new Date() } }
            );

          send(room.red, {
            type: "start",
            firstTurn: "red",
            yourColor: "red",
            opponentUsername: room.blueUsername,
          });

          send(room.blue, {
            type: "start",
            firstTurn: "red",
            yourColor: "blue",
            opponentUsername: room.redUsername,
          });

          console.log(`Game ${gameId} started`);
        } else {
          send(ws, { type: "waiting", message: "Waiting for opponent..." });
        }
      } catch (err) {
        console.error("Join error:", err);
        send(ws, { type: "error", message: "Failed to join game" });
      }
    }

    if (type === "move") {
      if (!currentGameId) return;
      const room = rooms.get(currentGameId);
      if (!room) return;

      const opponentColor = currentColor === "red" ? "blue" : "red";
      send(room[opponentColor], {
        type: "opponent_move",
        edge,
        color: currentColor,
        nextTurn: opponentColor,
      });
    }

    if (type === "game_over") {
      if (!currentGameId) return;
      const room = rooms.get(currentGameId);
      if (!room) return;

      const opponentColor = currentColor === "red" ? "blue" : "red";
      send(room[opponentColor], {
        type: "game_over",
        winner: msg.winner,
        loser: msg.loser,
        triangle: msg.triangle,
      });

      rooms.delete(currentGameId);
    }

    if (type === "ping") {
      send(ws, { type: "pong" });
    }
  });

  /** Disconnect the WebSocket */
  ws.on("close", async () => {
    if (!currentGameId) return;
    const room = rooms.get(currentGameId);
    if (!room) return;

    const opponentColor = currentColor === "red" ? "blue" : "red";

    try {
      const db = getDB();

      const game = await db
        .collection("games")
        .findOne({ _id: new ObjectId(currentGameId) });

      if (game && game.status === "active") {
        const opponentUsername = room[`${opponentColor}Username`];
        const durationSeconds = Math.round(
          (new Date() - new Date(game.createdAt)) / 1000
        );

        await db.collection("games").updateOne(
          { _id: new ObjectId(currentGameId) },
          {
            $set: {
              status: "finished",
              winner: opponentUsername,
              disconnectedPlayer: room[`${currentColor}Username`],
              durationSeconds,
              updatedAt: new Date(),
            },
          }
        );

        await db.collection("players").updateOne(
          { username: opponentUsername },
          {
            $inc: { wins: 1, totalGames: 1 },
            $set: { updatedAt: new Date() },
          }
        );

        const disconnectedUsername = room[`${currentColor}Username`];
        if (disconnectedUsername && disconnectedUsername !== "AI") {
          await db.collection("players").updateOne(
            { username: disconnectedUsername },
            {
              $inc: { losses: 1, totalGames: 1 },
              $set: { winStreak: 0, updatedAt: new Date() },
            }
          );
        }
      }
    } catch (err) {
      console.error("Disconnect DB update error:", err);
    }

    send(room[opponentColor], {
      type: "opponent_disconnected",
      username: room[`${currentColor}Username`],
    });

    rooms.delete(currentGameId);
    console.log(
      `Room ${currentGameId} closed — ${room[`${currentColor}Username`]} disconnected`
    );
  });
}
