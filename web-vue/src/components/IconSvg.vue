<script setup lang="ts">
/**
 * IconSvg — SVG 图标渲染组件
 *
 * SVG_ICONS 是预定义的安全 SVG 字符串常量（非用户输入），
 * 使用 v-html 是唯一合理的方案，将 SVG 字符串渲染为 DOM 元素。
 */
import { SVG_ICONS } from '@/lib/constants';

/** 图标名称 */
const props = defineProps<{ name: keyof typeof SVG_ICONS }>();
</script>

<template>
  <span class="icon-svg" v-html="SVG_ICONS[props.name]"></span>
</template>
