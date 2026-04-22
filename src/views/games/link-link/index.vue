<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";

defineOptions({
  name: "LinkLinkGame"
});

// 游戏配置
const ROWS = 8;
const COLS = 12;
const TYPES = 16;
const CELL_SIZE = 50;
const GAME_TIME = 300;

// 游戏状态
const grid = ref<number[][]>([]);
const selected = ref<{ row: number; col: number } | null>(null);
const score = ref(0);
const timeLeft = ref(GAME_TIME);
const isPlaying = ref(false);
const isPaused = ref(false);
const pathPoints = ref<{ x: number; y: number }[]>([]);
const level = ref(1);
const hintCount = ref(3);
const undoStack = ref<{ grid: number[][]; score: number }[]>([]);

// 定时器
let timer: number | null = null;

// 图案类型（使用 emoji 作为图案）
const patterns = [
  "🍎",
  "🍊",
  "🍋",
  "🍇",
  "🍓",
  "🍒",
  "🍑",
  "🥝",
  "🍍",
  "🥑",
  "🍆",
  "🥕",
  "🌽",
  "🍄",
  "🌸",
  "🌺"
];

// 获取图案
const getPattern = (type: number) => {
  if (type === 0) return "";
  return patterns[(type - 1) % patterns.length;
};

// 深拷贝网格
const cloneGrid = (g: number[][]) => {
  return g.map(row => [...row]);
};

// 检查两个格子是否可以直接连接（无转弯）
const canConnectDirect = (
  r1: number,
  c1: number,
  r2: number,
  c2: number
): { canConnect: boolean; points: { x: number; y: number }[] } => {
  if (r1 === r2) {
    const minCol = Math.min(c1, c2);
    const maxCol = Math.max(c1, c2);
    for (let c = minCol + 1; c < maxCol; c++) {
      if (grid.value[r1][c] !== 0) {
        return { canConnect: false, points: [] };
      }
    }
    return {
      canConnect: true,
      points: [
        { x: c1, y: r1 },
        { x: c2, y: r2 }
      ]
    };
  }

  if (c1 === c2) {
    const minRow = Math.min(r1, r2);
    const maxRow = Math.max(r1, r2);
    for (let r = minRow + 1; r < maxRow; r++) {
      if (grid.value[r][c1] !== 0) {
        return { canConnect: false, points: [] };
      }
    }
    return {
      canConnect: true,
      points: [
        { x: c1, y: r1 },
        { x: c2, y: r2 }
      ]
    };
  }

  return { canConnect: false, points: [] };
};

// 检查两个格子是否可以通过一个转弯连接
const canConnectOneTurn = (
  r1: number,
  c1: number,
  r2: number,
  c2: number
): { canConnect: boolean; points: { x: number; y: number }[] } => {
  if (grid.value[r1][c2] === 0) {
    const direct1 = canConnectDirect(r1, c1, r1, c2);
    const direct2 = canConnectDirect(r1, c2, r2, c2);
    if (direct1.canConnect && direct2.canConnect) {
      return {
        canConnect: true,
        points: [
          { x: c1, y: r1 },
          { x: c2, y: r1 },
          { x: c2, y: r2 }
        ]
      };
    }
  }

  if (grid.value[r2][c1] === 0) {
    const direct1 = canConnectDirect(r1, c1, r2, c1);
    const direct2 = canConnectDirect(r2, c1, r2, c2);
    if (direct1.canConnect && direct2.canConnect) {
      return {
        canConnect: true,
        points: [
          { x: c1, y: r1 },
          { x: c1, y: r2 },
          { x: c2, y: r2 }
        ]
      };
    }
  }

  return { canConnect: false, points: [] };
};

// 检查两个格子是否可以通过两个转弯连接
const canConnectTwoTurns = (
  r1: number,
  c1: number,
  r2: number,
  c2: number
): { canConnect: boolean; points: { x: number; y: number }[] } => {
  for (let c = -1; c <= COLS; c++) {
    if (c === c1 || c === c2) continue;

    const isEmpty1 = c < 0 || c >= COLS || grid.value[r1][c] === 0;
    const isEmpty2 = c < 0 || c >= COLS || grid.value[r2][c] === 0;

    if (isEmpty1 && isEmpty2) {
      const direct1 = canConnectDirect(r1, c1, r1, c);
      const direct2 = canConnectOneTurn(r1, c, r2, c2);
      if (direct1.canConnect && direct2.canConnect) {
        return {
          canConnect: true,
          points: [
            { x: c1, y: r1 },
            { x: c, y: r1 },
            { x: c, y: r2 },
            { x: c2, y: r2 }
          ]
        };
      }
    }
  }

  for (let r = -1; r <= ROWS; r++) {
    if (r === r1 || r === r2) continue;

    const isEmpty1 = r < 0 || r >= ROWS || grid.value[r][c1] === 0;
    const isEmpty2 = r < 0 || r >= ROWS || grid.value[r][c2] === 0;

    if (isEmpty1 && isEmpty2) {
      const direct1 = canConnectDirect(r1, c1, r, c1);
      const direct2 = canConnectOneTurn(r, c1, r2, c2);
      if (direct1.canConnect && direct2.canConnect) {
        return {
          canConnect: true,
          points: [
            { x: c1, y: r1 },
            { x: c1, y: r },
            { x: c2, y: r },
            { x: c2, y: r2 }
          ]
        };
      }
    }
  }

  return { canConnect: false, points: [] };
};

// 检查两个格子是否可以连接
const canConnect = (
  r1: number,
  c1: number,
  r2: number,
  c2: number
): { canConnect: boolean; points: { x: number; y: number }[] } => {
  if (grid.value[r1][c1] !== grid.value[r2][c2]) {
    return { canConnect: false, points: [] };
  }
  if (grid.value[r1][c1] === 0) {
    return { canConnect: false, points: [] };
  }
  if (r1 === r2 && c1 === c2) {
    return { canConnect: false, points: [] };
  }

  const direct = canConnectDirect(r1, c1, r2, c2);
  if (direct.canConnect) return direct;

  const oneTurn = canConnectOneTurn(r1, c1, r2, c2);
  if (oneTurn.canConnect) return oneTurn;

  const twoTurns = canConnectTwoTurns(r1, c1, r2, c2);
  if (twoTurns.canConnect) return twoTurns;

  return { canConnect: false, points: [] };
};

// 初始化游戏
const initGame = () => {
  const totalCells = ROWS * COLS;
  const pairs = totalCells / 2;

  const types: number[] = [];
  for (let i = 0; i < pairs; i++) {
    const type = (i % TYPES) + 1;
    types.push(type);
    types.push(type);
  }

  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }

  grid.value = [];
  for (let r = 0; r < ROWS; r++) {
    const row: number[] = [];
    for (let c = 0; c < COLS; c++) {
      row.push(types[r * COLS + c]);
    }
    grid.value.push(row);
  }

  selected.value = null;
  score.value = 0;
  timeLeft.value = GAME_TIME;
  isPlaying.value = true;
  isPaused.value = false;
  pathPoints.value = [];
  hintCount.value = 3;
  undoStack.value = [];

  startTimer();
};

