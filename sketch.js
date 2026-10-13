// --- Morse Tree ---
// type letters/digits/spaces to grow the tree
// . = left+straight, - = right+straight, | = all three
// BFS queue: expands one tip per symbol (dot/dash/bar) (left→right)

let branchAngle = 40;
let lenDecay = 0.7;
let thicknessDecay = 0.8;

let segments = [];
let tipQueue = [];
let symbolQueue = [];
let typedText = "";
let history = [];
let textDisplay;
let ui;
let controls;
let sidePanel;
let exportControls;
let treePanel;
let canvas;
let camScale = 1;
let camTargetScale = 1;
let camAnchorX = 0;
let camAnchorY = 0;
let camPanX = 0;
let camPanY = 0;
let camTargetPanX = 0;
let camTargetPanY = 0;
let savePNGButton, saveSVGButton;

let MIN_LEN = 12.0;
let MIN_W = 0.6;
const MIN_CLEARANCE = 2.0;
const VIEW_MARGIN = 40;
const ZOOM_SMOOTH = 0.08;


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

    ui = createDiv().class('app-layout').style('display', 'flex');
    sidePanel = createDiv().parent(ui).class('side-panel');
    exportControls = createDiv().parent(sidePanel).class('export-controls');
    controls = createDiv().parent(sidePanel)
        .class('controls')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('gap', '12px');

    treePanel = createDiv().parent(ui)
        .class('tree-panel')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('gap', '8px');
    canvas.parent(treePanel);
    makeControls();

    textInput = createInput('');
    textInput.parent(treePanel);
    textInput.attribute('placeholder', 'Type…');
    textInput.attribute('aria-label', 'Text encoded by the tree');
    textInput.style('font-size', '18px');
    textInput.style('width', '100%');
    textInput.input(() => {
        const inputElement = textInput.elt;
        const selectionStart = inputElement.selectionStart;
        const selectionEnd = inputElement.selectionEnd;
        const selectionDirection = inputElement.selectionDirection;
        syncTextInput(textInput.value());
        inputElement.setSelectionRange(
            Math.min(selectionStart, typedText.length),
            Math.min(selectionEnd, typedText.length),
            selectionDirection
        );
    });
    textInput.elt.focus({ preventScroll: true });

    savePNGButton = createButton("Save PNG");
    savePNGButton.parent(exportControls);
    savePNGButton.mousePressed(() => {
    saveCanvas("morse_tree", "png");
    });

    saveSVGButton = createButton("Save SVG");
    saveSVGButton.parent(exportControls);
    saveSVGButton.mousePressed(() => {
    saveAsSVG();
    });

    savePNGButton.style('height', '2rem');  // adjust as needed
    saveSVGButton.style('height', '2rem');

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
    resetCamera(initialBranch.x1, initialBranch.y1);
    updateCamera();

}

function makeControl(label, min, max, step, value, onChange) {
    const initialValue = Number(Number(value).toPrecision(2));
    const row = createDiv().class('control-row').style('display', 'flex')
        .style('flex-direction', 'column');

    const caption = createSpan(label).class('control-label');
    const slider = createSlider(min, max, initialValue, step);
    slider.class('control-slider');
    const input = createInput(initialValue, 'text');
    input.class('parameter-number');
    input.attribute('inputmode', 'decimal');
    onChange(initialValue);

    slider.input(() => {
        input.value(slider.value());
        onChange(Number(slider.value()));
    });

    function updateFromInput(finalize = false) {
        const raw = input.value().trim();
        if (!raw) {
            if (!finalize) return;
            input.value(min);
            slider.value(min);
            onChange(min);
            return;
        }

        if (!finalize && /[.,]$/.test(raw)) return;

        const entered = Number(raw.replace(',', '.'));
        const v = constrain(Number.isFinite(entered) ? entered : min, min, max);
        slider.value(v);
        onChange(v);
        if (finalize || !Number.isFinite(entered) || entered < min || entered > max) {
            input.value(v);
        }
    }

    input.input(() => updateFromInput());
    input.changed(() => updateFromInput(true));

    caption.parent(row);
    slider.parent(row);
    input.parent(row);

    return row;
}

function makeControls() {
    makeControl('Branch angle (°)', 0, 180, 1, branchAngle,
        v => branchAngle = v).parent(controls);

    makeControl('Length decay', 0, 2, 0.01, lenDecay,
        v => lenDecay = v).parent(controls);

    makeControl('Width decay', 0, 2, 0.01, thicknessDecay,
        v => thicknessDecay = v).parent(controls);

    makeControl('Min length (relative)', 0, 1, 0.0001, MIN_LEN / initialBranch.len,
        v => MIN_LEN = v * initialBranch.len).parent(controls);

    makeControl('Min width (relative)', 0, 1, 0.001, MIN_W / initialBranch.w,
        v => MIN_W = v * initialBranch.w).parent(controls);
}


