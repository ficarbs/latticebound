// NPC, door and boss scripts. Each runs with world input locked.
import { G, flag, setFlag, wipe, sleep } from './state.js';
import { SPECIES, ITEMS, STARTERS, EL } from './data.js';
import { makeKith, healAll, give, addKith, statsOf } from './kith.js';
import { sfx } from './audio.js';
import { say, choose, toast, starterSelect, shopScreen, ending } from './ui.js';
import { startBattle } from './battle.js';
import { W } from './world.js';
import { travelMenu } from './ui.js';
import { saveGame } from './save.js';

async function gift(id, n, who) {
  give(id, n);
  sfx('item');
  await say(`Received ${n > 1 ? n + ' × ' : ''}${ITEMS[id].name}.`, who);
}
async function rest(text) {
  await wipe(1, 0.3);
  healAll(); sfx('heal');
  await sleep(0.6);
  await wipe(0, 0.3);
  G.p.heal = { map: W.map.id, x: W.pl.x, y: W.pl.y };
  saveGame();
  await say(text);
}

// After the story the Wardens fight again, at a strength that follows how deep you have gone.
const REMATCH = {
  maris: ['finfathom', 'brinelle', 'noxwing', 'gillby', 'maelorca'],
  kael: ['magmander', 'cragnaw', 'flarevane', 'coalcub', 'solkharn'],
  yuna: ['stagvolt', 'phantigre', 'noxwing', 'wispurr', 'solkharn'],
  sable: ['sporelord', 'phantigre', 'maelorca', 'solkharn', 'eldergrove'],
};
async function rematch(n) {
  const who = n.name, tier = flag('unlit') ? 3 : flag('dg12') ? 2 : 1, lv = [0, 54, 76, 100][tier], key = `rm_${n.id}_${tier}`;
  const pick = await choose(['Rematch', 'Just talk'], { prompt: `${who} is ready for you again. Team level ${lv}.${flag(key) ? ' (Already beaten at this strength.)' : ''}`, name: who });
  if (pick !== 0) return false;
  const foes = REMATCH[n.id].slice(tier === 1 ? 1 : 0).filter((sp, i) => tier > 1 || SPECIES[sp].stage > 1 || i > 2).map((sp, i, a) => {
    const k = makeKith(sp, lv - (a.length - 1 - i));
    if (i === a.length - 1) { k.boss = 1 + tier * 0.5; k.hp = statsOf(k).hp; if (tier > 1) k.traits = { enrage: 0.4, double: tier === 3 }; }
    return k;
  });
  const r = await startBattle({ foes, kind: 'trainer', name: who, gold: lv * 60 });
  if (r !== 'win') return true;
  if (!flag(key)) {
    setFlag(key);
    await say(tier === 3 ? 'There is nothing left I can teach you. Nothing left anyone can.' : 'Stronger than last time. Go deeper, then come back. I will be stronger too.', who);
    await gift('shard', tier * 3, who);
    await gift('elixir', tier * 2, who);
    if (tier === 3 && Object.keys(REMATCH).every(id => flag(`rm_${id}_3`)) && !flag('crest')) {
      setFlag('crest');
      await gift('crest', 1);
      await say('All four Wardens, at their strongest. The Crest is yours, and so is the title that goes with it.');
    }
  } else await say('Again, and again you win. Good.', who);
  saveGame();
  return true;
}

