# Quest Generation Guide

This document tells Claude how to generate a complete quest for Chronicles of Proxima and push it into a running game via the API.

---

## When the user says "generate a quest" (or similar)

Follow these steps **in order**:

1. **Register any new catalog items** (weapons, armors, gems, spells) the quest needs
2. **Attach the quest** to the game (`POST /api/game/:gameId/quest`)
   — this also spawns all NPCs automatically

All API calls go to `http://localhost:8888`.

---

## Step 1 — Register catalog items (if needed)

Use existing catalog items where possible. Only register new ones if the quest story requires gear not already in the roster.

```
POST /api/roster/weapons    { key, label, mods[], gemSlots[], gemKeys[] }
POST /api/roster/armors     { key, label, mods[], gemSlots[], gemKeys[] }
POST /api/roster/gems       { key, label, color, mods[] }
POST /api/roster/spells     { key, label, mana, friendly, damage, duration, mods[] }
```

---

## Step 2 — Attach the quest

```
POST /api/game/:gameId/quest
Content-Type: application/json

{ ...quest definition (see schema below) }
```

Returns `{ state }` with the full updated game state.

---

## Quest Schema

```jsonc
{
  "key": "quest_001",            // unique identifier
  "title": "The Fallen Gate",    // shown in UI
  "description": "...",          // 1-2 sentence summary shown in quest panel

  // Optional: custom map. If omitted, the default map is used.
  // See "Map format" section below for how to build the data arrays.
  "map": { "width": 10, "height": 10, "layers": [ /* sand + wall layers */ ] },

  // Story beats (ordered). The first stage is active at start.
  "stages": [
    { "id": "intro",      "description": "Find the wounded guard at the southern gate." },
    { "id": "north_gate", "description": "Push through the northern passage." }
  ],

  // Objectives. Keys are arbitrary but must be referenced correctly in effects.
  "objectives": {
    "talk_to_guard": {
      "type": "dialog",          // "dialog" | "reach_cell" | "kill_enemy"
      "description": "Speak with the wounded guard",
      "condition": {
        // For dialog: completed via effect in dialog node
        // For reach_cell: { "cell": [x, y] }
        // For kill_enemy: { "npcKey": "enemy_key" }
      },
      "status": "pending"        // always "pending" at creation
    }
  },

  // Zones that block movement until unlocked.
  // Cells work like walls until the unlock condition is triggered.
  "blockedZones": {
    "gate_north": {
      "cells": [[5,0],[5,1],[5,2]],    // array of [x,y] pairs
      "status": "locked",              // always "locked" at creation
      "unlockCondition": {
        "type": "objective",
        "objectiveKey": "talk_to_guard"
      }
    }
  },

  // Dialog trees. Each dialog has a "nodes" map and an optional "conditionalStart" list.
  // conditionalStart: ordered list of { condition, nodeId }. First matching condition wins.
  // If no condition matches, falls back to the "start" node.
  // Supported conditions: { objectivesComplete: ["obj_key", ...] } — true if ALL listed objectives are completed.
  // Each node has: speaker, text, choices[].
  // Each choice has: text, next (nodeId or null to end dialog), effects[]
  "dialogs": {
    "guard_dialog": {
      "conditionalStart": [
        { "condition": { "objectivesComplete": ["talk_to_guard", "kill_shadow"] }, "nodeId": "all_done" },
        { "condition": { "objectivesComplete": ["talk_to_guard"] }, "nodeId": "reminder" }
      ],
      "nodes": {
        "start": {
          "speaker": "wounded_guard",   // npcKey or "narrator"
          "text": "Help... they came from the north...",
          "choices": [
            { "text": "Who attacked you?", "next": "reveal" },
            { "text": "I'll handle it.", "next": "promise" }
          ]
        },
        "promise": {
          "speaker": "wounded_guard",
          "text": "Please hurry...",
          "choices": [
            { "text": "I will.", "next": "reveal" }
          ]
        },
        "reveal": {
          "speaker": "wounded_guard",
          "text": "Shadow creatures — they went north through the gate!",
          "choices": [
            {
              "text": "I'll stop them.",
              "next": null,
              "effects": [
                { "type": "complete_objective", "objectiveKey": "talk_to_guard" },
                { "type": "unlock_zone", "zoneKey": "gate_north" },
                { "type": "advance_stage", "stage": "north_gate" }
              ]
            }
          ]
        }
      }
    }
  },

  // Playable characters for this quest. ALWAYS include this.
  // Replaces the default test characters (Theon/Rheon) with story-appropriate ones.
  // Use the same spec as spawn-player. At least one player required.
  "players": [
    {
      "key": "dartha",
      "label": "Dartha",
      "cell": [3, 8],
      "weap1Key": null,
      "weap2Key": null,
      "armorKey": null,
      "spellKeys": []
    }
  ],

  // NPCs to spawn. They use the same character spec as spawn-player.
  // Two NPC types based on "dialogKey":
  //   - dialogKey set    → dialog NPC: renders as gold token, clickable to talk, NOT attackable
  //   - dialogKey null   → combat enemy: renders as regular character token, attackable, no dialog
  // Both types are skipped in the turn order (they never get an active turn).
  // reach_cell objectives render as a pulsing ◎ beacon on the map for navigation.
  "npcs": [
    {
      "key": "wounded_guard",
      "label": "Wounded Guard",
      "cell": [3, 5],
      "dialogKey": "guard_dialog",   // dialog NPC
      "weap1Key": null,
      "weap2Key": null,
      "armorKey": null,
      "spellKeys": []
    },
    {
      "key": "shadow_creature",
      "label": "Shadow Creature",
      "cell": [7, 2],
      "dialogKey": null,             // combat enemy
      "weap1Key": null,
      "weap2Key": null,
      "armorKey": null,
      "spellKeys": []
    }
  ]
}
```

