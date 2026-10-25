<script setup lang="ts">
type ButtonProps = {
  /** Visible button text. */
  label: string;
  /** Visual emphasis. */
  variant?: 'primary' | 'secondary';
  /** Prevent interaction when unavailable. */
  disabled?: boolean;
};

const props = withDefaults(defineProps<ButtonProps>(), {
  variant: 'primary',
  disabled: false,
});

const emit = defineEmits<{
  /** Forward the native click event. */
  click: [event: MouseEvent];
}>();
</script>

<template>
  <button
    type="button"
    :class="['demo-button', `demo-button--${props.variant}`]"
    :disabled="props.disabled"
    @click="emit('click', $event)"
  >
    {{ props.label }}
  </button>
</template>

<style scoped>
.demo-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 12px 22px;
  border: 1px solid transparent;
  border-radius: 12px;
  font:
    600 15px / 1.4 system-ui,
    sans-serif;
  cursor: pointer;
  transition:
    background-color 150ms ease,
    border-color 150ms ease;
}

.demo-button--primary {
  background: #087f66;
  color: #fff;
}

.demo-button--primary:hover:not(:disabled) {
  background: #065f4b;
}

.demo-button--secondary {
  border-color: #cbd8d2;
  background: #fff;
  color: #344c46;
}

.demo-button--secondary:hover:not(:disabled) {
  border-color: #087f66;
  background: #edf5f0;
}

.demo-button:focus-visible {
  outline: 3px solid #7654c4;
  outline-offset: 4px;
}

.demo-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (prefers-reduced-motion: reduce) {
  .demo-button {
    transition: none;
  }
}
</style>
