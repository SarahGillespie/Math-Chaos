import { Router } from "express";
import {
  createPlayer,
  getPlayers,
  getPlayerByUsername,
  updatePlayerResult,
  updatePlayer,
  deletePlayer,
} from "../controllers/playersController.js";

const router = Router();

router.post("/", createPlayer);
router.get("/", getPlayers);
router.get("/:username", getPlayerByUsername);
router.patch("/:username/result", updatePlayerResult);
router.patch("/:username", updatePlayer);
router.delete("/:username", deletePlayer);

export default router;
