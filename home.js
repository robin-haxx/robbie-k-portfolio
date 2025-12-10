// ===== GLOBAL VARIABLES =====
// Note: canvasSize, canvasWidth, canvasHeight are declared in system_runner.js

let colourTheme = 1;

let firstRun = true;
let phaseCheck = false;
let bassFade = false; // bass-driven "ghost" effect. uses alpha; can eat performance.
let fadeMax = 150; // when bassfade is true, lower value means more "ghosting"

let gridX = 5;
let gridY = 5;
let cellsX;
let cellsY;

let grid;
let cols;
let rows;
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

//let aliveCol = [colGreen,colYellow,colBlack,colCream];
let deadCol = colWhite;
let current = 0;
let addSize = 0;

let appleSize;

let sceneDuration = 130; // counter ticks (60/second) each scene lasts. supports updating during playback scope.
let maxRes = 50;

// PRE-CREATED COLOR OBJECTS 
let whiteCol, whiteColAlpha, whiteColHighAlpha, appleCol, greenCol, yellowCol, blackCol, creamCol, greyCol, greyColTwo;

// Track if colors have been initialized
let colorsInitialized = false;

// Pre-allocated arrays and cached values
let nextGrid;
let aliveColTheme0;
let aliveColTheme1;
let cachedBgColor;
let lastDeadCol = null;

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

