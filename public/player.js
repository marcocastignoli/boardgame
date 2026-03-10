const API = 'http://localhost:8888'

let gameId = null
let myPlayerKey = null
let state = null
let pendingAction = null
let eventSource = null

// ===== API =====
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

// ===== Join Flow =====
async function initJoin() {
    const games = await apiGet('/api/games')
    const sel = document.getElementById('join-game-select')
    sel.innerHTML = '<option value="">— select a game —</option>'
    games.forEach(g => {
        const opt = document.createElement('option')
        opt.value = g.gameId
        const names = g.players.map(p => `${p.label}${p.alive ? '' : ' ☠'}`).join(', ')
        opt.textContent = `Turn ${g.turn} — ${names} [${g.gameId.slice(0, 6)}]`
        sel.appendChild(opt)
    })
    document.getElementById('join-load-btn').disabled = games.length === 0
    if (games.length === 0) {
        sel.innerHTML = '<option value="">No active games found</option>'
    }
}

document.getElementById('join-load-btn').addEventListener('click', async () => {
    const id = document.getElementById('join-game-select').value
    if (!id) return
    const data = await apiGet(`/api/game/${id}`)
    if (data.error) { showJoinError(data.error); return }
    gameId = id
    showPlayerStep(data.state)
})

document.getElementById('join-game-select').addEventListener('change', e => {
    document.getElementById('join-load-btn').disabled = !e.target.value
})

document.getElementById('join-back-btn').addEventListener('click', () => {
    document.getElementById('join-step-player').classList.add('hidden')
    document.getElementById('join-step-game').classList.remove('hidden')
    gameId = null
})

function showJoinError(msg) {
    const el = document.getElementById('join-error')
    el.textContent = msg
    el.classList.remove('hidden')
}

function showPlayerStep(gameState) {
    document.getElementById('join-step-game').classList.add('hidden')
    const step = document.getElementById('join-step-player')
    step.classList.remove('hidden')

    const list = document.getElementById('join-player-list')
    list.innerHTML = ''
    gameState.players.filter(p => p.alive).forEach(p => {
        const card = document.createElement('div')
        card.className = `player-pick-card ${p.key}`
        card.innerHTML = `
            <div class="pick-token ${p.key}">${p.label.substring(0, 2).toUpperCase()}</div>
            <div class="pick-info">
                <div class="pick-name">${p.label}</div>
                <div class="pick-stats">HP: ${p.hp} &nbsp; Mana: ${p.mana}/${p.maxMana}</div>
                <div class="pick-equip">
                    ${p.equipment.weap1 ? `⚔ ${p.equipment.weap1.label}` : ''}
                    ${p.equipment.armor ? ` &nbsp; 🛡 ${p.equipment.armor.label}` : ''}
                </div>
            </div>
        `
        card.addEventListener('click', () => enterGame(p.key, gameState))
        list.appendChild(card)
    })
}

function enterGame(playerKey, initialState) {
    myPlayerKey = playerKey
    sessionStorage.setItem('proxima_game', gameId)
    sessionStorage.setItem('proxima_player', playerKey)

    document.getElementById('join-overlay').classList.add('hidden')
    document.getElementById('game-ui').classList.remove('hidden')

    document.getElementById('my-player-label').textContent =
        initialState.players.find(p => p.key === playerKey)?.label || playerKey

    applyState(initialState)
    subscribeSSE()
    addLog(`You have entered the fray as ${initialState.players.find(p => p.key === playerKey)?.label}.`, 'turn')
}

// ===== SSE =====
function subscribeSSE() {
    if (eventSource) eventSource.close()
    eventSource = new EventSource(`${API}/api/game/${gameId}/events`)
    eventSource.onmessage = e => {
        const newState = JSON.parse(e.data)
        // Only update if something actually changed (avoid re-render loops)
        const oldActive = state?.activePlayerKey
        applyState(newState)
        // Notify if it just became our turn
        if (newState.activePlayerKey === myPlayerKey && oldActive !== myPlayerKey) {
            flashMyTurn()
        }
    }
    eventSource.onerror = () => {
        // Will auto-reconnect
    }
}

