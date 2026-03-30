const boardElement = document.getElementById("board");
const nextBoardElement = document.getElementById("next-board");
const scoreElement = document.getElementById("score");
const linesElement = document.getElementById("lines");
const levelElement = document.getElementById("level");
const statusElement = document.getElementById("status");
const startButton = document.getElementById("start-button");
const pauseButton = document.getElementById("pause-button");
const restartButton = document.getElementById("restart-button");
const overlayElement = document.getElementById("overlay");
const overlayTitleElement = document.getElementById("overlay-title");
const overlayCopyElement = document.getElementById("overlay-copy");
const touchButtons = document.querySelectorAll("[data-action]");

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const PREVIEW_SIZE = 4;

const PIECES = {
  I: {
    color: "sapphire",
    rotations: [
      [
        [0, 1],
        [1, 1],
        [2, 1],
        [3, 1],
      ],
      [
        [2, 0],
        [2, 1],
        [2, 2],
        [2, 3],
      ],
      [
        [0, 2],
        [1, 2],
        [2, 2],
        [3, 2],
      ],
      [
        [1, 0],
        [1, 1],
        [1, 2],
        [1, 3],
      ],
    ],
  },
  O: {
    color: "gold",
    rotations: [
      [
        [1, 0],
        [2, 0],
        [1, 1],
        [2, 1],
      ],
    ],
  },
  T: {
    color: "violet",
    rotations: [
      [
        [1, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      [
        [1, 0],
        [1, 1],
        [2, 1],
        [1, 2],
      ],
      [
        [0, 1],
        [1, 1],
        [2, 1],
        [1, 2],
      ],
      [
        [1, 0],
        [0, 1],
        [1, 1],
        [1, 2],
      ],
    ],
  },
  S: {
    color: "emerald",
    rotations: [
      [
        [1, 0],
        [2, 0],
        [0, 1],
        [1, 1],
      ],
      [
        [1, 0],
        [1, 1],
        [2, 1],
        [2, 2],
      ],
      [
        [1, 1],
        [2, 1],
        [0, 2],
        [1, 2],
      ],
      [
        [0, 0],
        [0, 1],
        [1, 1],
        [1, 2],
      ],
    ],
  },
  Z: {
    color: "ruby",
    rotations: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [2, 1],
      ],
      [
        [2, 0],
        [1, 1],
        [2, 1],
        [1, 2],
      ],
      [
        [0, 1],
        [1, 1],
        [1, 2],
        [2, 2],
      ],
      [
        [1, 0],
        [0, 1],
        [1, 1],
        [0, 2],
      ],
    ],
  },
  J: {
    color: "silver",
    rotations: [
      [
        [0, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      [
        [1, 0],
        [2, 0],
        [1, 1],
        [1, 2],
      ],
      [
        [0, 1],
        [1, 1],
        [2, 1],
        [2, 2],
      ],
      [
        [1, 0],
        [1, 1],
        [0, 2],
        [1, 2],
      ],
    ],
  },
  L: {
    color: "amber",
    rotations: [
      [
        [2, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      [
        [1, 0],
        [1, 1],
        [1, 2],
        [2, 2],
      ],
      [
        [0, 1],
        [1, 1],
        [2, 1],
        [0, 2],
      ],
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [1, 2],
      ],
    ],
  },
};

const PIECE_KEYS = Object.keys(PIECES);
const SCORE_TABLE = [0, 100, 300, 500, 800];

let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let clearedLines = 0;
let level = 1;
let isPlaying = false;
let isPaused = false;
let isGameOver = false;
let animationFrameId = 0;
let dropAccumulator = 0;
let lastFrameTime = 0;

const boardCells = [];
const nextCells = [];

function createGrid(container, cells, count) {
  for (let index = 0; index < count; index += 1) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cells.push(cell);
    container.appendChild(cell);
  }
}

function createEmptyBoard() {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array(BOARD_WIDTH).fill(null),
  );
}

function randomPiece() {
  const type = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];

  return {
    type,
    rotationIndex: 0,
    x: 3,
    y: 0,
  };
}