// 开始计时
const startTimer = () => {
  if (timer) clearInterval(timer);
  timer = window.setInterval(() => {
    if (!isPaused.value && isPlaying.value) {
      timeLeft.value--;
      if (timeLeft.value <= 0) {
        gameOver(false);
      }
    }
  }, 1000);
};

// 游戏结束
const gameOver = async (won: boolean) => {
  isPlaying.value = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  if (won) {
    await ElMessageBox.alert(`恭喜过关！\n得分：${score.value}\n剩余时间：${timeLeft.value}秒`, "游戏胜利", {
      confirmButtonText: "下一关",
      type: "success"
    });
    level.value++;
    initGame();
  } else {
    await ElMessageBox.alert(`游戏结束！\n得分：${score.value}`, "游戏失败", {
      confirmButtonText: "重新开始",
      type: "error"
    });
    level.value = 1;
    initGame();
  }
};

// 检查游戏是否胜利
const checkWin = () => {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid.value[r][c] !== 0) return false;
    }
  }
  return true;
};

// 显示连线动画
const showPath = (points: { x: number; y: number }[]) => {
  pathPoints.value = points;
  setTimeout(() => {
    pathPoints.value = [];
  }, 500);
};

// 点击格子
const clickCell = (row: number, col: number) => {
  if (!isPlaying.value || isPaused.value) return;
  if (grid.value[row][col] === 0) return;

  if (!selected.value) {
    selected.value = { row, col };
  } else {
    if (selected.value.row === row && selected.value.col === col) {
      selected.value = null;
      return;
    }

    const result = canConnect(selected.value.row, selected.value.col, row, col);

    if (result.canConnect) {
      undoStack.value.push({
        grid: cloneGrid(grid.value),
        score: score.value
      });

      showPath(result.points);

      grid.value[selected.value.row][selected.value.col] = 0;
      grid.value[row][col] = 0;
      score.value += 10;

      nextTick(() => {
        if (checkWin()) {
          gameOver(true);
        }
      });
    } else {
      ElMessage.warning("无法连接！");
    }

    selected.value = null;
  }
};

