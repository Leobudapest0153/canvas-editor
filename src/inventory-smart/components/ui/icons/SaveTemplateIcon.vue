<template>
  <svg
    :width="size"
    :height="size"
    :class="iconClass"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      :stroke-width="strokeWidth"
      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
    />
  </svg>
</template>

<script setup>
defineProps({
  size: { type: [String, Number], default: 16 },
  strokeWidth: { type: [String, Number], default: 2 },
  iconClass: { type: String, default: '' }
})
</script>
