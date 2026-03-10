import { GoogleGenerativeAI } from '@google/generative-ai'
import { createGame, listGames, getGameState, performAction, spawnPlayer, removePlayer, getRoster, registerWeapon, registerArmor, registerGem, registerSpell, buildGeminiContext, addSseClient, removeSseClient } from './gameManager.js'
import config from '../../config.js'

export default function gameRoutes(app) {
    // List all available items/spells/gems
    app.get('/api/roster', (req, res) => {
        res.json(getRoster())
    })

    // Register new catalog entries
    // Mod descriptor format: { label?, key?, attributes: { <attr>: { type: "fixed", value: N } | { type: "dice", count: N, faces: N } } }
    // Valid attributes: hp, mana, maxMana, parry, dodge, meleeDamage, spellPower, rangeDamage, hit, actions, endTurnMana, speed

    app.post('/api/roster/weapons', (req, res) => {
        try { res.json(registerWeapon(req.body)) }
        catch (e) { res.status(400).json({ error: e.message }) }
    })

    app.post('/api/roster/armors', (req, res) => {
        try { res.json(registerArmor(req.body)) }
        catch (e) { res.status(400).json({ error: e.message }) }
    })

    app.post('/api/roster/gems', (req, res) => {
        try { res.json(registerGem(req.body)) }
        catch (e) { res.status(400).json({ error: e.message }) }
    })

    app.post('/api/roster/spells', (req, res) => {
        try { res.json(registerSpell(req.body)) }
        catch (e) { res.status(400).json({ error: e.message }) }
    })

    // List all saved games
    app.get('/api/games', (req, res) => {
        res.json(listGames())
    })

    // Create a new game
    app.post('/api/game/new', async (req, res) => {
        try {
            const gameId = await createGame()
            const state = getGameState(gameId)
            res.json({ gameId, state })
        } catch (e) {
            res.status(500).json({ error: e.message })
        }
    })

    // Get game state
    app.get('/api/game/:gameId', (req, res) => {
        try {
            const state = getGameState(req.params.gameId)
            res.json({ state })
        } catch (e) {
            res.status(404).json({ error: e.message })
        }
    })

    // Perform a game action
    app.post('/api/game/:gameId/action', async (req, res) => {
        try {
            const result = await performAction(req.params.gameId, req.body)
            res.json(result)
        } catch (e) {
            res.status(400).json({ error: e.message })
        }
    })

    // Spawn a new player into a game
    // Body: { key, label, weap1Key?, weap2Key?, armorKey?, spellKeys?: [], cell?: [x,y] }
    app.post('/api/game/:gameId/players', async (req, res) => {
        try {
            const state = await spawnPlayer(req.params.gameId, req.body)
            res.json({ state })
        } catch (e) {
            res.status(400).json({ error: e.message })
        }
    })

    // Remove a player from a game
    app.delete('/api/game/:gameId/players/:playerKey', async (req, res) => {
        try {
            const state = await removePlayer(req.params.gameId, req.params.playerKey)
            res.json({ state })
        } catch (e) {
            res.status(400).json({ error: e.message })
        }
    })

    // SSE endpoint for real-time state updates
    app.get('/api/game/:gameId/events', (req, res) => {
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        res.setHeader('X-Accel-Buffering', 'no')
        res.socket?.setNoDelay(true)
        res.flushHeaders()

        const { gameId } = req.params
        addSseClient(gameId, res)

        // Send current state immediately
        try {
            const state = getGameState(gameId)
            res.write(`data: ${JSON.stringify(state)}\n\n`)
        } catch {}

        // Keep-alive ping every 25s
        const ping = setInterval(() => { try { res.write(': ping\n\n') } catch {} }, 25000)

        req.on('close', () => {
            clearInterval(ping)
            removeSseClient(gameId, res)
        })
    })

    // Ask Gemini to interpret a natural language command
    app.post('/api/game/:gameId/gemini', async (req, res) => {
        const { message } = req.body
        if (!message) return res.status(400).json({ error: 'message is required' })

        const apiKey = config.geminiApiKey
        if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })

        try {
            const state = getGameState(req.params.gameId)
            const roster = getRoster()
            const systemContext = buildGeminiContext(state, roster)

            const genAI = new GoogleGenerativeAI(apiKey)
            const model = genAI.getGenerativeModel({
                model: 'gemini-3.1-flash-lite-preview',
                systemInstruction: systemContext
            })

            const result = await Promise.race([
                model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: message }] }],
                    generationConfig: { thinkingConfig: { thinkingBudget: 8192 } }
                }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Gemini request timed out after 2m')), 120000)
                )
            ])
            const text = result.response.text().trim()

            // Strip markdown code fences if present
            const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

            let parsed
            try {
                parsed = JSON.parse(cleaned)
            } catch {
                return res.status(200).json({
                    action: { description: 'Could not parse Gemini response.', actions: [{ category: 'unknown', action: {} }] },
                    raw: text
                })
            }

            res.json({ action: parsed })
        } catch (e) {
            res.status(500).json({ error: e.message })
        }
    })
}
