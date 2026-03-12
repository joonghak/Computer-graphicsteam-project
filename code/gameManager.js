export class GameManager {
    constructor() {
        this.countdownTimeout = null;
        this.countdownInterval = null;
        this.initializeGame();
    }

    initializeGame() {
        // 게임 상태
        this.gameState = {
            isGameOver: false,
            isCountdown: false,
            isRoundEnd: false,
            isPlaying: false,
            currentRound: 1,
            maxRounds: 3,
            roundTime: 180, 
            remainingTime: 60,
            scores: [0, 0],
            health: [100, 100],
            roundResults: []
        };

        this.ui = {
            timer: document.querySelector('.timer'),
            roundInfo: document.querySelector('.round-info'),
            healthBars: [
                document.querySelector('#player1 .health-fill'),
                document.querySelector('#player2 .health-fill')
            ],
            roundSymbols: [
                document.querySelectorAll('#player1 .round-symbol'),
                document.querySelectorAll('#player2 .round-symbol')
            ],
            result: document.getElementById('result'),
            resultText: document.getElementById('result-text'),
            restartButton: document.getElementById('restart-button'),
            countdown: document.getElementById('countdown')
        };

        this.ui.restartButton.addEventListener('click', () => this.returnToMenu());

        this.lastTime = performance.now();
        this.lastUIUpdate = performance.now();
        this.gameLoop();
    }

    startGame() {
        this.gameState.isPlaying = true;
        this.gameState.isCountdown = false;
        this.gameState.remainingTime = this.gameState.roundTime;
        this.lastTime = performance.now();
        this.lastUIUpdate = performance.now();
        this.startRound();
    }

    gameLoop() {
        if (!this.gameState.isPlaying) {
            requestAnimationFrame(() => this.gameLoop());
            return;
        }

        const now = performance.now();
        const deltaTime = (now - this.lastTime) / 1000;
        this.lastTime = now;

        this.updateGame(deltaTime, now);
        requestAnimationFrame(() => this.gameLoop());
    }

    updateGame(deltaTime, now) {
        if (!this.gameState.isPlaying) return;

        this.gameState.remainingTime = Math.max(0, this.gameState.remainingTime - deltaTime);
        
        this.checkGameOver();
        
        this.updateUI();
        
        if (this.gameState.remainingTime <= 0) {
            this.gameState.remainingTime = 0;
            this.handleTimeout();
        }
    }

    startRound() {
        this.gameState.isCountdown = true;
        this.gameState.isRoundEnd = false;
        this.gameState.isPlaying = false;
        this.gameState.remainingTime = this.gameState.roundTime;
        this.gameState.health = [100, 100];
        this.updateUI();


        if (window.keys) {
            Object.keys(window.keys).forEach(key => {
                window.keys[key] = false;
            });
        }


        window.resetPlayerPositions();


        this.showCountdown();
    }

    showCountdown() {

        if (this.countdownTimeout) clearTimeout(this.countdownTimeout);
        if (this.countdownInterval) clearInterval(this.countdownInterval);

        const countdown = this.ui.countdown;
        if (!countdown) return;

        countdown.style.display = 'block';
        this.gameState.isCountdown = true;
        this.gameState.isPlaying = false;

        countdown.textContent = 'READY?';
        countdown.classList.remove('fight');

        this.countdownTimeout = setTimeout(() => {
            let count = 3;
            this.countdownInterval = setInterval(() => {
                if (count > 0) {
                    countdown.textContent = count.toString();
                    count--;
                } else {
                    clearInterval(this.countdownInterval);
                    this.countdownInterval = null;

                    countdown.textContent = 'FIGHT!';
                    countdown.classList.add('fight');

                    this.gameState.isCountdown = false;
                    this.gameState.isPlaying = true;
                    this.lastTime = performance.now();
                    this.lastUIUpdate = performance.now();
                    this.updateUI();

                    setTimeout(() => {
                        countdown.style.display = 'none';
                        countdown.classList.remove('fight');
                    }, 1000);
                }
            }, 1000);
        }, 1000);
    }

    endRound(winner) {
        if (this.gameState.isRoundEnd) return; 
        
        this.gameState.isRoundEnd = true;
        this.gameState.isPlaying = false;


        if (window.keys) {
            Object.keys(window.keys).forEach(key => {
                window.keys[key] = false;
            });
        }

        window.resetPlayerPositions();

        this.gameState.roundResults.push(winner);
        

        if (winner > 0) {
            this.gameState.scores[winner - 1]++;
        }
        
        if (winner > 0) {
            const roundIndex = this.gameState.currentRound - 1;
            const symbols = this.ui.roundSymbols[winner - 1];
            if (symbols && symbols[roundIndex]) {
                symbols[roundIndex].classList.add('won');
            }
        }

        if (winner > 0 && this.gameState.scores[winner - 1] >= 2) {
            setTimeout(() => this.endGame(), 2000);
            return;
        }


        setTimeout(() => {
            if (this.gameState.currentRound < this.gameState.maxRounds) {
                this.startNextRound();
            } else {
                this.endGame();
            }
        }, 2000);
    }

    startNextRound() {
        this.gameState.currentRound++;
        this.startRound();
    }

    endGame() {
        this.gameState.isGameOver = true;
        this.gameState.isPlaying = false;
        

        let winner;
        if (this.gameState.scores[0] >= 2) {
            winner = 1;
        } else if (this.gameState.scores[1] >= 2) {
            winner = 2;
        } else if (this.gameState.scores[0] > this.gameState.scores[1]) {
            winner = 1;
        } else if (this.gameState.scores[1] > this.gameState.scores[0]) {
            winner = 2;
        } else {
            winner = 0;
        }


        if (winner > 0 && this.gameState.roundResults.length > 0) {
            const lastRoundIndex = this.gameState.currentRound - 1;
            const symbols = this.ui.roundSymbols[winner - 1];
            if (symbols && symbols[lastRoundIndex] && !symbols[lastRoundIndex].classList.contains('won')) {
                symbols[lastRoundIndex].classList.add('won');
            }
        }


        let resultMessage;
        if (winner === 0) {
            resultMessage = "Draw!";
        } else {
            resultMessage = `Player ${winner} wins!`;
        }

        if (this.ui.resultText && this.ui.result) {
            this.ui.resultText.textContent = resultMessage;
            this.ui.result.style.display = 'block';
        }
    }

    returnToMenu() {
        // 게임 씬 숨기기
        const gameScene = document.getElementById('game-scene');
        const menuScene = document.getElementById('menu-scene');
        if (gameScene) gameScene.classList.add('hidden');
        if (menuScene) menuScene.classList.remove('hidden');
        

        if (this.ui.result) {
            this.ui.result.style.display = 'none';
        }
        

        this.gameState.isGameOver = true;
        

        if (this.ui.roundSymbols) {
            this.ui.roundSymbols.forEach(symbols => {
                if (symbols) {
                    symbols.forEach(symbol => {
                        if (symbol) symbol.classList.remove('won');
                    });
                }
            });
        }
    }


    updateHealth(playerIndex, damage) {
        if (playerIndex >= 0 && playerIndex < 2 && this.gameState.isPlaying) {
            this.gameState.health[playerIndex] = Math.max(0, this.gameState.health[playerIndex] - damage);
            this.updateUI();
            console.log("체력 업데이트:", this.gameState.health[playerIndex]);
        }
    }

    updateUI() {
        if (this.ui.timer) {
            const minutes = Math.floor(this.gameState.remainingTime / 60);
            const seconds = Math.floor(this.gameState.remainingTime % 60);
            this.ui.timer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }


        if (this.ui.roundInfo) {
            this.ui.roundInfo.textContent = `Round ${this.gameState.currentRound}`;
        }


        this.updateHealthBars();
    }

    updateHealthBars() {
        if (this.ui.healthBars[0] && this.ui.healthBars[1]) {
            this.ui.healthBars[0].style.width = `${this.gameState.health[0]}%`;
            this.ui.healthBars[1].style.width = `${this.gameState.health[1]}%`;
        }
    }

    handleTimeout() {

        if (this.gameState.health[0] > this.gameState.health[1]) {
            this.endRound(1);
        } else if (this.gameState.health[1] > this.gameState.health[0]) {
            this.endRound(2);
        } else {
            this.endRound(0); 
        }
    }

    checkGameOver() {

        const player1Dead = this.gameState.health[0] <= 0;
        const player2Dead = this.gameState.health[1] <= 0;

        if (player1Dead || player2Dead) {
            if (player1Dead && player2Dead) {
                this.endRound(0); 
            } else if (player1Dead) {
                this.endRound(2);
            } else {
                this.endRound(1);
            }
        }
    }
}