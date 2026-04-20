<!--
  COMPONENT: ActivityBlock.vue

  DESCRIPTION:
    Renders an activity block for any supported activity subType.
    Lazily imports the activity shell and question widget packages on mount
    and tears down the assessment on unmount.

    A module-level singleton cache (`ensureImported`) ensures each package
    is fetched at most once across all mounted instances, even when multiple
    ActivityBlocks mount concurrently.

  PROPS:
    - block (Object, required): The activity block descriptor.
        Must have: { id, type, details: { activityJson } }
    - segmentStatus (String): Passed down from Segment for state-driven rendering.

  EMITS:
    - 'on-user-response': Payload { blockId, responses } on submit / change.
    - 'on-task-begin':    Fired when user interacts while segment not yet started.
-->

<template>
  <div>
    <div class="flex items-center gap-2 mb-8 mt-8">
      <span class="w-[34px] h-[34px] rounded-[9px] bg-[var(--w-color-kicker-icon-bg,#e6edfc)] text-[var(--w-color-kicker,#2f65c3)] inline-flex items-center justify-center">
        <img src="~/assets/images/question-icon.svg" alt="" aria-hidden="true" class="w-5 h-5" />
      </span>
      <span class="m-0 text-[clamp(0.95rem,1.02vw,1rem)] font-bold tracking-[0.01em] text-[#2f65c3]">Question {{ questionIndex }}</span>
    </div>
    <div ref="containerRef" />
  </div>
</template>

<script lang="ts">
/**
 * MODULE-LEVEL SINGLETON LOADER
 *
 * Lives in a plain <script> block (not <script setup>) so it is evaluated
 * exactly once per module load and shared across every ActivityBlock instance.
 *
 * If multiple widgets mount concurrently and all require the same package,
 * `ensureImported` guarantees the dynamic import() is only called once —
 * every caller receives the same in-flight Promise.
 */
const _importCache = new Map<string, Promise<void>>();

function ensureImported(key: string, factory: () => Promise<any>): Promise<void> {
  if (!_importCache.has(key)) {
    _importCache.set(key, factory().then(() => {}));
  }
  return _importCache.get(key)!;
}
</script>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';

/**
 * LOOKUP MAPS
 * Add new entries here as new activity / question types are introduced.
 */

/** subType → dynamic import of the assessment class package */
const ACTIVITY_PACKAGE_MAP: Record<string, () => Promise<any>> = {
  'single-question': () => import('@comprodls/w-single-question'),
  'open-response':   () => import('@comprodls/w-open-response'),
};

/** subType → the named export that holds the assessment class */
const ACTIVITY_EXPORT_MAP: Record<string, string> = {
  'single-question': 'SingleQuestionAssessment',
  'open-response':   'OpenResponseAssessment',
};

/** fragment type → dynamic import of the question widget package */
const QUESTION_PACKAGE_MAP: Record<string, () => Promise<any>> = {
  'meqn':       () => import('@comprodls/w-question-meqn'),
  'fib':        () => import('@comprodls/w-question-fib'),
  'plain-text': () => import('@comprodls/w-question-plain-text'),
  'rich-text':  () => import('@comprodls/w-question-rich-text'),
};

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
  questionIndex?: number;
}>();

/**
 * EMITS
 */
const emit = defineEmits<{
  'on-user-response': [payload: { blockId: string; responses: Array<{ id: string; value: string }> }];
  'on-task-begin': [];
}>();

const containerRef = ref<HTMLElement | null>(null);
let assessment: any | null = null;

onMounted(async () => {
  if (!containerRef.value) return;

  const activityJson = props.block.details?.activityJson;
  const launchId = `launch-${props.block.id}`;

  // ── Input validation ──────────────────────────────────────────────────────
  if (!activityJson || !launchId) {
    console.error('[ActivityBlock] activityJson or block.id is missing — assessment will not be initialised.', {
      activityJson,
      launchId,
    });
    return;
  }

  // ── Resolve activity subType ──────────────────────────────────────────────
  const subType: string = activityJson?.subType ?? 'single-question';
  if (!ACTIVITY_PACKAGE_MAP[subType]) {
    console.error(`[ActivityBlock] Unknown subType: "${subType}"`);
    return;
  }

  // ── Collect unique question widget types from all fragments ───────────────
  const fragments: Record<string, any> = activityJson?.itemFragments ?? {};
  const uniqueQuestionTypes = [
    ...new Set(
      Object.values(fragments)
        .map((frag: any) => frag?.data?.type)
        .filter(Boolean)
    ),
  ] as string[];

  const unknownTypes = uniqueQuestionTypes.filter((t) => !QUESTION_PACKAGE_MAP[t]);
  if (unknownTypes.length) {
    console.warn(`[ActivityBlock] No package mapped for question type(s): ${unknownTypes.join(', ')}`);
  }

  // ── Import everything in parallel (singleton cache prevents duplicate fetches) ───
  const [activityModule] = await Promise.all([
    ensureImported(subType, ACTIVITY_PACKAGE_MAP[subType]).then(() => ACTIVITY_PACKAGE_MAP[subType]()),
    ...uniqueQuestionTypes
      .filter((t) => QUESTION_PACKAGE_MAP[t])
      .map((t) => ensureImported(t, QUESTION_PACKAGE_MAP[t])),
  ]);

  // Guard: component may have been unmounted during the async gap above.
  if (!containerRef.value) return;

  // ── Mount assessment ──────────────────────────────────────────────────────
  const exportName = ACTIVITY_EXPORT_MAP[subType];
  const AssessmentClass = (exportName && activityModule[exportName]) ?? Object.values(activityModule)[0];

  assessment = new AssessmentClass();
  await assessment.init(launchId, activityJson, {
    events: {
      ready:       (e: any) => console.log('[activity] ready', e.launchId),
      submit:      (e: any) => emit('on-user-response', { blockId: props.block.id, responses: [{ id: props.block.id, value: JSON.stringify(e) }] }),
      checkAnswer: (e: any) => console.log('[activity] checkAnswer', e.status),
      change:      (e: any) => emit('on-user-response', { blockId: props.block.id, responses: [{ id: props.block.id, value: JSON.stringify(e) }] }),
    },
  });
  assessment.mount(launchId, containerRef.value);
});

onBeforeUnmount(() => {
  assessment?.destroy();
  assessment = null;
});
</script>
