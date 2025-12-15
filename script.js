// General utility functions for the Champions 11 CC website

const BADGE_DEFINITIONS = [
  {
    badge_id: 'thirty_up',
    name: 'Thirty Up',
    short_title: '30+ Runs',
    description: 'Scored 30 or more runs in a single innings.',
    category: 'batting',
    scope: 'innings',
    award_frequency: 'once_per_innings',
    requires_manual_review: false,
    rules: [
      {
        type: 'condition',
        condition: {
          metric: 'runs',
          operator: '>=',
          value: 30,
        },
      },
    ],
  },
  {
    badge_id: 'half_century_hero',
    name: 'Half-Century Hero',
    short_title: '50+ Runs',
    description: 'Scored a half-century in an innings.',
    category: 'batting',
    scope: 'innings',
    award_frequency: 'once_per_innings',
    requires_manual_review: false,
    rules: [
      {
        type: 'condition',
        condition: {
          metric: 'runs',
          operator: '>=',
          value: 50,
        },
      },
    ],
  },
  {
    badge_id: 'century_maker',
    name: 'Century Maker',
    short_title: '100 Runs',
    description: 'Reached a century in a single innings.',
    category: 'batting',
    scope: 'innings',
    award_frequency: 'once_per_innings',
    requires_manual_review: false,
    rules: [
      {
        type: 'condition',
        condition: {
          metric: 'runs',
          operator: '>=',
          value: 100,
        },
      },
    ],
  },
  {
    badge_id: 'rapid_fire',
    name: 'Rapid Fire',
    short_title: 'High SR',
    description: 'Scored at a very high strike rate with a minimum ball threshold.',
    category: 'batting',
    scope: 'innings',
    award_frequency: 'once_per_innings',
    requires_manual_review: false,
    rules: [
      {
        type: 'all_of',
        all_of: [
          {
            type: 'condition',
            condition: {
              metric: 'balls_faced',
              operator: '>=',
              value: 20,
            },
          },
          {
            type: 'condition',
            condition: {
              metric: 'strike_rate',
              operator: '>=',
              value: 150,
              format_overrides: {
                OD: { value: 120 },
                TEST: { value: 100 },
              },
            },
          },
        ],
      },
    ],
  },
  {
    badge_id: 'six_hitter_supreme',
    name: 'Six-Hitter Supreme',
    short_title: '6s Master',
    description: 'Hit five or more sixes in an innings.',
    category: 'batting',
    scope: 'innings',
    award_frequency: 'once_per_innings',
    requires_manual_review: false,
    rules: [
      {
        type: 'condition',
        condition: {
          metric: 'sixes',
          operator: '>=',
          value: 5,
        },
      },
    ],
  },
  {
    badge_id: 'triple_strike',
    name: 'Triple Strike',
    short_title: '3 Wkts',
    description: 'Took three wickets in a match.',
    category: 'bowling',
    scope: 'match',
    award_frequency: 'once_per_match',
    requires_manual_review: false,
    rules: [
      {
        type: 'condition',
        condition: {
          metric: 'wickets',
          operator: '>=',
          value: 3,
        },
      },
    ],
  },
  {
    badge_id: 'five_for_royalty',
    name: 'Five-For Royalty',
    short_title: '5 Wkts',
    description: 'Claimed a five-wicket haul in a match.',
    category: 'bowling',
    scope: 'match',
    award_frequency: 'once_per_match',
    requires_manual_review: false,
    rules: [
      {
        type: 'condition',
        condition: {
          metric: 'wickets',
          operator: '>=',
          value: 5,
        },
      },
    ],
  },
  {
    badge_id: 'economy_enforcer',
    name: 'Economy Enforcer',
    short_title: 'Low Econ',
    description: 'Bowled economically with a minimum overs threshold.',
    category: 'bowling',
    scope: 'match',
    award_frequency: 'once_per_match',
    requires_manual_review: false,
    rules: [
      {
        type: 'all_of',
        all_of: [
          {
            type: 'condition',
            condition: {
              metric: 'overs_bowled',
              operator: '>=',
              value: 3,
            },
          },
          {
            type: 'condition',
            condition: {
              metric: 'economy',
              operator: '<=',
              value: 5,
              format_overrides: {
                OD: { value: 6 },
                TEST: { value: 3 },
              },
            },
          },
        ],
      },
    ],
  },
  {
    badge_id: 'all_round_impact',
    name: 'All-Round Impact',
    short_title: 'All-Rounder',
    description: 'Contributed significantly with both bat and ball.',
    category: 'all_round',
    scope: 'match',
    award_frequency: 'once_per_match',
    requires_manual_review: false,
    rules: [
      {
        type: 'all_of',
        all_of: [
          {
            type: 'condition',
            condition: {
              metric: 'runs',
              operator: '>=',
              value: 30,
            },
          },
          {
            type: 'condition',
            condition: {
              metric: 'wickets',
              operator: '>=',
              value: 2,
            },
          },
        ],
      },
    ],
  },
  {
    badge_id: 'safe_hands',
    name: 'Safe Hands',
    short_title: 'Catches',
    description: 'Took two or more clean catches in a match.',
    category: 'fielding',
    scope: 'match',
    award_frequency: 'once_per_match',
    requires_manual_review: false,
    rules: [
      {
        type: 'condition',
        condition: {
          metric: 'catches',
          operator: '>=',
          value: 2,
        },
      },
    ],
  },
  {
    badge_id: 'direct_hit_specialist',
    name: 'Bullseye Throw',
    short_title: 'Direct Hit',
    description: 'Effected a run-out with a direct hit.',
    category: 'fielding',
    scope: 'match',
    award_frequency: 'multiple_allowed',
    requires_manual_review: false,
    rules: [
      {
        type: 'condition',
        condition: {
          metric: 'direct_hit_runouts',
          operator: '>=',
          value: 1,
        },
      },
    ],
  },
  {
    badge_id: 'match_mvp',
    name: 'Match MVP',
    short_title: 'MVP',
    description: 'Official Player of the Match.',
    category: 'all_round',
    scope: 'match',
    award_frequency: 'once_per_match',
    requires_manual_review: true,
    rules: [
      {
        type: 'condition',
        condition: {
          metric: 'player_of_match',
          operator: '==',
          value: 1,
        },
      },
    ],
  },
  {
    badge_id: '1k_run_club',
    name: '1K Run Club',
    short_title: '1000 Runs',
    description: 'Reached 1,000 career runs.',
    category: 'career',
    scope: 'career',
    award_frequency: 'once_per_career',
    requires_manual_review: false,
    rules: [
      {
        type: 'milestone_condition',
        milestone_condition: {
          metric: 'career_runs',
          milestone: 1000,
        },
      },
    ],
  },
  {
    badge_id: '100_wicket_wall',
    name: '100-Wicket Wall',
    short_title: '100 Wkts',
    description: 'Reached 100 career wickets.',
    category: 'career',
    scope: 'career',
    award_frequency: 'once_per_career',
    requires_manual_review: false,
    rules: [
      {
        type: 'milestone_condition',
        milestone_condition: {
          metric: 'career_wickets',
          milestone: 100,
        },
      },
    ],
  },
];

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