// 撤销
const undo = () => {
  if (undoStack.value.length === 0) {
    ElMessage.warning("没有可撤销的操作！");
    return;
  }

  const last = undoStack.value.pop()!;
  grid.value = last.grid;
  score.value = last.score;
  ElMessage.success("已撤销！");
};

// 提示
const hint = () => {
  if (hintCount.value <= 0) {
    ElMessage.warning("提示次数用完了！");
    return;
  }

  for (let r1 = 0; r1 < ROWS; r1++) {
    for (let c1 = 0; c1 < COLS; c1++) {
      if (grid.value[r1][c1] === 0) continue;
      for (let r2 = 0; r2 < ROWS; r2++) {
        for (let c2 = 0; c2 < COLS; c2++) {
          if (r1 === r2 && c1 === c2) continue;
          if (grid.value[r2][c2] === 0) continue;

          const result = canConnect(r1, c1, r2, c2);
          if (result.canConnect) {
            showPath(result.points);
            hintCount.value--;
            ElMessage.info(`找到一对！剩余提示：${hintCount.value}次`);
            return;
          }
        }
      }
    }
  }

  ElMessage.warning("没有可匹配的对！");
};

// 重新排列
const shuffle = () => {
  const cells: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid.value[r][c] !== 0) {
        cells.push(grid.value[r][c]);
      }
    }
  }

  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  let index = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid.value[r][c] !== 0) {
        grid.value[r][c] = cells[index++];
      }
    }
  }

  ElMessage.success("已重新排列！");
};

// 暂停/继续
const togglePause = () => {
  isPaused.value = !isPaused.value;
};

// 格式化时间
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

// 计算连线 SVG 路径
const pathD = computed(() => {
  if (pathPoints.value.length < 2) return "";

  let d = `M ${pathPoints.value[0].x * ${CELL_SIZE + CELL_SIZE / 2} ${pathPoints.value[0].y * CELL_SIZE + CELL_SIZE / 2}`;
  for (let i = 1; i < pathPoints.value.length; i++) {
    d += ` L ${pathPoints.value[i].x * CELL_SIZE + CELL_SIZE / 2} ${pathPoints.value[i].y * CELL_SIZE + CELL_SIZE / 2}`;
  }
  return d;
});

onMounted(() => {
  initGame();
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
});
</script>

