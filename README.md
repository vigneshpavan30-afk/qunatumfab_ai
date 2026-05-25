# QuantumFab AI

Quantum chip design assistant powered by GLM via ThinkByte LiteLLM Proxy.

## Quick Start

### First time only — Setup
Open PowerShell in this folder and run:
```
powershell -ExecutionPolicy Bypass -File SETUP.ps1
```
It will ask for your API key, install all dependencies, and configure everything.

### Every time — Start the app
Double-click **START.bat**

Then open http://localhost:3000

## Manual Start (if START.bat doesn't work)

**Window 1 — Backend:**
```
cd backend
node server.js
```

**Window 2 — Frontend:**
```
cd frontend
npm start
```

## Try these prompts
- "Design a 5-qubit transmon chip with heavy-hex topology"
- "9-qubit surface code layout"
- "What causes T1 decoherence in transmon qubits?"
- "Design a readout resonator for a 5.2 GHz qubit"

## Configuration
Edit `backend\.env` to change API key or model.

Models available:
- `glm-4-7` (default, balanced)
- `glm-4-7-flash` (faster, cheaper)
- `glm-5` (most capable)
