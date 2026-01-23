<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { useCompetitiveGame } from "../composables/useCompetitiveGame";
import type { Level, Position } from "../types/game";
import CompetitiveTile from "./CompetitiveTile.vue";
import GameCharacter from "./GameCharacter.vue";
import DewCharacter from "./DewCharacter.vue";

const TILE_SIZE = 64;
const GAP_SIZE = 3;

const props = defineProps<{
	level: Level;
}>();

const emit = defineEmits<{
	gameOver: [winner: "player1" | "player2" | "tie"];
	backToMenu: [];
}>();

const game = useCompetitiveGame(props.level);

// Keyboard handling
function handleKeyDown(e: KeyboardEvent) {
	if (e.key === "Escape") {
		emit("backToMenu");
		return;
	}
	game.handleKeyDown(e);
}

onMounted(() => {
	window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
	window.removeEventListener("keydown", handleKeyDown);
});

// Game over state is handled by the game composable

// Board style
const boardStyle = computed(() => ({
	gridTemplateColumns: `repeat(${game.levelWidth}, ${TILE_SIZE}px)`,
	gridTemplateRows: `repeat(${game.levelHeight}, ${TILE_SIZE}px)`,
	gap: `${GAP_SIZE}px`,
}));

// Check if a position has a valid move indicator
function isValidMove(pos: Position): boolean {
	return game.currentValidMoves.value.some(
		(m) => m.x === pos.x && m.y === pos.y,
	);
}

// Check if a position was just planted
function isJustPlanted(pos: Position): boolean {
	const planted = game.lastPlantedPosition.value;
	return planted !== null && planted.x === pos.x && planted.y === pos.y;
}

// Handle tile click
function handleTileClick(pos: Position): void {
	game.handleClick(pos);
}

function handleRestart(): void {
	game.initializeGame();
}
</script>

