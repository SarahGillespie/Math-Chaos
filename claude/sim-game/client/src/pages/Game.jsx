import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { api } from '../api';
import './Game.css';

const NUM_DOTS = 6, SVG_SIZE = 400, CENTER = 200, ORBIT = 150;
const COLORS = { 1: '#3b82f6', 2: '#ef4444' };

function dotPos(i) {
  const a = (2 * Math.PI * i) / NUM_DOTS - Math.PI / 2;
  return { x: CENTER + ORBIT * Math.cos(a), y: CENTER + ORBIT * Math.sin(a) };
}
const DOTS = Array.from({ length: NUM_DOTS }, (_, i) => dotPos(i));
function eKey(a, b) { return [Math.min(a, b), Math.max(a, b)].join('-'); }

function detectTriangle(edges, player) {
  for (let a = 0; a < 6; a++)
    for (let b = a + 1; b < 6; b++)
      for (let c = b + 1; c < 6; c++)
        if (edges[eKey(a,b)] === player && edges[eKey(b,c)] === player && edges[eKey(a,c)] === player)
          return [a, b, c];
  return null;
}

function initLocalGame() {
  return { players: { 1: 'me', 2: 'bot' }, edges: {}, currentTurn: 1, status: 'active', isBot: true, winner: null, losingTriangle: null };
}