function flashMyTurn() {
    const badge = document.getElementById('my-turn-badge')
    badge.classList.remove('hidden')
    badge.classList.add('pulse')
    setTimeout(() => badge.classList.remove('pulse'), 3000)
}

// ===== Actions =====
function isMyTurn() {
    return state && state.activePlayerKey === myPlayerKey
}

function hasActionsLeft() {
    if (!isMyTurn()) return false
    const me = state.players.find(p => p.key === myPlayerKey)
    return me ? state.actionsActivePlayer < me.actions : false
}

async function doAction(action) {
    if (!gameId) return
    const data = await apiPost(`/api/game/${gameId}/action`, action)
    if (data.error) { addLog(`Error: ${data.error}`, 'damage'); return }
    if (data.actionLogs) data.actionLogs.forEach(l => addLog(l))
    applyState(data.state)
}

// ===== State =====
function applyState(newState) {
    state = newState
    renderMap()
    renderHeader()
    renderCombatants()
    updateControls()
}

// ===== Header =====
function renderHeader() {
    document.getElementById('turn-label').textContent = `Turn ${state.turn}`
    const active = state.players.find(p => p.key === state.activePlayerKey)
    document.getElementById('active-label').textContent = active ? `${active.label}'s turn` : ''

    const badge = document.getElementById('my-turn-badge')
    if (isMyTurn()) {
        badge.classList.remove('hidden')
    } else {
        badge.classList.add('hidden')
    }
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

            const coord = document.createElement('span')
            coord.className = 'coord'
            coord.textContent = `${col},${row}`
            cell.appendChild(coord)

            const charsHere = state.players.filter(p => p.cell[0] === col && p.cell[1] === row)
            charsHere.forEach(p => {
                const token = document.createElement('div')
                const isActive = p.key === state.activePlayerKey
                const isMe = p.key === myPlayerKey
                token.className = `char-token ${p.key}${isActive ? ' active' : ''}${!p.alive ? ' dead' : ''}${isMe ? ' mine' : ''}`
                token.textContent = p.label.substring(0, 2).toUpperCase()
                token.title = `${p.label} — HP: ${p.hp}, Mana: ${p.mana}`
                cell.appendChild(token)
            })

            grid.appendChild(cell)
        }
    }
}

// ===== Combatants panel =====
function renderCombatants() {
    const list = document.getElementById('combatants-list')
    list.innerHTML = ''

    // Show turn order first
    const ordered = [...state.turnOrder]
    ordered.forEach((entry, i) => {
        const p = state.players.find(pl => pl.key === entry.key)
        if (!p) return
        const isActive = p.key === state.activePlayerKey
        const isMe = p.key === myPlayerKey
        const isCurrent = i === state.turnOrderIndex

        const maxHp = p.hp > 0 ? Math.max(p.hp, 10) : 10
        const hpPct = Math.max(0, Math.min(100, (p.hp / maxHp) * 100))
        const manaPct = p.maxMana > 0 ? Math.max(0, Math.min(100, (p.mana / p.maxMana) * 100)) : 0

        const card = document.createElement('div')
        card.className = `combatant-card ${p.key}${isActive ? ' active' : ''}${!p.alive ? ' dead' : ''}${isMe ? ' mine' : ''}`
        card.innerHTML = `
            <div class="combatant-token ${p.key}">${p.label.substring(0, 2).toUpperCase()}</div>
            <div class="combatant-info">
                <div class="combatant-name">
                    ${p.label}${isMe ? ' <span class="you-badge">YOU</span>' : ''}${isCurrent ? ' <span class="current-badge">▶</span>' : ''}
                </div>
                <div class="combatant-bars">
                    <div class="mini-bar-row">
                        <span class="mini-bar-label">HP</span>
                        <div class="mini-bar-track"><div class="mini-bar-fill hp" style="width:${hpPct}%"></div></div>
                        <span class="mini-bar-val">${p.hp}</span>
                    </div>
                    <div class="mini-bar-row">
                        <span class="mini-bar-label">MP</span>
                        <div class="mini-bar-track"><div class="mini-bar-fill mana" style="width:${manaPct}%"></div></div>
                        <span class="mini-bar-val">${p.mana}</span>
                    </div>
                </div>
                <div class="combatant-pos">[${p.cell}]</div>
            </div>
        `
        list.appendChild(card)
    })
}