function oversToDecimal(value) {
  if (value === null || value === undefined || value === '' || value === '-' || value === 0) {
    return null;
  }
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  const oversPart = Math.trunc(num);
  const ballsPart = Math.round((num - oversPart) * 10);
  const totalBalls = oversPart * 6 + ballsPart;
  if (totalBalls <= 0) return null;
  return totalBalls / 6;
}

function deriveMatchFormat(match) {
  if (!match) return '';
  const type = (match.MatchType || '').toUpperCase();
  const overs = Number(match.Overs);
  if (type.includes('TEST')) return 'TEST';
  if (type.includes('T10')) return 'T10';
  if (type.includes('T20')) return 'T20';
  if (type.includes('OD')) return 'OD';
  if (type.includes('LIMITED')) return 'OD';
  if (!Number.isNaN(overs)) {
    if (overs <= 20) return 'T20';
    if (overs >= 40) return 'OD';
  }
  return type || '';
}

function compareValues(left, operator, right) {
  if (left === null || left === undefined) return false;
  if (right === null || right === undefined) return false;
  switch (operator) {
    case '>=':
      return Number(left) >= Number(right);
    case '>':
      return Number(left) > Number(right);
    case '<=':
      return Number(left) <= Number(right);
    case '<':
      return Number(left) < Number(right);
    case '==':
      return left === right || Number(left) === Number(right);
    default:
      return false;
  }
}

