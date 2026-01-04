// --- Morse Tree ---
// type letters/digits/spaces to grow the tree
// . = left+straight, - = right+straight, | = all three
// BFS queue: expands one tip per symbol (left→right)

let branchAngle = 30;
let lenDecay = 0.72;
let thicknessDecay = 0.72;
let stepEvery = 14;

const MIN_LEN = 2.0;
const MIN_W = 0.6;

const MORSE = {
  'A':'.-','B':'-...','C':'-.-.','D':'-..','E':'.','F':'..-.',
  'G':'--.','H':'....','I':'..','J':'.---','K':'-.-','L':'.-..',
  'M':'--','N':'-.','O':'---','P':'.--.','Q':'--.-','R':'.-.',
  'S':'...','T':'-','U':'..-','V':'...-','W':'.--','X':'-..-',
  'Y':'-.--','Z':'--..',
  '1':'.----','2':'..---','3':'...--','4':'....-','5':'.....',
  '6':'-....','7':'--...','8':'---..','9':'----.','0':'-----'
};

let segments = [];
let tipQueue = [];
let symbolQueue = [];
let typedText = "";

function setup() {
  createCanvas(700, 700);
  angleMode(DEGREES);
  stroke(0);
  noFill();
  resetTree();
}

function resetTree() {
  segments = [];
  tipQueue = [{ x: width/2, y: height, angle: -90, len: 120, w: 6 }];
  symbolQueue = [];
  typedText = "";
}

function draw() {

  // expand one queued symbol per step
  if (frameCount % stepEvery === 0 && symbolQueue.length > 0) {
    const sym = symbolQueue.shift();
    expandNextTip(sym);
  }

  // draw all segments persistently
  for (const s of segments) {
    strokeWeight(s.w);
    line(s.x1, s.y1, s.x2, s.y2);
  }

  // draw active tips (preview)
  stroke(0);
  for (const b of tipQueue) {
    const x2 = b.x + cos(b.angle) * b.len;
    const y2 = b.y + sin(b.angle) * b.len;
    strokeWeight(max(1, b.w * 0.6));
    line(b.x, b.y, x2, y2);
  }

  // HUD
  noStroke(); fill(0); textSize(12);
  text(
    "Type letters/digits/spaces to grow.\n" +
    "Angle " + branchAngle + "°, decay " + nf(lenDecay,1,2) + "/" + nf(thicknessDecay,1,2) +
    "\nTyped: " + typedText,
    12, 16
  );
}

function expandNextTip(symbol) {
  if (tipQueue.length === 0) return;
  const b = tipQueue.shift(); // FIFO

  const x2 = b.x + cos(b.angle) * b.len;
  const y2 = b.y + sin(b.angle) * b.len;
  segments.push({ x1: b.x, y1: b.y, x2, y2, w: b.w });

  const newLen = b.len * lenDecay;
  const newW = b.w * thicknessDecay;
  if (newLen < MIN_LEN || newW < MIN_W) return;

  if (symbol === '.') {
    tipQueue.push(makeTip(x2, y2, b.angle - branchAngle, newLen, newW));
    tipQueue.push(makeTip(x2, y2, b.angle, newLen, newW));
  } else if (symbol === '-') {
    tipQueue.push(makeTip(x2, y2, b.angle + branchAngle, newLen, newW));
    tipQueue.push(makeTip(x2, y2, b.angle, newLen, newW));
  } else if (symbol === '|') {
    tipQueue.push(makeTip(x2, y2, b.angle - branchAngle, newLen, newW));
    tipQueue.push(makeTip(x2, y2, b.angle, newLen, newW));
    tipQueue.push(makeTip(x2, y2, b.angle + branchAngle, newLen, newW));
  } else {
    tipQueue.push(makeTip(x2, y2, b.angle, newLen, newW));
  }
}

function makeTip(x, y, angle, len, w) {
  return { x, y, angle, len, w };
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

// helpers
function setAngle(a){ branchAngle = a; }
function setDecay(l,t){ lenDecay = l; thicknessDecay = t; }
function clearTree(){ resetTree(); }
