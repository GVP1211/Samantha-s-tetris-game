import { useEffect } from 'react';
import './App.css'

class Tetris {
  width: number;
  height: number;
  grid: (number | string)[][];
  score: number;
  gameOver: boolean;
  speedLevel: number;
  shapes: { [key: string]: number[][] };
  colors: { [key: string]: string };
  currentPiece: { type: string; shape: number[][]; x: number; y: number } | null;
  nextPiece: { type: string; shape: number[][]; x: number; y: number } | null;

  constructor(width = 10, height = 20) {
      this.width = width;
      this.height = height;
      this.grid = Array(height).fill(null).map(() => Array(width).fill(0));
      this.score = 0;
      this.gameOver = false;
      this.speedLevel = 1;

      // Define tetromino shapes and colors
      this.shapes = {
          'I': [[1, 1, 1, 1]], // Cyan
          'O': [[1, 1], [1, 1]], // Yellow
          'T': [[0, 1, 0], [1, 1, 1]], // Purple
          'S': [[0, 1, 1], [1, 1, 0]], // Green
          'Z': [[1, 1, 0], [0, 1, 1]], // Red
          'J': [[1, 0, 0], [1, 1, 1]], // Blue
          'L': [[0, 0, 1], [1, 1, 1]]  // Orange
      };

      this.colors = {
          'I': '#00f0f0',
          'O': '#f0f000',
          'T': '#a000f0',
          'S': '#00f000',
          'Z': '#f00000',
          'J': '#0000f0',
          'L': '#f0a000'
      };

      this.currentPiece = null;
      this.nextPiece = this.generatePiece();
  }

  generatePiece() {
      const pieces = Object.keys(this.shapes);
      const type = pieces[Math.floor(Math.random() * pieces.length)];
      const shape = this.shapes[type];
      return {
          type,
          shape: JSON.parse(JSON.stringify(shape)),
          x: Math.floor((this.width - shape[0].length) / 2),
          y: 0
      };
  }

  rotate(piece: { shape: number[][]; type?: string; x?: number; y?: number }) {
      const newShape = Array(piece.shape[0].length).fill(null)
          .map(() => Array(piece.shape.length).fill(0));

      for (let y = 0; y < piece.shape.length; y++) {
          for (let x = 0; x < piece.shape[y].length; x++) {
              newShape[x][piece.shape.length - 1 - y] = piece.shape[y][x];
          }
      }

      const rotated = {
          type: piece.type,
          shape: newShape,
          x: piece.x || 0,
          y: piece.y || 0
      };

      return this.isValidMove(rotated) ? rotated : piece;
  }

  isValidMove(piece: { shape: number[][]; type?: string; x: number; y: number }) {
      return piece.shape.every((row, dy) =>
          row.every((value, dx) =>
              value === 0 ||
              (piece.x + dx >= 0 &&
               piece.x + dx < this.width &&
               piece.y + dy < this.height &&
               !this.grid[piece.y + dy]?.[piece.x + dx])
          )
      );
  }

  movePiece(dx: number, dy: number) {
      if (!this.currentPiece) return false;
      const newPiece = {
          ...this.currentPiece,
          x: this.currentPiece.x + dx,
          y: this.currentPiece.y + dy
      };

      if (this.isValidMove(newPiece)) {
          this.currentPiece = newPiece;
          return true;
      }
      return false;
  }

  mergePiece() {
      if (!this.currentPiece) return;
      const piece = this.currentPiece;
      piece.shape.forEach((row, dy) => {
          row.forEach((value, dx) => {
              if (value) {
                  const y = piece.y + dy;
                  const x = piece.x + dx;
                  if (y >= 0 && y < this.height) {
                      this.grid[y][x] = piece.type;
                  }
              }
          });
      });
      this.score += 10;
  }

  clearLines() {
      let linesCleared = 0;
      for (let y = this.height - 1; y >= 0; y--) {
          if (this.grid[y].every(cell => cell !== 0)) {
              this.grid.splice(y, 1);
              this.grid.unshift(Array(this.width).fill(0));
              linesCleared++;
              y++;
          }
      }
      if (linesCleared > 0) {
          const linePoints = [0, 100, 300, 500, 800];
          this.score += linePoints[linesCleared];

          if (Math.floor(this.score / 300) > (this.speedLevel - 1)) {
              this.speedLevel++;
          }
      }
  }

