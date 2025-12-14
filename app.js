/* Champions 11 CC — static site (no backend)
   Data source: data.json (generated from Excel)
*/
const $ = (sel) => document.querySelector(sel);

let DB = null;

function fmt(n, digits=2){
  if(n === null || n === undefined || n === '') return '-';
  if(typeof n === 'number') return Number.isFinite(n) ? n.toFixed(digits).replace(/\.00$/,'') : '-';
  const x = Number(n);
  return Number.isFinite(x) ? x.toFixed(digits).replace(/\.00$/,'') : String(n);
}
function badgeForResult(r){
  const s = String(r || '').toLowerCase();
  if(s.includes('won')) return ['good','Won'];
  if(s.includes('lost')) return ['bad','Lost'];
  if(s.includes('tie')) return ['warn','Tie'];
  if(s.includes('no')) return ['warn','No Result'];
  return ['','Result'];
}
function byId(list, key){
  const m = new Map();
  list.forEach(x => m.set(String(x[key]), x));
  return m;
}
function sum(arr, key){
  return arr.reduce((a,x)=> a + (Number(x[key]) || 0), 0);
}
function groupBy(list, key){
  const m = new Map();
  list.forEach(x=>{
    const k = String(x[key]);
    if(!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  });
  return m;
}

async function load(){
  const res = await fetch('data.json', {cache:'no-store'});
  DB = await res.json();

  // Convenience maps
  DB.playerMap = byId(DB.players, 'PlayerID');
  DB.matchMap  = byId(DB.matches, 'MatchID');
  DB.batByMatch = groupBy(DB.batting, 'MatchID');
  DB.bowlByMatch = groupBy(DB.bowling, 'MatchID');
  DB.fieldByMatch = groupBy(DB.fielding, 'MatchID');

  renderOverview();
  renderPlayers();
  renderMatches();
  renderLeaderboards();
}

function renderOverview(){
  const v = $('#view-overview');
  const team = (DB.team_stats && DB.team_stats[0]) || {};
  const matches = DB.matches || [];
  const latest = [...matches].sort((a,b)=> String(b.Date||'').localeCompare(String(a.Date||'')))[0];

  const cards = [
    {title:'Matches', value: team.Matches ?? matches.length, note:'Total'},
    {title:'Won', value: team.Won ?? '-', note:'Wins'},
    {title:'Lost', value: team.Lost ?? '-', note:'Losses'},
    {title:'Net RR', value: fmt(team['Net RR'] ?? team.NetRR ?? team.NetRR, 2), note:'Net Run Rate'}
  ];

  v.innerHTML = `
    <div class="grid cards">
      ${cards.map((c,i)=>`
        <div class="card" style="grid-column: span 3;">
          <h2>${c.title}</h2>
          <div class="kpi">
            <div class="value">${c.value ?? '-'}</div>
            <span class="badge">${c.note}</span>
          </div>
        </div>
      `).join('')}
    </div>

    <div style="height:14px"></div>

    <div class="split">
      <div class="card">
        <h2>Latest Match</h2>
        ${latest ? `
          <div class="row">
            <div>
              <div><b>vs ${latest.Opponent || '-'}</b> <span class="small muted">(${latest.MatchType || ''} • ${latest.Overs || ''} overs)</span></div>
              <div class="muted small">${latest.Date || '-'} • ${latest.Venue || '-'}</div>
            </div>
            <span class="badge ${badgeForResult(latest['Match Result'])[0]}">${badgeForResult(latest['Match Result'])[1]}</span>
          </div>
          <div style="height:10px"></div>
          <div class="muted small">
            Team: ${latest['Team Runs'] ?? '-'} / ${latest['Team Wickets Lost'] ?? '-'} (${latest['Team Overs Played'] ?? '-'} ov) —
            Opp: ${latest['Opponent Runs'] ?? '-'} / ${latest['Opponent Wickets Lost'] ?? '-'} (${latest['Opponent Overs Played'] ?? '-'} ov)
          </div>
        ` : `<div class="muted">No matches found.</div>`}
      </div>

      <div class="card">
        <h2>How this works</h2>
        <ol class="small muted" style="line-height:1.6; margin: 8px 0 0 18px;">
          <li>Keep data in Excel (your master DB).</li>
          <li>Export to <b>data.json</b> (script provided).</li>
          <li>Host for free on <b>GitHub Pages</b> (static site).</li>
        </ol>
        <div style="height:10px"></div>
        <span class="badge">No backend • No database cost</span>
      </div>
    </div>
  `;
}

function renderPlayers(){
  const v = $('#view-players');
  const career = DB.career || [];
  const players = DB.players || [];

  const rows = career.map(r=>{
    const pid = String(r.PlayerID);
    const p = DB.playerMap.get(pid) || {};
    return {
      PlayerID: pid,
      Name: r['Player Name'] || p['Player Name'] || pid,
      Role: p.Role || '-',
      Matches: r.Matches ?? '-',
      Runs: r.Runs ?? 0,
      Avg: r.Avg ?? '-',
      SR: r.SR ?? '-',
      Wkts: r.Wkts ?? 0,
      Econ: r.Econ ?? '-',
      Catches: r.Catches ?? 0
    };
  });

  v.innerHTML = `
    <div class="card">
      <div class="row">
        <div>
          <h2>Players (Career Summary)</h2>
          <div class="muted small">Search + sort works entirely in-browser.</div>
        </div>
        <div class="controls">
          <input id="playerSearch" placeholder="Search player..." />
          <select id="playerSort">
            <option value="Runs">Sort: Runs</option>
            <option value="Wkts">Sort: Wickets</option>
            <option value="Avg">Sort: Bat Avg</option>
            <option value="Econ">Sort: Economy</option>
            <option value="Catches">Sort: Catches</option>
          </select>
        </div>
      </div>
      <div style="height:12px"></div>
      <div class="table-wrap">
        <table id="playersTable">
          <thead>
            <tr>
              <th>Player</th><th>Role</th><th>Mat</th><th>Runs</th><th>Avg</th><th>SR</th><th>Wkts</th><th>Econ</th><th>Catches</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `;

  const tbody = $('#playersTable tbody');
  const search = $('#playerSearch');
  const sort = $('#playerSort');

  function render(){
    const q = (search.value || '').toLowerCase().trim();
    const key = sort.value;

    const filtered = rows.filter(r => (r.Name || '').toLowerCase().includes(q) || (r.Role || '').toLowerCase().includes(q));

    filtered.sort((a,b)=>{
      const av = Number(a[key]) || 0;
      const bv = Number(b[key]) || 0;
      // For Econ lower is better
      if(key === 'Econ') return av - bv;
      return bv - av;
    });

    tbody.innerHTML = filtered.map(r=>`
      <tr>
        <td><b>${r.Name}</b> <span class="muted small">(${r.PlayerID})</span></td>
        <td>${r.Role}</td>
        <td>${r.Matches}</td>
        <td>${r.Runs}</td>
        <td>${fmt(r.Avg,2)}</td>
        <td>${fmt(r.SR,2)}</td>
        <td>${r.Wkts}</td>
        <td>${fmt(r.Econ,2)}</td>
        <td>${r.Catches}</td>
      </tr>
    `).join('');
  }

  search.addEventListener('input', render);
  sort.addEventListener('change', render);
  render();
}

function renderMatches(){
  const v = $('#view-matches');
  const matches = [...(DB.matches || [])].sort((a,b)=> String(b.Date||'').localeCompare(String(a.Date||'')));

  v.innerHTML = `
    <div class="card">
      <div class="row">
        <div>
          <h2>Matches</h2>
          <div class="muted small">Click a match to view the scorecard (batting / bowling / fielding).</div>
        </div>
        <div class="controls">
          <input id="matchSearch" placeholder="Search opponent / venue..." />
        </div>
      </div>
      <div style="height:12px"></div>
      <div class="table-wrap">
        <table id="matchesTable">
          <thead>
            <tr>
              <th>Date</th><th>Opponent</th><th>Venue</th><th>Result</th><th>Team</th><th>Opp</th><th>Type</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <div style="height:14px"></div>
    <div class="card" id="scorecard">
      <h2>Scorecard</h2>
      <div class="muted">Select a match above.</div>
    </div>
  `;

  const tbody = $('#matchesTable tbody');
  const search = $('#matchSearch');
  const scorecard = $('#scorecard');

  function renderTable(){
    const q = (search.value || '').toLowerCase().trim();
    const filtered = matches.filter(m =>
      String(m.Opponent||'').toLowerCase().includes(q) ||
      String(m.Venue||'').toLowerCase().includes(q)
    );

    tbody.innerHTML = filtered.map(m=>{
      const [cls,label]=badgeForResult(m['Match Result']);
      const team = `${m['Team Runs'] ?? '-'} / ${m['Team Wickets Lost'] ?? '-'} (${m['Team Overs Played'] ?? '-'} ov)`;
      const opp  = `${m['Opponent Runs'] ?? '-'} / ${m['Opponent Wickets Lost'] ?? '-'} (${m['Opponent Overs Played'] ?? '-'} ov)`;
      return `
        <tr data-mid="${m.MatchID}">
          <td>${m.Date || '-'}</td>
          <td><b>${m.Opponent || '-'}</b></td>
          <td>${m.Venue || '-'}</td>
          <td><span class="badge ${cls}">${label}</span></td>
          <td>${team}</td>
          <td>${opp}</td>
          <td class="muted small">${m.MatchType || ''}</td>
        </tr>
      `;
    }).join('');
  }

  function renderScorecard(matchId){
    const m = DB.matchMap.get(String(matchId));
    if(!m) return;

    const bat = (DB.batByMatch.get(String(matchId)) || []).map(r=>{
      const p = DB.playerMap.get(String(r.PlayerID)) || {};
      return {...r, Name: p['Player Name'] || r.PlayerID};
    }).sort((a,b)=> (b.Runs||0) - (a.Runs||0));

    const bowl = (DB.bowlByMatch.get(String(matchId)) || []).map(r=>{
      const p = DB.playerMap.get(String(r.PlayerID)) || {};
      return {...r, Name: p['Player Name'] || r.PlayerID};
    }).sort((a,b)=> (b.Wickets||0) - (a.Wickets||0) || (a.Economy||99) - (b.Economy||99));

    const field = (DB.fieldByMatch.get(String(matchId)) || []).map(r=>{
      const p = DB.playerMap.get(String(r.PlayerID)) || {};
      return {...r, Name: p['Player Name'] || r.PlayerID};
    });

    scorecard.innerHTML = `
      <div class="row">
        <div>
          <h2>Scorecard</h2>
          <div><b>vs ${m.Opponent || '-'}</b> <span class="muted small">(${m.Date || '-'})</span></div>
          <div class="muted small">${m.Venue || '-'}</div>
        </div>
        <span class="badge ${badgeForResult(m['Match Result'])[0]}">${badgeForResult(m['Match Result'])[1]}</span>
      </div>

      <div style="height:12px"></div>

      <div class="grid" style="grid-template-columns: 1fr; gap:14px;">
        <div class="card" style="background: rgba(15,23,48,.55);">
          <h2>Batting</h2>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Player</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th><th>Out</th><th>Dismissal</th></tr></thead>
              <tbody>
                ${bat.map(r=>`
                  <tr>
                    <td><b>${r.Name}</b></td>
                    <td>${r.Runs ?? 0}</td>
                    <td>${r.Balls ?? 0}</td>
                    <td>${r.Fours ?? 0}</td>
                    <td>${r.Sixes ?? 0}</td>
                    <td>${fmt(r['Strike Rate'],2)}</td>
                    <td>${r.Out || '-'}</td>
                    <td class="muted small">${r['Dismissal Type'] || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="card" style="background: rgba(15,23,48,.55);">
          <h2>Bowling</h2>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Player</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th><th>Dots</th><th>Wd</th><th>NB</th></tr></thead>
              <tbody>
                ${bowl.map(r=>`
                  <tr>
                    <td><b>${r.Name}</b></td>
                    <td>${fmt(r.Overs,1)}</td>
                    <td>${r.Maidens ?? 0}</td>
                    <td>${r.Runs ?? 0}</td>
                    <td>${r.Wickets ?? 0}</td>
                    <td>${fmt(r.Economy,2)}</td>
                    <td>${r.Dots ?? 0}</td>
                    <td>${r.Wides ?? 0}</td>
                    <td>${r['No-Balls'] ?? 0}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="card" style="background: rgba(15,23,48,.55);">
          <h2>Fielding</h2>
          ${field.length ? `
            <div class="table-wrap">
              <table>
                <thead><tr><th>Player</th><th>Catches</th><th>Run Outs</th><th>Stumpings</th></tr></thead>
                <tbody>
                  ${field.map(r=>`
                    <tr>
                      <td><b>${r.Name}</b></td>
                      <td>${r.Catches ?? 0}</td>
                      <td>${r['Run Outs'] ?? 0}</td>
                      <td>${r.Stumpings ?? 0}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `<div class="muted small">No fielding records for this match (yet).</div>`}
        </div>
      </div>
    `;
  }

  renderTable();
  search.addEventListener('input', renderTable);

  tbody.addEventListener('click', (e)=>{
    const tr = e.target.closest('tr[data-mid]');
    if(!tr) return;
    renderScorecard(tr.dataset.mid);
  });
}

function renderLeaderboards(){
  const v = $('#view-leaderboards');

  // compute leaderboards live from batting/bowling/fielding
  const bat = DB.batting || [];
  const bowl = DB.bowling || [];
  const field = DB.fielding || [];

  const runsByPlayer = new Map();
  bat.forEach(r=>{
    const id = String(r.PlayerID);
    runsByPlayer.set(id, (runsByPlayer.get(id)||0) + (Number(r.Runs)||0));
  });

  const wktsByPlayer = new Map();
  bowl.forEach(r=>{
    const id = String(r.PlayerID);
    wktsByPlayer.set(id, (wktsByPlayer.get(id)||0) + (Number(r.Wickets)||0));
  });

  const catchesByPlayer = new Map();
  field.forEach(r=>{
    const id = String(r.PlayerID);
    catchesByPlayer.set(id, (catchesByPlayer.get(id)||0) + (Number(r.Catches)||0));
  });

  function topN(map, n=10){
    return [...map.entries()]
      .map(([id,val])=>({id, val}))
      .sort((a,b)=>b.val-a.val)
      .slice(0,n)
      .map(x=>({
        ...x,
        name: (DB.playerMap.get(x.id)||{})['Player Name'] || x.id
      }));
  }

  const topRuns = topN(runsByPlayer, 10);
  const topWkts = topN(wktsByPlayer, 10);
  const topCatches = topN(catchesByPlayer, 10);

  const block = (title, rows, unit) => `
    <div class="card" style="background: rgba(18,26,51,.85);">
      <h2>${title}</h2>
      <div class="table-wrap">
        <table style="min-width: 520px;">
          <thead><tr><th>#</th><th>Player</th><th>${unit}</th></tr></thead>
          <tbody>
            ${rows.map((r,i)=>`
              <tr><td>${i+1}</td><td><b>${r.name}</b></td><td>${r.val}</td></tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  v.innerHTML = `
    <div class="grid" style="grid-template-columns: repeat(12, 1fr); gap:14px;">
      <div style="grid-column: span 6;">${block('Top Runs', topRuns, 'Runs')}</div>
      <div style="grid-column: span 6;">${block('Top Wickets', topWkts, 'Wkts')}</div>
      <div style="grid-column: span 6;">${block('Most Catches', topCatches, 'Catches')}</div>
      <div style="grid-column: span 6;">
        <div class="card">
          <h2>Notes</h2>
          <ul class="muted small" style="line-height:1.7">
            <li>Leaderboards are calculated from match-by-match sheets.</li>
            <li>If you add new matches, just regenerate <b>data.json</b> and re-upload.</li>
          </ul>
        </div>
      </div>
    </div>
  `;
}

function setupTabs(){
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      tabs.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.view;
      document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
      $('#view-' + view).classList.remove('hidden');
      window.scrollTo({top:0, behavior:'smooth'});
    });
  });
}

setupTabs();
load().catch(err=>{
  console.error(err);
  document.body.innerHTML = '<div style="padding:18px;color:#fff">Failed to load data.json. If you opened index.html directly, use a local server or GitHub Pages.</div>';
});
