import { useState } from "react";
import Home from "./components/Home/Home.jsx";
import GameMenu from "./components/GameMenu/GameMenu.jsx";
import GameLobby from "./components/GameLobby/GameLobby.jsx";
import GameBoard from "./components/GameBoard/GameBoard.jsx";
import Leaderboard from "./components/Leaderboard/Leaderboard.jsx";

export default function App() {
  const [screen, setScreen] = useState("home");
  const [gameConfig, setGameConfig] = useState(null);

  function handleSelectGame(gameName) {
    if (gameName === "sim") setScreen("menu");
  }

  function handleStartGame(config) {
    console.log("handleStartGame config:", config);
    setGameConfig(config);
    if (config.mode === "multiplayer") {
      setScreen("lobby");
    } else {
      setScreen("game");
    }
  }

  function handleGameReady(config) {
    setGameConfig(config);
    setScreen("game");
  }

  function handleBackToHome() {
    setGameConfig(null);
    setScreen("home");
  }

  return (
    <>
      {screen === "home" && (
        <Home
          onSelectGame={handleSelectGame}
          onLeaderboard={() => setScreen("leaderboard")}
        />
      )}
      {screen === "menu" && (
        <GameMenu onStartGame={handleStartGame} onBack={handleBackToHome} />
      )}
      {screen === "lobby" && (
        <GameLobby
          config={gameConfig}
          onGameReady={handleGameReady}
          onBack={handleBackToHome}
        />
      )}
      {screen === "game" && (
        <GameBoard config={gameConfig} onBackToMenu={handleBackToHome} />
      )}
      {screen === "leaderboard" && <Leaderboard onBack={handleBackToHome} />}
    </>
  );
}