// ===== Controls =====
function updateControls() {
    const myTurn = isMyTurn()
    const me = state?.players.find(p => p.key === myPlayerKey)

    // Section styling
    const wrap = document.getElementById('controls-wrap')
    const title = document.getElementById('controls-title')
    const waiting = document.getElementById('waiting-label')
    if (myTurn) {
        wrap.classList.remove('disabled')
        title.textContent = 'Your Actions'
        waiting.classList.add('hidden')
    } else {
        wrap.classList.add('disabled')
        title.textContent = 'Controls'
        waiting.classList.remove('hidden')
    }

    const actionsLeft = myTurn
        ? (me ? me.actions - state.actionsActivePlayer : 0)
        : 0
    const canAct = myTurn && actionsLeft > 0

    // Update section label with actions remaining
    if (myTurn) {
        document.getElementById('controls-title').textContent =
            actionsLeft > 0
                ? `Your Actions (${actionsLeft} left)`
                : 'No Actions Left — End Your Turn'
    }

    // Move buttons
    document.querySelectorAll('.move-btn[data-dx]').forEach(b => b.disabled = !canAct)

    // Attack target dropdown — exclude self for melee/range
    const targets = state.players.filter(p => p.key !== myPlayerKey && p.alive)
    populateSelect('attack-target', targets)

    // Spell select
    const spellSel = document.getElementById('spell-select')
    spellSel.innerHTML = '<option value="">Spell...</option>'
    if (me) {
        me.spells.forEach(s => {
            const opt = document.createElement('option')
            opt.value = s.key
            opt.textContent = `${s.label} (${s.mana}✦)`
            spellSel.appendChild(opt)
        })
    }
    populateSelect('spell-target', state.players.filter(p => p.alive))

    document.getElementById('melee-btn').disabled = !canAct
    document.getElementById('range-btn').disabled = !canAct
    document.getElementById('cast-btn').disabled = !canAct
    document.getElementById('end-turn-btn').disabled = !myTurn
}

function populateSelect(id, players) {
    const sel = document.getElementById(id)
    const prev = sel.value
    sel.innerHTML = `<option value="">Target...</option>`
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
    if (!cls) {
        if (/dead|miss|cannot/.test(msg.toLowerCase())) cls = 'damage'
        else if (/recover|mana/.test(msg.toLowerCase())) cls = 'heal'
        else if (/next turn|turn \d/.test(msg.toLowerCase())) cls = 'turn'
        else if (/cast|attack|hit/.test(msg.toLowerCase())) cls = 'action'
    }
    line.className = 'log-line' + (cls ? ` ${cls}` : '')
    line.textContent = msg
    out.appendChild(line)
    out.scrollTop = out.scrollHeight
}

// ===== Oracle / Gemini =====
function addChatMsg(text, type = 'user') {
    const messages = document.getElementById('chat-messages')
    const msg = document.createElement('div')
    msg.className = `chat-msg ${type}`
    msg.textContent = text
    messages.appendChild(msg)
    messages.scrollTop = messages.scrollHeight
}