function getCellsForPiece(piece, rotationIndex = piece.rotationIndex) {
  return PIECES[piece.type].rotations[rotationIndex].map(([offsetX, offsetY]) => ({
    x: piece.x + offsetX,
    y: piece.y + offsetY,
  }));
}

function hasCollision(piece, x = piece.x, y = piece.y, rotationIndex = piece.rotationIndex) {
  const candidate = { ...piece, x, y, rotationIndex };

  return getCellsForPiece(candidate, rotationIndex).some((cell) => {
    if (cell.x < 0 || cell.x >= BOARD_WIDTH || cell.y >= BOARD_HEIGHT) {
      return true;
    }

    if (cell.y < 0) {
      return false;
    }

    return Boolean(board[cell.y][cell.x]);
  });
}

function mergeCurrentPiece() {
  getCellsForPiece(currentPiece).forEach((cell) => {
    if (cell.y >= 0) {
      board[cell.y][cell.x] = PIECES[currentPiece.type].color;
    }
  });
}

function clearLines() {
  let removed = 0;

  board = board.filter((row) => {
    const complete = row.every(Boolean);
    if (complete) {
      removed += 1;
    }
    return !complete;
  });

  while (board.length < BOARD_HEIGHT) {
    board.unshift(Array(BOARD_WIDTH).fill(null));
  }

  if (removed > 0) {
    clearedLines += removed;
    score += SCORE_TABLE[removed] * level;
    level = Math.floor(clearedLines / 10) + 1;
  }
}

function getDropInterval() {
  return Math.max(120, 820 - (level - 1) * 65);
}

function spawnPiece() {
  currentPiece = nextPiece || randomPiece();
  currentPiece.x = currentPiece.type === "I" ? 3 : 3;
  currentPiece.y = -1;
  currentPiece.rotationIndex = 0;
  nextPiece = randomPiece();

  if (hasCollision(currentPiece, currentPiece.x, currentPiece.y, currentPiece.rotationIndex)) {
    endGame();
  }
}

function updateStats() {
  scoreElement.textContent = String(score);
  linesElement.textContent = String(clearedLines);
  levelElement.textContent = String(level);
  statusElement.textContent = isGameOver
    ? "Défaite"
    : isPlaying
      ? isPaused
        ? "En pause"
        : "En jeu"
      : "En veille";
  pauseButton.textContent = isPaused ? "Reprendre" : "Pause";
}

function paintCell(cell, colorName) {
  cell.className = "cell";
  if (colorName) {
    const normalized = colorName === "gold" ? "sun" : colorName;
    cell.classList.add("filled", normalized);
  }
}

function renderBoard() {
  const activeMap = new Map();

  if (currentPiece) {
    getCellsForPiece(currentPiece).forEach((cell) => {
      if (cell.y >= 0) {
        activeMap.set(`${cell.x}:${cell.y}`, PIECES[currentPiece.type].color);
      }
    });
  }

  boardCells.forEach((cell, index) => {
    const x = index % BOARD_WIDTH;
    const y = Math.floor(index / BOARD_WIDTH);
    const activeColor = activeMap.get(`${x}:${y}`);
    const color = activeColor || board[y][x];
    paintCell(cell, color);
  });
}

function renderNextPiece() {
  nextCells.forEach((cell) => {
    cell.className = "cell";
  });

  if (!nextPiece) {
    return;
  }

  PIECES[nextPiece.type].rotations[0].forEach(([x, y]) => {
    const index = y * PREVIEW_SIZE + x;
    const color = PIECES[nextPiece.type].color;
    paintCell(nextCells[index], color);
  });
}

function updateOverlay(visible, title, copy) {
  overlayElement.classList.toggle("visible", visible);
  overlayTitleElement.textContent = title;
  overlayCopyElement.textContent = copy;
}

function draw() {
  renderBoard();
  renderNextPiece();
  updateStats();
}

function lockPiece() {
  mergeCurrentPiece();
  clearLines();
  spawnPiece();
  draw();
}

function softDrop() {
  if (!isPlaying || isPaused) {
    return;
  }

  if (!hasCollision(currentPiece, currentPiece.x, currentPiece.y + 1)) {
    currentPiece.y += 1;
  } else {
    lockPiece();
  }

  draw();
}

