import { useState, useEffect, useCallback } from "react";
import { playersAPI } from "../api/api.js";

export function useLeaderboard() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("wins");
  const [selectedUsername, setSelectedUsername] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchPlayers() {
      setLoading(true);
      try {
        const data = await playersAPI.getLeaderboard({ sort, limit: 80 });
        setPlayers(data);
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlayers();
  }, [sort]);

  const selectPlayer = useCallback((username) => {
    setSelectedUsername((prev) => (prev === username ? null : username));
  }, []);

  const deleteSelected = useCallback(async () => {
    if (!selectedUsername) return;
    setDeleting(true);
    try {
      await playersAPI.delete(selectedUsername);
      setPlayers((prev) => prev.filter((p) => p.username !== selectedUsername));
      setSelectedUsername(null);
    } catch (err) {
      console.error("Failed to delete player:", err);
    } finally {
      setDeleting(false);
    }
  }, [selectedUsername]);

  return {
    players,
    loading,
    sort,
    setSort,
    selectedUsername,
    selectPlayer,
    deleteSelected,
    deleting,
  };
}
