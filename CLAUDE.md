# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # install dependencies
npm start          # run server (node src/server.js) on port 8888
```

There are no tests. The legacy test script referenced in README (`node src/test.js`) no longer exists.

## Configuration

Copy `src/config.example.js` to `src/config.js` and set:
- `port` — defaults to 8888
- `dataDir` — path for NeDB `.db` files (relative to project root)
- `geminiApiKey` — or set `GEMINI_API_KEY` env var (`.env` file supported via dotenv)
- `mongo` block is legacy; MongoDB is no longer used

## Architecture

**ES Modules** (`"type": "module"` in package.json). No bundler, no transpilation.

### Game Engine (`src/classes/`)

Pure game logic with no I/O concerns:

- **`Mod.js`** — a modifier with attribute functions (`hp`, `mana`, `parry`, etc.) and a turn range (`startsAt`/`expiresAt`). Attributes are functions `() => number` to support dice rolls.
- **`Character.js`** — holds an array of `Mod`s plus equipment (weap1, weap2, armor) and spells. `getAttr(attr, silence, turn)` sums all active mods + gear mods at a given turn. `turns` counter is per-character and increments in `nextTurn()`.
- **`Game.js`** — orchestrates combat. Calls `console.log` directly for all game narration (these are captured by `gameManager`). `checkDistance` uses `reduce` which is broken for 2D — only computes last coordinate diff (known bug).
- **`Spell.js`** — spell data (mods, damage fn, mana cost, duration, friendly flag).
- **`Items.js`** — `Weapon` and `Armor` classes, each holding mods and gem slots.
- **`Gem.js`** — gem with color type and mods.
- **`Dice.js`** — `dices(count, faces)` and `roll([...])` utilities.
- **`Los.js`** — line-of-sight algorithm for the Tiled map grid.

### Data (`src/var/`)

- **`modifiers.js`** — array of named `Mod` presets (e.g. `baseMods`, `sword_mage_damage`). Look up by `.find(m => m.key === '...')`.
- **`damages.js`** — array of spell damage descriptors. Look up by `.find(d => d.key === '...').damage`.

### Server (`src/server/game/`)

- **`gameManager.js`** — in-memory `Map` of live games. Manages a `CATALOG` of items/spells/gems, character building (`buildCharacter`), game state serialization, and NeDB persistence (catalog + game saves in `data/` dir). `captureLog` intercepts `console.log` to collect game narration for the API response.
- **`routes.js`** — Express routes + Gemini integration. Gemini receives full game state context and returns a JSON array of actions to execute server-side.

### Persistence

NeDB (embedded, file-based) stores five collections in the configured `dataDir`:
- `catalog_weapons.db`, `catalog_armors.db`, `catalog_gems.db`, `catalog_spells.db` — registered catalog entries
- `games.db` — serialized game states (restored on server start)

### Frontend (`public/`)

A single-page GM (Game Master) interface — vanilla JS, no framework. The page at `http://localhost:8888` has three main areas:

**Left panel — Battlefield + Actions**
- `#map-grid`: renders the 10×10 map as a CSS grid; wall cells get `.wall`, characters get `.char-token` badges showing their initials
- `#actions-section`: all controls for the active player — turn order list (click a slot to activate that player), GM Override buttons (force-set active player), directional move pad, attack target selects (melee/range), spell select + target, and "Force End Round" (GM override for `next-turn`)
- `#players-section`: stat cards per character with HP/mana bars, parry/dodge/speed/cell stats, and +/− buttons that call `set-player-actions` to override action count mid-turn
- `#log-section`: combat log with keyword-based CSS class coloring (damage/heal/turn/action)

**Right panel — Gemini Assistant (`#chat-section`)**
- Free-text input → `POST /api/game/:id/gemini` → receives `{ description, actions: [{category, action}] }`
- Shows a confirmation step before executing; on confirm, steps are dispatched sequentially via `executeStep()` which routes each `category` to the right API endpoint
- Categories: `game-action`, `spawn-player`, `remove-player`, `register-weapon`, `register-armor`, `register-gem`, `register-spell`

**World Explorer (`#explorer-section`, below the fold)**
- Tabbed view of the catalog (weapons/armors/spells/gems) from `GET /api/roster`
- Refreshed after any Gemini action that may register new items

**State flow**: every action calls `applyState(newState)` which re-renders map, players, header, and action controls atomically from the server response. The client holds no local game logic — all computation is server-side.

## Key Patterns

**Attribute calculation**: All character attributes are computed dynamically. Never access raw values — always call `character.getAttr('attrName', true)`. The `silence` flag suppresses console output.

**Mod turn ranges**: `startsAt` is inclusive, `expiresAt` is exclusive. Default is `0` to `Infinity`. Spell mods set `startsAt = currentTurn`, `expiresAt = currentTurn + duration`.

**Adding new catalog items**: Add to the `CATALOG` object in `gameManager.js` or call the `register*` functions at runtime (via API or on startup). Mod descriptors use `{ type: "fixed", value: N }` or `{ type: "dice", count: N, faces: F }`.

## Quest System

See **`QUEST_GENERATION.md`** for the full quest schema, map format, dialog system, and step-by-step guide to generating quests. Key points:
- `POST /api/game/new/quest` — create a new game and attach a quest in one request
- Quest JSON includes: `players` (replaces test chars), `npcs`, `map`, `stages`, `objectives`, `blockedZones`, `dialogs`
- Wall layer **must** include `"height": 10, "width": 10` — `Los.js` uses `wall.height` as column count; omitting it crashes movement

---

**Known bugs (do not fix without understanding full impact)**:
- `Game.checkDistance` — `reduce` without initial accumulator only processes last element; melee distance check coincidentally works for same-cell (returns 0) but range distance is unreliable for non-adjacent cells.
- `Character.processSpell` — mutates the shared `Mod` object's `startsAt`/`expiresAt` from the spell definition (shared reference bug); affects all future casts of the same spell.
