class Quest {
    constructor(def) {
        this.key = def.key
        this.title = def.title
        this.description = def.description || ''
        this.stages = def.stages || []
        this.stage = def.stage || (def.stages?.[0]?.id) || 'start'

        // Deep clone objectives with runtime status
        this.objectives = {}
        for (const [k, v] of Object.entries(def.objectives || {})) {
            this.objectives[k] = { ...v }
        }

        // Deep clone blocked zones with runtime status
        this.blockedZones = {}
        for (const [k, v] of Object.entries(def.blockedZones || {})) {
            this.blockedZones[k] = { ...v, cells: v.cells.map(c => [...c]) }
        }

        // Deep clone dialogs
        this.dialogs = {}
        for (const [k, v] of Object.entries(def.dialogs || {})) {
            const nodes = {}
            for (const [nodeId, node] of Object.entries(v.nodes || {})) {
                nodes[nodeId] = {
                    ...node,
                    choices: (node.choices || []).map(c => ({ ...c, effects: (c.effects || []).map(e => ({ ...e })) }))
                }
            }
            this.dialogs[k] = { nodes, conditionalStart: (v.conditionalStart || []).map(c => ({ ...c, condition: { ...c.condition } })) }
        }

        // NPC dialog map: npcKey -> dialogKey (only NPCs with dialogs)
        this.npcDialogs = {}
        // All NPC keys (including combatant NPCs with no dialog)
        this.allNpcKeys = new Set()
        for (const npc of (def.npcs || [])) {
            this.allNpcKeys.add(npc.key)
            if (npc.dialogKey) this.npcDialogs[npc.key] = npc.dialogKey
        }

        this.activeDialog = null // { npcKey, dialogKey, nodeId }
        this.terrain = def.terrain || 'sand' // 'sand' | 'grass' | 'snow'
        this.innerRows = new Set(def.innerRows || []) // rows that use floor tile instead of terrain
    }

    getDialogNode(dialogKey, nodeId) {
        return this.dialogs[dialogKey]?.nodes[nodeId] || null
    }

    startDialog(npcKey) {
        const dialogKey = this.npcDialogs[npcKey]
        if (!dialogKey) throw new Error(`No dialog for NPC: ${npcKey}`)
        const dialog = this.dialogs[dialogKey]
        if (!dialog) throw new Error(`Dialog not found: ${dialogKey}`)

        // Pick start node based on conditions (first match wins)
        let startNodeId = 'start'
        for (const cond of (dialog.conditionalStart || [])) {
            if (cond.condition.objectivesComplete) {
                const allComplete = cond.condition.objectivesComplete.every(
                    key => this.objectives[key]?.status === 'completed'
                )
                if (allComplete) { startNodeId = cond.nodeId; break }
            }
        }

        const node = this.getDialogNode(dialogKey, startNodeId)
        if (!node) throw new Error(`No node "${startNodeId}" in dialog: ${dialogKey}`)
        this.activeDialog = { npcKey, dialogKey, nodeId: startNodeId }
        return { npcKey, dialogKey, nodeId: startNodeId, node }
    }

    // Returns { nextNode, nodeId, effects } and advances or closes the dialog
    applyChoice(choiceIndex) {
        if (!this.activeDialog) throw new Error('No active dialog')
        const { dialogKey, nodeId } = this.activeDialog
        const node = this.getDialogNode(dialogKey, nodeId)
        if (!node) throw new Error(`Dialog node not found: ${nodeId}`)
        const choice = node.choices[choiceIndex]
        if (!choice) throw new Error(`Choice ${choiceIndex} not found`)

        const effects = choice.effects || []

        if (choice.next) {
            const nextNode = this.getDialogNode(dialogKey, choice.next)
            this.activeDialog = { ...this.activeDialog, nodeId: choice.next }
            return { nextNode, nodeId: choice.next, effects }
        } else {
            // End of dialog branch — apply effects from the choice itself, then close
            this.activeDialog = null
            return { nextNode: null, nodeId: null, effects }
        }
    }

