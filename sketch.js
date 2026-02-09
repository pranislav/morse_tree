// --- Morse Tree ---
// type letters/digits/spaces to grow the tree
// . = left+straight, - = right+straight, | = all three
// BFS queue: expands one tip per symbol (dot/dash/bar) (left→right)

let branchAngle = 40;
let lenDecay = 0.72;
let thicknessDecay = 0.8;

let segments = [];
let tipQueue = [];
let symbolQueue = [];
let typedText = "";
let history = [];
let lastUndoFrame = 0;
let textDisplay;
let ui;
let controls;
let canvas;


const MIN_LEN = 10.0;
const MIN_W = 0.6;
const MIN_CLEARANCE = 2.0;
const UNDO_DELAY = 6; // frames


const MORSE = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
    'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
    'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
    'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..',
    '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
    '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----'
};


function setup() {
    canvas = createCanvas(700, 500);
    angleMode(DEGREES);
    stroke(0);
    noFill();
    resetTree();
    textDisplay = createDiv('');
    textDisplay.style('font-family', 'monospace');
    textDisplay.style('margin', '8px');

    ui = createDiv().style('display', 'flex');
    controls = createDiv().parent(ui)
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('gap', '12px');

    canvas.parent(ui);
    makeControls();

    textInput = createInput('');
    textInput.attribute('placeholder', 'Type…');
    textInput.style('font-size', '18px');
    textInput.style('width', '100%');
    textInput.input(() => {
        const ch = textInput.value().slice(-1);
        handleChar(ch);
    });

}

function resetTree() {
    initialBranch = {
        x1: width / 2,
        y1: height,
        x2: width / 2,
        y2: height - 120,
        angle: -90,
        len: 120,
        w: 6,
        parent: null
    };
    tipQueue = [initialBranch];
    segments = [initialBranch];
    symbolQueue = [];
    typedText = "";
}

function makeControl(label, min, max, step, value, onChange) {
    const row = createDiv().style('display', 'flex')
        .style('flex-direction', 'column');

    const caption = createSpan(label);
    const slider = createSlider(min, max, value, step);
    const input = createInput(value, 'number');

    slider.input(() => {
        input.value(slider.value());
        onChange(Number(slider.value()));
    });

    input.input(() => {
        let v = constrain(Number(input.value()), min, max);
        slider.value(v);
        onChange(v);
    });

    caption.parent(row);
    slider.parent(row);
    input.parent(row);

    return row;
}

function makeControls() {
    makeControl('Branch angle (°)', 5, 80, 1, branchAngle,
        v => branchAngle = v).parent(controls);

    makeControl('Length decay', 0.5, 0.95, 0.01, lenDecay,
        v => lenDecay = v).parent(controls);

    makeControl('Width decay', 0.5, 0.95, 0.01, thicknessDecay,
        v => thicknessDecay = v).parent(controls);

    makeControl('Min length', 2, 50, 1, MIN_LEN,
        v => MIN_LEN = v).parent(controls);

    makeControl('Min width', 0.1, 5, 0.1, MIN_W,
        v => MIN_W = v).parent(controls);
}


function draw() {
  background(255);

  updateTree();
  handleContinuousUndo();

  const bounds = computeBounds(segments);
  applyCamera(bounds);

  drawSegments();

  pop(); // camera
}

function updateTree() {
  if (symbolQueue.length > 0) {
    expandNextTip(symbolQueue.shift());
  }
}

function handleContinuousUndo() {
  if (keyIsDown(BACKSPACE) && history.length > 0) {
    if (frameCount - lastUndoFrame > UNDO_DELAY) {
      undoLast();
      lastUndoFrame = frameCount;
    }
  }
}

function computeBounds(segs) {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const s of segs) {
    minX = min(minX, s.x1, s.x2);
    minY = min(minY, s.y1, s.y2);
    maxX = max(maxX, s.x1, s.x2);
    maxY = max(maxY, s.y1, s.y2);
  }

  return { minX, minY, maxX, maxY };
}

function applyCamera(b) {
  push();

  const w = max(1, b.maxX - b.minX);
  const h = max(1, b.maxY - b.minY);
  const pad = 40;

  const sx = (width  - pad) / w;
  const sy = (height - pad) / h;
  const s  = min(sx, sy);

  translate(width / 2, height / 2);
  scale(s);
  translate(-(b.minX + b.maxX) / 2, -(b.minY + b.maxY) / 2);
}

function drawSegments() {
  stroke(0);
  for (const s of segments) {
    strokeWeight(s.w);
    line(s.x1, s.y1, s.x2, s.y2);
  }
}