function draw() {
  background(255);

  // 1. simulation step (at most one symbol)
  if (symbolQueue.length > 0) {
    expandNextTip(symbolQueue.shift());
    updateCamera();   // ← ONLY when geometry changed
  }

  // 2. draw tree with camera
  beginCamera();

  stroke(0);
  for (const s of segments) {
    strokeWeight(s.w);
    line(s.x1, s.y1, s.x2, s.y2);
  }

  endCamera();
}


function resetCamera(anchorX, anchorY) {
  camScale = 1;
  camTargetScale = 1;
  camAnchorX = anchorX;
  camAnchorY = anchorY;
  camPanX = 0;
  camPanY = 0;
  camTargetPanX = 0;
  camTargetPanY = 0;
}

function updateCamera() {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const s of segments) {
    minX = min(minX, s.x1, s.x2);
    minY = min(minY, s.y1, s.y2);
    maxX = max(maxX, s.x1, s.x2);
    maxY = max(maxY, s.y1, s.y2);
  }

  const w = maxX - minX;
  const h = maxY - minY;

  if (w <= 0 || h <= 0) return;

  const widestSide = max(camAnchorX - minX, maxX - camAnchorX);
  const sx = (width / 2 - VIEW_MARGIN) / widestSide;
  const sy = (height - 2 * VIEW_MARGIN) / h;

  camTargetScale = min(1, sx, sy);

  // Keep the trunk's base in its original lower position. Pan only when a
  // branch would otherwise cross the canvas margin.
  const top = height - 20 + (minY - camAnchorY) * camTargetScale;
  const bottom = height - 20 + (maxY - camAnchorY) * camTargetScale;

  camTargetPanX = 0;
  camTargetPanY = top < VIEW_MARGIN ? VIEW_MARGIN - top :
      bottom > height - 20 ? height - 20 - bottom : 0;
}

function beginCamera() {
  camScale = lerp(camScale, camTargetScale, ZOOM_SMOOTH);
  camPanX = lerp(camPanX, camTargetPanX, ZOOM_SMOOTH);
  camPanY = lerp(camPanY, camTargetPanY, ZOOM_SMOOTH);

  push();
  translate(width / 2 + camPanX, height - 20 + camPanY);
  scale(camScale);
  translate(-camAnchorX, -camAnchorY);
}

function endCamera() {
  pop();
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
        symbolQueue.push('|');
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

// Reconcile the editable text field with the same per-character undo history
// used by keyboard input. This also handles mobile Backspace and selections.
function syncTextInput(value) {
    const nextText = value.toUpperCase();
    let commonLength = 0;
    while (commonLength < typedText.length && commonLength < nextText.length &&
        typedText[commonLength] === nextText[commonLength]) {
        commonLength++;
    }

    if (typedText.length > commonLength) {
        rebuildTree(nextText.slice(0, commonLength));
    }
    for (const ch of nextText.slice(commonLength)) handleChar(ch);
    textInput.value(typedText);
}

function rebuildTree(text) {
    const currentScale = camScale;
    const currentTargetScale = camTargetScale;
    const currentPanX = camPanX;
    const currentPanY = camPanY;
    const currentTargetPanX = camTargetPanX;
    const currentTargetPanY = camTargetPanY;
    resetTree();
    camScale = currentScale;
    camTargetScale = currentTargetScale;
    camPanX = currentPanX;
    camPanY = currentPanY;
    camTargetPanX = currentTargetPanX;
    camTargetPanY = currentTargetPanY;
    history = [];

    for (const ch of text) {
        const c = ch.toUpperCase();
        if (c === ' ') {
            history.push(snapshot());
            symbolQueue.push('|');
            typedText += ' ';
        } else if (MORSE[c]) {
            history.push(snapshot());
            enqueueMorse(MORSE[c]);
            typedText += c;
        }

        // Finish each prior character before taking the next snapshot so the
        // undo history always describes a stable, fully grown prefix.
        let safety = 0;
        while (symbolQueue.length > 0 && tipQueue.length > 0 && safety++ < 10000) {
            expandNextTip(symbolQueue.shift());
        }
    }

    updateCamera();
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

function keyPressed() {
    if (keyCode === BACKSPACE && document.activeElement?.tagName !== 'INPUT') {
        undoLast();
        return false;
    }
}

function enqueueMorse(codeStr) {
    for (const c of codeStr) symbolQueue.push(c);
    symbolQueue.push('|');
}


function undoLast() {
    if (history.length === 0) return;

    const h = history.pop();
    rebuildTree(h.typedText);
    textInput.value(typedText);
}

function saveAsSVG() {
  // start recording SVG into a buffer
  beginRecordSVG(this, "morse_tree.svg");

  // draw the tree world exactly like on canvas
  beginCamera();  // reuse your camera transform
  stroke(0);
  for (const s of segments) {
    strokeWeight(s.w);
    line(s.x1, s.y1, s.x2, s.y2);
  }
  endCamera();

  // finish and save
  endRecordSVG();
}