const SCRIPTS = {
  async talk(n) { for (const line of n.lines) await say(line, n.name); },

  async sable(n) {
    const who = n.name;
    if (!flag('starter')) {
      await say('There you are. The Lattice has been humming your name all morning.', who);
      await say('Every Kith grows by walking it: a web of nodes, shared by all of them. Each level earns a Spark, and each Spark lights one node.', who);
      await say('Three young Kith are ready for a Tamer. Choose the one that feels right.', who);
      const sp = await starterSelect();
      const k = makeKith(sp, 3);
      k.sparks = 2;
      addKith(k);
      setFlag('starter');
      sfx('fanfare');
      await say(`${SPECIES[sp].name} bounds over and sits on your foot. It's decided, then.`, who);
      await gift('tonic', 5, who);
      await gift('seal', 5, who);
      await say(`${k.name} already holds 2 Sparks. Press X to open the menu, pick Lattice, and light the nodes beside it.`, who);
      await say('North of the vale, something in Glimmer Grotto is tearing at the Lattice. Go carefully, and come back stronger.', who);
      saveGame();
      return;
    }
    if (flag('clear') && (await rematch(n))) return;
    if (flag('unlit')) return say('You went all the way down. I have studied the Lattice for forty years and I do not know what you are any more. Thank you.', who);
    if (flag('clear')) return say('The hum is clean again, but the Spire has a stair now, going down. The Hollow Deep. Whatever fed the Nullmaw is at the bottom, and it will take Kith near Lv 100 to face it.', who);
    if (flag('yuna')) return say('Four Wardens, four Waygates. The Spire is all that is left. Finish it.', who);
    if (flag('maris')) return say('Key II opens the deep locks, and past them the last skills and the second Ascension. East of Saltmarsh lie Cindermere and Galehaven. Their Wardens guard the road to the Spire.', who);
    if (flag('key1')) return say('Lattice Key I! Take it to a ring lock between two arms. Cross it and your Kith can learn another element entirely. Brinecliff lies north.', who);
    const sparks = G.p.party.reduce((s, k) => s + k.sparks, 0);
    if (sparks) return say(`You are carrying ${sparks} unspent Spark${sparks > 1 ? 's' : ''}. Menu, then Lattice. Unlit nodes do nobody any good.`, who);
    await say('Ascension nodes sit eight steps out on every arm. But every family ascends its own way: one by level, one by the sea, one by keeping the right company. Open a Kith\'s Form Chart from the menu to see every form its family can reach.', who);
  },

  async mender() {
    await say('Welcome to the Mender\'s Lodge. Let me see to your Kith.', 'Mender');
    await rest('All mended. Walk the Lattice well.');
  },
  async home() { await rest('You rest a while at home. Your Kith look refreshed.'); },
  async lab() { await say('The lab door is propped open. Charts of the Lattice cover every wall, six arms meeting at one bright Heart.'); },
  async locked() { await say('Nobody seems to be home.'); },
  async shop1() { await say('Fresh stock, fair prices.', 'Trader'); await shopScreen(['tonic', 'ether', 'seal', 'rekindle']); },
  async shop2() { await say('Brinecliff\'s finest. The Spark Shards came in on the last tide.', 'Trader'); await shopScreen(['tonic', 'tonicx', 'ether', 'seal', 'sealx', 'rekindle', 'shard']); },

  async trainer(n) {
    const t = n.trainer, key = 't_' + n.id;
    if (flag(key)) return say(t.after, n.name);
    await say(t.before, n.name);
    const r = await startBattle({ foes: t.party.map(([s, l]) => makeKith(s, l)), kind: 'trainer', name: n.name, gold: t.gold });
    if (r === 'win') { setFlag(key); await say(t.after, n.name); }
  },

  async shop3() { await say('Mountain prices, mountain quality.', 'Trader'); await shopScreen(['tonicx', 'elixir', 'ether', 'etherx', 'sealx', 'rekindle', 'shard']); },
  async waygate() {
    await say('A Waygate. The Lattice surfaces here, close enough to step into.');
    await travelMenu();
  },
  async rift2() { await say('Static chokes the mouth of the pass. Warden Kael keeps Cindermere, and the pass with it.'); },
  async gate2() { await say('The Spire road is barred with static. Warden Yuna of Galehaven decides who walks it.'); },

  async kael(n) {
    const who = n.name;
    if (flag('clear') && (await rematch(n))) return;
    if (flag('kael')) return say('The pass is open. Mind the lava, mind Yuna, and mind whatever lives in that tower.', who);
    await say('Maris sent you, then. She tests whether you can hold a Key. I test whether you can take a hit.', who);
    if ((await choose(['Try me', 'Not yet'], { prompt: 'Face the Warden of Cindermere?', name: who })) !== 0) return;
    const r = await startBattle({ foes: [makeKith('magmander', 21), makeKith('cragnaw', 22), makeKith('flarevane', 23)], kind: 'trainer', name: who, gold: 800 });
    if (r !== 'win') return;
    setFlag('kael');
    await say('Hah! Still standing. Good. The pass will not stop you now.', who);
    await gift('shard', 2, who);
    await gift('elixir', 3, who);
    saveGame();
  },
  async yuna(n) {
    const who = n.name;
    if (flag('clear') && (await rematch(n))) return;
    if (flag('yuna')) return say('The Spire gate is open. I have watched that tower grow for a year. Go and end it.', who);
    await say('Three Wardens let you pass. I am the last door, and I am the one that stays shut.', who);
    if ((await choose(['Open it', 'Not yet'], { prompt: 'Face the Warden of Galehaven?', name: who })) !== 0) return;
    const r = await startBattle({ foes: [makeKith('stagvolt', 26), makeKith('phantigre', 26), makeKith('noxwing', 27), makeKith('solkharn', 28)], kind: 'trainer', name: who, gold: 1200 });
    if (r !== 'win') return;
    setFlag('yuna');
    await say('...Then it opens. Take these. You will want every Spark you can get.', who);
    await gift('shard', 3, who);
    await gift('rekindle', 2, who);
    saveGame();
  },

  async guardian(n) {
    const g = n.g, last = n.floor === 24;
    await say(last ? 'The stair ends. There is no floor here, only something vast and pale that was here before the Lattice had light in it.' : `${g.name} bars the stair down. The static around it is thick enough to lean on.`);
    if ((await choose(['Fight', 'Step back'], { prompt: last ? 'This is the bottom of everything.' : 'There is a font and a Waygate behind you.' })) !== 0) return;
    const foes = g.party.map(([sp, lv]) => {
      const k = makeKith(sp, lv);
      if (g.party.length === 1) k.name = g.name;
      if (g.fix) { k.fix = g.fix; k.hp = g.fix.hp; k.en = g.fix.en; k.boss = 1; }
      else if (g.boss) { k.boss = g.boss; k.hp = statsOf(k).hp; }
      if (g.traits) k.traits = g.traits;
      return k;
    });
    const r = await startBattle({ foes, kind: g.party.length > 1 ? 'trainer' : 'boss', name: g.name, gold: n.floor * 400 });
    if (r !== 'win') return;
    setFlag('dg' + n.floor);
    await gift('shard', last ? 10 : 3);
    saveGame();
    if (!last) return say(`The way down is clear. Floor ${n.floor} is now a Waygate stop: Travel will bring you back here.`);
    setFlag('unlit');
    await say('The Unlit comes apart like frost in the sun. Under it, the oldest node in the world catches, and burns steady.');
    await ending(true);
  },

  async rift() { await say('A wall of static crackles across the road. It tastes of the Grotto. Whatever feeds it is still in there.'); },
  async gate() { await say('Bars of static seal the way to the Spire. Warden Maris of Brinecliff is said to hold the key.'); },

  async hollow(n) {
    await say('The Cragnaw flickers like a bad memory. Lines of static run where its eyes should be.');
    if ((await choose(['Fight', 'Back away'], { prompt: 'It hasn\'t noticed you yet.' })) !== 0) return;
    const boss = makeKith('cragnaw', 10);
    boss.boss = 1.7; boss.name = 'Hollowed Cragnaw'; boss.hp = Math.round(boss.hp * 1.7);
    const r = await startBattle({ foes: [boss], kind: 'boss', name: 'Hollowed Cragnaw', gold: 200 });
    if (r !== 'win') return;
    setFlag('key1');
    await say('The static drains out of it and into the floor. The Cragnaw blinks, yawns, and trundles off into the dark.');
    await gift('key1', 1);
    await say('Something it had swallowed. Lattice Key I: it opens the Lv.1 locks on the rings between arms.');
    saveGame();
  },

  async maris(n) {
    const who = n.name;
    if (flag('clear') && (await rematch(n))) return;
    if (flag('maris')) return say('The gate past Saltmarsh will open for you now. Kael holds Cindermere and Yuna holds Galehaven. Neither will wave you through.', who);
    await say('So the vale finally sent someone. I keep the second Key, and I do not hand it to Tamers who cannot hold it.', who);
    if ((await choose(['I\'m ready', 'Not yet'], { prompt: 'Face the Warden of Brinecliff?', name: who })) !== 0) return;
    const r = await startBattle({ foes: [makeKith('gillby', 13), makeKith('noxwing', 14), makeKith('finfathom', 16)], kind: 'trainer', name: who, gold: 500 });
    if (r !== 'win') return;
    setFlag('maris');
    await say('Ha! The tide goes out for you. Take it.', who);
    await gift('key2', 1, who);
    await gift('shard', 2, who);
    await say('Key II opens the deep locks, far out on every arm. And the static gate east of Saltmarsh answers to it too. Cindermere is beyond.', who);
    saveGame();
  },

  async gift(n) {
    const who = n.name;
    if (flag('gift')) return say('How is the little one settling in? Kith from different arms make each other braver.', who);
    const have = [...G.p.party, ...G.p.reserve].map(k => SPECIES[k.sp].el);
    const sp = STARTERS.find(s => !have.includes(SPECIES[s].el)) || STARTERS[0];
    await say('I raise orphaned Kith here by the water. This one keeps staring at the road like it has somewhere to be.', who);
    if ((await choose(['Take it along', 'Not now'], { prompt: `Adopt the ${SPECIES[sp].name}?`, name: who })) !== 0) return;
    const k = makeKith(sp, 10);
    k.sparks = 3;
    setFlag('gift');
    sfx('fanfare');
    const where = addKith(k);
    await say(`${k.name} joined you${where === 'haven' ? ' and waits in the Haven' : ''}! A ${EL[SPECIES[sp].el].name} Kith with 3 Sparks to spend.`, who);
    saveGame();
  },

  async font() {
    await say('A shard of clean Lattice light, somehow untouched by the static. It is warm.');
    await rest('Your Kith are restored.');
  },

  async nullmaw() {
    await say('At the top of the Spire the Lattice simply stops. In the gap, something opens far too many teeth.');
    if ((await choose(['Step forward', 'Not yet'], { prompt: 'There is no way around it.' })) !== 0) return;
    const boss = makeKith('nullmaw', 34);
    boss.fix = { hp: 620, en: 120, atk: 42, def: 32, spd: 24 }; boss.boss = 1; boss.hp = 620; boss.en = 120; boss.traits = { enrage: 0.35 };
    const r = await startBattle({ foes: [boss], kind: 'boss', name: 'Nullmaw', gold: 2000 });
    if (r !== 'win') return;
    setFlag('clear');
    await say('The Nullmaw folds in on itself like paper. Where it was, a single node flickers, then holds steady.');
    await gift('shard', 5);
    saveGame();
    await ending();
  },
};

export async function runScript(name, arg) {
  G.busy++;
  try { await SCRIPTS[name](arg); } finally { G.busy--; }
}
