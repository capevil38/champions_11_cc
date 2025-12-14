/* script.js
 * Utility functions to load and process cricket data
 * The data.json file should reside in the same directory as this script.
 */

// Load the entire data set from data.json
async function loadData() {
  const response = await fetch('data.json');
  if (!response.ok) {
    throw new Error('Failed to load data.json');
  }
  return response.json();
}

// Return the first (and only) team stats object
function getTeamStats(data) {
  return data.team_stats && data.team_stats.length > 0 ? data.team_stats[0] : {};
}

// Retrieve a player object by their ID
function getPlayerById(data, id) {
  return data.players.find((p) => p['PlayerID'] === id);
}

// Retrieve a player's career stats by their ID
function getPlayerCareerStats(data, id) {
  return data.player_career_stats.find((p) => p['PlayerID'] === id);
}

// Get batting entries for a specific match
function getBattingForMatch(data, matchId) {
  return data.batting.filter((row) => row['MatchID'] == matchId);
}

// Get bowling entries for a specific match
function getBowlingForMatch(data, matchId) {
  return data.bowling.filter((row) => row['MatchID'] == matchId);
}

// Get fielding entries for a specific match
function getFieldingForMatch(data, matchId) {
  return data.fielding.filter((row) => row['MatchID'] == matchId);
}

// Return a list of top players ordered by a numeric field
function getTopPlayersByField(data, fieldName, limit = 5) {
  const stats = data.player_career_stats
    .filter((p) => p[fieldName] !== null && p[fieldName] !== undefined)
    .sort((a, b) => (parseFloat(b[fieldName] || 0) - parseFloat(a[fieldName] || 0)))
    .slice(0, limit);
  return stats;
}

// Parse URL query parameters and return an object
function getQueryParams() {
  const params = {};
  const queryString = window.location.search;
  if (queryString) {
    const parts = queryString.substring(1).split('&');
    parts.forEach((pair) => {
      const [key, value] = pair.split('=');
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    });
  }
  return params;
}

// Format a number with commas (for readability)
function formatNumber(num) {
  return num !== null && num !== undefined ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '-';
}

// Export functions globally to ensure they are accessible from inline scripts
window.loadData = loadData;
window.getTeamStats = getTeamStats;
window.getPlayerById = getPlayerById;
window.getPlayerCareerStats = getPlayerCareerStats;
window.getBattingForMatch = getBattingForMatch;
window.getBowlingForMatch = getBowlingForMatch;
window.getFieldingForMatch = getFieldingForMatch;
window.getTopPlayersByField = getTopPlayersByField;
window.getQueryParams = getQueryParams;
window.formatNumber = formatNumber;