<template>
  <div class="link-link-game">
    <div class="game-header">
      <div class="game-info">
        <span class="info-item">
          <el-icon><Timer /></el-icon>
          时间：{{ formatTime(timeLeft) }}
        </span>
        <span class="info-item">
          <el-icon><Trophy /></el-icon>
          得分：{{ score }}
        </span>
        <span class="info-item">
          <el-icon><Medal /></el-icon>
          关卡：{{ level }}
        </span>
        <span class="info-item">
          <el-icon><Help /></el-icon>
          提示：{{ hintCount }}
        </span>
      </div>
      <div class="game-controls">
        <el-button type="primary" @click="initGame">
          <el-icon><Refresh /></el-icon>
          重新开始
        </el-button>
        <el-button :type="isPaused ? 'success' : 'warning'" @click="togglePause">
          <el-icon><component :is="isPaused ? 'VideoPlay' : 'VideoPause'" /></el-icon>
          {{ isPaused ? "继续" : "暂停" }}
        </el-button>
        <el-button type="info" @click="hint">
          <el-icon><Help /></el-icon>
          提示
        </el-button>
        <el-button type="danger" @click="undo">
          <el-icon><ArrowLeft /></el-icon>
          撤销
        </el-button>
        <el-button type="warning" @click="shuffle">
          <el-icon><RefreshRight /></el-icon>
          重排
        </el-button>
      </div>
    </div>

    <div class="game-container" :class="{ paused: isPaused }">
      <svg
        class="game-grid"
        :style="{ width: COLS * CELL_SIZE + 'px', height: ROWS * CELL_SIZE + 'px' }"
      >
        <defs>
        </defs>

        <g v-for="(row, r) in grid" :key="r">
          <rect
            v-for="(cell, c) in row"
            :key="`${r}-${c}`"
            :x="c * CELL_SIZE"
            :y="r * CELL_SIZE"
            :width="CELL_SIZE"
            :height="CELL_SIZE"
            :class="['cell', {
              'selected': selected && selected.row === r && selected.col === c',
              'empty': cell === 0
            }]"
            @click="clickCell(r, c)"
          />
          <text
            v-if="cell !== 0"
            :x="c * CELL_SIZE + CELL_SIZE / 2"
            :y="r * CELL_SIZE + CELL_SIZE / 2 + 8"
            text-anchor="middle"
            font-size="32"
            class="emoji"
            @click="clickCell(r, c)"
          >
            {{ getPattern(cell) }}
          </text>
        </g>

        <path
          v-if="pathPoints.length > 1"
          :d="pathD"
          fill="none"
          stroke="#409eff"
          stroke-width="4"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="path-line"
        />
        <circle
          v-for="(point, index) in pathPoints"
          :key="index"
          :cx="point.x * CELL_SIZE + CELL_SIZE / 2"
          :cy="point.y * CELL_SIZE + CELL_SIZE / 2"
          r="8"
          fill="#409eff"
          class="path-point"
        />
      </svg>

      <div v-if="isPaused" class="pause-overlay">
        <div class="pause-text">游戏暂停</div>
      </div>
    </div>

    <div class="game-tips">
      <h3>游戏说明</h3>
      <ul>
        <li>点击两个相同的图案，如果它们可以通过不超过两个转弯的路径连接，则消除</li>
        <li>消除一对得 10 分</li>
        <li>在时间结束前消除所有图案即可过关</li>
        <li>可以使用提示功能寻找可消除的对</li>
        <li>可以撤销上一步操作</li>
        <li>无法连接时可以使用重排功能</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.link-link-game {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  min-height: calc(100vh - 100px);
}

.game-header {
  width: 100%;
  max-width: 700px;
  margin-bottom: 20px;
  padding: 15px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.game-info {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-size: 16px;
  font-weight: bold;
}

.info-item .el-icon {
  font-size: 20px;
}

.game-controls {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.game-container {
  position: relative;
  background: linear-gradient(145deg, #ffffff, #f0f0f0);
  border-radius: 15px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.game-grid {
  display: block;
  border-radius: 8px;
  background: #e8e8e8;
}

.cell {
  fill: white;
  stroke: #d0d0d0;
  stroke-width: 1;
  cursor: pointer;
  transition: all 0.2s ease;
  rx: 8;
}

.cell:hover:not(.empty) {
  fill: #e6f7ff;
  stroke: #409eff;
}

.cell.selected {
  fill: #b3d8ff;
  stroke: #409eff;
  stroke-width: 2;
}

.cell.empty {
  fill: transparent;
  stroke: transparent;
  cursor: default;
}

.emoji {
  cursor: pointer;
  user-select: none;
  pointer-events: none;
}

.path-line {
  animation: dash 0.5s ease-in-out;
}

.path-point {
  animation: pulse 0.5s ease-in-out;
}

@keyframes dash {
  from {
    stroke-dasharray: 0 1000;
    stroke-dashoffset: 0;
  }
  to {
    stroke-dasharray: 1000 0;
    stroke-dashoffset: 0;
  }
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.3);
  }
}

.pause-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 15px;
}

.pause-text {
  font-size: 48px;
  color: white;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.game-tips {
  margin-top: 30px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 10px;
  max-width: 700px;
  width: 100%;
}

.game-tips h3 {
  margin-bottom: 10px;
  color: #303133;
}

.game-tips ul {
  margin: 0;
  padding-left: 20px;
  color: #606266;
  line-height: 1.8;
}

.game-tips li {
  margin-bottom: 5px;
}
</style>