    completeObjective(key) {
        if (this.objectives[key] && this.objectives[key].status !== 'completed') {
            this.objectives[key].status = 'completed'
            return true
        }
        return false
    }

    // Returns the cells that were unlocked (for removing from dynamicWalls)
    unlockZone(key) {
        if (this.blockedZones[key] && this.blockedZones[key].status === 'locked') {
            this.blockedZones[key].status = 'unlocked'
            return this.blockedZones[key].cells
        }
        return []
    }

    // Returns Set of "x,y" strings for all currently locked zone cells
    getWallCells() {
        const cells = new Set()
        for (const zone of Object.values(this.blockedZones)) {
            if (zone.status === 'locked') {
                for (const [x, y] of zone.cells) {
                    cells.add(`${x},${y}`)
                }
            }
        }
        return cells
    }

    // Check reach_cell objectives — call after player moves
    checkReachObjectives(playerCell) {
        const completed = []
        for (const [key, obj] of Object.entries(this.objectives)) {
            if (obj.type === 'reach_cell' && obj.status === 'pending') {
                const [tx, ty] = obj.condition.cell
                if (playerCell[0] === tx && playerCell[1] === ty) {
                    this.completeObjective(key)
                    completed.push(key)
                }
            }
        }
        return completed
    }

    // Check kill objectives — call when an NPC dies
    checkKillObjective(npcKey) {
        const completed = []
        for (const [key, obj] of Object.entries(this.objectives)) {
            if (obj.type === 'kill_enemy' && obj.status === 'pending' && obj.condition?.npcKey === npcKey) {
                this.completeObjective(key)
                completed.push(key)
            }
        }
        return completed
    }

    // State for frontend (no dialog node tree, just active node)
    serialize() {
        return {
            key: this.key,
            title: this.title,
            description: this.description,
            stage: this.stage,
            objectives: Object.entries(this.objectives).map(([k, v]) => ({
                key: k,
                description: v.description,
                type: v.type,
                status: v.status
            })),
            objectiveMarkers: Object.entries(this.objectives)
                .filter(([, v]) => v.type === 'reach_cell' && v.status === 'pending' && v.condition?.cell)
                .map(([k, v]) => ({ key: k, cell: v.condition.cell, description: v.description })),
            blockedZones: Object.entries(this.blockedZones).map(([k, v]) => ({
                key: k,
                cells: v.cells,
                status: v.status
            })),
            activeDialog: this.activeDialog ? {
                npcKey: this.activeDialog.npcKey,
                dialogKey: this.activeDialog.dialogKey,
                nodeId: this.activeDialog.nodeId,
                node: this.getDialogNode(this.activeDialog.dialogKey, this.activeDialog.nodeId)
            } : null,
            npcKeys: Object.keys(this.npcDialogs),
            terrain: this.terrain
        }
    }

    // Full state for DB persistence
    serializeForDb() {
        return {
            key: this.key,
            title: this.title,
            description: this.description,
            stage: this.stage,
            stages: this.stages,
            objectives: this.objectives,
            blockedZones: this.blockedZones,
            dialogs: this.dialogs,
            npcDialogs: this.npcDialogs,
            allNpcKeys: [...this.allNpcKeys],
            activeDialog: this.activeDialog
        }
    }

    // Restore from DB (state already has runtime statuses applied)
    static fromDb(saved) {
        const q = new Quest({
            key: saved.key,
            title: saved.title,
            description: saved.description,
            stage: saved.stage,
            stages: saved.stages || [],
            objectives: saved.objectives || {},
            blockedZones: saved.blockedZones || {},
            dialogs: saved.dialogs || {},
            npcs: Object.entries(saved.npcDialogs || {}).map(([key, dialogKey]) => ({ key, dialogKey }))
        })
        // Restore runtime status (already includes completed/unlocked state)
        q.objectives = saved.objectives || {}
        q.blockedZones = saved.blockedZones || {}
        q.activeDialog = saved.activeDialog || null
        q.allNpcKeys = new Set(saved.allNpcKeys || Object.keys(saved.npcDialogs || {}))
        return q
    }
}

export default Quest