function resolveConditionValue(condition, context) {
  if (!condition || typeof condition !== 'object') return null;
  const { format_overrides: overrides } = condition;
  if (!overrides) return condition.value;
  const formatKey = (context.matchFormat || '').toUpperCase();
  if (formatKey && overrides[formatKey] && overrides[formatKey].value !== undefined) {
    return overrides[formatKey].value;
  }
  return condition.value;
}

function getMetricValue(metric, context) {
  const { entry, matchStats, career, match } = context;
  switch (metric) {
    case 'runs':
      if (entry && entry.Runs != null) return Number(entry.Runs);
      if (matchStats && matchStats.runs != null) return matchStats.runs;
      if (career && career.Runs != null) return Number(career.Runs);
      return 0;
    case 'balls_faced':
      if (entry && entry.Balls != null) return Number(entry.Balls);
      if (matchStats && matchStats.balls_faced != null) return matchStats.balls_faced;
      return 0;
    case 'strike_rate':
      if (entry && entry['Strike Rate'] != null) return Number(entry['Strike Rate']);
      if (matchStats && matchStats.strike_rate != null) return matchStats.strike_rate;
      return null;
    case 'sixes':
      if (entry && entry.Sixes != null) return Number(entry.Sixes);
      if (matchStats && matchStats.sixes != null) return matchStats.sixes;
      return 0;
    case 'wickets':
      if (matchStats && matchStats.wickets != null) return matchStats.wickets;
      if (entry && entry.Wkts != null) return Number(entry.Wkts);
      if (career && career.Wkts != null) return Number(career.Wkts);
      return 0;
    case 'overs_bowled':
      if (matchStats && matchStats.overs_bowled != null) return matchStats.overs_bowled;
      return null;
    case 'economy':
      if (matchStats && matchStats.economy != null) return matchStats.economy;
      return null;
    case 'catches':
      if (matchStats && matchStats.catches != null) return matchStats.catches;
      return 0;
    case 'direct_hit_runouts':
      if (matchStats && matchStats.direct_hit_runouts != null) {
        return matchStats.direct_hit_runouts;
      }
      return 0;
    case 'player_of_match':
      if (match && (match['Player Of Match'] || match['Player of Match'])) {
        const value = match['Player Of Match'] || match['Player of Match'];
        return value === context.playerId || value === context.playerName ? 1 : 0;
      }
      if (matchStats && matchStats.player_of_match != null) {
        return matchStats.player_of_match;
      }
      return 0;
    case 'career_runs':
      if (career && career.Runs != null) return Number(career.Runs);
      return 0;
    case 'career_wickets':
      if (career && career.Wkts != null) return Number(career.Wkts);
      return 0;
    default:
      return null;
  }
}

function evaluateRule(rule, context) {
  if (!rule) return false;
  if (rule.type === 'condition') {
    const metricValue = getMetricValue(rule.condition.metric, context);
    const targetValue = resolveConditionValue(rule.condition, context);
    return compareValues(metricValue, rule.condition.operator, targetValue);
  }
  if (rule.type === 'all_of' && Array.isArray(rule.all_of)) {
    return rule.all_of.every((subRule) => evaluateRule(subRule, context));
  }
  if (rule.type === 'any_of' && Array.isArray(rule.any_of)) {
    return rule.any_of.some((subRule) => evaluateRule(subRule, context));
  }
  if (rule.type === 'milestone_condition' && rule.milestone_condition) {
    const metricValue = getMetricValue(rule.milestone_condition.metric, context);
    const milestone = rule.milestone_condition.milestone;
    return metricValue != null && Number(metricValue) >= Number(milestone);
  }
  return false;
}

