<script setup lang="ts">
import { useGsap } from '~/composables/useGsap'

const gsap = useGsap()

const revealCard = ref<HTMLElement | null>(null)

let animationContext: ReturnType<typeof gsap.context> | undefined

onMounted(() => {
  if (!revealCard.value) return

  animationContext = gsap.context(() => {
    gsap.fromTo(
      revealCard.value,
      {
        autoAlpha: 0,
        y: 60
      },
      {
        autoAlpha: 1,
        y: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: revealCard.value,
          start: 'top 85%',
          once: true
        }
      }
    )
  }, revealCard.value)
})

onBeforeUnmount(() => {
  animationContext?.revert()
})
</script>

<template>
  <main>
    <!-- Hero Section -->
    <section
      class="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center"
    >
      <p class="mb-6 text-sm font-semibold uppercase tracking-[0.3em] text-blue-700">
        VINFAST BRAND EXPERIENCE
      </p>

      <h1 class="text-5xl font-bold tracking-tight text-gray-900 sm:text-7xl">
        Move Beyond.
      </h1>

      <p class="mt-6 text-lg text-gray-500">
        Discover the future of electric mobility.
      </p>

      <div class="mt-12 animate-bounce text-3xl text-blue-600">
        ↓
      </div>
    </section>

    <!-- Scroll Animation Section -->
    <section
      class="flex min-h-screen items-center justify-center bg-gray-100 px-6"
    >
      <div
        ref="revealCard"
        class="w-full max-w-xl rounded-3xl bg-white p-10 text-center shadow-xl"
      >
        <p class="text-sm font-semibold uppercase tracking-widest text-blue-600">
          Innovation
        </p>

        <h2 class="mt-4 text-3xl font-bold text-gray-900">
          Discover VinFast
        </h2>

        <p class="mt-5 leading-relaxed text-gray-500">
          Experience the future of electric mobility through
          innovative design, advanced technology and
          sustainable transportation.
        </p>

        <UButton class="mt-8" size="lg">
          Explore Vehicles
        </UButton>
      </div>
    </section>
  </main>
</template>