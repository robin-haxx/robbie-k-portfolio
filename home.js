// ===== GLOBAL VARIABLES =====
// Note: canvasSize, canvasWidth, canvasHeight are declared in system_runner.js

let colourTheme = 1;

let firstRun = true;
let phaseCheck = false;
let bassFade = false; // bass-driven "ghost" effect. uses alpha; can eat performance.
let fadeMax = 150; // when bassfade is true, lower value means more "ghosting"

// grid is a flat Uint8Array indexed [i * rows + j] (column-major, matches the old grid[i][j])
let grid;
let nextGrid;
let cols = 0;
let rows = 0;
let resolution = 20; //are default res values necessary anymore? could give some options to user tbh

// need to refactor colour storage if I build a full style tool suite. Should be fun.
let colGreen = [80, 150, 90];
let colBlue = [50, 50, 100];
let colRed = [80, 50, 20];
let colApple = [240, 100, 80];
let colWhite = [75, 148, 103];
let colCream = [255, 255, 230];
let colBlack = [255, 255, 255];
let colYellow = [213, 219, 15];

let deadCol = colWhite;
let current = 0;

let appleSize;

let sceneDuration = 130; // counter ticks (60/second) each scene lasts. supports updating during playback scope.
let maxRes = 50;

// GOL generations advance on wall-clock time so the speed doesn't depend on the display's refresh rate.
// (previously: every 16 frames at ~60fps)
const STEP_MS_THEME0 = 16 * 1000 / 60;
const STEP_MS_THEME1 = 8 * 1000 / 60;
let lastStepTime = 0;

// PRE-CREATED COLOR OBJECTS
let whiteCol, whiteColAlpha, whiteColHighAlpha, appleCol, greenCol, yellowCol, blackCol, creamCol, greyCol, greyColTwo;
let colorsInitialized = false;
let aliveColTheme0;
let aliveColTheme1;
const colWhiteCss = `rgb(${colWhite[0]},${colWhite[1]},${colWhite[2]})`;

// ===== SETUP COLORS (called once on first frame) =====
function setupColors() {
  if (colorsInitialized) return;

  whiteCol = color(75, 148, 103, 50);
  whiteColAlpha = color(0, 0, 0, 200);
  whiteColHighAlpha = color(0, 0, 0, 50);
  appleCol = color(240, 100, 80);
  greenCol = color(80, 150, 90);
  yellowCol = color(213, 219, 15);
  blackCol = color(75, 148, 103);
  creamCol = color(255, 255, 230);
  greyCol = color(220, 220, 220);
  greyColTwo = color(180, 180, 100);

  aliveColTheme0 = [whiteCol, greyColTwo, blackCol, greyCol];
  aliveColTheme1 = [yellowCol, greenCol, creamCol, blackCol];

  colorsInitialized = true;
}

// ===== GRID =====

// (re)build the grid for the current canvas size + resolution, seeding cells with the given density.
// If keepExisting is true, cells that still fit are carried over (used on window resize) so the pattern doesn't reset.
function buildGrid(density, keepExisting) {
  const newCols = max(1, round(width / resolution)); //very important to round these to account for math error in dividing canvas
  const newRows = max(1, round(height / resolution));
  const newGrid = new Uint8Array(newCols * newRows);

  for (let i = 0; i < newCols; i++) {
    for (let j = 0; j < newRows; j++) {
      if (keepExisting && grid && i < cols && j < rows) {
        newGrid[i * newRows + j] = grid[i * rows + j];
      } else {
        newGrid[i * newRows + j] = Math.random() < density ? 1 : 0;
      }
    }
  }

  cols = newCols;
  rows = newRows;
  grid = newGrid;
  nextGrid = new Uint8Array(cols * rows);
}