function evaluateBadge(badge, context) {
  if (!badge.rules || !badge.rules.length) {
    return false;
  }
  return badge.rules.every((rule) => evaluateRule(rule, context));
}

function buildMatchPlayerStats(data) {
  const stats = {};
  const ensure = (matchId, playerId) => {
    if (!stats[matchId]) stats[matchId] = {};
    if (!stats[matchId][playerId]) {
      stats[matchId][playerId] = {
        runs: 0,
        balls_faced: 0,
        strike_rate: null,
        sixes: 0,
        wickets: 0,
        overs_bowled: 0,
        economy: null,
        bowling_runs: 0,
        catches: 0,
        direct_hit_runouts: 0,
        player_of_match: null,
      };
    }
    return stats[matchId][playerId];
  };
  (data.batting || []).forEach((entry) => {
    if (!entry || entry.MatchID == null || !entry.PlayerID) return;
    const matchId = String(entry.MatchID);
    const playerId = entry.PlayerID;
    const record = ensure(matchId, playerId);
    record.runs += Number(entry.Runs || 0);
    record.balls_faced += Number(entry.Balls || 0);
    record.sixes += Number(entry.Sixes || 0);
    if (entry['Strike Rate'] != null) {
      record.strike_rate = Number(entry['Strike Rate']);
    } else if (record.runs && record.balls_faced) {
      record.strike_rate = Number(((record.runs / record.balls_faced) * 100).toFixed(2));
    }
  });
  (data.bowling || []).forEach((entry) => {
    if (!entry || entry.MatchID == null || !entry.PlayerID) return;
    const matchId = String(entry.MatchID);
    const playerId = entry.PlayerID;
    const record = ensure(matchId, playerId);
    record.wickets += Number(entry.Wkts || 0);
    const oversDecimal = oversToDecimal(entry.Overs);
    if (oversDecimal) {
      record.overs_bowled += oversDecimal;
    }
    record.bowling_runs += Number(entry['Bowl Runs'] || 0);
    if (entry.Economy != null) {
      record.economy = Number(entry.Economy);
    }
  });
  (data.fielding || []).forEach((entry) => {
    if (!entry || entry.MatchID == null || !entry.PlayerID) return;
    const matchId = String(entry.MatchID);
    const playerId = entry.PlayerID;
    const record = ensure(matchId, playerId);
    record.catches += Number(entry.Catches || 0);
    record.direct_hit_runouts += Number(
      entry['Direct Hit Run Outs'] || entry['Direct Hit'] || entry['Direct Hit RunOuts'] || 0
    );
  });
  Object.values(stats).forEach((playerMap) => {
    Object.values(playerMap).forEach((record) => {
      if ((record.economy === null || Number.isNaN(record.economy)) && record.overs_bowled) {
        record.economy = Number((record.bowling_runs / record.overs_bowled).toFixed(2));
      } else if (record.economy != null) {
        record.economy = Number(record.economy.toFixed ? record.economy.toFixed(2) : record.economy);
      }
    });
  });
  return stats;
}