function hardDrop() {
  if (!isPlaying || isPaused) {
    return;
  }

  while (!hasCollision(currentPiece, currentPiece.x, currentPiece.y + 1)) {
    currentPiece.y += 1;
  }

  lockPiece();
}

function move(direction) {
  if (!isPlaying || isPaused) {
    return;
  }

  const nextX = currentPiece.x + direction;
  if (!hasCollision(currentPiece, nextX, currentPiece.y)) {
    currentPiece.x = nextX;
    draw();
  }
}

function rotatePiece() {
  if (!isPlaying || isPaused) {
    return;
  }

  const rotationCount = PIECES[currentPiece.type].rotations.length;
  const nextRotation = (currentPiece.rotationIndex + 1) % rotationCount;
  const kicks = [0, -1, 1, -2, 2];

  for (const offset of kicks) {
    if (!hasCollision(currentPiece, currentPiece.x + offset, currentPiece.y, nextRotation)) {
      currentPiece.x += offset;
      currentPiece.rotationIndex = nextRotation;
      draw();
      return;
    }
  }
}

function endGame() {
  isPlaying = false;
  isPaused = false;
  isGameOver = true;
  cancelAnimationFrame(animationFrameId);
  updateOverlay(
    true,
    "La muraille a cédé",
    "Relance une partie pour reforger la défense du château.",
  );
  updateStats();
}

function togglePause() {
  if (!isPlaying) {
    return;
  }

  isPaused = !isPaused;
  updateOverlay(
    isPaused,
    isPaused ? "Pause du conseil" : "",
    isPaused ? "Le forgeron attend ton signal pour reprendre." : "",
  );
  updateStats();

  if (!isPaused) {
    lastFrameTime = performance.now();
    animationFrameId = requestAnimationFrame(gameLoop);
  } else {
    cancelAnimationFrame(animationFrameId);
  }
}

function resetGame() {
  board = createEmptyBoard();
  currentPiece = null;
  nextPiece = randomPiece();
  score = 0;
  clearedLines = 0;
  level = 1;
  isGameOver = false;
  dropAccumulator = 0;
  lastFrameTime = 0;
}

function startGame() {
  cancelAnimationFrame(animationFrameId);
  resetGame();
  isPlaying = true;
  isPaused = false;
  updateOverlay(false, "", "");
  spawnPiece();
  draw();
  lastFrameTime = performance.now();
  animationFrameId = requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
  if (!isPlaying || isPaused) {
    return;
  }

  if (!lastFrameTime) {
    lastFrameTime = timestamp;
  }

  const delta = timestamp - lastFrameTime;
  lastFrameTime = timestamp;
  dropAccumulator += delta;

  if (dropAccumulator >= getDropInterval()) {
    dropAccumulator = 0;
    softDrop();
  }

  animationFrameId = requestAnimationFrame(gameLoop);
}

function handleAction(action) {
  switch (action) {
    case "left":
      move(-1);
      break;
    case "right":
      move(1);
      break;
    case "rotate":
      rotatePiece();
      break;
    case "down":
      softDrop();
      break;
    case "drop":
      hardDrop();
      break;
    default:
      break;
  }
}

document.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) || event.code === "Space") {
    event.preventDefault();
  }

  if (event.key === "p" || event.key === "P") {
    togglePause();
    return;
  }

  if (!isPlaying || isPaused) {
    return;
  }

  switch (event.key) {
    case "ArrowLeft":
      handleAction("left");
      break;
    case "ArrowRight":
      handleAction("right");
      break;
    case "ArrowUp":
      handleAction("rotate");
      break;
    case "ArrowDown":
      handleAction("down");
      break;
    default:
      if (event.code === "Space") {
        handleAction("drop");
      }
  }
});

startButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", togglePause);
restartButton.addEventListener("click", startGame);

touchButtons.forEach((button) => {
  button.addEventListener("click", () => {
    handleAction(button.dataset.action);
  });
});

createGrid(boardElement, boardCells, BOARD_WIDTH * BOARD_HEIGHT);
createGrid(nextBoardElement, nextCells, PREVIEW_SIZE * PREVIEW_SIZE);
resetGame();
draw();
