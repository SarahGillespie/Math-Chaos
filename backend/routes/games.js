import { Router } from "express";
import {
  createGame,
  getGames,
  getGameById,
  addMove,
  updateGameStatus,
  deleteGame,
} from "../controllers/gamesController.js";

const router = Router();

router.post("/", createGame);
router.get("/", getGames);
router.get("/:id", getGameById);
router.patch("/:id/move", addMove);
router.patch("/:id/status", updateGameStatus);
router.delete("/:id", deleteGame);

export default router;