<template>
  <div class="competitive-game">
    <!-- Score Header -->
    <div class="score-header">
      <div :class="['player-score', 'player-score--p1', { 'player-score--active': game.isPlayer1Turn.value }]">
        <div class="player-avatar player-avatar--p1">
          <img src="/art/MushroomGirl.webp" alt="Mushroom Girl" class="avatar-img" />
        </div>
        <div class="player-info">
          <span class="player-name">Sprout</span>
          <span class="player-mushrooms">{{ game.player1Score.value }}</span>
          <span v-if="game.player1ExtraTurns.value > 0" class="bonus-indicator">+{{ game.player1ExtraTurns.value }} turns</span>
        </div>
        <div v-if="game.player1Stuck.value" class="stuck-badge">Stuck!</div>
      </div>

      <div class="turn-indicator">
        <span v-if="!game.gameOver.value">
          <template v-if="game.isPlayer1Turn.value">Your Turn</template>
          <template v-else>
            <span v-if="game.isAiThinking.value" class="ai-thinking">Dew is thinking...</span>
            <span v-else>Dew's Turn</span>
          </template>
        </span>
        <span v-else class="game-over-text">Game Over!</span>
      </div>

      <div :class="['player-score', 'player-score--p2', { 'player-score--active': game.isPlayer2Turn.value }]">
        <div class="player-avatar player-avatar--p2">
          <img src="/art/Dew.webp" alt="Dew" class="avatar-img" />
        </div>
        <div class="player-info">
          <span class="player-name">Dew <span class="ai-badge">AI</span></span>
          <span class="player-mushrooms">{{ game.player2Score.value }}</span>
          <span v-if="game.player2ExtraTurns.value > 0" class="bonus-indicator">+{{ game.player2ExtraTurns.value }} turns</span>
        </div>
        <div v-if="game.player2Stuck.value" class="stuck-badge">Stuck!</div>
      </div>
    </div>

    <!-- Game Board -->
    <div class="board-container">
      <div class="board" :style="boardStyle">
        <CompetitiveTile
          v-for="tile in game.tiles.value.flat()"
          :key="`${tile.position.x}-${tile.position.y}`"
          :tile="tile"
          :is-player1-here="game.player1Position.value.x === tile.position.x && game.player1Position.value.y === tile.position.y"
          :is-player2-here="game.player2Position.value.x === tile.position.x && game.player2Position.value.y === tile.position.y"
          :is-valid-move="isValidMove(tile.position)"
          :is-just-planted="isJustPlanted(tile.position)"
          @click="handleTileClick(tile.position)"
        />

        <!-- Player 1 (Mushroom Girl) -->
        <GameCharacter
          :position="game.player1Position.value"
          :is-hopping="game.player1Hopping.value"
          :is-sliding="false"
          :is-bouncing="false"
          :is-stuck="game.player1Stuck.value"
          :is-teleporting="false"
          :teleport-phase="null"
          :facing-direction="game.player1Facing.value"
          :board-padding="0"
          :disabled="!game.isPlayer1Turn.value"
        />

        <!-- Player 2 (Dew) -->
        <DewCharacter
          :position="game.player2Position.value"
          :is-hopping="game.player2Hopping.value"
          :is-sliding="false"
          :is-bouncing="false"
          :is-stuck="game.player2Stuck.value"
          :is-teleporting="false"
          :teleport-phase="null"
          :facing-direction="game.player2Facing.value"
          :board-padding="0"
          :disabled="!game.isPlayer2Turn.value"
        />
      </div>
    </div>

    <!-- Coin Flip Modal -->
    <Transition name="modal">
      <div v-if="game.showCoinFlip.value" class="coin-flip-overlay" @click="game.dismissCoinFlip">
        <div class="coin-flip-modal" @click.stop>
          <h2 class="coin-flip-title">Coin Flip!</h2>
          <div class="coin-flip-result">
            <img
              :src="game.coinFlipResult.value === 'player1' ? '/art/MushroomGirl.webp' : '/art/Dew.webp'"
              :alt="game.coinFlipResult.value === 'player1' ? 'Mushroom Girl' : 'Dew'"
              class="coin-winner-img"
            />
            <p class="coin-winner-text">
              {{ game.coinFlipResult.value === 'player1' ? 'Sprout' : 'Dew' }} goes first!
            </p>
          </div>
          <button class="coin-flip-button" @click="game.dismissCoinFlip">
            Start Game
          </button>
        </div>
      </div>
    </Transition>

    <!-- Game Over Modal -->
    <Transition name="modal">
      <div v-if="game.gameOver.value" class="game-over-overlay">
        <div class="game-over-modal">
          <h2 class="game-over-title">
            <template v-if="game.winner.value === 'tie'">It's a Tie!</template>
            <template v-else>
              {{ game.winner.value === 'player1' ? 'Sprout' : 'Dew' }} Wins!
            </template>
          </h2>
          <div class="final-scores">
            <div class="final-score final-score--p1">
              <img src="/art/MushroomGirl.webp" alt="Sprout" class="final-avatar" />
              <span class="final-name">Sprout</span>
              <span class="final-count">{{ game.player1Score.value }}</span>
            </div>
            <div class="score-separator">vs</div>
            <div class="final-score final-score--p2">
              <img src="/art/Dew.webp" alt="Dew" class="final-avatar" />
              <span class="final-name">Dew</span>
              <span class="final-count">{{ game.player2Score.value }}</span>
            </div>
          </div>
          <div class="game-over-buttons">
            <button class="game-over-button" @click="handleRestart">
              Play Again
            </button>
            <button class="game-over-button game-over-button--secondary" @click="emit('backToMenu')">
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Bottom Bar -->
    <div class="bottom-bar">
      <button class="bottom-button" @click="handleRestart">
        Restart
      </button>
      <button class="bottom-button" @click="emit('backToMenu')">
        Quit
      </button>
    </div>
  </div>
</template>

<style scoped>
.competitive-game {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: linear-gradient(180deg, #4a6741 0%, #3d5636 50%, #2d4028 100%);
}

/* Score Header */
.score-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.2);
}

.player-score {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
  position: relative;
}

.player-score--active {
  background: rgba(255, 255, 255, 0.25);
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.3);
}

.player-score--p1.player-score--active {
  background: rgba(200, 80, 80, 0.3);
  box-shadow: 0 0 12px rgba(200, 80, 80, 0.4);
}

.player-score--p2.player-score--active {
  background: rgba(80, 80, 200, 0.3);
  box-shadow: 0 0 12px rgba(80, 80, 200, 0.4);
}

.player-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid rgba(255, 255, 255, 0.3);
}

.player-avatar--p1 {
  border-color: rgba(200, 80, 80, 0.6);
}

.player-avatar--p2 {
  border-color: rgba(80, 80, 200, 0.6);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
}