async function sendOracleMessage() {
    const input = document.getElementById('chat-input')
    const msg = input.value.trim()
    if (!msg || !gameId) return
    input.value = ''

    addChatMsg(msg, 'user')

    const btn = document.getElementById('chat-send-btn')
    btn.disabled = true
    btn.textContent = '...'

    try {
        const data = await apiPost(`/api/game/${gameId}/gemini`, { message: msg })
        btn.disabled = false
        btn.textContent = 'Ask'

        if (data.error) { addChatMsg(`Error: ${data.error}`, 'error'); return }

        const response = data.action
        const isUnknown = !response.actions || response.actions[0]?.category === 'unknown'
        if (isUnknown) { addChatMsg(response.description, 'error'); return }

        const stepSummary = response.actions.map(s => `• ${s.category}`).join('\n')
        addChatMsg(`${response.description}\n(${response.actions.length} step${response.actions.length > 1 ? 's' : ''}: ${stepSummary})`, 'oracle')

        pendingAction = response
        document.getElementById('pending-description').textContent = response.description
        document.getElementById('chat-pending').classList.remove('hidden')
    } catch (e) {
        btn.disabled = false
        btn.textContent = 'Ask'
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
            return
        }
        case 'remove-player': {
            const data = await fetch(`${API}/api/game/${gameId}/players/${action.playerKey}`, { method: 'DELETE' }).then(r => r.json())
            if (data.error) throw new Error(data.error)
            applyState(data.state)
            return
        }
        case 'register-weapon': {
            await apiPost('/api/roster/weapons', action)
            return
        }
        case 'register-armor': {
            await apiPost('/api/roster/armors', action)
            return
        }
        case 'register-gem': {
            await apiPost('/api/roster/gems', action)
            return
        }
        case 'register-spell': {
            await apiPost('/api/roster/spells', action)
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
        for (const step of actions) await executeStep(step.category, step.action)
        addChatMsg(`Done! (${actions.length} step${actions.length > 1 ? 's' : ''} executed)`, 'oracle')
    } catch (e) {
        addChatMsg(`Error: ${e.message}`, 'error')
    }
}

// ===== Event Listeners =====
document.querySelectorAll('.move-btn[data-dx]').forEach(btn => {
    btn.addEventListener('click', () => {
        if (!hasActionsLeft()) return
        doAction({ type: 'move', coords: [parseInt(btn.dataset.dx), parseInt(btn.dataset.dy)] })
    })
})

document.getElementById('melee-btn').addEventListener('click', () => {
    if (!hasActionsLeft()) return
    const target = document.getElementById('attack-target').value
    if (!target) return
    doAction({ type: 'attack-melee', targetKey: target })
})

document.getElementById('range-btn').addEventListener('click', () => {
    if (!hasActionsLeft()) return
    const target = document.getElementById('attack-target').value
    if (!target) return
    doAction({ type: 'attack-range', targetKey: target })
})

document.getElementById('cast-btn').addEventListener('click', () => {
    if (!hasActionsLeft()) return
    const spell = document.getElementById('spell-select').value
    const target = document.getElementById('spell-target').value
    if (!spell || !target) return
    doAction({ type: 'cast-spell', spellKey: spell, targetKey: target })
})

document.getElementById('end-turn-btn').addEventListener('click', () => {
    if (!isMyTurn()) return
    doAction({ type: 'end-player-turn' })
})

document.getElementById('chat-send-btn').addEventListener('click', sendOracleMessage)
document.getElementById('chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') sendOracleMessage()
})

document.getElementById('confirm-action-btn').addEventListener('click', confirmPendingAction)
document.getElementById('cancel-action-btn').addEventListener('click', () => {
    pendingAction = null
    document.getElementById('chat-pending').classList.add('hidden')
    addChatMsg('Action cancelled.', 'oracle')
})

// ===== Session restore =====
const savedGame = sessionStorage.getItem('proxima_game')
const savedPlayer = sessionStorage.getItem('proxima_player')
if (savedGame && savedPlayer) {
    apiGet(`/api/game/${savedGame}`).then(data => {
        if (data.error || !data.state) { initJoin(); return }
        const player = data.state.players.find(p => p.key === savedPlayer)
        if (!player || !player.alive) { initJoin(); return }
        gameId = savedGame
        enterGame(savedPlayer, data.state)
    }).catch(initJoin)
} else {
    initJoin()
}
