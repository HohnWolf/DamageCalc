// Copy one edited damage-calc Pokémon into a teambuilder team.
// The team shape is the one stored under cc_builder: current version's mons stay shared with team.mons.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RLBuilderAdopt = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function num(v) { v = parseInt(v, 10); return isFinite(v) ? v : 0; }
  function sameSpecies(mon, species, baseOf) {
    if (!mon || !mon.species || !species) return false;
    if (mon.species === species) return true;
    var base = baseOf ? baseOf(mon.species) : mon.species;
    var want = baseOf ? baseOf(species) : species;
    return base === want;
  }
  function cleanSet(mon, keep) {
    var src = (mon && mon.set) || {};
    var sps = { hp: 0, at: 0, df: 0, sa: 0, sd: 0, sp: 0 };
    Object.keys(sps).forEach(function (k) { sps[k] = Math.max(0, Math.min(32, num(src.sps && src.sps[k]))); });
    var moves = (src.moves || []).map(function (m) { return m && m.name ? m.name : m; })
      .filter(function (m) { return m && m !== '(No Move)'; }).slice(0, 4);
    var set = {
      species: mon.species,
      sps: sps,
      nature: src.nature || 'Hardy',
      ability: src.ability || '',
      item: src.item || '(none)',
      moves: moves
    };
    var forme = src.forme;
    if (forme && forme !== mon.species && String(forme).indexOf('Mega ') !== 0) set.forme = forme;
    if (keep) {
      if (keep.gender) set.gender = keep.gender;
      if (keep.shiny) set.shiny = true;
      if (keep.look) set.look = keep.look;
    }
    return set;
  }
  function freshMon(mon) {
    var name = mon.setName && mon.setName !== 'Blank Set' ? mon.setName : 'Set';
    return { species: mon.species, setName: name, set: cleanSet(mon, null) };
  }
  function ensure(team, idFn) {
    if (!team.versions || !team.versions.length) {
      var v0 = { id: idFn(), name: 'v1', mons: Array.isArray(team.mons) ? team.mons : [] };
      team.versions = [v0];
      team.curVer = v0.id;
    }
    var cur = null;
    team.versions.some(function (v) { if (v.id === team.curVer) { cur = v; return true; } return false; });
    if (!cur) { cur = team.versions[0]; team.curVer = cur.id; }
    if (!Array.isArray(cur.mons)) cur.mons = Array.isArray(team.mons) ? team.mons.slice() : [];
    team.mons = cur.mons;
    return team;
  }
  function findTeam(store, id) {
    var hit = null;
    (store.teams || []).some(function (t) { if (t && t.id === id) { hit = t; return true; } return false; });
    return hit;
  }
  // choice: { mode: 'update'|'add'|'replace'|'new', teamId, index, name }
  function apply(store, mon, choice, hooks) {
    hooks = hooks || {};
    var idFn = hooks.id || function () { return 't' + Math.random().toString(36).slice(2); };
    var baseOf = hooks.baseOf;
    if (!store || !Array.isArray(store.teams)) return { ok: false, error: 'empty' };
    if (!mon || !mon.species) return { ok: false, error: 'empty' };
    choice = choice || {};
    if (choice.mode === 'new') {
      var made = freshMon(mon);
      var vid = idFn();
      var team = { id: idFn(), name: choice.name || 'Team', mons: [made], versions: [{ id: vid, name: 'v1', mons: null }], curVer: vid };
      team.versions[0].mons = team.mons;
      store.teams.push(team);
      store.cur = team.id;
      return { ok: true, mode: 'new', teamId: team.id, teamName: team.name, index: 0 };
    }
    var target = findTeam(store, choice.teamId) || findTeam(store, store.cur) || store.teams[0];
    if (!target) return { ok: false, error: 'missing' };
    ensure(target, idFn);
    var idx = choice.index | 0;
    if (choice.mode === 'update') {
      var cur = target.mons[idx];
      if (!cur || !sameSpecies(cur, mon.species, baseOf)) return { ok: false, error: 'species' };
      cur.set = cleanSet(mon, cur.set);
      cur.set.species = cur.species;
      store.cur = target.id;
      return { ok: true, mode: 'update', teamId: target.id, teamName: target.name, index: idx };
    }
    if (choice.mode === 'replace') {
      if (!target.mons[idx]) return { ok: false, error: 'missing' };
      target.mons[idx] = freshMon(mon);
      store.cur = target.id;
      return { ok: true, mode: 'replace', teamId: target.id, teamName: target.name, index: idx };
    }
    if (target.mons.length >= 6) return { ok: false, error: 'full' };
    target.mons.push(freshMon(mon));
    store.cur = target.id;
    return { ok: true, mode: 'add', teamId: target.id, teamName: target.name, index: target.mons.length - 1 };
  }
  return { apply: apply, sameSpecies: sameSpecies, cleanSet: cleanSet };
});