.player-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.player-name {
  font-family: 'Georgia', serif;
  font-size: 14px;
  color: #c8d4b8;
}

.player-mushrooms {
  font-family: 'Georgia', serif;
  font-size: 24px;
  font-weight: bold;
  color: #f5edd6;
}

.bonus-indicator {
  font-size: 11px;
  color: #a8d898;
  background: rgba(124, 182, 104, 0.3);
  padding: 2px 6px;
  border-radius: 4px;
}

.stuck-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #e85a5a;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: bold;
}

.turn-indicator {
  font-family: 'Georgia', serif;
  font-size: 18px;
  color: #f5edd6;
  text-align: center;
}

.game-over-text {
  color: #e8a87c;
}

.ai-badge {
  font-size: 10px;
  background: rgba(80, 80, 200, 0.4);
  padding: 2px 5px;
  border-radius: 3px;
  margin-left: 4px;
  vertical-align: middle;
}

.ai-thinking {
  animation: pulse-text 1s ease-in-out infinite;
}

@keyframes pulse-text {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Board Container */
.board-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow: auto;
}

.board {
  display: grid;
  position: relative;
  background: rgba(0, 0, 0, 0.2);
  padding: 12px;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

/* Bottom Bar */
.bottom-bar {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
}

.bottom-button {
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  font-family: 'Georgia', serif;
  font-size: 14px;
  color: #c8d4b8;
  cursor: pointer;
  transition: all 0.2s ease;
}

.bottom-button:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

/* Coin Flip Modal */
.coin-flip-overlay,
.game-over-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.coin-flip-modal,
.game-over-modal {
  background: linear-gradient(180deg, #4a6741 0%, #3d5636 100%);
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  max-width: 360px;
  width: 90%;
}

.coin-flip-title,
.game-over-title {
  font-family: 'Georgia', serif;
  font-size: 28px;
  color: #f5edd6;
  margin: 0 0 24px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.coin-flip-result {
  margin-bottom: 24px;
}

.coin-winner-img {
  width: 120px;
  height: 140px;
  object-fit: contain;
  margin-bottom: 12px;
}

.coin-winner-text {
  font-family: 'Georgia', serif;
  font-size: 18px;
  color: #c8d4b8;
  margin: 0;
}

.coin-flip-button,
.game-over-button {
  padding: 14px 32px;
  background: linear-gradient(135deg, #e8a87c 0%, #d4896a 50%, #c47a5c 100%);
  border: none;
  border-radius: 10px;
  font-family: 'Georgia', serif;
  font-size: 18px;
  color: #fff8e7;
  cursor: pointer;
  box-shadow:
    0 4px 0 #8b5a3a,
    0 6px 12px rgba(0, 0, 0, 0.3);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.coin-flip-button:hover,
.game-over-button:hover {
  transform: translateY(-2px);
  box-shadow:
    0 6px 0 #8b5a3a,
    0 8px 16px rgba(0, 0, 0, 0.3);
}

.coin-flip-button:active,
.game-over-button:active {
  transform: translateY(2px);
  box-shadow:
    0 2px 0 #8b5a3a,
    0 4px 8px rgba(0, 0, 0, 0.3);
}

/* Final Scores */
.final-scores {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 24px;
}

.final-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.final-avatar {
  width: 64px;
  height: 72px;
  object-fit: contain;
}

.final-name {
  font-family: 'Georgia', serif;
  font-size: 14px;
  color: #c8d4b8;
}

.final-count {
  font-family: 'Georgia', serif;
  font-size: 32px;
  font-weight: bold;
  color: #f5edd6;
}

.score-separator {
  font-family: 'Georgia', serif;
  font-size: 18px;
  color: #8a9a7a;
}

.game-over-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.game-over-button--secondary {
  background: rgba(255, 255, 255, 0.1);
  box-shadow: none;
  color: #c8d4b8;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.game-over-button--secondary:hover {
  background: rgba(255, 255, 255, 0.2);
  box-shadow: none;
  transform: none;
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .coin-flip-modal,
.modal-enter-active .game-over-modal,
.modal-leave-active .coin-flip-modal,
.modal-leave-active .game-over-modal {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .coin-flip-modal,
.modal-enter-from .game-over-modal {
  transform: scale(0.9);
}

.modal-leave-to .coin-flip-modal,
.modal-leave-to .game-over-modal {
  transform: scale(0.9);
}
</style>
