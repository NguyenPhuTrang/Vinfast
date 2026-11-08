<script setup lang="ts">
import { useCounterStore } from '~/stores/counter'

const counter = useCounterStore()
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-gray-50">
    <div class="rounded-2xl bg-white p-10 text-center shadow-lg">
      <h1 class="mb-6 text-3xl font-bold">
        VinFast Website
      </h1>

      <p class="mb-3 text-gray-500">
        Pinia State Management Test
      </p>

      <p class="mb-2 text-xl">
        Count: {{ counter.count }}
      </p>

      <p class="mb-6 text-xl">
        Double Count: {{ counter.doubleCount }}
      </p>

      <div class="flex justify-center gap-3">
        <UButton @click="counter.decrement">
          Decrease
        </UButton>

        <UButton @click="counter.increment">
          Increase
        </UButton>
      </div>
    </div>
  </main>
</template>