---

## Effect types (in dialog choice `effects[]`)

| type | params | what it does |
|------|--------|--------------|
| `complete_objective` | `objectiveKey` | marks objective as completed, logs it |
| `unlock_zone` | `zoneKey` | removes locked zone walls, logs "A path has been opened" |
| `advance_stage` | `stage` | sets quest stage, logs the stage description |

---

## Objective types

| type | how it completes |
|------|-----------------|
| `dialog` | via `complete_objective` effect in a dialog choice |
| `reach_cell` | automatically when the active player moves onto `condition.cell` |
| `kill_enemy` | automatically when an NPC with `condition.npcKey` dies in combat |

---

## Map format

Quests can include a custom `map` field. If omitted, the default map is used (10×10 with a vertical wall at columns 4-5, rows 1-7).

```jsonc
"map": {
  "width": 10,
  "height": 10,
  "layers": [
    {
      "name": "sand",
      "data": [ /* 100 integers, all 30 */ ],
      "properties": [{ "name": "collision", "type": "bool", "value": false }],
      "type": "tilelayer"
    },
    {
      "name": "wall",
      "height": 10,
      "width": 10,
      "data": [ /* 100 integers: 0 = open, 10 = wall */ ],
      "properties": [{ "name": "collision", "type": "bool", "value": true }],
      "type": "tilelayer"
    }
  ]
}
```

### How to build the data arrays

- Both arrays have exactly `width × height` elements (100 for 10×10), row-major order.
- Index formula: `index = row * width + col`  →  cell [col, row] → `data[row * 10 + col]`
- `sand` layer: all `30` (floor tile, no collision)
- `wall` layer: `10` for a wall tile, `0` for open space

### JavaScript helper (use in your head when generating)

```javascript
// Start with all-open wall layer
const wallData = Array(100).fill(0)

// Helper: set cell [col, row] as wall
function wall(col, row) { wallData[row * 10 + col] = 10 }

// Example: vertical wall at col 4, rows 1-7
for (let row = 1; row <= 7; row++) { wall(4, row); wall(5, row) }
```

### Default map (used when quest has no `map` field)

