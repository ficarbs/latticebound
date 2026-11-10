// NPC, door and boss scripts. Each runs with world input locked.
import { G, flag, setFlag, wipe, sleep } from './state.js';
import { SPECIES, ITEMS, STARTERS, EL } from './data.js';
import { makeKith, healAll, give, addKith } from './kith.js';
import { sfx } from './audio.js';
import { say, choose, toast, starterSelect, shopScreen, ending } from './ui.js';
import { startBattle } from './battle.js';
import { W } from './world.js';
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
    if (flag('clear')) return say('The hum is clean again. You did that. The Lattice still has far corners no Kith of yours has walked, though.', who);
    if (flag('maris')) return say('Key II opens the deep locks, and past them the last skills and the second Ascension. The Spire waits beyond Saltmarsh.', who);
    if (flag('key1')) return say('Lattice Key I! Take it to a ring lock between two arms. Cross it and your Kith can learn another element entirely. Brinecliff lies north.', who);
    const sparks = G.p.party.reduce((s, k) => s + k.sparks, 0);
    if (sparks) return say(`You are carrying ${sparks} unspent Spark${sparks > 1 ? 's' : ''}. Menu, then Lattice. Unlit nodes do nobody any good.`, who);
    await say('Ascension nodes sit eight steps out on every arm. A Kith that reaches one at Lv 10 takes its next form.', who);
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

  async rift() { await say('A wall of static crackles across the road. It tastes of the Grotto. Whatever feeds it is still in there.'); },
  async gate() { await say('Bars of static seal the way to the Spire. Warden Maris of Brinecliff is said to hold the key.'); },

  async hollow(n) {
    await say('The Cragnaw flickers like a bad memory. Lines of static run where its eyes should be.');
    if ((await choose(['Fight', 'Back away'], { prompt: 'It hasn\'t noticed you yet.' })) !== 0) return;
    const boss = makeKith('cragnaw', 9);
    boss.boss = 1.5; boss.name = 'Hollowed Cragnaw'; boss.hp = Math.round(boss.hp * 1.5);
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
    if (flag('maris')) return say('The gate past Saltmarsh will open for you now. Whatever sits at the top of that Spire, it is eating the Lattice from the far end.', who);
    await say('So the vale finally sent someone. I keep the second Key, and I do not hand it to Tamers who cannot hold it.', who);
    if ((await choose(['I\'m ready', 'Not yet'], { prompt: 'Face the Warden of Brinecliff?', name: who })) !== 0) return;
    const r = await startBattle({ foes: [makeKith('gillby', 12), makeKith('noxwing', 13), makeKith('finfathom', 15)], kind: 'trainer', name: who, gold: 500 });
    if (r !== 'win') return;
    setFlag('maris');
    await say('Ha! The tide goes out for you. Take it.', who);
    await gift('key2', 1, who);
    await gift('shard', 2, who);
    await say('Key II opens the deep locks, far out on every arm. And the static gate east of Saltmarsh answers to it too.', who);
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
    const boss = makeKith('nullmaw', 22);
    boss.boss = 1.6; boss.hp = Math.round(boss.hp * 1.6);
    const r = await startBattle({ foes: [boss], kind: 'boss', name: 'Nullmaw', gold: 2000 });
    if (r !== 'win') return;
    setFlag('clear');
    await say('The Nullmaw folds in on itself like paper. Where it was, a single node flickers, then holds steady.');
    await gift('shard', 5);
    saveGame();
    await ending();
    toast('The Lattice is whole. Thanks for playing!');
  },
};

export async function runScript(name, arg) {
  G.busy++;
  try { await SCRIPTS[name](arg); } finally { G.busy--; }
}
