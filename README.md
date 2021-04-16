# Chronicles of Proxima

One thousand years after the Proxima Centauri colonalization, the human race felt into a dark age.
Chronicles of Proxima is set five thousands years after the beginning of the dark age, humans completally forgot the knowledge of the past, but they still have access to Gems, fragments of an ancient technology that they use to enhance their weapons and armor. They also reacts to some materials in magical ways allowing them to cast spells.

## Work in progress board game

Chronicles of Proxima was initially thought as a board game, this implementation has some differences from the orgiginal idea. Still, the gameplay is very similar. Right now the project is a work in progress, I just finished working on the basic dynamics of the gameplay. And I'm starting to work on the backend to allow multiplayer games. Then I'll work on the frontend.

## Game mechanics

### Base attributes
Every character or mob has the following attributes:
* **hp**: the amount of life of the player
* ~~**maxHp**: the maximum amount of life of the player~~ **//TODO**
* **mana**: the amount of mana of the player
* **maxMana**: the maximum amount of mana of the player
* **parry**:  a value used to define if the player is being hit
* **dodge**: a value used to define if the player is being hit
* **meleeDamage**: the amount of damage the player does using a melee weapon
* **spellPower**: the amount of damage the player does using a spell
* **rangeDamage**: the amount of damage the player does using a ranged weapon
* **hit**:  a value used to define if the player hits the target
* **actions**: the amount of actions the player can to each action
* **endTurnMana**: the amount of mana restored every end turn
* **speed**: the maximum speed of the player

### Turn

The turn has the following phases: 
1) Selecting the active player
2) The active player spend it's actions
3) When the active player has no actions left, repeat step 1. until all the players have spent all their available actions.
4) At the end of the turn calculate endTurn modifiers. (E.g endTurnMana)

### Actions

The available actions are:
* Move
* Attack: melee, range, spell 
* Spell attack
* Use friendly spell
* ~~Search~~ **//TODO**
* ~~Activate an item~~ **//TODO**

### Map

The maps in this implementation are created using the open source map editor *Tiled*.

![alt text](./docs/imgs/tiled.png)

There are currently two kind of blocks: normal and walls. The player cannot move through walls.

The player can move in every directions without cutting the edges of the walls and respecting her maxium speed.

### Calculating attributes

A character doesn't have fixed attributes, attributes are calculated each time, applying all the modifiers of the character and all the modifier of every piece of its gear.

Modifiers can be permanent or temporary, so it should be considered in the calculation

E.g.
Rheon has the following modifiers:
* **0 parry [0 -> ∞]** from his base stats. [0 -> ∞] is the duration of the modifier (from turn 0 to the end).
* **+5 parry [0 -> 1]** from the spell he cast at turn 0, that last for one turn
* **-1d3 parry [0 -> 1]** from the spell his enemy cast on him. (1d3 means one "three faces" dice)

Here is how to calculate Rheon's parry at turn 0
```
0 + 5 - 1d3 = 0 + 5 - 2 = 3
```

### Attacking

A player hits the target if her hit roll is higher then the parry or the dodge of the target.

### Line of sight

One of the main differences between the board game and this implementation is the calculation of the line of sight. In the board game version the players use a ruler to check if there are any obstancles between the two entities. In this implementation I use a "weird" way to check it, follow [this link](./docs/LOS.md) to discover more.

```
Game starts
Active player is Theon
Theon tries to hit Rheon.
        Calculation for Theon's hit
                Base stats: 4   () => roll([...dices(1, 6)])
                Total: 4
        Calculation for Rheon's dodge
                Total: 0
        Calculation for Rheon's parry
                Total: 0
Theon spell hit Rheon rolling hit 4 against parry 0
        Calculation for Theon's spellPower
                Light enchantment of spell power: 2     () => roll([...dices(1, 3)])
                Light enchantment of spell power: 3     () => roll([...dices(1, 3)])
                Total: 5
Theon does 5 spell damage to Rheon.
Rheon has now 5 hp.
Theon tries to hit Rheon.
        Calculation for Theon's hit
                Base stats: 6   () => roll([...dices(1, 6)])
                Total: 6
        Calculation for Rheon's dodge
                Total: 0
        Calculation for Rheon's parry
                Total: 0
Theon spell hit Rheon rolling hit 6 against parry 0
        Calculation for Theon's spellPower
                Light enchantment of spell power: 1     () => roll([...dices(1, 3)])
                Light enchantment of spell power: 1     () => roll([...dices(1, 3)])
                Total: 2
Theon does 2 spell damage to Rheon.
Rheon has now 3 hp.
Active player is Rheon
Rheon cannot attack because Theon is too far away
Rheon moves 0, -1
Rheon tries to hit Theon.
        Calculation for Rheon's hit
                Base stats: 6   () => roll([...dices(1, 6)])
                Fireball's burns: -1    () => -1
                Fireball's burns: -1    () => -1
                Total: 4
Rheon melee misses Theon rolling hit 4 against parry 5
Next turn
Active player is Rheon
Rheon tries to hit Theon.
        Calculation for Rheon's hit
                Base stats: 6   () => roll([...dices(1, 6)])
                Total: 6
Rheon melee hit Theon rolling hit 6 against parry 0
        Calculation for Rheon's meleeDamage
                Sword strike: 12        () => roll([...dices(3, 6)])
                Total: 12
Rheon does 12 melee damage to Theon.
Theon is dead.
Rheon cannot target Theon because Theon is dead
```