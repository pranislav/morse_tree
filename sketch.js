// --- Morse Tree ---
// type letters/digits/spaces to grow the tree
// . = left+straight, - = right+straight, | = all three
// BFS queue: expands one tip per symbol (dot/dash/bar) (left→right)

let branchAngle = 40;
let lenDecay = 0.72;
let thicknessDecay = 0.8;

const MIN_LEN = 10.0;
const MIN_W = 0.6;

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

    // --- CLASH CHECK (atomic) ---
    for (const c of children) {
        if (clashesWithExisting(c)) {
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

function segmentsIntersect(a, b, c, d) {
    function orient(p, q, r) {
        return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    }

    function onSeg(p, q, r) {
        return q.x <= max(p.x, r.x) && q.x >= min(p.x, r.x) &&
            q.y <= max(p.y, r.y) && q.y >= min(p.y, r.y);
    }

    const o1 = orient(a, b, c);
    const o2 = orient(a, b, d);
    const o3 = orient(c, d, a);
    const o4 = orient(c, d, b);

    if (o1 * o2 < 0 && o3 * o4 < 0) return true;

    if (o1 === 0 && onSeg(a, c, b)) return true;
    if (o2 === 0 && onSeg(a, d, b)) return true;
    if (o3 === 0 && onSeg(c, a, d)) return true;
    if (o4 === 0 && onSeg(c, b, d)) return true;

    return false;
}


function clashesWithExisting(segment) {
    const EPS = 1e-3;

    const { x1, y1, x2, y2, angle, len, w, parent } = segment;

    for (const s of segments) {
        // skip parent segment
        if (s === parent) continue;

        // ignore tiny overlaps at the joint
        if (dist(x1, y1, s.x1, s.y1) < EPS ||
            dist(x1, y1, s.x2, s.y2) < EPS) continue;

        if (segmentsIntersect(
            { x: x1, y: y1 }, { x: x2, y: y2 },
            { x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }
        )) {
            return true;
        }
    }
    return false;
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
