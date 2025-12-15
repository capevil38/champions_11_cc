// General utility functions for the Champions 11 CC website

function getApiBaseUrl() {
  if (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) {
    return window.APP_CONFIG.API_BASE_URL;
  }
  try {
    return window.localStorage.getItem('apiBaseUrl') || '';
  } catch (err) {
    return '';
  }
}

function setApiBaseUrl(url) {
  const normalized = (url || '').trim().replace(/\/+$/, '');
  window.APP_CONFIG = window.APP_CONFIG || {};
  if (normalized) {
    window.APP_CONFIG.API_BASE_URL = normalized;
  } else {
    delete window.APP_CONFIG.API_BASE_URL;
  }
  try {
    if (normalized) {
      window.localStorage.setItem('apiBaseUrl', normalized);
    } else {
      window.localStorage.removeItem('apiBaseUrl');
    }
  } catch (err) {
    // ignore storage errors
  }
  return normalized;
}

function clearApiBaseUrl() {
  window.APP_CONFIG = window.APP_CONFIG || {};
  delete window.APP_CONFIG.API_BASE_URL;
  try {
    window.localStorage.removeItem('apiBaseUrl');
  } catch (err) {
    // ignore
  }
}

function resolveApiUrl(path) {
  const base = getApiBaseUrl();
  if (base) {
    const normalizedBase = base.replace(/\/+$/, '');
    const normalizedPath = path.replace(/^\/+/, '');
    return `${normalizedBase}/${normalizedPath}`;
  }
  const localPath = path === 'data' ? 'data.json' : path;
  return new URL(localPath, window.location.href).href;
}

// Load the dataset from the API (or fallback JSON)
async function loadData() {
  const dataUrl = resolveApiUrl('data');
  const response = await fetch(dataUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Unable to load data');
  }
  return response.json();
}

// Get player object by PlayerID
function getPlayerById(data, id) {
  return data.players.find((p) => p['PlayerID'] === id);
}

// Get career stats for a player
function getCareerStatsById(data, id) {
  return data.player_career_stats.find((p) => p['PlayerID'] === id);
}

// Get top players by a numeric field (e.g., Runs, Wkts)
function getTopPlayers(
  data,
  fieldName,
  limit = 5,
  ascending = false,
  options = {}
) {
  const { ignoreZero = false } = options;
  const normalize = (val) => {
    if (val === null || val === undefined || val === '-') {
      return ascending ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    }
    return Number(val);
  };
  return data.player_career_stats
    .filter((p) => {
      const value = p[fieldName];
      if (value == null || value === '-') return false;
      if (ignoreZero && Number(value) === 0) return false;
      return true;
    })
    .sort((a, b) => {
      const aVal = normalize(a[fieldName]);
      const bVal = normalize(b[fieldName]);
      return ascending ? aVal - bVal : bVal - aVal;
    })
    .slice(0, limit);
}

// Simple sort function for tables; expects an array of objects and a field
function sortArray(arr, field, ascending = true) {
  return arr.slice().sort((a, b) => {
    const aVal = a[field] || 0;
    const bVal = b[field] || 0;
    if (aVal === bVal) return 0;
    return ascending ? aVal - bVal : bVal - aVal;
  });
}

// Filter players by search term (matches name case‑insensitively)
function filterPlayers(data, term) {
  const t = term.trim().toLowerCase();
  if (!t) return data.player_career_stats;
  return data.player_career_stats.filter((stat) => {
    const player = data.players.find((p) => p['PlayerID'] === stat['PlayerID']);
    return player && player['Player Name'].toLowerCase().includes(t);
  });
}

// Get batting entries for a player
function getBattingEntries(data, playerId) {
  return data.batting.filter((b) => b['PlayerID'] === playerId);
}

// Get bowling entries for a player
function getBowlingEntries(data, playerId) {
  return data.bowling.filter((b) => b['PlayerID'] === playerId);
}

// Get entries for a match
function getEntriesForMatch(data, matchId, type) {
  if (!data[type]) return [];
  const targetId =
    typeof matchId === 'number' ? matchId : Number.parseInt(matchId, 10);
  if (Number.isNaN(targetId)) {
    return [];
  }
  return data[type].filter(
    (e) => Number.parseInt(e['MatchID'], 10) === targetId
  );
}

// Parse query parameters from URL
function getQueryParams() {
  const params = {};
  const query = window.location.search.substring(1);
  query.split('&').forEach((pair) => {
    const [k, v] = pair.split('=');
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
  });
  return params;
}

