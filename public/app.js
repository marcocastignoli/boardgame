const API = 'http://localhost:8888'

let gameId = null
let state = null
let pendingAction = null

// ===== API helpers =====
async function apiPost(path, body = {}) {
    const r = await fetch(`${API}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    return r.json()
}

async function apiGet(path) {
    const r = await fetch(`${API}${path}`)
    return r.json()
}

// ===== Saved games =====
async function refreshGameList() {
    const games = await apiGet('/api/games')
    const sel = document.getElementById('load-game-select')
    const prev = sel.value
    sel.innerHTML = '<option value="">Load saved game...</option>'
    games.forEach(g => {
        const opt = document.createElement('option')
        opt.value = g.gameId
        const names = g.players.map(p => `${p.label}${p.alive ? '' : '💀'}`).join(', ')
        opt.textContent = `Turn ${g.turn} — ${names} [${g.gameId.slice(0, 6)}]`
        sel.appendChild(opt)
    })
    if (prev) sel.value = prev
}

async function loadGame(id) {
    if (!id) return
    const data = await apiGet(`/api/game/${id}`)
    if (data.error) { addLog(`Error: ${data.error}`, 'damage'); return }
    gameId = id
    applyState(data.state)
    addLog(`=== Game ${id.slice(0, 6)} loaded ===`, 'turn')
}

// ===== State =====
async function newGame() {
    const data = await apiPost('/api/game/new')
    gameId = data.gameId
    applyState(data.state)
    addLog('=== New game started ===', 'turn')
    refreshGameList()
}

async function doAction(action) {
    const data = await apiPost(`/api/game/${gameId}/action`, action)
    if (data.error) { addLog(`Error: ${data.error}`, 'damage'); return }
    if (data.actionLogs) data.actionLogs.forEach(l => addLog(l))
    applyState(data.state)
}

function applyState(newState) {
    state = newState
    renderMap()
    renderPlayers()
    renderHeader()
    updateActionControls()
}

// ===== Header =====
function renderHeader() {
    document.getElementById('turn-label').textContent = `Turn: ${state.turn}`
    const active = state.players.find(p => p.key === state.activePlayerKey)
    document.getElementById('active-player-label').textContent =
        active ? `Active: ${active.label}` : 'No active player'
    document.getElementById('actions-label').textContent =
        active ? `Actions: ${state.actionsActivePlayer}/${active.actions}` : 'Actions: —'
}

// ===== Map =====
function renderMap() {
    const grid = document.getElementById('map-grid')
    grid.innerHTML = ''
    const { width, height, walls } = state.map

    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            const idx = row * width + col
            const isWall = walls[idx] !== 0

            const cell = document.createElement('div')
            cell.className = 'map-cell' + (isWall ? ' wall' : '')
            cell.dataset.x = col
            cell.dataset.y = row

            const coord = document.createElement('span')
            coord.className = 'coord'
            coord.textContent = `${col},${row}`
            cell.appendChild(coord)

            // Place character tokens
            const charsHere = state.players.filter(p => p.cell[0] === col && p.cell[1] === row)
            charsHere.forEach(p => {
                const token = document.createElement('div')
                const isActive = p.key === state.activePlayerKey
                token.className = `char-token ${p.key}${isActive ? ' active' : ''}${!p.alive ? ' dead' : ''}`
                token.textContent = p.label.substring(0, 2).toUpperCase()
                token.title = `${p.label} — HP: ${p.hp}, Mana: ${p.mana}`
                cell.appendChild(token)
            })

            grid.appendChild(cell)
        }
    }
}

// ===== Players =====
function renderPlayers() {
    const list = document.getElementById('players-list')
    list.innerHTML = ''
    state.players.forEach(p => {
        const isActive = p.key === state.activePlayerKey
        const maxHp = 10 // base hp from baseMods; not separately tracked
        const hpPct = Math.max(0, Math.min(100, (p.hp / maxHp) * 100))
        const manaPct = p.maxMana > 0 ? Math.max(0, Math.min(100, (p.mana / p.maxMana) * 100)) : 0

        const card = document.createElement('div')
        card.className = `player-card ${p.key}${isActive ? ' active' : ''}${!p.alive ? ' dead' : ''}`

        card.innerHTML = `
            <div class="player-card-header">
                <div class="player-dot ${p.key}"></div>
                <span class="player-name">${p.label}</span>
                <span class="player-status">${!p.alive ? '💀 Dead' : isActive ? '⚔ Active' : ''}</span>
            </div>
            <div class="stat-bars">
                <div class="stat-bar-row">
                    <span class="stat-bar-label">HP</span>
                    <div class="stat-bar-track"><div class="stat-bar-fill hp" style="width:${hpPct}%"></div></div>
                    <span class="stat-bar-value">${p.hp}</span>
                </div>
                <div class="stat-bar-row">
                    <span class="stat-bar-label">Mana</span>
                    <div class="stat-bar-track"><div class="stat-bar-fill mana" style="width:${manaPct}%"></div></div>
                    <span class="stat-bar-value">${p.mana}/${p.maxMana}</span>
                </div>
            </div>
            <div class="stat-grid">
                <span>Parry</span><span class="stat-val">${p.parry}</span>
                <span>Dodge</span><span class="stat-val">${p.dodge}</span>
                <span>Speed</span><span class="stat-val">${p.speed}</span>
                <span>Cell</span><span class="stat-val">[${p.cell}]</span>
                <span>Actions</span>
                <span class="stat-val actions-ctrl">
                    <button class="actions-adj-btn" data-key="${p.key}" data-delta="-1">−</button>
                    <span>${p.actions}</span>
                    <button class="actions-adj-btn" data-key="${p.key}" data-delta="1">+</button>
                </span>
            </div>
            <div class="inventory-list">
                ${p.equipment.weap1 ? `<span class="inv-tag weap">⚔ ${p.equipment.weap1.label}</span>` : ''}
                ${p.equipment.weap2 ? `<span class="inv-tag weap">🏹 ${p.equipment.weap2.label}</span>` : ''}
                ${p.equipment.armor ? `<span class="inv-tag armor">🛡 ${p.equipment.armor.label}</span>` : ''}
            </div>
            ${p.spells.length > 0 ? `
            <div class="spells-list">
                ${p.spells.map(s => `
                    <span class="spell-tag ${s.friendly ? 'friendly' : 'hostile'}">
                        ${s.label} <span class="spell-mana">${s.mana}✦</span>
                    </span>`).join('')}
            </div>` : ''}
        `
        list.appendChild(card)
    })
}

// ===== Turn order =====
function renderTurnOrder() {
    if (!state) return
    const list = document.getElementById('turn-order-list')
    list.innerHTML = ''
    state.turnOrder.forEach((entry, i) => {
        const isActive = entry.key === state.activePlayerKey
        const isCurrent = i === state.turnOrderIndex
        const el = document.createElement('span')
        el.className = `turn-order-slot${isActive ? ' active' : ''}${!entry.alive ? ' dead' : ''}${isCurrent ? ' current' : ''}`
        el.textContent = `${i + 1}. ${entry.label}`
        el.title = `Click to activate ${entry.label}`
        el.addEventListener('click', () => {
            if (entry.alive) doAction({ type: 'set-active-player', playerKey: entry.key })
        })
        list.appendChild(el)
    })
}

// ===== Action controls =====
function updateActionControls() {
    if (!state) return

    // Turn order
    renderTurnOrder()

    // Set player buttons (GM override)
    const setPlayerBtns = document.getElementById('set-player-btns')
    setPlayerBtns.innerHTML = ''
    state.players.forEach(p => {
        const btn = document.createElement('button')
        btn.textContent = p.label
        if (p.key === state.activePlayerKey) btn.classList.add('active-player')
        btn.addEventListener('click', () => doAction({ type: 'set-active-player', playerKey: p.key }))
        setPlayerBtns.appendChild(btn)
    })

    // Target selects
    const targets = state.players.filter(p => p.key !== state.activePlayerKey)
    populateSelect('attack-target', targets)
    populateSelect('spell-target', state.players)  // spells can be self-targeted (friendly)

    // Spell select
    const active = state.players.find(p => p.key === state.activePlayerKey)
    const spellSel = document.getElementById('spell-select')
    spellSel.innerHTML = '<option value="">Select spell...</option>'
    if (active) {
        active.spells.forEach(s => {
            const opt = document.createElement('option')
            opt.value = s.key
            opt.textContent = `${s.label} (${s.mana}✦)`
            spellSel.appendChild(opt)
        })
    }

    // Enable/disable based on game state
    const hasActive = !!state.activePlayerKey
    const hasPlayers = state.players.some(p => p.alive)
    document.querySelectorAll('.move-btn').forEach(b => b.disabled = !hasActive)
    document.getElementById('melee-btn').disabled = !hasActive
    document.getElementById('range-btn').disabled = !hasActive
    document.getElementById('cast-btn').disabled = !hasActive
    document.getElementById('end-player-turn-btn').disabled = !hasPlayers
    document.getElementById('end-turn-btn').disabled = !hasPlayers
}

// ===== World Explorer =====
let explorerTab = 'weapons'
let rosterCache = null

async function refreshExplorer() {
    rosterCache = await apiGet('/api/roster')
    renderExplorer()
}

function renderExplorer() {
    if (!rosterCache) return
    const content = document.getElementById('explorer-content')
    content.innerHTML = ''
    const items = rosterCache[explorerTab] || []
    if (items.length === 0) {
        content.innerHTML = '<span style="color:var(--text2);font-size:13px">No items registered.</span>'
        return
    }
    items.forEach(item => {
        const card = document.createElement('div')
        card.className = 'explorer-card'
        let tagsHtml = ''
        let extraHtml = ''

        if (explorerTab === 'spells') {
            tagsHtml += `<span class="explorer-tag mana">${item.mana}✦</span>`
            tagsHtml += `<span class="explorer-tag ${item.friendly ? 'friendly' : 'hostile'}">${item.friendly ? 'Friendly' : 'Hostile'}</span>`
            if (item.duration) tagsHtml += `<span class="explorer-tag duration">${item.duration}t</span>`
        }
        if (explorerTab === 'gems') {
            tagsHtml += `<span class="explorer-tag"><span class="explorer-gem-dot gem-${item.color}"></span>${item.color}</span>`
        }
        if ((explorerTab === 'weapons' || explorerTab === 'armors') && item.gemSlots?.length) {
            const slots = item.gemSlots.map(c => `<span class="explorer-gem-dot gem-${c}" title="${c}"></span>`).join('')
            tagsHtml += `<span class="explorer-tag">Slots: ${slots}</span>`
        }
        if ((explorerTab === 'weapons' || explorerTab === 'armors') && item.gems?.length) {
            const fitted = item.gems.map(g => `<span class="explorer-gem-dot gem-${g.color}"></span>${g.label}`).join(', ')
            extraHtml += `<div class="explorer-mod-list" style="margin-top:4px;color:var(--text)">${fitted}</div>`
        }
        if (item.modLabels?.length) {
            extraHtml += `<div class="explorer-mod-list">${item.modLabels.map(l => `<span>${l}</span>`).join('')}</div>`
        }

        card.innerHTML = `
            <div class="explorer-card-name">${item.label}</div>
            <div class="explorer-card-key">${item.key}</div>
            ${tagsHtml ? `<div class="explorer-card-tags">${tagsHtml}</div>` : ''}
            ${extraHtml}
        `
        content.appendChild(card)
    })
}

document.getElementById('explorer-tabs').addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn')
    if (!btn) return
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    explorerTab = btn.dataset.tab
    renderExplorer()
})

function populateSelect(id, players) {
    const sel = document.getElementById(id)
    const prev = sel.value
    sel.innerHTML = '<option value="">Select target...</option>'
    players.forEach(p => {
        const opt = document.createElement('option')
        opt.value = p.key
        opt.textContent = `${p.label} [${p.cell}] HP:${p.hp}`
        sel.appendChild(opt)
    })
    if (prev) sel.value = prev
}

// ===== Log =====
function addLog(msg, cls = '') {
    const out = document.getElementById('log-output')
    const line = document.createElement('div')
    line.className = 'log-line' + (cls ? ` ${cls}` : '')
    // Colorize keywords
    if (!cls) {
        if (/dead|miss|cannot/.test(msg.toLowerCase())) cls = 'damage'
        else if (/recover|mana/.test(msg.toLowerCase())) cls = 'heal'
        else if (/next turn|turn \d/.test(msg.toLowerCase())) cls = 'turn'
        else if (/cast|attack|hit/.test(msg.toLowerCase())) cls = 'action'
        line.className = 'log-line' + (cls ? ` ${cls}` : '')
    }
    line.textContent = msg
    out.appendChild(line)
    out.scrollTop = out.scrollHeight
}

// ===== Gemini Chat =====
function addChatMsg(text, type = 'user') {
    const messages = document.getElementById('chat-messages')
    const msg = document.createElement('div')
    msg.className = `chat-msg ${type}`
    msg.textContent = text
    messages.appendChild(msg)
    messages.scrollTop = messages.scrollHeight
}

async function sendGeminiMessage() {
    const input = document.getElementById('chat-input')
    const msg = input.value.trim()
    if (!msg || !gameId) return
    input.value = ''

    addChatMsg(msg, 'user')

    const sendBtn = document.getElementById('chat-send-btn')
    sendBtn.disabled = true
    sendBtn.innerHTML = '<span class="spinner"></span>Thinking...'

    try {
        const data = await apiPost(`/api/game/${gameId}/gemini`, { message: msg })
        sendBtn.disabled = false
        sendBtn.textContent = 'Send'

        if (data.error) {
            addChatMsg(`Error: ${data.error}`, 'error')
            return
        }

        const response = data.action  // { description, actions: [{category, action}, ...] }
        const isUnknown = !response.actions || response.actions[0]?.category === 'unknown'
        if (isUnknown) {
            addChatMsg(response.description, 'error')
            return
        }

        const stepSummary = response.actions.map(s => `• ${s.category}`).join('\n')
        addChatMsg(`${response.description}\n(${response.actions.length} step${response.actions.length > 1 ? 's' : ''}: ${stepSummary})`, 'gemini')

        // Show confirmation
        pendingAction = response
        document.getElementById('pending-description').textContent =
            `Confirm: ${response.description}`
        document.getElementById('chat-pending').classList.remove('hidden')
    } catch (e) {
        sendBtn.disabled = false
        sendBtn.textContent = 'Send'
        addChatMsg(`Network error: ${e.message}`, 'error')
    }
}

async function executeStep(category, action) {
    switch (category) {
        case 'game-action': {
            const data = await apiPost(`/api/game/${gameId}/action`, action)
            if (data.error) throw new Error(data.error)
            if (data.actionLogs) data.actionLogs.forEach(l => addLog(l))
            applyState(data.state)
            return
        }
        case 'spawn-player': {
            const data = await apiPost(`/api/game/${gameId}/players`, action)
            if (data.error) throw new Error(data.error)
            applyState(data.state)
            addLog(`${action.label} joined the game.`, 'turn')
            return
        }
        case 'remove-player': {
            const data = await fetch(`${API}/api/game/${gameId}/players/${action.playerKey}`, { method: 'DELETE' }).then(r => r.json())
            if (data.error) throw new Error(data.error)
            applyState(data.state)
            addLog('Player removed from game.', 'turn')
            return
        }
        case 'register-weapon': {
            const data = await apiPost('/api/roster/weapons', action)
            if (data.error) throw new Error(data.error)
            addLog(`New weapon registered: ${action.label}`, 'heal')
            return
        }
        case 'register-armor': {
            const data = await apiPost('/api/roster/armors', action)
            if (data.error) throw new Error(data.error)
            addLog(`New armor registered: ${action.label}`, 'heal')
            return
        }
        case 'register-gem': {
            const data = await apiPost('/api/roster/gems', action)
            if (data.error) throw new Error(data.error)
            addLog(`New gem registered: ${action.label}`, 'heal')
            return
        }
        case 'register-spell': {
            const data = await apiPost('/api/roster/spells', action)
            if (data.error) throw new Error(data.error)
            addLog(`New spell registered: ${action.label}`, 'heal')
            return
        }
        default:
            throw new Error(`Unknown category "${category}"`)
    }
}

async function confirmPendingAction() {
    if (!pendingAction) return
    document.getElementById('chat-pending').classList.add('hidden')

    const { actions } = pendingAction
    pendingAction = null

    try {
        for (const step of actions) {
            await executeStep(step.category, step.action)
        }
        addChatMsg(`Done! (${actions.length} step${actions.length > 1 ? 's' : ''} executed)`, 'gemini')
        refreshExplorer()
    } catch (e) {
        addChatMsg(`Error: ${e.message}`, 'error')
        refreshExplorer()
    }
}

// ===== Event Listeners =====
document.getElementById('new-game-btn').addEventListener('click', newGame)

document.getElementById('end-player-turn-btn').addEventListener('click', () =>
    doAction({ type: 'end-player-turn' }))

document.getElementById('end-turn-btn').addEventListener('click', () =>
    doAction({ type: 'next-turn' }))

document.getElementById('players-list').addEventListener('click', e => {
    const btn = e.target.closest('.actions-adj-btn')
    if (!btn || !gameId) return
    const playerKey = btn.dataset.key
    const player = state?.players.find(p => p.key === playerKey)
    if (!player) return
    const newActions = player.actions + parseInt(btn.dataset.delta)
    if (newActions < 1) return
    doAction({ type: 'set-player-actions', playerKey, actions: newActions })
})

document.querySelectorAll('.move-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const dx = parseInt(btn.dataset.dx)
        const dy = parseInt(btn.dataset.dy)
        doAction({ type: 'move', coords: [dx, dy] })
    })
})

document.getElementById('melee-btn').addEventListener('click', () => {
    const target = document.getElementById('attack-target').value
    if (!target) return
    doAction({ type: 'attack-melee', targetKey: target })
})

document.getElementById('range-btn').addEventListener('click', () => {
    const target = document.getElementById('attack-target').value
    if (!target) return
    doAction({ type: 'attack-range', targetKey: target })
})

document.getElementById('cast-btn').addEventListener('click', () => {
    const spell = document.getElementById('spell-select').value
    const target = document.getElementById('spell-target').value
    if (!spell || !target) return
    doAction({ type: 'cast-spell', spellKey: spell, targetKey: target })
})

document.getElementById('chat-send-btn').addEventListener('click', sendGeminiMessage)
document.getElementById('chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') sendGeminiMessage()
})

document.getElementById('confirm-action-btn').addEventListener('click', confirmPendingAction)
document.getElementById('cancel-action-btn').addEventListener('click', () => {
    pendingAction = null
    document.getElementById('chat-pending').classList.add('hidden')
    addChatMsg('Action cancelled.', 'gemini')
})

document.getElementById('load-game-btn').addEventListener('click', () => {
    const id = document.getElementById('load-game-select').value
    if (id) loadGame(id)
})

// ===== Init =====
addLog('Welcome to Chronicles of Proxima. Click "New Game" to begin or load a saved game.', 'turn')
refreshGameList()
refreshExplorer()
