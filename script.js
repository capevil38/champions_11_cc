// General utility functions for the Champions 11 CC website

// Load the dataset from the provided JSON file
async function loadData() {
  const response = await fetch('data.json');
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
function getTopPlayers(data, fieldName, limit = 5) {
  return data.player_career_stats
    .filter((p) => p[fieldName] != null)
    .sort((a, b) => (b[fieldName] || 0) - (a[fieldName] || 0))
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
  return data[type].filter((e) => e['MatchID'] == matchId);
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