<!--
  COMPONENT: Block.vue

  DESCRIPTION:
    Dispatches to the correct block renderer based on block.type using a
    component map.  The resolved component is rendered via <component :is>.

    Currently supported block types:
      - rich_text  → <w-rt-block>    (HTML rich text with interactive inputs)
      - rich_video → <w-video-block> (YouTube / embedded video)
      - activity   → <ActivityBlock> (assessment widget)

    New block types: add an entry to BLOCK_TYPE_TO_COMPONENT (and
    BLOCK_TYPE_TO_IMPORT if the type relies on a self-registering web-component
    package) and supply its props in resolvedProps.

  PROPS:
    - block (Object, required): Content block from the task content JSON.
        Must have: { id, type, details }
    - segmentStatus (String): Passed down from Segment for state-driven rendering.

  EMITS:
    - 'on-user-response': Payload { blockId, responses } when user interacts.
    - 'on-task-begin': Fired when user interacts while segment not yet started.
-->

<template>
  <div class="block-wrapper mb-6 font-[Satoshi,sans-serif]">

    <!-- Resolved dynamically via BLOCK_TYPE_TO_COMPONENT map -->
    <component
      v-if="resolvedComponent"
      :is="resolvedComponent"
      v-bind="resolvedProps"
      @value-changed="(e: any) => _handleRtResponse(e)"
      @on-user-response="(payload: any) => emit('on-user-response', payload)"
      @on-task-begin="emit('on-task-begin')"
    />

    <!-- UNSUPPORTED TYPE FALLBACK -->
    <p v-else class="text-sm text-gray-400 italic">
      [Block type "{{ block.type }}" is not yet supported]
    </p>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import ActivityBlock from './ActivityBlock.vue';

/**
 * PROPS
 */
const props = defineProps<{
  block: {
    id: string;
    type: string;
    details?: Record<string, any>;
  };
  segmentStatus?: string;
  index?: number;
}>();

/**
 * EMITS
 */
const emit = defineEmits<{
  'on-user-response': [payload: { blockId: string; responses: Array<{ id: string; value: string }> }];
  'on-task-begin': [];
}>();

/**
 * Maps block.type → component to render.
 * Web-component types use their tag name (string); Vue components are
 * imported directly.  Add new types here — no template changes needed.
 */
const BLOCK_TYPE_TO_COMPONENT: Record<string, any> = {
  rich_text:  'w-rt-block',
  rich_video: 'w-video-block',
  activity:   ActivityBlock,
};

/**
 * Side-effect imports that register web-component packages in the browser.
 * Activity handles its own imports inside ActivityBlock.vue.
 */
const BLOCK_TYPE_TO_IMPORT: Record<string, () => Promise<any>> = {
  rich_text:  () => import('@comprodls/w-rt-block'),
  rich_video: () => import('@comprodls/w-video-block'),
};

/** Resolved component for <component :is>. Null → unsupported fallback. */
const resolvedComponent = computed(() => BLOCK_TYPE_TO_COMPONENT[props.block.type] ?? null);

/** Props fed into the resolved component via v-bind. */
const resolvedProps = computed((): Record<string, any> => {
  switch (props.block.type) {
    case 'rich_text':
      return { content: props.block.details?.html ?? '' };
    case 'rich_video':
      return {
        url:         props.block.details?.url ?? '',
        title:       props.block.details?.title ?? '',
        description: props.block.details?.description ?? '',
      };
    case 'activity':
      return { block: props.block, segmentStatus: props.segmentStatus, questionIndex: props.index };
    default:
      return {};
  }
});

/** Register web-component packages that are not self-bootstrapping. */
onMounted(async () => {
  const importer = BLOCK_TYPE_TO_IMPORT[props.block.type];
  if (importer) await importer();
});

/**
 * Handles value-changed from w-rt-block.
 * Normalises to Array<{ id, value }> and emits on-user-response.
 */
function _handleRtResponse(e: any) {
  const detail = e?.detail ?? {};
  const responses: Array<{ id: string; value: string }> = Array.isArray(detail)
    ? detail
    : [{ id: detail.id ?? props.block.id, value: detail.value ?? '' }];

  emit('on-user-response', { blockId: props.block.id, responses });
}
</script>