// Format numbers with commas
function formatNumber(num) {
  if (num == null || num === undefined || num === '') return '-';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function parseMatchDate(match) {
  if (!match || !match.Date) return null;
  return new Date(match.Date);
}

function getMatchesSortedByDate(data) {
  if (!data.matches) return [];
  return data.matches
    .slice()
    .sort((a, b) => {
      const dateA = parseMatchDate(a);
      const dateB = parseMatchDate(b);
      return (dateB || 0) - (dateA || 0);
    });
}

function getMatchInsights(data) {
  const matches = getMatchesSortedByDate(data);
  if (!matches.length) return null;
  const latest = matches[0];
  const batting = getEntriesForMatch(data, latest.MatchID, 'batting');
  const bowling = getEntriesForMatch(data, latest.MatchID, 'bowling');
  const topBatter = batting.reduce((best, entry) => {
    if (!entry) return best;
    if (!best || (entry.Runs || 0) > (best.Runs || 0)) return entry;
    return best;
  }, null);
  const topBowler = bowling.reduce((best, entry) => {
    if (!entry) return best;
    const wickets = entry.Wkts || 0;
    if (!best) return entry;
    const bestWkts = best.Wkts || 0;
    if (wickets > bestWkts) return entry;
    if (wickets === bestWkts) {
      const econ = entry.Economy != null ? parseFloat(entry.Economy) : Infinity;
      const bestEcon =
        best.Economy != null ? parseFloat(best.Economy) : Infinity;
      return econ < bestEcon ? entry : best;
    }
    return best;
  }, null);
  const teamOvers = latest['Team Overs Played'] || latest.Overs || null;
  const oppOvers = latest['Opponent Overs Played'] || latest.Overs || null;
  const teamRunRate =
    teamOvers && latest['Team Runs']
      ? (latest['Team Runs'] / teamOvers).toFixed(2)
      : null;
  const oppRunRate =
    oppOvers && latest['Opponent Runs']
      ? (latest['Opponent Runs'] / oppOvers).toFixed(2)
      : null;
  return {
    latest,
    topBatter,
    topBowler,
    teamRunRate,
    oppRunRate,
  };
}

function computeVenueAnalytics(data, limit = 5) {
  const venues = {};
  (data.matches || []).forEach((match) => {
    const venue = match.Venue || 'Unknown';
    if (!venues[venue]) {
      venues[venue] = { venue, matches: 0, runs: 0 };
    }
    venues[venue].matches += 1;
    venues[venue].runs += match['Team Runs'] || 0;
  });
  return Object.values(venues)
    .map((entry) => ({
      ...entry,
      average: entry.matches ? (entry.runs / entry.matches).toFixed(1) : '-',
    }))
    .sort((a, b) => b.average - a.average)
    .slice(0, limit);
}

function computeOpponentAnalytics(data, limit = 5) {
  const opponents = {};
  (data.matches || []).forEach((match) => {
    const opp = match.Opponent || 'Unknown';
    if (!opponents[opp]) {
      opponents[opp] = { opponent: opp, matches: 0, wins: 0 };
    }
    opponents[opp].matches += 1;
    if (match['Match Result'] && match['Match Result'].toLowerCase() === 'won') {
      opponents[opp].wins += 1;
    }
  });
  return Object.values(opponents)
    .map((entry) => ({
      ...entry,
      winPct: entry.matches ? ((entry.wins / entry.matches) * 100).toFixed(1) : '0',
    }))
    .sort((a, b) => b.winPct - a.winPct)
    .slice(0, limit);
}

function buildPlayerMatchIndex(data) {
  const matchMap = new Map();
  (data.matches || []).forEach((match) => {
    matchMap.set(String(match.MatchID), match);
  });
  const opponents = new Set();
  const venues = new Set();
  const playerOpponents = {};
  const playerVenues = {};
  function addEntry(playerId, match) {
    if (!playerId || !match) return;
    if (match.Opponent) {
      opponents.add(match.Opponent);
      const set = playerOpponents[playerId] || new Set();
      set.add(match.Opponent);
      playerOpponents[playerId] = set;
    }
    if (match.Venue) {
      venues.add(match.Venue);
      const set = playerVenues[playerId] || new Set();
      set.add(match.Venue);
      playerVenues[playerId] = set;
    }
  }
  ['batting', 'bowling', 'fielding'].forEach((section) => {
    (data[section] || []).forEach((entry) => {
      const match = matchMap.get(String(entry.MatchID));
      addEntry(entry.PlayerID, match);
    });
  });
  return {
    opponents: Array.from(opponents).sort(),
    venues: Array.from(venues).sort(),
    playerOpponents,
    playerVenues,
  };
}

function getPlayerComparisonStats(data, playerId) {
  const player = getPlayerById(data, playerId);
  const career = getCareerStatsById(data, playerId);
  const batting = getBattingEntries(data, playerId)
    .slice()
    .sort((a, b) => Number(a.MatchID) - Number(b.MatchID));
  const bowling = getBowlingEntries(data, playerId)
    .slice()
    .sort((a, b) => Number(a.MatchID) - Number(b.MatchID));
  return {
    player,
    career,
    recentBatting: batting.slice(-3),
    recentBowling: bowling.slice(-3),
  };
}

function computeBattingRating(entry) {
  if (!entry) return 0;
  const runs = entry.Runs || 0;
  const strikeRate =
    entry['Strike Rate'] != null ? parseFloat(entry['Strike Rate']) : null;
  let score = runs;
  if (strikeRate) {
    score += strikeRate / 4;
  }
  if (runs >= 50) score += 12;
  else if (runs >= 30) score += 6;
  if (entry.Out === 'No') score += 5;
  return parseFloat(Math.max(score, 0).toFixed(1));
}

function computeBowlingRating(entry) {
  if (!entry) return 0;
  const wickets = entry.Wkts || 0;
  const runs = entry['Bowl Runs'] || 0;
  const economy =
    entry.Economy != null ? parseFloat(entry.Economy) : null;
  let score = wickets * 18;
  score += Math.max(0, 20 - runs * 0.5);
  if (economy != null) {
    score += Math.max(0, 15 - economy * 2);
  }
  return parseFloat(Math.max(score, 0).toFixed(1));
}

function computeFieldingRating(entry) {
  if (!entry) return 0;
  const catches = entry.Catches || 0;
  const runOuts = entry['Run Outs'] || 0;
  const stumpings = entry.Stumpings || 0;
  const score = catches * 5 + runOuts * 7 + stumpings * 6;
  return parseFloat(score.toFixed(1));
}

function getBestBowlingSpells(data, limit = 10) {
  return (data.bowling || [])
    .map((entry) => ({
      ...entry,
      rating: computeBowlingRating(entry),
    }))
    .sort((a, b) => {
      if ((b.Wkts || 0) !== (a.Wkts || 0)) {
        return (b.Wkts || 0) - (a.Wkts || 0);
      }
      const econA = a.Economy != null ? parseFloat(a.Economy) : Infinity;
      const econB = b.Economy != null ? parseFloat(b.Economy) : Infinity;
      if (econA !== econB) return econA - econB;
      return (a['Bowl Runs'] || 0) - (b['Bowl Runs'] || 0);
    })
    .slice(0, limit);
}

function calculateMatchRatings(data, matchId) {
  const batting = getEntriesForMatch(data, matchId, 'batting');
  const bowling = getEntriesForMatch(data, matchId, 'bowling');
  const fielding = getEntriesForMatch(data, matchId, 'fielding');
  const ratingsMap = new Map();
  const ensureEntry = (playerId) => {
    if (!ratingsMap.has(playerId)) {
      ratingsMap.set(playerId, {
        PlayerID: playerId,
        batting: 0,
        bowling: 0,
        fielding: 0,
      });
    }
    return ratingsMap.get(playerId);
  };
  batting.forEach((entry) => {
    const rating = ensureEntry(entry.PlayerID);
    rating.batting += computeBattingRating(entry);
  });
  bowling.forEach((entry) => {
    const rating = ensureEntry(entry.PlayerID);
    rating.bowling += computeBowlingRating(entry);
  });
  fielding.forEach((entry) => {
    const rating = ensureEntry(entry.PlayerID);
    rating.fielding += computeFieldingRating(entry);
  });
  return Array.from(ratingsMap.values())
    .map((entry) => ({
      ...entry,
      overall: parseFloat(
        (entry.batting + entry.bowling + entry.fielding).toFixed(1)
      ),
    }))
    .sort((a, b) => b.overall - a.overall);
}

if (typeof window !== 'undefined') {
  window.DataAPI = {
    getApiBaseUrl,
    setApiBaseUrl,
    clearApiBaseUrl,
    resolveApiUrl,
  };
  window.Analytics = {
    getMatchInsights,
    computeVenueAnalytics,
    computeOpponentAnalytics,
    buildPlayerMatchIndex,
    getPlayerComparisonStats,
    computeBattingRating,
    computeBowlingRating,
    computeFieldingRating,
    getBestBowlingSpells,
    calculateMatchRatings,
  };
  try {
    const host = window.location.hostname || '';
    if (host.includes('onrender.com') && !getApiBaseUrl()) {
      setApiBaseUrl(window.location.origin);
    }
  } catch (err) {
    // ignore
  }
}