// reserves space for screen size changes, fully regens cells when phaseShift is triggered
function refreshCanvas() {
  clear();
  
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;
  
  console.log(canvasWidth, canvasHeight);
  resizeCanvas(canvasWidth, canvasHeight);
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

// function windowResized() {
//   resizeCanvas(windowWidth, windowHeight);
// }

function draw_one_frame(words, vocal, drum, bass, other, counter) {
  // maybe update this + other menu options to update on reselection instead of each frame
  if (!colorsInitialized) {
    setupColors();
  }
  
  colourTheme = 0;

  ellipseMode(CENTER);
  rectMode(CENTER);

  // next steps: move as much out of these statements as possible to preserve individual changes, start building other themes
  if (colourTheme == 0) {
    deadCol = colBlack;
    maxRes = 50;
    //resolution = 20;
    sceneDuration = 130;
    //let aliveCol = [yellowCol,greenCol,creamCol,blackCol];
    let aliveCol = aliveColTheme0;

    let resMap = map(other, 0, 100, 80, 10, true); //unused
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

      // push();
      // fill(deadCol);
      // noStroke();
      // rect(canvasWidth/2,canvasHeight/2,canvasWidth,canvasHeight)
      // pop();
      cols = round(canvasWidth / resolution); //very important to round these to account for math error in dividing canvas
      rows = round(canvasHeight / resolution);
      grid = make2DArray(cols, rows);
      nextGrid = make2DArray(cols, rows);
      
      let threshold = drum > 60 ? 0.5 : 0.125;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          grid[i][j] = random() < threshold ? 1 : 0;
        }
      }
      firstRun = false;
      phaseCheck = false;
    }

    if (bassFade) {
      let bassFadeAlpha = map(bass, 0, 100, fadeMax, 0, true);
      let bgColor = color(deadCol[0], deadCol[1], deadCol[2], bassFadeAlpha);
      background(bgColor);
    } else {
      background(deadCol);
    }

    // Pre-calculate appleSize once per frame
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

    // Pre-calculate constants
    const resMinusOne = resolution - 1;
    const resMinusFour = resolution - 4;
    const bassMapWeight = bassMap * 0.1;
    const vocalWeight = 0.01 * vocal;
    const bassMapWeight2 = 0.2 * bassMap;
    const rectSize1 = resMinusOne * appleSize * 1.1;
    const rectSize2 = resMinusFour * 2;
    const rectSize3 = resMinusOne * 3;
    const rectSize4 = resMinusOne * 40 * bassMap;
    const drawExtraRects = drum < 65 || bass < 38;
    const drawInnerRect = (drum > 55 && drum < 65) || (bass > 28 && bass < 38);

    // Draw all alive cells
    fill(shiftedCol);
    stroke(colWhite);
    strokeWeight(0.1);
    
    for (let i = 0; i < cols; i++) {
      let x = i * resolution;
      for (let j = 0; j < rows; j++) {
        if (grid[i][j] == 1) {
          let y = j * resolution;
          //fill(aliveCol[current]);
          //stroke(bass*5);

          //strokeWeight(drum/40)
          //circle(x,y,((resolution+5)* appleSize))
          rect(x, y, rectSize1);
          noFill();
          rect(x, y, rectSize2);

          strokeWeight(bassMapWeight);
          rect(x, y, rectSize3);
          
          if (drawExtraRects) {
            stroke(bass);
            strokeWeight(vocalWeight);
            // line(x - 50, y, x + 50, y);
            // line(x, y - 50, x, y + 50);
            if (drawInnerRect) {
              strokeWeight(bassMapWeight2);
              stroke(whiteColAlpha);
              rect(x, y, rectSize4);
            }
          }
          
          // Reset for next cell
          fill(shiftedCol);
          stroke(colWhite);
          strokeWeight(0.1);
        }
      }
    }

    // Compute next based on grid
    const shouldDrawHighBass = bass > 80;
    
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        let state = grid[i][j];
        // Count live neighbors!
        let sum = 0;
        let neighbours = countNeighbours(grid, i, j);

        if (state == 0) {
          if (random() < 0.001) {
            state = 1;
          }
        }

        if (state == 0 && neighbours == 3) {
          if (shouldDrawHighBass) {
            stroke(whiteColHighAlpha);
            strokeWeight(0.1);
            noFill();
            rect(i * resolution, j * resolution, resMinusOne * 4);
          }
          // line(
          //   i * resolution - 20,
          //   j * resolution,
          //   i * resolution + 20,
          //   j * resolution,
          // );
          // line(
          //   i * resolution,
          //   j * resolution - 20,
          //   i * resolution,
          //   j * resolution + 20,
          // );
          nextGrid[i][j] = 1;
        } else if (state == 1 && (neighbours < 2 || neighbours > 3)) {
          //addSize -=1;

          nextGrid[i][j] = 0;
        } else {
          //addSize -=1;

          nextGrid[i][j] = state;
        }
      }
    }

    // iterates the GOL based on a rate that is the product of audio activity
    if (frameCount % 16 == 0) {
      let temp = grid;
      grid = nextGrid;
      nextGrid = temp;
    }
  } else if (colourTheme == 1) {
    deadCol = colBlack;
    //resolution = 20;
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
      cols = round(canvasWidth / resolution);
      rows = round(canvasHeight / resolution);
      grid = make2DArray(cols, rows);
      nextGrid = make2DArray(cols, rows);
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          grid[i][j] = random() < 0.5 ? 1 : 0;
        }
      }
      firstRun = false;
      phaseCheck = false;
    }
    let bassFadeAlpha = map(bass, 0, 100, 100, 0, true);
    let bgColor = color(deadCol[0], deadCol[1], deadCol[2], bassFadeAlpha);
    background(bgColor);

    // Pre-calculate sizes
    const resPlusFive = resolution + 5;
    const resMinusOne = resolution - 1;
    
    fill(shiftedCol);
    //stroke(bass*5);
    noStroke();
    
    for (let i = 0; i < cols; i++) {
      let x = i * resolution;
      for (let j = 0; j < rows; j++) {
        if (grid[i][j] == 1) {
          let y = j * resolution;
          //fill(aliveCol[current]);
          appleSize = random(0, 0.1);
          //strokeWeight(drum/40)
          circle(x, y, resPlusFive * appleSize);
          rect(x, y, resMinusOne * appleSize);
        }
      }
    }

    // Compute next based on grid
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        let state = grid[i][j];
        // Count live neighbors!
        let sum = 0;
        let neighbours = countNeighbours(grid, i, j);

        if (state == 0) {
          if (random() < 0.125) {
            state = 1;
          }
        }
        if (state == 0 && neighbours == 3) {
          nextGrid[i][j] = 1;
        } else if (state == 1 && (neighbours < 2 || neighbours > 3)) {
          nextGrid[i][j] = 0;
        } else {
          nextGrid[i][j] = state;
        }
      }
    }
    // iterates the GOL based on a rate that is the product of audio activity
    if (frameCount % 8 == 0) {
      let temp = grid;
      grid = nextGrid;
      nextGrid = temp;
    }
  } else {
    console.log(`invalid style option: ${colourTheme}`);
  }

  //debugInfo();
}

// constructor for cell array (current and next)
function make2DArray(cols, rows) {
  let arr = new Array(cols);
  for (let i = 0; i < cols; i++) {
    arr[i] = new Array(rows);
  }
  return arr;
}

// check how many current "active/alive" neighbours a cell has, return int sum to decide how it advances in next
function countNeighbours(grid, x, y) {
  let sum = 0;
  let colsMinusOne = cols - 1;
  let rowsMinusOne = rows - 1;
  
  for (let i = -1; i < 2; i++) {
    let col = x + i;
    if (col < 0) col = colsMinusOne;
    else if (col >= cols) col = 0;
    
    for (let j = -1; j < 2; j++) {
      let row = y + j;
      if (row < 0) row = rowsMinusOne;
      else if (row >= rows) row = 0;
      
      sum += grid[col][row];
    }
  }
  sum -= grid[x][y];
  return sum;
}