export default function Game({ gameId, gameOpts, user, onLeave }) {
  const isLocal = !!(gameOpts && gameOpts.guest);

  const [game,     setGame]     = useState(isLocal ? initLocalGame() : null);
  const [selected, setSelected] = useState(null);
  const [hovered,  setHovered]  = useState(null);
  const [err,      setErr]      = useState('');

  const fetchGame = useCallback(() => {
    if (isLocal) return;
    api.getGame(gameId).then(setGame).catch(console.error);
  }, [gameId, isLocal]);

  useEffect(() => {
    if (isLocal) return;
    fetchGame();
    const t = setInterval(fetchGame, 1500);
    return () => clearInterval(t);
  }, [fetchGame, isLocal]);

  if (!game) return <div className="game-loading">Loading game...</div>;

  const isBot  = game.players['2'] === 'bot';
  const myNum  = isLocal ? 1 : (game.players['1'] === user.id ? 1 : 2);
  const myTurn = game.currentTurn === myNum && game.status === 'active';
  const isPending = game.status === 'pending';

  function localMove(dotA, dotB, currentGame) {
    const key      = eKey(dotA, dotB);
    const newEdges = { ...currentGame.edges, [key]: currentGame.currentTurn };
    const tri      = detectTriangle(newEdges, currentGame.currentTurn);
    const finished = !!tri;
    const winner   = finished ? (currentGame.currentTurn === 1 ? 2 : 1) : null;
    return { ...currentGame, edges: newEdges, currentTurn: currentGame.currentTurn === 1 ? 2 : 1,
      ...(finished && { status: 'finished', winner, losingTriangle: tri }) };
  }

  async function handleDotClick(i) {
    if (!myTurn || isPending) return;
    if (selected === null) { setSelected(i); return; }
    if (selected === i)    { setSelected(null); return; }
    const key = eKey(selected, i);
    if (game.edges[key]) { setSelected(i); return; }
    const a = selected;
    setSelected(null); setErr('');

    if (isLocal) {
      let updated = localMove(a, i, game);
      setGame(updated);
      // bot move
      if (updated.status === 'active' && updated.currentTurn === 2) {
        const available = [];
        for (let x = 0; x < 6; x++)
          for (let y = x + 1; y < 6; y++)
            if (!updated.edges[eKey(x, y)]) available.push([x, y]);
        if (available.length) {
          const [ba, bb] = available[Math.floor(Math.random() * available.length)];
          setGame(g => localMove(ba, bb, g));
        }
      }
      return;
    }

    try { await api.makeMove(gameId, a, i); fetchGame(); }
    catch (e) { setErr(e.message); }
  }

  async function handleAccept() {
    try { await api.acceptGame(gameId); fetchGame(); }
    catch (e) { setErr(e.message); }
  }

  const hoverKey    = selected !== null && hovered !== null && hovered !== selected ? eKey(selected, hovered) : null;
  const showPreview = hoverKey && !game.edges[hoverKey] && myTurn;

  let statusMsg;
  if (isPending) statusMsg = myNum === 2 ? "You've been challenged - accept to start!" : 'Waiting for opponent to accept...';
  else if (game.status === 'finished') statusMsg = game.winner === myNum ? 'You win!' : 'You lose.';
  else statusMsg = myTurn ? 'Your turn' : (isBot ? 'Bot is thinking...' : "Opponent's turn...");

  return (
    <div className="game-wrap">
      <div className="game-top-bar">
        <button className="game-back-btn" onClick={onLeave}>Back</button>
        <span className="game-status">{statusMsg}</span>
        <span className="game-player-label">
          You are <span style={{ color: COLORS[myNum], fontWeight: 'bold' }}>{myNum === 1 ? 'Blue' : 'Red'}</span>
        </span>
      </div>
      {err && <div className="game-err">{err}</div>}
      {isPending && myNum === 2 && (
        <button className="game-accept-btn" onClick={handleAccept}>Accept challenge</button>
      )}
      <svg width={SVG_SIZE} height={SVG_SIZE} className="game-svg">
        {Object.entries(game.edges).map(([key, player]) => {
          const [a, b] = key.split('-').map(Number);
          const losing = game.losingTriangle?.includes(a) && game.losingTriangle?.includes(b);
          return <line key={key} x1={DOTS[a].x} y1={DOTS[a].y} x2={DOTS[b].x} y2={DOTS[b].y}
            stroke={COLORS[player]} strokeWidth={losing ? 5 : 2.5} opacity={0.9} />;
        })}
        {showPreview && (
          <line x1={DOTS[selected].x} y1={DOTS[selected].y} x2={DOTS[hovered].x} y2={DOTS[hovered].y}
            stroke={COLORS[myNum]} strokeWidth={2} strokeDasharray="6 4" opacity={0.45} />
        )}
        {game.losingTriangle && (
          <polygon points={game.losingTriangle.map(i => `${DOTS[i].x},${DOTS[i].y}`).join(' ')}
            fill={COLORS[game.winner === 1 ? 2 : 1]} fillOpacity={0.12} />
        )}
        {DOTS.map((pos, i) => (
          <g key={i} onClick={() => handleDotClick(i)}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
            style={{ cursor: myTurn ? 'pointer' : 'default' }}>
            <circle cx={pos.x} cy={pos.y} r={18} fill="transparent" />
            <circle cx={pos.x} cy={pos.y} r={12}
              fill={selected === i ? COLORS[myNum] : '#fff'}
              stroke={selected === i ? COLORS[myNum] : '#444'} strokeWidth={2} />
            <text x={pos.x} y={pos.y + 5} textAnchor="middle" fontSize="12"
              fill={selected === i ? '#fff' : '#333'}
              style={{ userSelect: 'none', pointerEvents: 'none' }}>{i + 1}</text>
          </g>
        ))}
      </svg>
      <div className="game-legend">
        {[1, 2].map(p => (
          <div key={p} className="game-legend-item"
            style={{ opacity: game.currentTurn === p && game.status === 'active' ? 1 : 0.4 }}>
            <div className="game-legend-bar" style={{ background: COLORS[p] }} />
            <span style={{ color: COLORS[p], fontWeight: 'bold' }}>{p === myNum ? 'You' : (isBot ? 'Bot' : 'Opponent')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

Game.propTypes = {
  gameId:   PropTypes.string.isRequired,
  gameOpts: PropTypes.shape({ guest: PropTypes.bool }),
  user:     PropTypes.shape({ id: PropTypes.string.isRequired, username: PropTypes.string.isRequired }).isRequired,
  onLeave:  PropTypes.func.isRequired,
};