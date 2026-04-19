import { useState, useEffect, useCallback } from "react";
import { playersAPI, authAPI } from "../api/api.js";

const PAGE_SIZE = 20;

export function useLeaderboard() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sort, setSort] = useState("wins");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedUsername, setSelectedUsername] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [currentPlayerRank, setCurrentPlayerRank] = useState(null);

  // Fetch the leaderboard page
  useEffect(() => {
    async function fetchPlayers() {
      setLoading(true);
      setPage(1);
      try {
        const data = await playersAPI.getLeaderboard({
          sort,
          limit: PAGE_SIZE,
          skip: 0,
        });
        const { count } = await playersAPI.getCount();
        setTotalCount(count);
        setPlayers(data);
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlayers();
  }, [sort]);

  // Fetch the current user's record and rank independently
  useEffect(() => {
    const username = localStorage.getItem("sim_username");
    if (!username) return;

    async function fetchCurrentPlayer() {
      try {
        const data = await playersAPI.getByUsername(username);
        setCurrentPlayer(data.player ?? data);
        // rank may be returned by the API; fall back to null if not
        setCurrentPlayerRank(data.rank ?? null);
      } catch (err) {
        console.error("Failed to fetch current player:", err);
        setCurrentPlayer(null);
        setCurrentPlayerRank(null);
      }
    }
    fetchCurrentPlayer();
  }, []);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const data = await playersAPI.getLeaderboard({
        sort,
        limit: PAGE_SIZE,
        skip: page * PAGE_SIZE,
      });
      setPlayers((prev) => [...prev, ...data]);
      setPage((prev) => prev + 1);
    } catch (err) {
      console.error("Failed to load more:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [sort, page]);

  const selectPlayer = useCallback((username) => {
    setSelectedUsername((prev) => (prev === username ? null : username));
  }, []);

  const deleteSelected = useCallback(async () => {
    if (!selectedUsername) return;
    setDeleting(true);
    try {
      await playersAPI.delete(selectedUsername);
      setPlayers((prev) => prev.filter((p) => p.username !== selectedUsername));
      setTotalCount((prev) => prev - 1);

      const currentUsername = localStorage.getItem("sim_username") || "";
      const isDeletingSelf =
        selectedUsername.toLowerCase() === currentUsername.toLowerCase();

      if (isDeletingSelf) {
        await authAPI.logout();
        localStorage.removeItem("sim_username");
        window.location.reload();
        return;
      }

      setSelectedUsername(null);
    } catch (err) {
      console.error("Failed to delete player:", err);
    } finally {
      setDeleting(false);
    }
  }, [selectedUsername]);

  const hasMore = players.length < totalCount;

  return {
    players,
    loading,
    loadingMore,
    sort,
    setSort,
    totalCount,
    hasMore,
    loadMore,
    selectedUsername,
    selectPlayer,
    deleteSelected,
    deleting,
    currentPlayer,
    currentPlayerRank,
  };
}
