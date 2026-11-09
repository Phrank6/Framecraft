#!/usr/bin/env node
/**
 * Tiny local server for the AI step. The browser POSTs one parsed scene to
 * /api/extract; this server adds the Claude API key and calls the Messages API.
 * The key is read from the ANTHROPIC_API_KEY environment variable and never
 * reaches the browser, the repo or a chat.
 *
 *   ANTHROPIC_API_KEY=... npm run ai-server     (then npm run dev in another terminal)
 *
 * Optional: FRAMECRAFT_MODEL (default claude-sonnet-5-5), PORT (default 8787).
 */
import http from 'node:http';
import { buildExtractionRequest, parseExtractionResponse, DEFAULT_MODEL } from '../src/script/extract.js';

const PORT = Number(process.env.PORT ?? 8787);
const MODEL = process.env.FRAMECRAFT_MODEL ?? DEFAULT_MODEL;
const MAX_BODY = 200_000;

export async function extractWithClaude(scene, { apiKey = process.env.ANTHROPIC_API_KEY, fetchImpl = fetch, model = MODEL } = {}) {
    if (!apiKey)
        throw Object.assign(new Error('ANTHROPIC_API_KEY is not set on the server'), { status: 503 });
    const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(buildExtractionRequest(scene, { model })),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok)
        throw Object.assign(new Error(body?.error?.message ?? `Claude API error ${res.status}`), { status: 502 });
    return parseExtractionResponse(body);
}

export function createServer(options = {}) {
    return http.createServer(async (req, res) => {
        const send = (status, data) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(data)); };
        if (req.method === 'GET' && req.url === '/api/health')
            return send(200, { ok: true, ai: Boolean(options.apiKey ?? process.env.ANTHROPIC_API_KEY), model: options.model ?? MODEL });
        if (req.method !== 'POST' || req.url !== '/api/extract')
            return send(404, { error: 'Not found' });
        let size = 0;
        const chunks = [];
        for await (const chunk of req) {
            size += chunk.length;
            if (size > MAX_BODY)
                return send(413, { error: 'Scene too large' });
            chunks.push(chunk);
        }
        try {
            const { scene } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            if (!scene?.heading || !Array.isArray(scene.elements))
                return send(400, { error: 'Body must be { scene } from toSceneList()' });
            send(200, { breakdown: await extractWithClaude(scene, options) });
        }
        catch (error) {
            send(error.status ?? 500, { error: error.message });
        }
    });
}

if (import.meta.url === `file://${process.argv[1]}`) {
    createServer().listen(PORT, '127.0.0.1', () => {
        console.log(`Framecraft AI server on http://127.0.0.1:${PORT} · model ${MODEL} · key ${process.env.ANTHROPIC_API_KEY ? 'found' : 'MISSING (offline extraction only)'}`);
    });
}