  spawnPiece() {
      this.currentPiece = this.nextPiece;
      this.nextPiece = this.generatePiece();

      if (!this.currentPiece || !this.isValidMove(this.currentPiece)) {
          this.gameOver = true;
      }
  }

  tick() {
      if (this.gameOver) return;

      if (!this.currentPiece) {
          this.spawnPiece();
          return;
      }

      if (!this.movePiece(0, 1)) {
          this.mergePiece();
          this.clearLines();
          this.spawnPiece();
      }
  }

  hardDrop() {
      while (this.movePiece(0, 1)) { }
      this.tick();
  }
}

function App() {
  useEffect(() => {
    const gameCanvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const nextPieceCanvas = document.getElementById('nextPieceCanvas') as HTMLCanvasElement;
    const scoreElement = document.getElementById('score');
    const startButton = document.getElementById('startButton') as HTMLButtonElement;

    if (!gameCanvas || !nextPieceCanvas || !scoreElement || !startButton) {
        console.error('Required elements not found');
        return;
    }

    const ctx = gameCanvas.getContext('2d');
    const nextCtx = nextPieceCanvas.getContext('2d');
    
    if (!ctx || !nextCtx) {
        console.error('Canvas context not found');
        return;
    }

    const BLOCK_SIZE = 30;
    const BASE_GAME_SPEED = 300;
    let game: Tetris | null = null;
    let gameLoop: number | null = null;
    let lastDropTime = 0;
    let controlsMap: Record<string, string> = {};
    const discoveredControls = new Set<string>();

    const availableKeys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
        .filter(key => !['F', 'R', 'P', 'M'].includes(key));

    function generateRandomControls() {
        const shuffled = [...availableKeys].sort(() => Math.random() - 0.5);
        return {
            left: shuffled[0],
            right: shuffled[1],
            rotate: shuffled[2],
            softDrop: shuffled[3],
            hardDrop: shuffled[4]
        };
    }

    function drawBlock(context: CanvasRenderingContext2D | null, x: number, y: number, color: string) {
        if (!context) return;
        context.fillStyle = color;
        context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
        context.fillStyle = 'rgba(255, 255, 255, 0.2)';
        context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE / 4);
    }

    function drawGame() {
        if (!ctx || !game) return;
        ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

        game.grid.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value && game) {
                    drawBlock(ctx, x, y, game.colors[value]);
                }
            });
        });

        const currentPiece = game.currentPiece;
        if (currentPiece) {
            currentPiece.shape.forEach((row, dy) => {
                row.forEach((value, dx) => {
                    if (value && game) {
                        drawBlock(
                            ctx,
                            currentPiece.x + dx,
                            currentPiece.y + dy,
                            game.colors[currentPiece.type]
                        );
                    }
                });
            });
        }
    }

    function drawNextPiece() {
        if (!nextCtx || !game || !game.nextPiece) return;
        nextCtx.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);

        const offsetX = (nextPieceCanvas.width / BLOCK_SIZE - game.nextPiece.shape[0].length) / 2;
        const offsetY = (nextPieceCanvas.height / BLOCK_SIZE - game.nextPiece.shape.length) / 2;

        game.nextPiece.shape.forEach((row, dy) => {
            row.forEach((value, dx) => {
                if (value) {
                    drawBlock(
                        nextCtx,
                        offsetX + dx,
                        offsetY + dy,
                        game.nextPiece?.type ? game.colors[game.nextPiece.type] : '#000000'
                    );
                }
            });
        });
    }

    function updateScore() {
        if (scoreElement && game) {
            scoreElement.textContent = game.score.toString();
        }
    }

    function updateControls() {
        const controlsDiv = document.querySelector('.controls');
        if (!controlsDiv) return;
        controlsDiv.innerHTML = '<h3>Controls</h3>';

        const controlDescriptions: Record<'left' | 'right' | 'rotate' | 'softDrop' | 'hardDrop', string> = {
            left: '← Move Left',
            right: '→ Move Right',
            rotate: '↻ Rotate',
            softDrop: '↓ Soft Drop',
            hardDrop: '⬇ Hard Drop'
        };

        for (const [action, key] of Object.entries(controlsMap)) {
            if (discoveredControls.has(action)) {
                controlsDiv.innerHTML += `<p>${key} : ${controlDescriptions[action as keyof typeof controlDescriptions]}</p>`;
            } else {
                controlsDiv.innerHTML += `<p>? : ${controlDescriptions[action as keyof typeof controlDescriptions]}</p>`;
            }
        }
    }

    function endGame() {
        if (gameLoop) cancelAnimationFrame(gameLoop);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over!', gameCanvas.width / 2, gameCanvas.height / 2);
        startButton.textContent = 'Play Again';
        startButton.disabled = false;
    }

    function update(timestamp: number) {
        if (!game) return;
        if (!game.gameOver) {
            const currentSpeed = BASE_GAME_SPEED / (game.speedLevel * 1.2);
            if (timestamp - lastDropTime > currentSpeed) {
                game.tick();
                lastDropTime = timestamp;
            }
            drawGame();
            drawNextPiece();
            updateScore();
            gameLoop = requestAnimationFrame(update);
        } else {
            endGame();
        }
    }

    function handleKeyPress(event: { key: string; }) {
        if (game && game.gameOver) return;
        const key = event.key.toUpperCase();
        let actionTaken = false;

        Object.entries(controlsMap).forEach(([action, controlKey]) => {
            if (key === controlKey && game) {
                discoveredControls.add(action);
                switch (action) {
                    case 'left':
                        actionTaken = game.movePiece(-1, 0);
                        break;
                    case 'right':
                        actionTaken = game.movePiece(1, 0);
                        break;
                    case 'softDrop':
                        actionTaken = game.movePiece(0, 1);
                        break;
                    case 'rotate':
                        if (game.currentPiece) {
                            const rotatedPiece = game.rotate(game.currentPiece);
                            if (rotatedPiece.type) {
                                game.currentPiece = rotatedPiece as { type: string; shape: number[][]; x: number; y: number };
                            }
                        }
                        actionTaken = true;
                        break;
                    case 'hardDrop':
                        game.hardDrop();
                        actionTaken = true;
                        break;
                }
            }
        });

        if (actionTaken) {
            updateControls();
            drawGame();
        }
    }

    function startGame() {
        game = new Tetris();
        controlsMap = generateRandomControls();
        discoveredControls.clear();
        startButton.disabled = true;
        document.addEventListener('keydown', handleKeyPress);
        lastDropTime = performance.now();
        updateControls();
        gameLoop = requestAnimationFrame(update);
    }

    // Attach the start game listener
    startButton.addEventListener('click', startGame);

    // Clean up the event listener on unmount
    return () => {
      startButton.removeEventListener('click', startGame);
      document.removeEventListener('keydown', handleKeyPress);
      if (gameLoop) cancelAnimationFrame(gameLoop);
    }
  }, []);

  return (
    <>
      <div className="container py-4">
        <div className="row justify-content-center">
            <div className="col-md-8 text-center">
                <h1 className="mb-4">Tetris</h1>
                <div className="game-container">
                    <canvas id="gameCanvas" width="300" height="600"></canvas>
                    <div className="game-info ms-4">
                        <div className="next-piece-container mb-4">
                            <h3>Next Piece</h3>
                            <canvas id="nextPieceCanvas" width="100" height="100"></canvas>
                        </div>
                        <div className="score-container">
                            <h3>Score</h3>
                            <div id="score" className="score">0</div>
                        </div>
                        <div className="controls mt-4">
                            <h3>Controls</h3>
                            <p>← → : Move</p>
                            <p>↑ : Rotate</p>
                            <p>↓ : Soft Drop</p>
                            <p>Space : Hard Drop</p>
                        </div>
                    </div>
                </div>
                <button id="startButton" className="btn btn-primary mt-4">Start Game</button>
            </div>
        </div>
      </div>
    </>
  );
}

export default App;
