const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
  baseURL: process.env.ANTHROPIC_BASE_URL,
});

const SYSTEM_PROMPT = `You are QuantumFab AI, an expert assistant for quantum chip design and fabrication. You help engineers design superconducting quantum processors, transmon qubits, resonators, and related quantum hardware.

When a user asks you to design a quantum chip, ALWAYS respond with a JSON block in this exact format (wrapped in \`\`\`json ... \`\`\`), followed by a plain-language explanation:

\`\`\`json
{
  "chip": {
    "name": "ChipName",
    "width": 800,
    "height": 600,
    "topology": "heavy-hex",
    "qubits": [
      { "id": "Q0", "x": 100, "y": 100, "type": "transmon", "frequency_ghz": 5.1 },
      { "id": "Q1", "x": 250, "y": 100, "type": "transmon", "frequency_ghz": 5.3 }
    ],
    "couplers": [
      { "from": "Q0", "to": "Q1", "type": "capacitive", "strength_mhz": 12 }
    ],
    "resonators": [
      { "id": "R0", "qubit": "Q0", "frequency_ghz": 6.8, "type": "readout" }
    ]
  }
}
\`\`\`

Then explain the design choices, fabrication considerations, and expected performance.

For non-design questions, answer as a knowledgeable quantum hardware expert. Cover topics like:
- Qubit coherence times and decoherence sources
- Fabrication processes (Josephson junctions, e-beam lithography)
- Microwave control and readout
- Error rates and gate fidelities
- Cryogenic requirements`;

app.post(['/api/chat', '/backend/server.js', '/chat', '/'], async (req, res) => {
  const { messages } = req.body;
  
  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await client.messages.stream({
      model: process.env.ANTHROPIC_DEFAULT_SONNET_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: messages,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('API Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get(['/health', '/backend/server.js/health', '/api/health', '/'], (req, res) => res.json({ status: 'ok' }));

if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`\n🔬 QuantumFab AI Backend running on http://localhost:${PORT}`);
    console.log(`   Base URL : ${process.env.ANTHROPIC_BASE_URL}`);
    console.log(`   Model    : ${process.env.ANTHROPIC_DEFAULT_SONNET_MODEL}\n`);
  });
}

module.exports = app;