```
  0 1 2 3 4 5 6 7 8 9   (x / col)
0 . . . . . . . . . .
1 . . . . W W . . . .
2 . . . . W W . . . .
3 . . . . W W . . . .
4 . . . . W W . . . .
5 . . . . W W . . . .
6 . . . . W W . . . .
7 . . . . W W . . . .   (Theon starts [3,7])
8 . . . . . . . . . .   (Rheon starts [4,8])
9 . . . . . . . . . .
```

### Map design guidelines

- Keep passages 1-2 cells wide at chokepoints so blocked zones are meaningful.
- Player characters typically start bottom-left (cols 0-3, rows 6-9).
- Enemies typically start top-right (cols 6-9, rows 0-4).
- NPCs can be placed anywhere reachable.
- Cells outside 0–9 are out of bounds — never place characters or objectives there.
- Always verify there's a reachable path from player start to every objective/NPC (blocked zones are unlocked during play, so plan the unlock sequence).

---

## Example: full minimal quest (copy-paste ready)

```json
POST /api/game/GAME_ID/quest

{
  "key": "the_shadow_gate",
  "title": "The Shadow Gate",
  "description": "A wounded guard tells of shadow creatures that slipped through the northern passage.",
  "stages": [
    { "id": "intro", "description": "Find the wounded guard." },
    { "id": "assault", "description": "Defeat the shadow creatures beyond the gate." }
  ],
  "objectives": {
    "talk_to_guard": {
      "type": "dialog",
      "description": "Speak with the wounded guard",
      "condition": {},
      "status": "pending"
    },
    "kill_shadow": {
      "type": "kill_enemy",
      "description": "Defeat the Shadow Creature",
      "condition": { "npcKey": "shadow_creature" },
      "status": "pending"
    }
  },
  "blockedZones": {
    "north_passage": {
      "cells": [[5,1],[5,2],[5,3]],
      "status": "locked",
      "unlockCondition": { "type": "objective", "objectiveKey": "talk_to_guard" }
    }
  },
  "dialogs": {
    "guard_dialog": {
      "nodes": {
        "start": {
          "speaker": "wounded_guard",
          "text": "They came from the north... shadow creatures. I couldn't stop them.",
          "choices": [
            { "text": "I'll take care of them.", "next": "grateful" }
          ]
        },
        "grateful": {
          "speaker": "wounded_guard",
          "text": "The gate... it was locked, but they broke through. You'll need to find another way — or open it yourself.",
          "choices": [
            {
              "text": "Show me.",
              "next": null,
              "effects": [
                { "type": "complete_objective", "objectiveKey": "talk_to_guard" },
                { "type": "unlock_zone", "zoneKey": "north_passage" },
                { "type": "advance_stage", "stage": "assault" }
              ]
            }
          ]
        }
      }
    }
  },
  "npcs": [
    {
      "key": "wounded_guard",
      "label": "Wounded Guard",
      "cell": [2, 8],
      "dialogKey": "guard_dialog",
      "weap1Key": null,
      "weap2Key": null,
      "armorKey": null,
      "spellKeys": []
    },
    {
      "key": "shadow_creature",
      "label": "Shadow Creature",
      "cell": [7, 2],
      "dialogKey": null,
      "weap1Key": null,
      "weap2Key": null,
      "armorKey": null,
      "spellKeys": []
    }
  ]
}
```

---

## Checklist before generating

- [ ] Quest includes a `players` array with story-appropriate characters (not Theon/Rheon)
- [ ] If a custom `map` is included, all NPC/player cells are on open (non-wall) tiles
- [ ] If a custom `map` is included, every objective and NPC is reachable from player start
- [ ] All `npcKey` values in objectives/effects/dialogs match keys in the `npcs` array
- [ ] NPCs intended for combat have `dialogKey: null`; NPCs intended for dialog have a matching `dialogKey`
- [ ] All `objectiveKey` values in effects match keys in `objectives`
- [ ] All `zoneKey` values in effects match keys in `blockedZones`
- [ ] All `stage` values in `advance_stage` effects match `id` values in `stages`
- [ ] All item keys referenced in NPC specs exist in the catalog (or register them first)
- [ ] NPC and player starting cells don't overlap
- [ ] Locked zone cells are actually on walls or chokepoints, not random open cells