// advance one generation of Conway's GOL (wrapping edges), with a chance of spontaneous births
function stepGrid(birthChance) {
  const g = grid;
  const n = nextGrid;
  const r = rows;
  const lastCol = cols - 1;
  const lastRow = rows - 1;

  for (let i = 0; i < cols; i++) {
    const cL = (i === 0 ? lastCol : i - 1) * r;
    const cM = i * r;
    const cR = (i === lastCol ? 0 : i + 1) * r;

    for (let j = 0; j < r; j++) {
      const up = j === 0 ? lastRow : j - 1;
      const down = j === lastRow ? 0 : j + 1;

      const neighbours =
        g[cL + up] + g[cL + j] + g[cL + down] +
        g[cM + up] + g[cM + down] +
        g[cR + up] + g[cR + j] + g[cR + down];

      let state = g[cM + j];
      if (state === 0 && Math.random() < birthChance) {
        state = 1;
      }

      if (state === 0 && neighbours === 3) {
        n[cM + j] = 1;
      } else if (state === 1 && (neighbours < 2 || neighbours > 3)) {
        n[cM + j] = 0;
      } else {
        n[cM + j] = state;
      }
    }
  }

  grid = n;
  nextGrid = g;
}

function maybeStep(stepMs, birthChance) {
  const now = millis();
  if (now - lastStepTime >= stepMs) {
    lastStepTime = now;
    stepGrid(birthChance);
  }
}

// add a centred square (rectMode CENTER equivalent) to the current path
function addSquare(ctx, x, y, size) {
  const h = size / 2;
  ctx.rect(x - h, y - h, size, size);
}

// ===== CANVAS =====

// reserves space for screen size changes, fully regens cells when phaseShift is triggered
function refreshCanvas() {
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;
  if (width !== canvasWidth || height !== canvasHeight) {
    resizeCanvas(canvasWidth, canvasHeight);
  }
}

// debounced so dragging the window / mobile URL bar showing+hiding doesn't thrash the grid
let resizeTimer = null;
function windowResized() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    refreshCanvas();
    if (!firstRun) {
      buildGrid(0.125, true);
    }
  }, 150);
}

// quick value display for music data, sans advanced timing tools
function debugInfo(counter, vocal, drum, bass, other) {
  push();
  fill(255);
  text("counter: " + counter, 100, 100);
  text("vocal: " + vocal, 100, 200);
  text("drum: " + drum, 100, 300);
  text("bass: " + bass, 100, 400);
  text("other: " + other, 100, 500);
  pop();
}

