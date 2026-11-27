<script setup lang="ts">
/** `bleed` crops the margin around the tile, for places that draw their own rounded frame. */
const { bleed = false } = defineProps<{ bleed?: boolean }>()
</script>

<template>
  <svg :viewBox="bleed ? '64 64 896 896' : '0 0 1024 1024'" aria-hidden="true">
    <rect x="64" y="64" width="896" height="896" rx="208" fill="#E0461F" />
    <circle cx="440" cy="512" r="262" fill="#FFFFFF" />
    <ellipse cx="362" cy="446" rx="30" ry="40" fill="#1F0D07" />
    <ellipse cx="518" cy="446" rx="30" ry="40" fill="#1F0D07" />
    <path d="M344 548h192c0 70-43 120-96 120s-96-50-96-120z" fill="#1F0D07" />
    <path d="M386 620c16 28 33 40 54 40s38-12 54-40c-16-10-34-14-54-14s-38 4-54 14z" fill="#FF8A66" />
    <g fill="none" stroke="#FFFFFF" stroke-width="44" stroke-linecap="round">
      <path d="M727.8 359A326 326 0 0 1 727.8 665" />
      <path d="M774.9 286.1A404 404 0 0 1 774.9 737.9" opacity=".7" />
    </g>
  </svg>
</template>
