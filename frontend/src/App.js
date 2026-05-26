import React, { useState, useRef, useEffect } from 'react';

// ── COLOR SYSTEM (Sleek Dark Slate & Emerald Lab Palette) ──────────────────────────
const C = {
  bg:         '#090d16', // Deep charcoal/slate background
  panel:      'rgba(17, 24, 39, 0.65)', // Sleek semi-transparent panels
  panelSolid: '#111827', // Solid dark slate panel
  border:     '#1e293b', // Deep tech borders
  borderGlow: 'rgba(16, 185, 129, 0.12)',
  accent:     '#10b981', // Emerald green primary accent
  accentGlow: 'rgba(16, 185, 129, 0.35)',
  accent2:    '#34d399', // Mint green secondary accent
  accent2Glow:'rgba(52, 211, 153, 0.25)',
  green:      '#059669', // Deep forest/lab green
  greenGlow:  'rgba(5, 150, 105, 0.25)',
  yellow:     '#f59e0b', // Amber warning/gold
  red:        '#ef4444', // Coral red
  text:       '#cbd5e1', // Light slate gray text
  muted:      '#64748b', // Slate muted steel
  white:      '#f8fafc', // Pure off-white
  fontMono:   "'JetBrains Mono', monospace",
  fontSans:   "'Plus Jakarta Sans', sans-serif",
};

// ── DEFAULT DEMO CHIP DATA (For interactive sample loading) ──────────────────
const DEMO_CHIP = {
  name: "QFab-Hermes 5Q",
  width: 800,
  height: 600,
  topology: "heavy-hex",
  qubits: [
    { id: "Q0", x: 180, y: 150, type: "transmon", frequency_ghz: 5.12, EC_Mhz: 220, EJ_Ghz: 15.5 },
    { id: "Q1", x: 400, y: 150, type: "transmon", frequency_ghz: 5.34, EC_Mhz: 215, EJ_Ghz: 17.2 },
    { id: "Q2", x: 620, y: 150, type: "transmon", frequency_ghz: 5.08, EC_Mhz: 225, EJ_Ghz: 14.9 },
    { id: "Q3", x: 290, y: 450, type: "transmon", frequency_ghz: 5.21, EC_Mhz: 218, EJ_Ghz: 16.1 },
    { id: "Q4", x: 510, y: 450, type: "transmon", frequency_ghz: 5.29, EC_Mhz: 216, EJ_Ghz: 16.8 }
  ],
  couplers: [
    { from: "Q0", to: "Q1", type: "capacitive", strength_mhz: 12.4, length_mm: 3.12 },
    { from: "Q1", to: "Q2", type: "capacitive", strength_mhz: 11.8, length_mm: 3.25 },
    { from: "Q0", to: "Q3", type: "capacitive", strength_mhz: 14.1, length_mm: 2.89 },
    { from: "Q1", to: "Q4", type: "capacitive", strength_mhz: 12.9, length_mm: 3.05 },
    { from: "Q3", to: "Q4", type: "capacitive", strength_mhz: 13.5, length_mm: 2.95 }
  ],
  resonators: [
    { id: "R0", qubit: "Q0", frequency_ghz: 6.82, type: "readout", QL: 14500 },
    { id: "R1", qubit: "Q1", frequency_ghz: 6.94, type: "readout", QL: 16200 },
    { id: "R2", qubit: "Q2", frequency_ghz: 6.75, type: "readout", QL: 15100 },
    { id: "R3", qubit: "Q3", frequency_ghz: 6.87, type: "readout", QL: 13800 },
    { id: "R4", qubit: "Q4", frequency_ghz: 7.02, type: "readout", QL: 15900 }
  ]
};

