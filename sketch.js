// --- Morse Tree ---
// type letters/digits/spaces to grow the tree
// . = left+straight, - = right+straight, | = all three
// BFS queue: expands one tip per symbol (dot/dash/bar) (left→right)

let branchAngle = 40;
let lenDecay = 0.72;
let thicknessDecay = 0.8;

const MIN_LEN = 10.0;
const MIN_W = 0.6;
const MIN_CLEARANCE = 2.0;

const MORSE = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
    'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
    'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
    'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..',
    '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
    '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----'
};

let segments = [];
let tipQueue = [];
let symbolQueue = [];
let typedText = "";

function setup() {
    createCanvas(700, 500);
    angleMode(DEGREES);
    stroke(0);
    noFill();
    resetTree();
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

function draw() {
    // expand one queued symbol per step
    if (symbolQueue.length > 0) {
        const sym = symbolQueue.shift();
        expandNextTip(sym);
    }

    // draw active tips
    stroke(0);
    for (const b of tipQueue) {
        strokeWeight(b.w);
        line(b.x1, b.y1, b.x2, b.y2);
    }

    // HUD
    noStroke(); fill(0); textSize(12);
    text(
        "Type letters/digits/spaces to grow.\n" +
        "Angle " + branchAngle + "°, decay " + nf(lenDecay, 1, 2) + "/" + nf(thicknessDecay, 1, 2) +
        "\nTyped: " + typedText,
        12, 16
    );
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


function keyTyped() {
    const ch = key;
    if (ch === ' ') {
        symbolQueue.push('|', '|');
        typedText += ' ';
    } else {
        const c = ch.toUpperCase();
        if (MORSE[c]) {
            enqueueMorse(MORSE[c]);
            typedText += c;
        }
    }
    return false;
}

function enqueueMorse(codeStr) {
    for (const c of codeStr) symbolQueue.push(c);
    symbolQueue.push('|');
}