function expandNextTip(symbol) {
    if (tipQueue.length === 0) return;

    const b = tipQueue.shift();
    const children = encodeChildren(symbol, b);

    // --- PROXIMITY CHECK (atomic) ---
    for (const c of children) {
        if (segmentTooClose(c)) {
            // parent dies, retry symbol on next tip
            symbolQueue.unshift(symbol);
            return;
        }
    }

    for (const c of children) {
        segments.push(c);
        tipQueue.push(c);
    }
}

function makeChild(angle, parent) {
    const newLen = max(parent.len * lenDecay, MIN_LEN);
    const newW = max(parent.w * thicknessDecay, MIN_W);
    return {
        x1: parent.x2,
        y1: parent.y2,
        x2: parent.x2 + cos(angle) * newLen,
        y2: parent.y2 + sin(angle) * newLen,
        angle,
        len: newLen,
        w: newW,
        parent: parent
    };
}

function encodeChildren(symbol, parent) {
    const children = [];
    if (symbol === '.') {
        children.push(makeChild(parent.angle - branchAngle, parent));
        children.push(makeChild(parent.angle, parent));
    } else if (symbol === '-') {
        children.push(makeChild(parent.angle, parent));
        children.push(makeChild(parent.angle + branchAngle, parent));
    } else if (symbol === '|') {
        children.push(makeChild(parent.angle - branchAngle, parent));
        children.push(makeChild(parent.angle, parent));
        children.push(makeChild(parent.angle + branchAngle, parent));
    } else {
        children.push(makeChild(parent.angle, parent));
    }
    return children;
}


function segmentTooClose(c, clearance = MIN_CLEARANCE) {

    for (const s of segments) {
        // skip parent
        if (s === c.parent) continue;

        const d = segmentSegmentDistance(
            c.x1, c.y1, c.x2, c.y2,
            s.x1, s.y1, s.x2, s.y2
        );

        const margin = clearance + 0.5 * (c.w + s.w);
        if (d < margin) return true;
    }

    return false;
}

function segmentSegmentDistance(x1, y1, x2, y2, x3, y3, x4, y4) {
    // helper
    function dot(ax, ay, bx, by) { return ax * bx + ay * by; }

    const ux = x2 - x1, uy = y2 - y1;
    const vx = x4 - x3, vy = y4 - y3;
    const wx = x1 - x3, wy = y1 - y3;

    const a = dot(ux, uy, ux, uy);
    const b = dot(ux, uy, vx, vy);
    const c = dot(vx, vy, vx, vy);
    const d = dot(ux, uy, wx, wy);
    const e = dot(vx, vy, wx, wy);

    const D = a * c - b * b;
    let sc, sN, sD = D;
    let tc, tN, tD = D;

    if (D < 1e-8) {
        sN = 0; sD = 1;
        tN = e; tD = c;
    } else {
        sN = (b * e - c * d);
        tN = (a * e - b * d);
        if (sN < 0) { sN = 0; tN = e; tD = c; }
        else if (sN > sD) { sN = sD; tN = e + b; tD = c; }
    }

    if (tN < 0) {
        tN = 0;
        if (-d < 0) sN = 0;
        else if (-d > a) sN = sD;
        else { sN = -d; sD = a; }
    } else if (tN > tD) {
        tN = tD;
        if ((-d + b) < 0) sN = 0;
        else if ((-d + b) > a) sN = sD;
        else { sN = (-d + b); sD = a; }
    }

    sc = Math.abs(sN) < 1e-8 ? 0 : sN / sD;
    tc = Math.abs(tN) < 1e-8 ? 0 : tN / tD;

    const dx = wx + sc * ux - tc * vx;
    const dy = wy + sc * uy - tc * vy;

    return Math.hypot(dx, dy);
}


function handleChar(ch) {

    if (ch === ' ') {
        history.push(snapshot());
        symbolQueue.push('|', '|');
        typedText += ' ';
    } else {
        const c = ch.toUpperCase();
        if (MORSE[c]) {
            history.push(snapshot());
            enqueueMorse(MORSE[c]);
            typedText += c;
        }
    }

    textInput.value(typedText);
}

function snapshot() {
  return {
    segments: segments.slice(),
    tipQueue: tipQueue.slice(),
    symbolQueue: symbolQueue.slice(),
    typedText
  };
}

function keyTyped() {
    if (document.activeElement.tagName === 'INPUT') return;
    handleChar(key);
    return false;
}

function enqueueMorse(codeStr) {
    for (const c of codeStr) symbolQueue.push(c);
    symbolQueue.push('|');
}


function undoLast() {
    if (history.length === 0) return;

    const h = history.pop();
    segments = h.segments;
    tipQueue = h.tipQueue;
    symbolQueue = h.symbolQueue;
    typedText = h.typedText;

    textInput.value(typedText);
}

function touchStarted() {
  textInput.elt.focus();
}