// ── CUSTOM PYTHON SYNTAX HIGHLIGHTER ──────────────────────────────────────────
function highlightPython(code) {
  if (!code) return '';
  const rules = [
    { regex: /(#.*)/g, class: 'comment' },
    { regex: /("(?:\\"|[^"])*"|'(?:\\'|[^'])*')/g, class: 'string' },
    { regex: /\b(def|class|import|from|return|if|elif|else|for|in|while|as|True|False|None)\b/g, class: 'keyword' },
    { regex: /\b(\d+(?:\.\d+)?)\b/g, class: 'number' },
    { regex: /\b(metal|designs|draw|RouteMeander|TransmonPocket|gui)\b/g, class: 'builtin' },
    { regex: /([()\[\]{}])/g, class: 'bracket' }
  ];

  let escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Apply highlight rules
  let styled = escaped;
  rules.forEach(rule => {
    styled = styled.replace(rule.regex, (match) => {
      return `<span class="py-${rule.class}">${match}</span>`;
    });
  });

  return styled;
}

// ── MAIN REDESIGNED CHIP DIAGRAM + WORKBENCH ──────────────────────────────────
function ChipDiagram({ chip, substrate, baseTemp, junctionQuality, activeTab, setActiveTab }) {
  if (!chip) return null;
  const { qubits = [], couplers = [], resonators = [], width = 800, height = 600, name, topology } = chip;

  // Zoom & Pan states
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState('fabricated'); // 'fabricated', 'physical', or 'qiskit'

  // Hover states for elements
  const [hoveredElement, setHoveredElement] = useState(null);

  const qubitMap = {};
  qubits.forEach(q => { qubitMap[q.id] = q; });

  const sortedQ = [...qubits].sort((a, b) => a.y - b.y);

  // Calculate meander parameters
  let minYGap = 100;
  for (let i = 1; i < sortedQ.length; i++) {
    minYGap = Math.min(minYGap, sortedQ[i].y - sortedQ[i - 1].y);
  }
  const safeAmp = Math.max(8, Math.min(22, (minYGap - 12) / 2));

  // Bond-pad geometry
  const padR = 22, innerR = 15;
  const leftPadX = 34, rightPadX = width - 34;
  const numPads = Math.max(sortedQ.length, 5);
  const padYStart = 55, padYEnd = height - 55;
  const padGap = numPads > 1 ? (padYEnd - padYStart) / (numPads - 1) : 0;
  const leftPads  = Array.from({ length: numPads }, (_, i) => ({ x: leftPadX,  y: padYStart + i * padGap }));
  const rightPads = Array.from({ length: numPads }, (_, i) => ({ x: rightPadX, y: padYStart + i * padGap }));

  // Serpentine routes generators
  function hMeander(sx, sy, w, h, passes) {
    passes = Math.max(2, passes);
    const rh = h / (passes - 1);
    let d = '';
    for (let i = 0; i < passes; i++) {
      const y = sy + i * rh;
      const goR = i % 2 === 0;
      const x1 = goR ? sx : sx + w;
      const x2 = goR ? sx + w : sx;
      d += (i === 0 ? `M ${x1.toFixed(1)} ${y.toFixed(1)}` : ` L ${x1.toFixed(1)} ${y.toFixed(1)}`);
      d += ` L ${x2.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  }

  function vMeander(sx, sy, w, h, passes) {
    passes = Math.max(2, passes);
    const cw = w / (passes - 1);
    let d = '';
    for (let i = 0; i < passes; i++) {
      const x = sx + i * cw;
      const goD = i % 2 === 0;
      const y1 = goD ? sy : sy + h;
      const y2 = goD ? sy + h : sy;
      d += (i === 0 ? `M ${x.toFixed(1)} ${y1.toFixed(1)}` : ` L ${x.toFixed(1)} ${y1.toFixed(1)}`);
      d += ` L ${x.toFixed(1)} ${y2.toFixed(1)}`;
    }
    return d;
  }

  function leftResPath(pad, q) {
    const sx = pad.x + padR + 2;
    const ex = q.x - 34;
    const avail = ex - sx;
    if (avail < 30) return `M ${sx} ${pad.y} L ${ex} ${q.y}`;
    const li = Math.min(avail * 0.12, 18);
    const mW = Math.max(20, avail - li - 15);
    const mx = sx + li;
    const amp = safeAmp;
    const passes = Math.max(4, Math.min(14, Math.round(mW / 9)));
    const topY = (pad.y + q.y) / 2 - amp;
    let d = `M ${sx} ${pad.y} L ${mx} ${pad.y} L ${mx} ${topY}`;
    const rh = (amp * 2) / (passes - 1);
    for (let i = 0; i < passes; i++) {
      const y = topY + i * rh;
      const goR = i % 2 === 0;
      const x1 = goR ? mx : mx + mW;
      const x2 = goR ? mx + mW : mx;
      d += ` L ${x1.toFixed(1)} ${y.toFixed(1)} L ${x2.toFixed(1)} ${y.toFixed(1)}`;
    }
    const lastX = ((passes - 1) % 2 === 0) ? mx + mW : mx;
    d += ` L ${lastX.toFixed(1)} ${q.y} L ${ex} ${q.y}`;
    return d;
  }

  function rightDrivePath(q, pad) {
    const sx = q.x + 34;
    const ex = pad.x - padR - 2;
    const avail = ex - sx;
    if (avail < 30) return `M ${sx} ${q.y} L ${ex} ${pad.y}`;
    const lo = Math.min(avail * 0.12, 18);
    const mW = Math.min(avail * 0.45, 55);
    const mx = ex - lo - mW;
    const amp = Math.min(safeAmp + 6, 30);
    const passes = Math.max(4, Math.min(12, Math.round(mW / 7)));
    const topY = q.y - amp;
    let d = `M ${sx} ${q.y} L ${mx} ${q.y}`;
    const cw = mW / (passes - 1);
    for (let i = 0; i < passes; i++) {
      const x = mx + i * cw;
      const goD = i % 2 === 0;
      const y1 = goD ? topY : topY + amp * 2;
      const y2 = goD ? topY + amp * 2 : topY;
      d += ` L ${x.toFixed(1)} ${y1.toFixed(1)} L ${x.toFixed(1)} ${y2.toFixed(1)}`;
    }
    const lastX = mx + (passes - 1) * cw;
    d += ` L ${lastX.toFixed(1)} ${pad.y} L ${ex} ${pad.y}`;
    return d;
  }

  // ── Telemetry Estimation System ──
  const getTelemetryMetrics = () => {
    // Base times by substrate
    let t1Base = 90; // sapphire base
    if (substrate === 'sapphire_ultra') t1Base = 160;
    if (substrate === 'silicon') t1Base = 50;

    // Thermal degradation factor: 10mK is 1.0, 50mK is 0.75, 100mK is 0.25
    const tempK = baseTemp / 1000;
    const tempFactor = Math.max(0.08, 1 - Math.pow(tempK / 0.12, 2.2));

    // Calculate averages
    const avgT1 = Math.round(t1Base * tempFactor * (1 - 0.015 * qubits.length));
    const avgT2 = Math.round(avgT1 * 1.55 * (0.5 + junctionQuality / 200));

    // Gate error scaling
    const base1QError = 0.00015;
    const base2QError = 0.0012;
    
    const jqLoss = (100 - junctionQuality) * 0.0008;
    const tempLoss = Math.max(0, (baseTemp - 10) * 0.00003);

    const singleQGateFidelity = Math.min(99.99, (1 - (base1QError + jqLoss + tempLoss)) * 100);
    const twoQGateFidelity = Math.min(99.95, (1 - (base2QError + jqLoss * 1.8 + tempLoss * 1.5 + couplers.length * 0.0001)) * 100);

    const thermalPower = (qubits.length * 0.45 + resonators.length * 0.2 + (substrate === 'silicon' ? 1.5 : 0.4)).toFixed(2);

    return { avgT1, avgT2, singleQGateFidelity, twoQGateFidelity, thermalPower };
  };

  const metrics = getTelemetryMetrics();

  // Qiskit Metal Code generation
  const generateQiskitMetalCode = () => {
    const scaleX = (x) => ((x - 400) / 100).toFixed(3);
    const scaleY = (y) => ((300 - y) / 100).toFixed(3);
    let code = `import qiskit_metal as metal
from qiskit_metal import designs, draw
from qiskit_metal.qlibrary.qubits.transmon_pocket import TransmonPocket
from qiskit_metal.qlibrary.tlines.meandered import RouteMeander

# Initialize Planar Design
design = designs.DesignPlanar()
design.overwrite_enabled = True
gui = metal.MetalGUI(design)

# Create Qubits (Transmon Pockets)
qubits = {}
`;
    qubits.forEach(q => {
      code += `
qubits['${q.id}'] = TransmonPocket(
    design, '${q.id}',
    options=dict(
        pos_x='${scaleX(q.x)}mm', pos_y='${scaleY(q.y)}mm',
        pad_width='425um', pad_height='220um',
        pocket_width='650um', pocket_height='650um',
        connection_pads=dict(
            readout=dict(loc_W=1, loc_H=-1, pad_width='30um'),
            bus=dict(loc_W=-1, loc_H=1, pad_width='30um')
        )
    )
)
`;
    });
    code += `\n# Reconstruct Inter-qubit Couplers (CPW Meandered Buses)`;
    couplers.forEach(c => {
      code += `
RouteMeander(design, 'cpw_bus_${c.from}_${c.to}',
    options=dict(
        pin_inputs=dict(
            start_pin=dict(component='${c.from}', pin='bus'),
            end_pin=dict(component='${c.to}', pin='bus')
        ),
        fillet='90um',
        lead=dict(start_straight='0.1mm', end_straight='0.1mm'),
        meander=dict(spacing='0.2mm', length='2.0mm'),
        total_length='4.5mm'
    )
)
`;
    });
    code += `\n# Reconstruct Readout Resonators`;
    resonators.forEach(r => {
      code += `
RouteMeander(design, 'readout_res_${r.qubit}',
    options=dict(
        pin_inputs=dict(
            start_pin=dict(component='${r.qubit}', pin='readout'),
            end_pin=dict(component='${r.qubit}', pin='readout')
        ),
        fillet='50um', total_length='6.5mm'
    )
)
`;
    });
    code += `\ngui.rebuild()\ngui.autofit()\n`;
    return code;
  };

  // Zoom/Pan helpers
  const handleZoom = (factor) => {
    setZoom(prev => Math.max(0.5, Math.min(4.0, prev * factor)));
  };

  const resetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (e.target.tagName === 'svg' || e.target.id === 'die-bg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Download code helper
  const downloadCodeFile = () => {
    const element = document.createElement("a");
    const file = new Blob([generateQiskitMetalCode()], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${name.toLowerCase().replace(/\s+/g, '_')}_qiskit.py`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Checkbox steps for fabrication recipe
  const [fabChecked, setFabChecked] = useState(Array(8).fill(false));
  const fabSteps = [
    { name: "Substrate Cleaning", desc: "Acetone/IPA rinse, oxygen plasma ash to remove organic contaminants" },
    { name: "Wafer Metallization", desc: "MBE evaporation of pure Niobium (150 nm thickness)" },
    { name: "Optical Photolithography", desc: "Spin-coat photoresist, laser projection write of resonators and outer CPW pins" },
    { name: "Reactive Ion Etching (RIE)", desc: "Chlorine/SF6 plasma dry etching of Niobium to pattern ground plane cavities" },
    { name: "E-Beam Lithography", desc: "Dual-layer PMMA resist, high-precision electron exposure of Josephson Junctions" },
    { name: "Dolan-Bridge Evaporation", desc: "In-situ oxidation of double-angle Aluminum (Al / AlOx / Al)" },
    { name: "Resist Lift-Off", desc: "Stripping in warm N-Methyl-2-pyrrolidone (NMP), followed by DI water rinse" },
    { name: "Die Dicing & Wirebonding", desc: "Protect layer spin, diamond blade dicing, packaging & NbTi wirebonding" }
  ];

  const handleFabCheck = (idx) => {
    const updated = [...fabChecked];
    updated[idx] = !updated[idx];
    setFabChecked(updated);
  };

  const activeFabSteps = fabChecked.filter(Boolean).length;
  const fabPercent = Math.round((activeFabSteps / fabSteps.length) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
      {/* ── Tabs Header ── */}
      <div style={{
        display: 'flex', borderBottom: `1px solid ${C.border}`, background: C.panelSolid,
        padding: '0 16px', alignItems: 'center', height: 48, gap: 4
      }}>
        {[
          { id: 'cad', label: '⚛️ CAD VISUALIZER' },
          { id: 'telemetry', label: '📊 COHERENCE SPECTRUM' },
          { id: 'export', label: '💾 QISKIT METAL SCRIPT' },
          { id: 'fab', label: '🛠️ FAB RECIPE' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === tab.id ? C.accent : 'transparent'}`,
              color: activeTab === tab.id ? C.white : C.muted,
              fontSize: '11px', fontWeight: 'bold', fontFamily: C.fontMono,
              cursor: 'pointer', padding: '0 16px', height: 48, transition: 'all 0.2s',
              display: 'flex', alignItems: 'center'
            }}
          >
            {tab.label}
          </button>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: C.muted, fontFamily: C.fontMono }}>CHIP:</span>
          <span style={{ fontSize: '11px', color: C.accent, fontFamily: C.fontMono, fontWeight: 'bold' }}>{name.toUpperCase()}</span>
        </div>
      </div>

      {/* ── Content View Panels ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* 1. CAD VISUALIZER TAB */}
        {activeTab === 'cad' && (
          <div 
            style={{ 
              width: '100%', 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              padding: '20px', 
              background: '#04070d',
              overflowY: 'auto'
            }}
          >
            {/* Card Container */}
            <div style={{
              background: 'rgba(8, 12, 24, 0.6)',
              border: `1px solid ${viewMode === 'fabricated' ? C.green + '22' : C.border}`,
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: viewMode === 'fabricated' ? `0 0 30px rgba(16, 185, 129, 0.03)` : 'none',
              transition: 'all 0.3s ease'
            }}>
              
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ 
                  color: C.green, 
                  fontSize: '16px', 
                  fontWeight: 'bold', 
                  fontFamily: C.fontMono,
                  letterSpacing: '0.5px'
                }}>
                  {name ? name.toUpperCase() : 'GRID ARRAY'} — {qubits.length}-TRANSMON CHIP
                </span>
                <span style={{ 
                  border: `1px solid ${C.green}55`, 
                  background: 'rgba(16, 185, 129, 0.04)', 
                  color: C.green, 
                  fontSize: '10px', 
                  fontFamily: C.fontMono, 
                  padding: '3px 9px', 
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  boxShadow: `0 0 10px ${C.accentGlow}`
                }}>
                  QISKIT METAL ({viewMode === 'fabricated' ? 'FABRICATED' : viewMode === 'physical' ? 'PHYSICAL' : 'DESIGN'})
                </span>
              </div>

              {/* Dynamic Description Box */}
              <div style={{
                background: 'rgba(16, 185, 129, 0.02)',
                borderLeft: `3px solid ${C.green}`,
                padding: '12px 16px',
                borderRadius: '0 8px 8px 0',
                color: C.text,
                fontSize: '12px',
                fontFamily: C.fontSans,
                lineHeight: '1.6'
              }}>
                Designed {qubits.length}-qubit {topology || 'grid'} chip using Qiskit Metal (TransmonPocket + RouteMeander + LaunchpadWirebond); scale ×1.00; with meander readout lines to bond pads.
              </div>

              {/* Segment Toggle Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { mode: 'qiskit', label: 'Chip Design Layout' },
                  { mode: 'physical', label: 'Physical Die' },
                  { mode: 'fabricated', label: 'Fabricated Chip' }
                ].map(opt => (
                  <button
                    key={opt.mode}
                    onClick={() => setViewMode(opt.mode)}
                    style={{
                      background: viewMode === opt.mode ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                      border: `1px solid ${viewMode === opt.mode ? C.green : C.border}`,
                      borderRadius: '6px',
                      padding: '6px 14px',
                      color: viewMode === opt.mode ? C.white : C.muted,
                      fontSize: '11px',
                      fontFamily: C.fontMono,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: viewMode === opt.mode ? `0 0 8px ${C.accentGlow}` : 'none'
                    }}
                    onMouseEnter={e => {
                      if (viewMode !== opt.mode) {
                        e.target.style.borderColor = C.accent;
                        e.target.style.color = C.white;
                      }
                    }}
                    onMouseLeave={e => {
                      if (viewMode !== opt.mode) {
                        e.target.style.borderColor = C.border;
                        e.target.style.color = C.muted;
                      }
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Main SVG Outer Canvas Frame */}
              <div 
                style={{
                  border: `1px solid ${viewMode === 'fabricated' ? C.green + '55' : C.border}`,
                  borderRadius: '10px',
                  background: '#020407',
                  position: 'relative',
                  overflow: 'hidden',
                  height: '520px',
                  boxShadow: viewMode === 'fabricated' ? 'inset 0 0 20px rgba(16, 185, 129, 0.05)' : 'none',
                  transition: 'border-color 0.3s ease'
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                {/* Toolbar overlay */}
                <div style={{
                  position: 'absolute', top: 12, left: 12, zIndex: 10,
                  background: 'rgba(5, 8, 18, 0.85)', padding: '6px 12px',
                  borderRadius: 8, border: `1px solid ${C.border}`, backdropFilter: 'blur(8px)',
                  display: 'flex', gap: 12, alignItems: 'center'
                }}>
                  <button onClick={() => handleZoom(1.2)} style={{ background: 'transparent', border: 'none', color: C.text, cursor: 'pointer', fontSize: 13 }}>➕</button>
                  <button onClick={() => handleZoom(0.8)} style={{ background: 'transparent', border: 'none', color: C.text, cursor: 'pointer', fontSize: 13 }}>➖</button>
                  <button onClick={resetView} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 11, fontFamily: C.fontMono }}>RESET VIEW</button>
                </div>

                {/* Quick stats indicator overlay */}
                <div style={{
                  position: 'absolute', top: 12, right: 12, zIndex: 10,
                  background: 'rgba(5, 8, 18, 0.85)', padding: '6px 12px',
                  borderRadius: 8, border: `1px solid ${C.border}`, backdropFilter: 'blur(8px)',
                  fontFamily: C.fontMono, fontSize: '10px', color: C.muted
                }}>
                  <span style={{ color: viewMode === 'fabricated' ? C.green : C.accent }}>
                    ● LIVE INTERACTIVE {viewMode.toUpperCase()} VIEW
                  </span>
                </div>

                {/* Hover Inspector Tooltip Overlay */}
                {hoveredElement && (
                  <div style={{
                    position: 'absolute', bottom: 16, left: 16, zIndex: 10,
                    background: 'rgba(8, 12, 26, 0.95)', padding: '14px 18px',
                    borderRadius: 8, border: `1px solid ${C.accent}`, backdropFilter: 'blur(10px)',
                    boxShadow: `0 0 16px ${C.accentGlow}`,
                    minWidth: 260, fontFamily: C.fontMono, animation: 'fadeIn 0.2s ease'
                  }}>
                    <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, paddingBottom: 6, marginBottom: 8, alignItems: 'center' }}>
                      <span style={{ color: C.accent, fontSize: '11px', fontWeight: 'bold' }}>🔬 CAD PIN INSPECTOR</span>
                      <span style={{ marginLeft: 'auto', background: C.border, padding: '1px 5px', fontSize: '9px', borderRadius: 3, color: C.white }}>
                        {hoveredElement.type.toUpperCase()}
                      </span>
                    </div>

                    {hoveredElement.type === 'qubit' && (
                      <div>
                        <div style={{ color: C.white, fontSize: 13, fontWeight: 'bold', marginBottom: 4 }}>ID: {hoveredElement.data.id}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, margin: '2px 0' }}>
                          <span>TYPE:</span><span style={{ color: C.green }}>{hoveredElement.data.type}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, margin: '2px 0' }}>
                          <span>FREQUENCY:</span><span style={{ color: C.white }}>{hoveredElement.data.frequency_ghz || 5.1} GHz</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, margin: '2px 0' }}>
                          <span>ANHARMONICITY:</span><span style={{ color: C.yellow }}>-{hoveredElement.data.EC_Mhz || 220} MHz</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, margin: '2px 0' }}>
                          <span>E_J/E_C RATIO:</span><span style={{ color: C.accent2 }}>{(hoveredElement.data.EJ_Ghz * 1000 / (hoveredElement.data.EC_Mhz || 220) || 75).toFixed(1)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, margin: '2px 0' }}>
                          <span>COHERENCE T1:</span><span style={{ color: C.accent }}>~{metrics.avgT1} μs</span>
                        </div>
                      </div>
                    )}

                    {hoveredElement.type === 'coupler' && (
                      <div>
                        <div style={{ color: C.white, fontSize: 13, fontWeight: 'bold', marginBottom: 4 }}>
                          {hoveredElement.data.from} ── {hoveredElement.data.to}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, margin: '2px 0' }}>
                          <span>COUPLING TYPE:</span><span style={{ color: C.green }}>{hoveredElement.data.type || 'capacitive'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, margin: '2px 0' }}>
                          <span>COUPLING STRENGTH:</span><span style={{ color: C.accent }}>{hoveredElement.data.strength_mhz || 12} MHz</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, margin: '2px 0' }}>
                          <span>CPW PATH LENGTH:</span><span style={{ color: C.white }}>{hoveredElement.data.length_mm || 3.1} mm</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, margin: '2px 0' }}>
                          <span>MUTUAL CAP:</span><span style={{ color: C.yellow }}>~1.95 fF</span>
                        </div>
                      </div>
                    )}

                    {hoveredElement.type === 'resonator' && (
                      <div>
                        <div style={{ color: C.white, fontSize: 13, fontWeight: 'bold', marginBottom: 4 }}>ID: {hoveredElement.data.id}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, margin: '2px 0' }}>
                          <span>QUBIT CONNECTION:</span><span style={{ color: C.green }}>{hoveredElement.data.qubit}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, margin: '2px 0' }}>
                          <span>RESONATOR FREQ:</span><span style={{ color: C.white }}>{hoveredElement.data.frequency_ghz} GHz</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, margin: '2px 0' }}>
                          <span>LOADED Q-FACTOR:</span><span style={{ color: C.yellow }}>{(hoveredElement.data.QL || 15000).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, margin: '2px 0' }}>
                          <span>MEANDER PASSES:</span><span style={{ color: C.accent2 }}>8 passes</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Canvas Main SVG Container */}
                <div 
                  style={{
                    width: '100%', height: '100%', cursor: isDragging ? 'grabbing' : 'grab',
                    overflow: 'hidden', outline: 'none'
                  }}
                  onMouseDown={handleMouseDown}
                >
                  <div style={{
                    width: '100%', height: '100%',
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.2,0.8,0.2,1)'
                  }}>
                    {viewMode === 'fabricated' ? (
                      /* ── RENDER: FABRICATED CHIP VIEW (Qiskit Metal Style) ── */
                      (() => {
                        const TC = '#34d399';   // bright mint/emerald trace
                        const TCD = '#064e3b';  // dim emerald for CPW ground edges
                        const BG = '#070f0e';   // dark forest slate background
                        const QW = 70, QH = 70; // TransmonPocket outer boundary
                        const IW = 52, IH = 36; // inner metal island
                        const cpW = 32, cpH = 10; // coupling pad size
                        // Chip center for launchpad placement
                        const qxs = qubits.map(q => q.x);
                        const qys = qubits.map(q => q.y);
                        const qCx = qubits.length ? (Math.min(...qxs) + Math.max(...qxs)) / 2 : width / 2;
                        const qCy = qubits.length ? (Math.min(...qys) + Math.max(...qys)) / 2 : height / 2;
                        // Top/bottom launchpads feed from chip center-x
                        const topLP = { x: qCx, y: 52 };
                        const botLP = { x: qCx, y: height - 52 };
                        // Qubit groups for top/bottom resonator routing
                        const topQubits = [...qubits].sort((a, b) => a.y - b.y).slice(0, Math.ceil(qubits.length / 2));
                        const botQubits = [...qubits].sort((a, b) => b.y - a.y).slice(0, Math.floor(qubits.length / 2));

                        // Helper: render a CPW trace (ground plane + center conductor)
                        const CPWPath = ({ d, hovered, id }) => (
                          <g>
                            <path d={d} fill="none" stroke="transparent" strokeWidth={20} />
                            {/* Outer ground clearance */}
                            <path d={d} fill="none" stroke={BG} strokeWidth={14} strokeLinecap="square" strokeLinejoin="miter" />
                            {/* Ground plane edges */}
                            <path d={d} fill="none" stroke={hovered ? TC : TCD} strokeWidth={10} strokeLinecap="square" strokeLinejoin="miter" />
                            {/* Inner gap (substrate) */}
                            <path d={d} fill="none" stroke={BG} strokeWidth={6} strokeLinecap="square" strokeLinejoin="miter" />
                            {/* Center conductor */}
                            <path d={d} fill="none" stroke={hovered ? TC : TC} strokeWidth={1.8} strokeLinecap="square" strokeLinejoin="miter"
                              style={{ filter: `drop-shadow(0 0 3px ${TC})` }} />
                          </g>
                        );

                        // Helper: meandering CPW resonator
                        const MeanderRes = ({ startX, startY, endX, endY, mWidth, passes, hovered }) => {
                          const totalH = Math.abs(endY - startY);
                          const goDown = endY > startY;
                          const stepH = totalH / (passes + 1);
                          const halfW = mWidth / 2;
                          let d = `M ${startX} ${startY}`;
                          d += ` L ${startX} ${startY + (goDown ? stepH * 0.4 : -stepH * 0.4)}`;
                          for (let i = 0; i < passes; i++) {
                            const y = startY + (goDown ? 1 : -1) * stepH * (i + 0.4);
                            const nextY = startY + (goDown ? 1 : -1) * stepH * (i + 1.4);
                            const goRight = i % 2 === 0;
                            d += ` L ${goRight ? startX + halfW : startX - halfW} ${y}`;
                            d += ` L ${goRight ? startX + halfW : startX - halfW} ${nextY}`;
                          }
                          const lastX = passes % 2 === 0 ? startX : (passes % 2 === 1 ? startX - halfW : startX + halfW);
                          d += ` L ${startX} ${endY}`;
                          return <CPWPath d={d} hovered={hovered} />;
                        };

                        return (
                          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', display: 'block' }}>
                            <defs>
                              <filter id="qmGlow" x="-30%" y="-30%" width="160%" height="160%">
                                <feGaussianBlur stdDeviation="2.5" result="blur" />
                                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                              </filter>
                              <filter id="qmGlowSoft">
                                <feGaussianBlur stdDeviation="1.2" result="blur" />
                                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                              </filter>
                            </defs>

                            {/* ── Background ── */}
                            <rect width={width} height={height} fill={BG} />
                            {/* Chip boundary */}
                            <rect x={22} y={22} width={width - 44} height={height - 44} fill="#050c18" stroke="#0e2a45" strokeWidth="1.5" rx="5" />
                            <rect x={30} y={30} width={width - 60} height={height - 60} fill="none" stroke="#081c30" strokeWidth="0.8" rx="4" strokeDasharray="5 4" />

                            {/* ── Title ── */}
                            <text x={width / 2} y={48} textAnchor="middle" fill="#1a4870" fontSize="10.5"
                              fontFamily={C.fontMono} letterSpacing="2.5">
                              Fabricated Superconducting Chip (Qiskit Metal)
                            </text>

                            {/* ── CPW Bus Couplers (Qiskit Metal RouteMeander style) ── */}
                            {couplers.map((c, idx) => {
                              const a = qubitMap[c.from], b = qubitMap[c.to];
                              if (!a || !b) return null;
                              const isH = Math.abs(a.x - b.x) > Math.abs(a.y - b.y);
                              const isHov = hoveredElement && hoveredElement.type === 'coupler' && hoveredElement.data.from === c.from && hoveredElement.data.to === c.to;
                              let route;
                              if (isH) {
                                // Horizontal bus: go from a to midpoint with meander, then to b
                                const midX = (a.x + b.x) / 2;
                                const mW = Math.abs(b.x - a.x) * 0.28;
                                const mH = 22;
                                const p = 5;
                                const mxS = midX - mW / 2;
                                let d = `M ${a.x} ${a.y} L ${mxS} ${a.y}`;
                                d += ` ${hMeander(mxS, a.y - mH / 2, mW, mH, p).substring(1)}`;
                                const lastX = ((p - 1) % 2 === 0) ? mxS + mW : mxS;
                                d += ` L ${lastX} ${b.y} L ${b.x} ${b.y}`;
                                route = d;
                              } else {
                                // Vertical bus: L-route with meander at elbow
                                const midY = (a.y + b.y) / 2;
                                const mH = Math.abs(b.y - a.y) * 0.28;
                                const mW2 = 22;
                                const p = 5;
                                const myS = midY - mH / 2;
                                let d = `M ${a.x} ${a.y} L ${a.x} ${myS}`;
                                d += ` ${vMeander(a.x - mW2 / 2, myS, mW2, mH, p).substring(1)}`;
                                const lastY = ((p - 1) % 2 === 0) ? myS + mH : myS;
                                d += ` L ${b.x} ${lastY} L ${b.x} ${b.y}`;
                                route = d;
                              }
                              return (
                                <g key={`qm-bus-${idx}`} style={{ cursor: 'pointer' }}
                                  onMouseEnter={() => setHoveredElement({ type: 'coupler', data: c })}
                                  onMouseLeave={() => setHoveredElement(null)}>
                                  <CPWPath d={route} hovered={isHov} />
                                </g>
                              );
                            })}

                            {/* ── Readout Resonators (RouteMeander to launchpads) ── */}
                            {qubits.map((q, idx) => {
                              const res = resonators.find(r => r.qubit === q.id) || { id: `R${idx}`, qubit: q.id };
                              const isHov = hoveredElement && hoveredElement.type === 'resonator' && hoveredElement.data.qubit === q.id;
                              // Alternate: even qubits go to top, odd go to bottom
                              const isTopRes = idx % 2 === 0;
                              const targetY = isTopRes ? topLP.y + 18 : botLP.y - 18;
                              const startY = isTopRes ? q.y - QH / 2 - 5 : q.y + QH / 2 + 5;
                              const mW = 38;
                              const passes = 5;
                              const totalH = Math.abs(targetY - startY);
                              const goDown = targetY > startY;
                              const stepH = totalH / (passes + 1);
                              let d = `M ${q.x} ${startY}`;
                              for (let i = 0; i < passes; i++) {
                                const y1 = startY + (goDown ? 1 : -1) * stepH * (i + 0.5);
                                const y2 = startY + (goDown ? 1 : -1) * stepH * (i + 1.0);
                                const goRight = i % 2 === 0;
                                d += ` L ${goRight ? q.x + mW : q.x - mW} ${y1}`;
                                d += ` L ${goRight ? q.x + mW : q.x - mW} ${y2}`;
                              }
                              d += ` L ${q.x} ${targetY}`;
                              return (
                                <g key={`qm-res-${idx}`} style={{ cursor: 'pointer' }}
                                  onMouseEnter={() => setHoveredElement({ type: 'resonator', data: res })}
                                  onMouseLeave={() => setHoveredElement(null)}>
                                  <CPWPath d={d} hovered={isHov} />
                                </g>
                              );
                            })}

                            {/* ── Left Readout Lines (to left bond pads) ── */}
                            {sortedQ.map((q, idx) => {
                              if (idx >= leftPads.length) return null;
                              const pad = leftPads[idx];
                              const res = resonators.find(r => r.qubit === q.id) || { id: `R${q.id}`, qubit: q.id };
                              const isHov = hoveredElement && hoveredElement.type === 'resonator' && hoveredElement.data.qubit === q.id;
                              const d = leftResPath(pad, q);
                              return (
                                <g key={`qm-lres-${idx}`} style={{ cursor: 'pointer' }}
                                  onMouseEnter={() => setHoveredElement({ type: 'resonator', data: res })}
                                  onMouseLeave={() => setHoveredElement(null)}>
                                  <CPWPath d={d} hovered={isHov} />
                                </g>
                              );
                            })}

                            {/* ── Right Drive Lines (to right bond pads) ── */}
                            {sortedQ.map((q, idx) => {
                              if (idx >= rightPads.length) return null;
                              const pad = rightPads[idx];
                              const isHov = hoveredElement && hoveredElement.type === 'qubit' && hoveredElement.data.id === q.id;
                              const d = rightDrivePath(q, pad);
                              return (
                                <g key={`qm-rdrv-${idx}`} style={{ cursor: 'pointer' }}
                                  onMouseEnter={() => setHoveredElement({ type: 'qubit', data: q })}
                                  onMouseLeave={() => setHoveredElement(null)}>
                                  <CPWPath d={d} hovered={isHov} />
                                </g>
                              );
                            })}

                            {/* ── Top LaunchpadWirebond (pointing UP) ── */}
                            <g>
                              <line x1={topLP.x} y1={22} x2={topLP.x} y2={topLP.y - 8} stroke={TCD} strokeWidth="1.8" />
                              {/* Outer dashed boundary */}
                              <polygon points={`${topLP.x - 16},${topLP.y + 14} ${topLP.x + 16},${topLP.y + 14} ${topLP.x + 16},${topLP.y + 2} ${topLP.x},${topLP.y - 14} ${topLP.x - 16},${topLP.y + 2}`}
                                fill="none" stroke={TCD} strokeWidth="1.2" strokeDasharray="3 2.5" />
                              {/* Inner metal body */}
                              <polygon points={`${topLP.x - 11},${topLP.y + 10} ${topLP.x + 11},${topLP.y + 10} ${topLP.x + 11},${topLP.y + 2} ${topLP.x},${topLP.y - 10} ${topLP.x - 11},${topLP.y + 2}`}
                                fill="#050c18" stroke={TC} strokeWidth="1.3" style={{ filter: `drop-shadow(0 0 3px ${TC})` }} />
                              {/* Wirebond dot */}
                              <circle cx={topLP.x} cy={topLP.y + 7} r="2.5" fill={TC} style={{ filter: `drop-shadow(0 0 4px ${TC})` }} />
                            </g>

                            {/* ── Bottom LaunchpadWirebond (pointing DOWN) ── */}
                            <g>
                              <line x1={botLP.x} y1={botLP.y + 8} x2={botLP.x} y2={height - 22} stroke={TCD} strokeWidth="1.8" />
                              <polygon points={`${botLP.x - 16},${botLP.y - 14} ${botLP.x + 16},${botLP.y - 14} ${botLP.x + 16},${botLP.y - 2} ${botLP.x},${botLP.y + 14} ${botLP.x - 16},${botLP.y - 2}`}
                                fill="none" stroke={TCD} strokeWidth="1.2" strokeDasharray="3 2.5" />
                              <polygon points={`${botLP.x - 11},${botLP.y - 10} ${botLP.x + 11},${botLP.y - 10} ${botLP.x + 11},${botLP.y - 2} ${botLP.x},${botLP.y + 10} ${botLP.x - 11},${botLP.y - 2}`}
                                fill="#050c18" stroke={TC} strokeWidth="1.3" style={{ filter: `drop-shadow(0 0 3px ${TC})` }} />
                              <circle cx={botLP.x} cy={botLP.y - 7} r="2.5" fill={TC} style={{ filter: `drop-shadow(0 0 4px ${TC})` }} />
                            </g>

                            {/* ── Left LaunchpadWirebonds (pointing LEFT) ── */}
                            {leftPads.map((pad, idx) => (
                              <g key={`qm-lp-l-${idx}`}>
                                <line x1={22} y1={pad.y} x2={pad.x - 8} y2={pad.y} stroke={TCD} strokeWidth="1.8" />
                                <polygon points={`${pad.x + 14},${pad.y - 16} ${pad.x + 14},${pad.y + 16} ${pad.x + 2},${pad.y + 16} ${pad.x - 14},${pad.y} ${pad.x + 2},${pad.y - 16}`}
                                  fill="none" stroke={TCD} strokeWidth="1.2" strokeDasharray="3 2.5" />
                                <polygon points={`${pad.x + 10},${pad.y - 11} ${pad.x + 10},${pad.y + 11} ${pad.x + 2},${pad.y + 11} ${pad.x - 10},${pad.y} ${pad.x + 2},${pad.y - 11}`}
                                  fill="#050c18" stroke={TC} strokeWidth="1.3" style={{ filter: `drop-shadow(0 0 3px ${TC})` }} />
                                <circle cx={pad.x + 6} cy={pad.y} r="2.5" fill={TC} style={{ filter: `drop-shadow(0 0 4px ${TC})` }} />
                              </g>
                            ))}

                            {/* ── Right LaunchpadWirebonds (pointing RIGHT) ── */}
                            {rightPads.map((pad, idx) => (
                              <g key={`qm-lp-r-${idx}`}>
                                <line x1={pad.x + 8} y1={pad.y} x2={width - 22} y2={pad.y} stroke={TCD} strokeWidth="1.8" />
                                <polygon points={`${pad.x - 14},${pad.y - 16} ${pad.x - 14},${pad.y + 16} ${pad.x - 2},${pad.y + 16} ${pad.x + 14},${pad.y} ${pad.x - 2},${pad.y - 16}`}
                                  fill="none" stroke={TCD} strokeWidth="1.2" strokeDasharray="3 2.5" />
                                <polygon points={`${pad.x - 10},${pad.y - 11} ${pad.x - 10},${pad.y + 11} ${pad.x - 2},${pad.y + 11} ${pad.x + 10},${pad.y} ${pad.x - 2},${pad.y - 11}`}
                                  fill="#050c18" stroke={TC} strokeWidth="1.3" style={{ filter: `drop-shadow(0 0 3px ${TC})` }} />
                                <circle cx={pad.x - 6} cy={pad.y} r="2.5" fill={TC} style={{ filter: `drop-shadow(0 0 4px ${TC})` }} />
                              </g>
                            ))}

                            {/* ── TransmonPocket Qubits (Qiskit Metal style) ── */}
                            {qubits.map(q => {
                              const isHov = hoveredElement && hoveredElement.type === 'qubit' && hoveredElement.data.id === q.id;
                              const col = isHov ? C.accent2 : TC;
                              const dim = isHov ? TC : TCD;
                              return (
                                <g key={`qm-q-${q.id}`} style={{ cursor: 'pointer' }}
                                  onMouseEnter={() => setHoveredElement({ type: 'qubit', data: q })}
                                  onMouseLeave={() => setHoveredElement(null)}>
                                  {/* Outer pocket boundary (dashed) */}
                                  <rect x={q.x - QW / 2} y={q.y - QH / 2} width={QW} height={QH}
                                    fill="none" stroke={dim} strokeWidth="0.9" strokeDasharray="3 2.5" rx="3" />
                                  {/* Inner metal island */}
                                  <rect x={q.x - IW / 2} y={q.y - IH / 2} width={IW} height={IH}
                                    fill="#050c18" stroke={col} strokeWidth="1.4" rx="2"
                                    style={{ filter: isHov ? `drop-shadow(0 0 5px ${col})` : `drop-shadow(0 0 2px ${col})` }} />
                                  {/* Top coupling pad */}
                                  <rect x={q.x - cpW / 2} y={q.y - IH / 2 - cpH} width={cpW} height={cpH}
                                    fill="#050c18" stroke={col} strokeWidth="1.1" rx="1"
                                    style={{ filter: `drop-shadow(0 0 2px ${col})` }} />
                                  {/* Bottom coupling pad */}
                                  <rect x={q.x - cpW / 2} y={q.y + IH / 2} width={cpW} height={cpH}
                                    fill="#050c18" stroke={col} strokeWidth="1.1" rx="1"
                                    style={{ filter: `drop-shadow(0 0 2px ${col})` }} />
                                  {/* Internal grid lines (metal layer texture) */}
                                  <line x1={q.x - IW / 2 + 8} y1={q.y} x2={q.x + IW / 2 - 8} y2={q.y} stroke={dim} strokeWidth="0.7" />
                                  <line x1={q.x} y1={q.y - IH / 2 + 6} x2={q.x} y2={q.y + IH / 2 - 6} stroke={dim} strokeWidth="0.7" />
                                  {/* Josephson junction cross */}
                                  <rect x={q.x - 5} y={q.y - 5} width={10} height={10}
                                    fill="none" stroke={col} strokeWidth="1"
                                    transform={`rotate(45 ${q.x} ${q.y})`}
                                    style={{ filter: `drop-shadow(0 0 3px ${col})` }} />
                                  <circle cx={q.x} cy={q.y} r="1.8" fill={col}
                                    style={{ filter: `drop-shadow(0 0 4px ${col})` }} />
                                  {/* Qubit label */}
                                  <text x={q.x} y={q.y - QH / 2 - 7} textAnchor="middle"
                                    fill={isHov ? col : '#1a4870'} fontSize="9.5" fontFamily={C.fontMono} fontWeight="bold">
                                    {q.id}
                                  </text>
                                </g>
                              );
                            })}
                          </svg>
                        );
                      })()
                    ) : viewMode === 'physical' ? (
                      /* ── RENDER: PHYSICAL DIE LAYOUT ── */
                      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', display: 'block' }}>
                        <defs>
                          <filter id="substrateNoise" x="0" y="0" width="100%" height="100%">
                            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="12" result="noise"/>
                            <feColorMatrix type="saturate" values="0" in="noise" result="mono"/>
                            <feBlend in="SourceGraphic" in2="mono" mode="multiply"/>
                          </filter>
                          <radialGradient id="metallicPad" cx="40%" cy="40%" r="60%">
                            <stop offset="0%" stopColor="#ffffff" />
                            <stop offset="30%" stopColor="#cccccc" />
                            <stop offset="70%" stopColor="#888888" />
                            <stop offset="100%" stopColor="#444444" />
                          </radialGradient>
                          <filter id="accentTraceGlow">
                            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                            <feMerge>
                              <feMergeNode in="coloredBlur"/>
                              <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                          </filter>
                        </defs>

                        {/* Ground Plane Die (Dark Deep Blue substrate) */}
                        <rect id="die-bg" width={width} height={height} fill="#0d1424" rx="12" />
                        <rect width={width} height={height} fill="#0b111d" rx="12" filter="url(#substrateNoise)" opacity="0.4" />

                        {/* Wafer boundaries and grid marks */}
                        <rect x="8" y="8" width={width-16} height={height-16} fill="none" stroke="#162238" strokeWidth="2" rx="10" />
                        <rect x="18" y="18" width={width-36} height={height-36} fill="none" stroke="#162238" strokeWidth="0.8" rx="8" strokeDasharray="3 4" />

                        {/* CPW Meandered Buses (Inter-qubit couplers) */}
                        {couplers.map((c, idx) => {
                          const a = qubitMap[c.from], b = qubitMap[c.to];
                          if (!a || !b) return null;
                          const mx = (a.x + b.x) / 2;
                          const isH = Math.abs(a.x - b.x) > Math.abs(a.y - b.y);
                          let route;
                          if (isH && Math.abs(a.y - b.y) < 10) {
                            const midX = (a.x + b.x) / 2;
                            const mW2 = Math.min(40, Math.abs(b.x - a.x) * 0.25);
                            const mH2 = 14;
                            const p = 4;
                            let d = `M ${a.x} ${a.y} L ${midX - mW2/2} ${a.y}`;
                            d += ` ${hMeander(midX - mW2/2, a.y - mH2/2, mW2, mH2, p).substring(1)}`;
                            const lastX2 = ((p-1) % 2 === 0) ? midX + mW2/2 : midX - mW2/2;
                            d += ` L ${lastX2} ${b.y} L ${b.x} ${b.y}`;
                            route = d;
                          } else {
                            route = `M ${a.x} ${a.y} L ${mx} ${a.y} L ${mx} ${b.y} L ${b.x} ${b.y}`;
                          }

                          const isHovered = hoveredElement && hoveredElement.type === 'coupler' && hoveredElement.data.from === c.from && hoveredElement.data.to === c.to;

                          return (
                            <g 
                              key={`bus-${idx}`} 
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={() => setHoveredElement({ type: 'coupler', data: c })}
                              onMouseLeave={() => setHoveredElement(null)}
                            >
                              <path d={route} fill="none" stroke="transparent" strokeWidth="18" />
                              <path d={route} fill="none" stroke="#05080f" strokeWidth="9" strokeLinecap="square" strokeLinejoin="miter" />
                              <path 
                                d={route} 
                                fill="none" 
                                stroke={isHovered ? C.accent : "#5e779a"} 
                                strokeWidth="2.5" 
                                strokeLinecap="square" 
                                strokeLinejoin="miter" 
                                filter={isHovered ? "url(#accentTraceGlow)" : ""}
                                style={{ transition: 'stroke 0.2s' }}
                              />
                            </g>
                          );
                        })}

                        {/* Left Readout Resonators */}
                        {sortedQ.map((q, idx) => {
                          if (idx >= leftPads.length) return null;
                          const pad = leftPads[idx];
                          const d = leftResPath(pad, q);
                          const res = resonators.find(r => r.qubit === q.id) || { id: `R${q.id}`, qubit: q.id, frequency_ghz: 6.8 };
                          const isHovered = hoveredElement && hoveredElement.type === 'resonator' && hoveredElement.data.qubit === q.id;

                          return (
                            <g 
                              key={`lres-${idx}`} 
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={() => setHoveredElement({ type: 'resonator', data: res })}
                              onMouseLeave={() => setHoveredElement(null)}
                            >
                              <path d={d} fill="none" stroke="transparent" strokeWidth="18" />
                              <path d={d} fill="none" stroke="#05080f" strokeWidth="9" strokeLinecap="square" />
                              <path 
                                d={d} 
                                fill="none" 
                                stroke={isHovered ? C.green : "#4f729a"} 
                                strokeWidth="2.2" 
                                strokeLinecap="square" 
                                filter={isHovered ? "url(#accentTraceGlow)" : ""}
                                style={{ transition: 'stroke 0.2s' }}
                              />
                            </g>
                          );
                        })}

                        {/* Right Drive Lines */}
                        {sortedQ.map((q, idx) => {
                          if (idx >= rightPads.length) return null;
                          const pad = rightPads[idx];
                          const d = rightDrivePath(q, pad);
                          const isHovered = hoveredElement && hoveredElement.type === 'qubit' && hoveredElement.data.id === q.id;

                          return (
                            <g 
                              key={`rdrv-${idx}`}
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={() => setHoveredElement({ type: 'qubit', data: q })}
                              onMouseLeave={() => setHoveredElement(null)}
                            >
                              <path d={d} fill="none" stroke="transparent" strokeWidth="16" />
                              <path d={d} fill="none" stroke="#05080f" strokeWidth="9" strokeLinecap="square" />
                              <path 
                                d={d} 
                                fill="none" 
                                stroke={isHovered ? C.accent2 : "#566b88"} 
                                strokeWidth="2.2" 
                                strokeLinecap="square"
                                filter={isHovered ? "url(#accentTraceGlow)" : ""}
                                style={{ transition: 'stroke 0.2s' }}
                              />
                            </g>
                          );
                        })}

                        {/* Outer Bond Pads (Chrome micro-structured) */}
                        {[...leftPads, ...rightPads].map((pad, idx) => {
                          const isLeft = idx < leftPads.length;
                          const stubX = isLeft ? 0 : width;
                          return (
                            <g key={`bp-${idx}`}>
                              <line x1={pad.x + (isLeft ? -padR : padR)} y1={pad.y} x2={stubX} y2={pad.y} stroke="#3b526d" strokeWidth="2.5" />
                              <circle cx={pad.x} cy={pad.y} r={padR} fill="url(#metallicPad)" stroke="#090d16" strokeWidth="1.5" />
                              <circle cx={pad.x} cy={pad.y} r={innerR} fill="#0d1424" />
                              <circle cx={pad.x} cy={pad.y} r={4.5} fill="#5e779a" stroke="#253549" strokeWidth="0.5" />
                            </g>
                          );
                        })}

                        {/* Transmon Qubit Pockets (Physical layout) */}
                        {qubits.map(q => {
                          const isHovered = hoveredElement && hoveredElement.type === 'qubit' && hoveredElement.data.id === q.id;
                          const pw = 56, ph = 56;
                          const capW = 40, capH = 11;
                          return (
                            <g 
                              key={`tp-${q.id}`} 
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={() => setHoveredElement({ type: 'qubit', data: q })}
                              onMouseLeave={() => setHoveredElement(null)}
                            >
                              {isHovered && (
                                <rect 
                                  x={q.x - pw/2 - 6} y={q.y - ph/2 - 6} width={pw + 12} height={ph + 12} 
                                  fill="none" stroke={C.accent} strokeWidth="2.5" rx="6" opacity="0.6"
                                  style={{ filter: "drop-shadow(0px 0px 8px ${C.accentGlow})" }}
                                />
                              )}
                              <rect x={q.x - pw/2} y={q.y - ph/2} width={pw} height={ph} fill="#070c17" stroke="#1c2b4a" strokeWidth="1.8" rx="4" />
                              <rect x={q.x - capW/2} y={q.y - ph/2 + 6} width={capW} height={capH} fill="#b49382" stroke="#4a3b34" strokeWidth="1" rx="2" />
                              <rect x={q.x - capW/2} y={q.y + ph/2 - 6 - capH} width={capW} height={capH} fill="#b49382" stroke="#4a3b34" strokeWidth="1" rx="2" />
                              <line x1={q.x - 5} y1={q.y} x2={q.x + 5} y2={q.y} stroke={C.accent} strokeWidth="1" />
                              <line x1={q.x} y1={q.y - 5} x2={q.x} y2={q.y + 5} stroke={C.accent} strokeWidth="1" />
                              <circle cx={q.x} cy={q.y} r={2.5} fill="#f1f5f9" stroke={C.accent} strokeWidth="0.8" />
                              <text x={q.x} y={q.y - 12} textAnchor="middle" fill="#566885" fontSize="8" fontFamily={C.fontMono}>{q.id}</text>
                            </g>
                          );
                        })}
                      </svg>
                    ) : (
                      /* ── RENDER: QISKIT METAL CAD SCHEMATIC ── */
                      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', display: 'block', background: '#0e111b' }}>
                        <defs>
                          <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#161c2a" strokeWidth="0.8"/>
                          </pattern>
                        </defs>

                        {/* Grid background */}
                        <rect width={width} height={height} fill="url(#gridPattern)"/>

                        {/* Axis Ticks */}
                        <line x1="50" y1={height - 40} x2={width - 20} y2={height - 40} stroke="#28324b" strokeWidth="1.2"/>
                        <line x1="50" y1="20" x2="50" y2={height - 40} stroke="#28324b" strokeWidth="1.2"/>

                        {/* Connection Buses */}
                        {couplers.map((c, idx) => {
                          const a = qubitMap[c.from], b = qubitMap[c.to];
                          if (!a || !b) return null;
                          const mx = (a.x + b.x) / 2;
                          const route = `M ${a.x} ${a.y} L ${mx} ${a.y} L ${mx} ${b.y} L ${b.x} ${b.y}`;
                          const isHovered = hoveredElement && hoveredElement.type === 'coupler' && hoveredElement.data.from === c.from && hoveredElement.data.to === c.to;

                          return (
                            <g 
                              key={`qm-bus-${idx}`}
                              onMouseEnter={() => setHoveredElement({ type: 'coupler', data: c })}
                              onMouseLeave={() => setHoveredElement(null)}
                              style={{ cursor: 'pointer' }}
                            >
                              <path d={route} fill="none" stroke="transparent" strokeWidth="12" />
                              <path 
                                d={route} 
                                fill="none" 
                                stroke={isHovered ? C.accent : "#3d4b68"} 
                                strokeWidth={isHovered ? "2.5" : "1.8"} 
                                strokeLinecap="square"
                                strokeLinejoin="miter"
                                style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
                              />
                            </g>
                          );
                        })}

                        {/* Left Resonators */}
                        {sortedQ.map((q, idx) => {
                          if (idx >= leftPads.length) return null;
                          const pad = leftPads[idx];
                          const d = leftResPath(pad, q);
                          const res = resonators.find(r => r.qubit === q.id) || { id: `R${q.id}`, qubit: q.id, frequency_ghz: 6.8 };
                          const isHovered = hoveredElement && hoveredElement.type === 'resonator' && hoveredElement.data.qubit === q.id;

                          return (
                            <g 
                              key={`qm-res-${idx}`}
                              onMouseEnter={() => setHoveredElement({ type: 'resonator', data: res })}
                              onMouseLeave={() => setHoveredElement(null)}
                              style={{ cursor: 'pointer' }}
                            >
                              <path d={d} fill="none" stroke="transparent" strokeWidth="12" />
                              <path 
                                d={d} 
                                fill="none" 
                                stroke={isHovered ? C.green : "#354460"} 
                                strokeWidth={isHovered ? "2.2" : "1.5"} 
                                strokeLinecap="square"
                                style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
                              />
                            </g>
                          );
                        })}

                        {/* Right Drive Lines */}
                        {sortedQ.map((q, idx) => {
                          if (idx >= rightPads.length) return null;
                          const pad = rightPads[idx];
                          const d = rightDrivePath(q, pad);
                          const isHovered = hoveredElement && hoveredElement.type === 'qubit' && hoveredElement.data.id === q.id;

                          return (
                            <g 
                              key={`qm-drv-${idx}`}
                              onMouseEnter={() => setHoveredElement({ type: 'qubit', data: q })}
                              onMouseLeave={() => setHoveredElement(null)}
                              style={{ cursor: 'pointer' }}
                            >
                              <path d={d} fill="none" stroke="transparent" strokeWidth="12" />
                              <path 
                                d={d} 
                                fill="none" 
                                stroke={isHovered ? C.accent2 : "#354460"} 
                                strokeWidth={isHovered ? "2.2" : "1.5"} 
                                strokeLinecap="square"
                                style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
                              />
                            </g>
                          );
                        })}

                        {/* Qubits as Cad blocks */}
                        {qubits.map(q => {
                          const isHovered = hoveredElement && hoveredElement.type === 'qubit' && hoveredElement.data.id === q.id;
                          const qw = 46, qh = 46;
                          return (
                            <g 
                              key={`qm-q-${q.id}`}
                              onMouseEnter={() => setHoveredElement({ type: 'qubit', data: q })}
                              onMouseLeave={() => setHoveredElement(null)}
                              style={{ cursor: 'pointer' }}
                            >
                              {/* CAD Boundary Box */}
                              <rect 
                                x={q.x - qw/2} y={q.y - qh/2} width={qw} height={qh} 
                                fill={isHovered ? "rgba(16, 185, 129, 0.08)" : "#131828"} 
                                stroke={isHovered ? C.accent : "#2f3c58"} 
                                strokeWidth="1.5" 
                                rx="2"
                                style={{ transition: 'all 0.2s' }}
                              />

                              {/* Capacitor blocks inside */}
                              <rect x={q.x - 16} y={q.y - 15} width={32} height={10} fill="#2f3b58" rx="1"/>
                              <rect x={q.x - 16} y={q.y + 5} width={32} height={10} fill="#2f3b58" rx="1"/>
                              <circle cx={q.x} cy={q.y} r={3} fill="#ff0054" />

                              {/* Pins connector nodes */}
                              <circle cx={q.x - qw/2} cy={q.y} r="2" fill="#566885" />
                              <circle cx={q.x + qw/2} cy={q.y} r="2" fill="#566885" />
                              <circle cx={q.x} cy={q.y - qh/2} r="2" fill="#566885" />
                              <circle cx={q.x} cy={q.y + qh/2} r="2" fill="#566885" />

                              {/* Text ID */}
                              <text x={q.x} y={q.y - 18} textAnchor="middle" fill={isHovered ? C.white : C.muted} fontSize="10" fontFamily={C.fontMono}>{q.id}</text>
                            </g>
                          );
                        })}

                        {/* Qiskit watermark */}
                        <text x={width - 25} y={height - 20} textAnchor="end" fill="#202c46" fontSize="14" fontFamily={C.fontMono} fontWeight="bold">
                          QISKIT METAL PLANAR MODEL
                        </text>
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. TELEMETRY COHERENCE TAB */}
        {activeTab === 'telemetry' && (
          <div style={{ padding: '24px', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ color: C.white, fontSize: '15px', fontWeight: 'bold', fontFamily: C.fontSans, letterSpacing: 0.5 }}>
              ⚡ METRIC ESTIMATION DASHBOARD (LIVE CALCULATIONS)
            </div>

            {/* Metric row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              
              {/* T1 Gauge */}
              <div style={{
                background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12
              }}>
                <div style={{ fontSize: '11px', color: C.accent, fontFamily: C.fontMono, fontWeight: 'bold' }}>T1 RELAXATION TIME</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 36, fontWeight: 'bold', color: C.white, fontFamily: C.fontMono }}>{metrics.avgT1}</span>
                  <span style={{ fontSize: 13, color: C.muted }}>μs</span>
                </div>
                {/* SVG Mini Bar Gauge */}
                <div style={{ width: '100%', height: 6, background: '#101625', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (metrics.avgT1 / 180) * 100)}%`, height: '100%', background: C.accent }} />
                </div>
                <div style={{ fontSize: '9px', color: C.muted, textAlign: 'center' }}>Target limit: 180 μs on {substrate.replace('_', ' ')}</div>
              </div>

              {/* T2 Gauge */}
              <div style={{
                background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12
              }}>
                <div style={{ fontSize: '11px', color: C.green, fontFamily: C.fontMono, fontWeight: 'bold' }}>T2 DECOHERENCE (ECHO)</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 36, fontWeight: 'bold', color: C.white, fontFamily: C.fontMono }}>{metrics.avgT2}</span>
                  <span style={{ fontSize: 13, color: C.muted }}>μs</span>
                </div>
                <div style={{ width: '100%', height: 6, background: '#101625', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (metrics.avgT2 / 280) * 100)}%`, height: '100%', background: C.green }} />
                </div>
                <div style={{ fontSize: '9px', color: C.muted, textAlign: 'center' }}>Optimized Hahn Echo estimated duration</div>
              </div>

              {/* 1Q Fidelity Gauge */}
              <div style={{
                background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12
              }}>
                <div style={{ fontSize: '11px', color: C.yellow, fontFamily: C.fontMono, fontWeight: 'bold' }}>AVG 1-QUBIT GATE FIDELITY</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                  <span style={{ fontSize: 32, fontWeight: 'bold', color: C.white, fontFamily: C.fontMono }}>{metrics.singleQGateFidelity.toFixed(3)}</span>
                  <span style={{ fontSize: 14, color: C.muted }}>%</span>
                </div>
                <div style={{ width: '100%', height: 6, background: '#101625', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${(metrics.singleQGateFidelity - 99) * 100}%`, height: '100%', background: C.yellow }} />
                </div>
                <div style={{ fontSize: '9px', color: C.muted, textAlign: 'center' }}>Error rate per single-pulse gate: {(100 - metrics.singleQGateFidelity).toFixed(4)}%</div>
              </div>

              {/* 2Q Fidelity Gauge */}
              <div style={{
                background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12
              }}>
                <div style={{ fontSize: '11px', color: C.accent2, fontFamily: C.fontMono, fontWeight: 'bold' }}>AVG 2-QUBIT CZ FIDELITY</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                  <span style={{ fontSize: 32, fontWeight: 'bold', color: C.white, fontFamily: C.fontMono }}>{metrics.twoQGateFidelity.toFixed(3)}</span>
                  <span style={{ fontSize: 14, color: C.muted }}>%</span>
                </div>
                <div style={{ width: '100%', height: 6, background: '#101625', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${(metrics.twoQGateFidelity - 98) * 50}%`, height: '100%', background: C.accent2 }} />
                </div>
                <div style={{ fontSize: '9px', color: C.muted, textAlign: 'center' }}>Cross-coupling bus crosstalk included</div>
              </div>

            </div>

            {/* Qubit Frequencies & Anharmonicity spectra list */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1, minHeight: 220 }}>
              
              {/* Active Chip Details */}
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '12px', color: C.white, fontFamily: C.fontMono, fontWeight: 'bold', borderBottom: `1px solid ${C.border}`, paddingBottom: 8, marginBottom: 12 }}>
                  🔧 PHYSICAL CHARACTERISTICS LIST
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, justifyContent: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: C.muted }}>Substrate Material:</span>
                    <span style={{ color: C.white, fontWeight: 'bold' }}>{substrate === 'sapphire_ultra' ? 'High-Purity Oxide-Free Sapphire' : substrate === 'sapphire' ? 'Standard Sapphire Al2O3' : 'Silicon (100) High-Resistivity'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: C.muted }}>Operating Temperature:</span>
                    <span style={{ color: C.red, fontWeight: 'bold' }}>{baseTemp} mK</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: C.muted }}>Josephson Junction Quality Factor:</span>
                    <span style={{ color: C.yellow, fontWeight: 'bold' }}>{junctionQuality}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: C.muted }}>Chip Base Thermal Load:</span>
                    <span style={{ color: C.green, fontWeight: 'bold' }}>{metrics.thermalPower} μW</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: C.muted }}>Number of Resonator buses:</span>
                    <span style={{ color: C.accent, fontWeight: 'bold' }}>{resonators.length} active CPWs</span>
                  </div>
                </div>
              </div>

              {/* Qubit details spectrum */}
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', maxHeight: 220, overflowY: 'auto' }}>
                <div style={{ fontSize: '12px', color: C.white, fontFamily: C.fontMono, fontWeight: 'bold', borderBottom: `1px solid ${C.border}`, paddingBottom: 8, marginBottom: 12 }}>
                  ⚡ ANHARMONICITY SPECTRUM
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {qubits.map(q => (
                    <div key={q.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '5px 10px', borderRadius: 4 }}>
                      <span style={{ color: C.white, fontSize: '11px', fontWeight: 'bold', fontFamily: C.fontMono }}>{q.id}</span>
                      <span style={{ color: C.muted, fontSize: '11px', fontFamily: C.fontMono }}>
                        Freq: <span style={{ color: C.accent }}>{q.frequency_ghz} GHz</span>
                      </span>
                      <span style={{ color: C.muted, fontSize: '11px', fontFamily: C.fontMono }}>
                        Anharmonicity: <span style={{ color: C.yellow }}>-{q.EC_Mhz || 220} MHz</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* 3. QISKIT METAL SCRIPT TAB */}
        {activeTab === 'export' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Toolbar */}
            <div style={{
              background: '#0a0d17', padding: '10px 16px', display: 'flex', gap: 12,
              borderBottom: `1px solid ${C.border}`, alignItems: 'center'
            }}>
              <span style={{ fontSize: '11px', color: C.green, fontFamily: C.fontMono, fontWeight: 'bold' }}>
                ⚡ EXPORT GENERATED QISKIT METAL SCRIPT (.py)
              </span>

              <button 
                onClick={() => {
                  navigator.clipboard.writeText(generateQiskitMetalCode());
                  alert('Qiskit Metal script copied to clipboard!');
                }}
                style={{
                  marginLeft: 'auto', background: C.accent + '22', border: `1px solid ${C.accent}`,
                  color: C.white, borderRadius: 4, padding: '4px 12px', fontSize: '10px',
                  fontFamily: C.fontMono, cursor: 'pointer', fontWeight: 'bold'
                }}
              >
                COPY TO CLIPBOARD
              </button>

              <button 
                onClick={downloadCodeFile}
                style={{
                  background: C.accent2 + '22', border: `1px solid ${C.accent2}`,
                  color: C.white, borderRadius: 4, padding: '4px 12px', fontSize: '10px',
                  fontFamily: C.fontMono, cursor: 'pointer', fontWeight: 'bold'
                }}
              >
                DOWNLOAD CODE
              </button>
            </div>

            {/* Python editor container */}
            <div style={{ flex: 1, overflowY: 'auto', background: '#020409', padding: '16px', position: 'relative' }}>
              <style dangerouslySetInnerHTML={{__html: `
                .py-comment { color: #566885; font-style: italic; }
                .py-string { color: #34d399; }
                .py-keyword { color: #f43f5e; font-weight: bold; }
                .py-number { color: #ffbe0b; }
                .py-builtin { color: #10b981; }
                .py-bracket { color: #a0aec0; }
              `}} />
              <pre style={{ margin: 0, fontFamily: C.fontMono, fontSize: '11.5px', lineHeight: '1.6' }}>
                <code dangerouslySetInnerHTML={{ __html: highlightPython(generateQiskitMetalCode()) }} />
              </pre>
            </div>
          </div>
        )}

        {/* 4. FAB RECIPE TAB */}
        {activeTab === 'fab' && (
          <div style={{ padding: '24px', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ color: C.white, fontSize: '15px', fontWeight: 'bold', fontFamily: C.fontSans, letterSpacing: 0.5 }}>
                🛠️ FABRICATION PROCESS RECIPE & CHECKLIST
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '11px', color: C.muted, fontFamily: C.fontMono }}>COMPLETE:</span>
                <span style={{ fontSize: '14px', color: C.green, fontFamily: C.fontMono, fontWeight: 'bold' }}>{fabPercent}%</span>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ width: '100%', height: 8, background: '#101625', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${fabPercent}%`, height: '100%', background: C.green, transition: 'width 0.4s ease' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {fabSteps.map((step, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleFabCheck(idx)}
                  style={{
                    background: fabChecked[idx] ? 'rgba(16, 185, 129, 0.04)' : C.panel,
                    border: `1px solid ${fabChecked[idx] ? C.green : C.border}`,
                    borderRadius: 8, padding: '14px 16px', cursor: 'pointer',
                    display: 'flex', gap: 14, alignItems: 'flex-start',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: 4,
                    border: `2px solid ${fabChecked[idx] ? C.green : C.muted}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: fabChecked[idx] ? C.green : 'transparent',
                    color: C.bg, fontSize: '12px', fontWeight: 'bold',
                    transition: 'all 0.2s'
                  }}>
                    {fabChecked[idx] && '✓'}
                  </div>

                  <div>
                    <div style={{
                      fontSize: '12px', fontWeight: 'bold',
                      color: fabChecked[idx] ? C.white : C.text,
                      fontFamily: C.fontSans, marginBottom: 2
                    }}>
                      Step {idx + 1}: {step.name}
                    </div>
                    <div style={{ fontSize: '11px', color: C.muted }}>
                      {step.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── ROTATING SPINNING BLOCH SPHERE FOUNDRY VISUALIZER (Placeholder) ────────────
function BlochSphereVisualizer({ onAssembleDemo }) {
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      background: '#04070d', alignItems: 'center', justifyContent: 'center', padding: '40px',
      position: 'relative', overflow: 'hidden'
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes rotateBloch {
          0% { transform: rotateX(70deg) rotateY(0deg); }
          100% { transform: rotateX(70deg) rotateY(360deg); }
        }
        @keyframes rotateOuterRing {
          0% { transform: rotateZ(0deg); }
          100% { transform: rotateZ(360deg); }
        }
        @keyframes laserScan {
          0%, 100% { top: 0%; opacity: 0.1; }
          50% { top: 100%; opacity: 0.8; }
        }
      `}} />

      {/* Wafer laser scanner line */}
      <div style={{
        position: 'absolute', left: 0, right: 0, height: '2px',
        background: `linear-gradient(90deg, transparent, ${C.accent}, transparent)`,
        animation: 'laserScan 6s infinite ease-in-out', zIndex: 5, pointerEvents: 'none'
      }} />

      {/* Grid Pattern overlay background */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'radial-gradient(#101b33 1px, transparent 1px)',
        backgroundSize: '24px 24px', opacity: 0.6
      }} />

      {/* ── Bloch Sphere / Wafer Hologram ── */}
      <div style={{ position: 'relative', width: 280, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        {/* Outer wafer outline */}
        <div style={{
          position: 'absolute', width: 260, height: 260, borderRadius: '50%',
          border: `1px solid ${C.border}`, boxShadow: `0 0 20px rgba(0, 212, 255, 0.05)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {/* Inner alignment ticks */}
          <div style={{ position: 'absolute', width: 10, height: 1, background: C.accent, left: 0 }} />
          <div style={{ position: 'absolute', width: 10, height: 1, background: C.accent, right: 0 }} />
          <div style={{ position: 'absolute', width: 1, height: 10, background: C.accent, top: 0 }} />
          <div style={{ position: 'absolute', width: 1, height: 10, background: C.accent, bottom: 0 }} />
        </div>

        {/* Rotating Wafer / Bloch Sphere SVG */}
        <svg viewBox="0 0 200 200" style={{ width: '80%', height: '80%', zIndex: 2 }}>
          {/* Base sphere circle */}
          <circle cx="100" cy="100" r="80" fill="none" stroke="${C.borderGlow}" strokeWidth="0.8" />
          
          {/* Rotating Equator ellipse */}
          <ellipse cx="100" cy="100" rx="80" ry="25" fill="none" stroke="${C.accentGlow}" strokeWidth="0.8" strokeDasharray="3 3"
            style={{ transformOrigin: 'center', animation: 'rotateOuterRing 15s infinite linear' }} />
          
          {/* Vertical Meridian ellipse */}
          <ellipse cx="100" cy="100" rx="25" ry="80" fill="none" stroke="${C.accent2Glow}" strokeWidth="0.8" />

          {/* Bloch state vector line */}
          <line x1="100" y1="100" x2="145" y2="60" stroke={C.accent2} strokeWidth="1.8" strokeDasharray="none" />
          <circle cx="145" cy="60" r="3.5" fill="#f1f5f9" style={{ filter: `drop-shadow(0px 0px 4px ${C.accent2})` }} />

          {/* Core alignment cross */}
          <line x1="100" y1="20" x2="100" y2="180" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
          <line x1="20" y1="100" x2="180" y2="100" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>

          {/* Quantum states labels */}
          <text x="100" y="15" textAnchor="middle" fill="#566885" fontSize="8" fontFamily={C.fontMono}>|0⟩ (GROUND)</text>
          <text x="100" y="195" textAnchor="middle" fill="#566885" fontSize="8" fontFamily={C.fontMono}>|1⟩ (EXCITED)</text>
        </svg>

        {/* Ambient background glow */}
        <div style={{
          position: 'absolute', width: 140, height: 140, borderRadius: '50%',
          background: `radial-gradient(circle, ${C.accentGlow} 0%, transparent 70%)`,
          opacity: 0.5, pointerEvents: 'none'
        }} />
      </div>

      {/* ── Instructions Panel ── */}
      <div style={{ maxWidth: 440, textAlign: 'center', zIndex: 10 }}>
        <h2 style={{ color: C.white, fontFamily: C.fontSans, fontSize: '18px', fontWeight: 'bold', margin: '0 0 10px', letterSpacing: 0.5 }}>
          QUANTUM FOUNDRY SIMULATOR
        </h2>
        <p style={{ color: C.muted, fontSize: '12px', lineHeight: 1.6, margin: '0 0 24px' }}>
          No chip design is currently active. Describe your chip topology to the **AI Copilot** on the left to start compiling, or assemble a sample device immediately to explore the workbench CAD tools.
        </p>

        <button 
          onClick={onAssembleDemo}
          style={{
            background: `linear-gradient(135deg, ${C.accent2}, ${C.accent})`,
            boxShadow: `0 0 16px ${C.accentGlow}`,
            border: 'none', borderRadius: 8, padding: '12px 24px',
            color: C.white, fontSize: '12px', fontWeight: 'bold',
            fontFamily: C.fontMono, cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.target.style.transform = 'scale(1.02)'}
          onMouseLeave={e => e.target.style.transform = 'scale(1)'}
        >
          ⚛️ ASSEMBLE SAMPLE DEVICE
        </button>
      </div>

      {/* Live environmental monitors overlay */}
      <div style={{
        position: 'absolute', bottom: 16, right: 16, display: 'flex', gap: 18,
        fontFamily: C.fontMono, fontSize: '9px', color: C.muted
      }}>
        <div>TEMP: <span style={{ color: C.green }}>10.4 mK</span></div>
        <div>HE-3 LEVEL: <span style={{ color: C.accent }}>98.2%</span></div>
        <div>VACUUM: <span style={{ color: C.yellow }}>1.2e-7 mbar</span></div>
      </div>
    </div>
  );
}

// ── CUSTOM STREAMING MESSAGE MARKDOWN-LITE PARSER ─────────────────────────────
function MsgText({ content }) {
  const lines = content.split('\n');
  return (
    <div style={{ lineHeight: 1.6 }}>
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <h3 key={i} style={{ color: C.accent, margin: '14px 0 6px', fontSize: 13, fontFamily: C.fontSans, fontWeight: 'bold', letterSpacing: 0.5 }}>{line.slice(4)}</h3>;
        if (line.startsWith('## '))  return <h2 key={i} style={{ color: C.accent, margin: '16px 0 8px', fontSize: 14, fontFamily: C.fontSans, fontWeight: 'bold' }}>{line.slice(3)}</h2>;
        if (line.startsWith('**') && line.endsWith('**')) return <p key={i} style={{ color: C.white, fontWeight: 'bold', margin: '6px 0', fontSize: '12.5px' }}>{line.slice(2,-2)}</p>;
        if (line.startsWith('- ')) return <div key={i} style={{ margin: '4px 0', paddingLeft: 12, color: C.text, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <span style={{ color: C.accent }}>•</span><span>{line.slice(2)}</span>
        </div>;
        if (line.trim() === '') return <div key={i} style={{ height: 8 }}/>;
        return <p key={i} style={{ margin: '3px 0', color: C.text }}>{line}</p>;
      })}
    </div>
  );
}