function draw_one_frame(words, vocal, drum, bass, other, counter) {
  // maybe update this + other menu options to update on reselection instead of each frame
  if (!colorsInitialized) {
    setupColors();
  }

  colourTheme = 0;

  // drawing below goes straight to the 2D context in a handful of batched paths,
  // instead of thousands of individual p5 rect() calls per frame.
  const ctx = drawingContext;

  if (colourTheme == 0) {
    deadCol = colBlack;
    maxRes = 50;
    sceneDuration = 130;
    let aliveCol = aliveColTheme0;

    let colShift = map(drum, 0, 100, 0, 2, true);
    let bassMap = map(vocal, 0, 100, 0, 0.5, true);

    let shiftedCol = lerpColor(whiteCol, aliveCol[current], colShift);

    if (counter % sceneDuration == 0 && counter != 0) {
      phaseCheck = true;
      resolution += 10;
      if (resolution >= maxRes) {
        resolution = 20;
      }
      current++;
      if (current >= aliveCol.length) {
        current = 0;
      }
    }

    if (firstRun || phaseCheck) {
      refreshCanvas();
      buildGrid(drum > 60 ? 0.5 : 0.125, false);
      lastStepTime = millis();
      firstRun = false;
      phaseCheck = false;
    }

    if (bassFade) {
      let bassFadeAlpha = map(bass, 0, 100, fadeMax, 0, true);
      background(deadCol[0], deadCol[1], deadCol[2], bassFadeAlpha);
    } else {
      background(deadCol);
    }

    // appleSize once per frame
    if (vocal > 60) {
      appleSize = random(0.6, 1);
    } else if (vocal > 50) {
      appleSize = random(0.5, 0.8);
    } else if (vocal > 40) {
      appleSize = 0.5;
    } else if (vocal > 20) {
      appleSize = random(0.3, 0.4);
    } else {
      appleSize = 0.2;
    }

    const resMinusOne = resolution - 1;
    const resMinusFour = resolution - 4;
    const rectSize1 = resMinusOne * appleSize * 1.1;
    const rectSize2 = resMinusFour * 2;
    const rectSize3 = resMinusOne * 3;
    const rectSize4 = resMinusOne * 40 * bassMap;
    const drawInnerRect = (drum > 55 && drum < 65) || (bass > 28 && bass < 38);

    // one pass over the grid builds every layer's path
    const pathFill = new Path2D();  // small filled core
    const pathThin = new Path2D();  // core outline + middle square
    const pathOuter = new Path2D(); // large faint square
    const pathInner = drawInnerRect ? new Path2D() : null;

    for (let i = 0; i < cols; i++) {
      const x = i * resolution;
      const col = i * rows;
      for (let j = 0; j < rows; j++) {
        if (grid[col + j] === 1) {
          const y = j * resolution;
          addSquare(pathFill, x, y, rectSize1);
          addSquare(pathThin, x, y, rectSize2);
          addSquare(pathOuter, x, y, rectSize3);
          if (pathInner) addSquare(pathInner, x, y, rectSize4);
        }
      }
    }

    ctx.fillStyle = shiftedCol.toString();
    ctx.fill(pathFill);

    ctx.strokeStyle = colWhiteCss;
    ctx.lineWidth = 0.1;
    ctx.stroke(pathFill);
    ctx.stroke(pathThin);

    ctx.lineWidth = bassMap * 0.1;
    ctx.stroke(pathOuter);

    if (pathInner) {
      ctx.lineWidth = 0.2 * bassMap;
      ctx.strokeStyle = whiteColAlpha.toString();
      ctx.stroke(pathInner);
    }

    // birth flashes on heavy bass
    if (bass > 80) {
      const pathBirth = new Path2D();
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if (grid[i * rows + j] === 0 && countNeighbours(grid, i, j) === 3) {
            addSquare(pathBirth, i * resolution, j * resolution, resMinusOne * 4);
          }
        }
      }
      ctx.lineWidth = 0.1;
      ctx.strokeStyle = whiteColHighAlpha.toString();
      ctx.stroke(pathBirth);
    }

    // iterates the GOL based on a rate that is the product of audio activity
    maybeStep(STEP_MS_THEME0, 0.001);
  } else if (colourTheme == 1) {
    deadCol = colBlack;
    maxRes = 50;
    sceneDuration = 240;

    let aliveCol = aliveColTheme1;
    let colShift = map(drum, 0, 100, 0, 0.8, true);

    let shiftedCol = lerpColor(appleCol, aliveCol[current], colShift);

    if (counter % 240 == 0 && counter != 0) {
      phaseCheck = true;
      resolution += 10;
      if (resolution >= maxRes) {
        resolution = 20;
      }
      current++;
      if (current >= aliveCol.length) {
        current = 0;
      }
    }

    if (firstRun || phaseCheck) {
      refreshCanvas();
      buildGrid(0.5, false);
      lastStepTime = millis();
      firstRun = false;
      phaseCheck = false;
    }
    let bassFadeAlpha = map(bass, 0, 100, 100, 0, true);
    background(deadCol[0], deadCol[1], deadCol[2], bassFadeAlpha);

    const resPlusFive = resolution + 5;
    const resMinusOne = resolution - 1;
    const path = new Path2D();

    for (let i = 0; i < cols; i++) {
      const x = i * resolution;
      for (let j = 0; j < rows; j++) {
        if (grid[i * rows + j] === 1) {
          const y = j * resolution;
          const s = Math.random() * 0.1;
          const r = (resPlusFive * s) / 2;
          path.moveTo(x + r, y);
          path.arc(x, y, r, 0, Math.PI * 2);
          addSquare(path, x, y, resMinusOne * s);
        }
      }
    }
    ctx.fillStyle = shiftedCol.toString();
    ctx.fill(path);

    // iterates the GOL based on a rate that is the product of audio activity
    maybeStep(STEP_MS_THEME1, 0.125);
  } else {
    console.log(`invalid style option: ${colourTheme}`);
  }

  //debugInfo();
}

// check how many current "active/alive" neighbours a cell has (wrapping edges)
function countNeighbours(g, x, y) {
  let sum = 0;
  for (let di = -1; di < 2; di++) {
    const col = ((x + di + cols) % cols) * rows;
    for (let dj = -1; dj < 2; dj++) {
      sum += g[col + ((y + dj + rows) % rows)];
    }
  }
  return sum - g[x * rows + y];
}