function describeAwardDetail(scope, params) {
  if (scope === 'innings' && params.entry) {
    const sr = params.entry['Strike Rate'] != null ? Number(params.entry['Strike Rate']).toFixed(2) : '-';
    return `Runs ${formatNumber(params.entry.Runs || 0)} (SR ${sr})`;
  }
  if (scope === 'match' && params.matchStats) {
    const parts = [];
    if (params.matchStats.runs) parts.push(`Runs ${formatNumber(params.matchStats.runs)}`);
    if (params.matchStats.wickets) parts.push(`Wkts ${formatNumber(params.matchStats.wickets)}`);
    if (params.matchStats.economy != null) parts.push(`Econ ${params.matchStats.economy}`);
    if (params.matchStats.catches) parts.push(`Catches ${formatNumber(params.matchStats.catches)}`);
    return parts.length ? parts.join(' • ') : 'Match contribution logged';
  }
  if (scope === 'career' && params.career) {
    const parts = [];
    if (params.career.Runs != null) parts.push(`Runs ${formatNumber(params.career.Runs)}`);
    if (params.career.Wkts != null) parts.push(`Wkts ${formatNumber(params.career.Wkts)}`);
    return parts.length ? parts.join(' • ') : 'Career milestone';
  }
  return '';
}

function calculateBadgeAwards(data) {
  const matchMap = new Map((data.matches || []).map((match) => [String(match.MatchID), match]));
  const careerMap = new Map((data.player_career_stats || []).map((entry) => [entry['PlayerID'], entry]));
  const playerMap = new Map((data.players || []).map((player) => [player['PlayerID'], player]));
  const matchStats = buildMatchPlayerStats(data);

  const result = BADGE_DEFINITIONS.map((badge) => ({
    badge,
    recipients: [],
  }));
  const badgeResultMap = new Map(result.map((row) => [row.badge.badge_id, row.recipients]));

  BADGE_DEFINITIONS.forEach((badge) => {
    const recipients = badgeResultMap.get(badge.badge_id);
    if (!recipients) return;
    if (badge.scope === 'innings') {
      (data.batting || []).forEach((entry) => {
        if (!entry || entry.MatchID == null || !entry.PlayerID) return;
        const match = matchMap.get(String(entry.MatchID));
        const player = playerMap.get(entry.PlayerID);
        if (!player) return;
        const context = {
          entry,
          match,
          matchStats: matchStats[String(entry.MatchID)]?.[entry.PlayerID] || null,
          matchFormat: deriveMatchFormat(match),
          playerId: entry.PlayerID,
          playerName: player['Player Name'],
        };
        if (evaluateBadge(badge, context)) {
          recipients.push({
            playerId: entry.PlayerID,
            playerName: player['Player Name'],
            matchId: entry.MatchID,
            opponent: match ? match.Opponent : null,
            date: match ? match.Date : null,
            detail: describeAwardDetail('innings', { entry }),
            requires_manual_review: badge.requires_manual_review,
          });
        }
      });
    } else if (badge.scope === 'match') {
      Object.entries(matchStats).forEach(([matchId, players]) => {
        const match = matchMap.get(matchId);
        const format = deriveMatchFormat(match);
        Object.entries(players).forEach(([playerId, statsForMatch]) => {
          const player = playerMap.get(playerId);
          if (!player) return;
          const context = {
            matchStats: statsForMatch,
            match,
            matchFormat: format,
            playerId,
            playerName: player['Player Name'],
          };
          if (evaluateBadge(badge, context)) {
            recipients.push({
              playerId,
              playerName: player['Player Name'],
              matchId,
              opponent: match ? match.Opponent : null,
              date: match ? match.Date : null,
              detail: describeAwardDetail('match', { matchStats: statsForMatch }),
              requires_manual_review: badge.requires_manual_review,
            });
          }
        });
      });
    } else if (badge.scope === 'career') {
      (data.player_career_stats || []).forEach((career) => {
        const player = playerMap.get(career['PlayerID']);
        if (!player) return;
        const context = {
          career,
          playerId: career['PlayerID'],
          playerName: player['Player Name'],
          matchFormat: '',
        };
        if (evaluateBadge(badge, context)) {
          recipients.push({
            playerId: career['PlayerID'],
            playerName: player['Player Name'],
            matchId: null,
            opponent: null,
            date: null,
            detail: describeAwardDetail('career', { career }),
            requires_manual_review: badge.requires_manual_review,
          });
        }
      });
    }
  });

  return result;
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
  window.Badges = {
    BADGE_DEFINITIONS,
    calculateBadgeAwards,
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