// ── TYPING INDICATOR ──────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '8px 0 4px' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: C.accent, opacity: 0.7,
          animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite`
        }}/>
      ))}
    </div>
  );
}

// ── MAIN APPLICATION REDESIGN ────────────────────────────────────────────────
export default function App() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `**Welcome to the QuantumFab AI Workspace** — your advanced quantum hardware co-designer.\n\nI can assist you in generating layout schematics, computing estimated coherence times, and structuring fabrication recipes for superconducting transmon chip geometries.\n\nType your target topology requirements below (e.g. *"Design a 5-qubit transmon chip with heavy-hex topology"*), or select a preset to begin.` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Persistence workbench variables
  const [activeChip, setActiveChip] = useState(null);
  const [activeTab, setActiveTab] = useState('cad'); // 'cad', 'telemetry', 'export', 'fab'

  // Hardware parameter sliders
  const [substrate, setSubstrate] = useState('sapphire'); // 'sapphire_ultra', 'sapphire', 'silicon'
  const [baseTemp, setBaseTemp] = useState(10); // 10mK to 120mK
  const [junctionQuality, setJunctionQuality] = useState(98); // 90% to 100%

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Parse message content to locate the latest chip JSON block
  const parseMessage = (text) => {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
    let chip = null;
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        chip = parsed.chip || null;
      } catch (_) {}
    }
    const cleaned = text.replace(/```json[\s\S]*?```/, '').trim();
    return { chip, text: cleaned };
  };

  // Trigger loading a demo device
  const handleLoadDemo = () => {
    setActiveChip(DEMO_CHIP);
    setActiveTab('cad');
  };

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setLoading(true);

    const apiMessages = newMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const { text: t } = JSON.parse(data);
              accumulated += t;
              
              // Automatically extract and set the latest designed chip during stream
              const { chip } = parseMessage(accumulated);
              if (chip) {
                setActiveChip(chip);
              }

              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: accumulated };
                return updated;
              });
            } catch (_) {}
          }
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `**Error:** ${err.message}\n\nVerify that the backend server is active: \`cd backend && node server.js\``
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const SUGGESTIONS = [
    'Design a 5-qubit transmon heavy-hex array',
    'Calculate T1 for Sapphire substrate',
    'Optimize readout resonator meanders',
    'Outline Josephson Junction fab checklist'
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, fontFamily: C.fontSans, color: C.text, overflow: 'hidden' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #03050a; }
        ::-webkit-scrollbar-thumb { background: #131b2e; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #10b98155; }
        textarea { resize: none; outline: none; }
        textarea::placeholder { color: #3b526d; }
      `}</style>

      {/* ── LEFT PANEL: AI COPILOT CHAT (35% width) ── */}
      <div style={{
        width: '35%', display: 'flex', flexDirection: 'column',
        borderRight: `1px solid ${C.border}`, background: 'rgba(5, 8, 15, 0.98)',
        position: 'relative', height: '100%'
      }}>
        {/* Chat Header */}
        <div style={{
          borderBottom: `1px solid ${C.border}`, padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: 12, background: C.panelSolid
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${C.accent2}, ${C.accent})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, filter: `drop-shadow(0px 0px 6px ${C.accentGlow})`
          }}>⚛</div>
          <div>
            <div style={{ color: C.white, fontWeight: 'bold', fontSize: '13px', letterSpacing: 0.5 }}>QUANTUMFAB COPILOT</div>
            <div style={{ color: C.muted, fontSize: '9px', fontFamily: C.fontMono, letterSpacing: 1.5 }}>CORE ENGINE ACTIVE</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: `0 0 6px ${C.green}` }}/>
            <span style={{ color: C.muted, fontSize: '9px', fontFamily: C.fontMono }}>ONLINE</span>
          </div>
        </div>

        {/* Scrollable Chat messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px' }}>
          {messages.map((msg, i) => {
            const { text } = parseMessage(msg.content);
            const isUser = msg.role === 'user';
            return (
              <div key={i} style={{
                marginBottom: 20, animation: 'fadeIn 0.25s ease',
                display: 'flex', flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start'
              }}>
                <div style={{
                  color: isUser ? C.muted : C.accent, fontSize: '8px',
                  fontFamily: C.fontMono, letterSpacing: 1.5, marginBottom: 4
                }}>
                  {isUser ? 'YOU' : 'QUANTUMFAB AI'}
                </div>

                <div style={{
                  maxWidth: '85%',
                  background: isUser ? 'rgba(52, 211, 153, 0.05)' : C.panel,
                  border: `1px solid ${isUser ? 'rgba(52, 211, 153, 0.25)' : C.border}`,
                  borderRadius: isUser ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                  padding: '12px 16px', fontSize: '12px'
                }}>
                  {isUser ? (
                    <p style={{ margin: 0, color: C.white, lineHeight: 1.5 }}>{msg.content}</p>
                  ) : (
                    <MsgText content={text} />
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ color: C.accent, fontSize: '8px', fontFamily: C.fontMono, letterSpacing: 1.5, marginBottom: 4 }}>QUANTUMFAB AI</div>
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: '4px 12px 12px 12px', padding: '4px 14px' }}>
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Slide controls drawer ── */}
        <div style={{
          background: C.panelSolid, border: `1px solid ${C.border}`, borderRadius: 8,
          padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10,
          margin: '0 16px 12px'
        }}>
          <div style={{ fontSize: '9px', color: C.white, fontFamily: C.fontMono, fontWeight: 'bold', borderBottom: `1px solid ${C.border}`, paddingBottom: 4 }}>
            🎛️ HARDWARE COMPILATION SETTINGS
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: '9px', color: C.muted, width: 85, fontFamily: C.fontMono }}>SUBSTRATE:</span>
            <select 
              value={substrate}
              onChange={e => setSubstrate(e.target.value)}
              style={{
                flex: 1, background: C.bg, border: `1px solid ${C.border}`, color: C.white,
                fontSize: '10px', fontFamily: C.fontMono, borderRadius: 4, padding: '2px 4px'
              }}
            >
              <option value="sapphire_ultra">Sapphire (Ultra Clean)</option>
              <option value="sapphire">Sapphire (Al2O3)</option>
              <option value="silicon">Silicon (HR-Si)</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: '9px', color: C.muted, width: 85, fontFamily: C.fontMono }}>BASE TEMP:</span>
            <input 
              type="range" min="10" max="120" step="10"
              value={baseTemp}
              onChange={e => setBaseTemp(parseInt(e.target.value))}
              style={{ flex: 1, height: 4, background: C.border }}
            />
            <span style={{ fontSize: '9px', color: C.accent, width: 35, textAlign: 'right', fontFamily: C.fontMono }}>{baseTemp}mK</span>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: '9px', color: C.muted, width: 85, fontFamily: C.fontMono }}>JUNCTION Q:</span>
            <input 
              type="range" min="90" max="100" step="1"
              value={junctionQuality}
              onChange={e => setJunctionQuality(parseInt(e.target.value))}
              style={{ flex: 1, height: 4, background: C.border }}
            />
            <span style={{ fontSize: '9px', color: C.accent, width: 35, textAlign: 'right', fontFamily: C.fontMono }}>{junctionQuality}%</span>
          </div>
        </div>

        {/* Input Bar Overlay */}
        <div style={{
          background: C.panelSolid, borderTop: `1px solid ${C.border}`,
          padding: '12px 16px 16px'
        }}>
          {/* Quick prompt presets */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 8 }}>
            {SUGGESTIONS.map((s, i) => (
              <button 
                key={i} 
                onClick={() => setInput(s)}
                style={{
                  background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 12,
                  padding: '3px 10px', color: C.muted, fontSize: '9px', fontFamily: C.fontMono,
                  cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.target.style.borderColor = C.accent; e.target.style.color = C.accent; }}
                onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.muted; }}
              >
                {s}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask me to design a quantum chip..."
              rows={2}
              style={{
                flex: 1, background: C.bg, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: '10px 12px', color: C.white,
                fontSize: '12px', fontFamily: C.fontSans,
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = C.accent}
              onBlur={e => e.target.style.borderColor = C.border}
            />
            <button 
              onClick={send} 
              disabled={loading || !input.trim()}
              style={{
                width: 42, height: 42, borderRadius: 8,
                background: loading || !input.trim()
                  ? C.border
                  : `linear-gradient(135deg, ${C.accent2}, ${C.accent})`,
                border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                fontSize: 16, color: C.white, display: 'flex', alignItems: 'center',
                justifyContent: 'center', transition: 'all 0.2s',
                boxShadow: loading || !input.trim() ? 'none' : `0 0 10px ${C.accentGlow}`
              }}
            >
              ↑
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: INTERACTIVE CAD DASHBOARD WORKBENCH (65% width) ── */}
      <div style={{ width: '65%', display: 'flex', flexDirection: 'column', height: '100%' }}>
        {activeChip ? (
          <ChipDiagram 
            chip={activeChip} 
            substrate={substrate}
            baseTemp={baseTemp}
            junctionQuality={junctionQuality}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        ) : (
          <BlochSphereVisualizer onAssembleDemo={handleLoadDemo} />
        )}
      </div>

    </div>
  );
}
