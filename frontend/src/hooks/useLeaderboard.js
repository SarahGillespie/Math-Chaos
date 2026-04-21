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
  const [deleting, setDeleting] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState(null);

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

  useEffect(() => {
    const username = localStorage.getItem("sim_username");
    if (!username) return;

    async function fetchCurrentPlayer() {
      try {
        const data = await playersAPI.getByUsername(username);
        setCurrentPlayer(data.player ?? data);
      } catch (err) {
        console.error("Failed to fetch current player:", err);
        setCurrentPlayer(null);
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

  const deleteOwnAccount = useCallback(async () => {
    const currentUsername = localStorage.getItem("sim_username") || "";
    if (!currentUsername) return;

    setDeleting(true);
    try {
      await playersAPI.delete(currentUsername);
      await authAPI.logout();
      localStorage.removeItem("sim_username");
      window.location.reload();
    } catch (err) {
      console.error("Failed to delete account:", err);
    } finally {
      setDeleting(false);
    }
  }, []);

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
    deleting,
    currentPlayer,
    deleteOwnAccount,
  };
}
