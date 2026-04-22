<script setup lang="ts">
import { ref, onMounted } from "vue";

defineOptions({
  name: "HelloPage"
});

const message = ref("");

onMounted(() => {
  console.log("Hello!");
  message.value = "Hello World! 👋";
});
</script>

<template>
  <div class="hello-page">
    <div class="hello-card">
      <h1 class="hello-title">{{ message }}</h1>
      <p class="hello-subtitle">这是一个简单的输出 Hello 的页面</p>
      <div class="hello-emoji">
        <span class="emoji">👋</span>
        <span class="emoji">😊</span>
        <span class="emoji">✨</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hello-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 100px);
  padding: 20px;
}

.hello-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 60px 80px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3);
}

.hello-title {
  color: white;
  font-size: 48px;
  font-weight: bold;
  margin: 0 0 20px 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
}

.hello-subtitle {
  color: rgba(255, 255, 255, 0.85);
  font-size: 18px;
  margin: 0 0 40px 0;
}

.hello-emoji {
  display: flex;
  justify-content: center;
  gap: 20px;
}

.emoji {
  font-size: 48px;
  animation: bounce 1s ease-in-out infinite;
}

.emoji:nth-child(2) {
  animation-delay: 0.2s;
}

.emoji:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}
</style>
