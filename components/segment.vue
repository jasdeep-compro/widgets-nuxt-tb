<!--
  COMPONENT: Segment.vue

  DESCRIPTION:
    Represents a single segment within a task. Acts as a container for rendering
    blocks of content and interactions. This is the middle layer in the task rendering
    flow that delegates to Block components for individual content blocks.
    Manages segment-level status normalization and propagates it to children.

  LAYOUT STRUCTURE:
    The component is divided into three main sections:
      1. Header Section:
         - Segment number and segment name display
         - Completion status indicator (if attempted)
         - Expand/collapse toggle button
      2. Content Area:
         - Renders Block components for each block in the segment
      3. Discussion Section:
         - Displays segment discussions and help functionality

  COMPONENTS:
    - Block:
      - Block.vue: Dynamic renderer for different content types (rich text, video, articulate, etc.)
      - BlockRichText.vue: Renders HTML content with embedded interactive components
      - BlockVideo.vue: Video player component
      - BlockArticulate.vue: Articulate SCORM content
      - BlockGoogleDoc.vue: Google Document viewer
    - Discussion:
      - index.vue: Main discussion component
      - SegmentDiscussionThread.vue:
        - Displays a single discussion as a card.
        - Manages comments (replies) for that discussion.

  PROPS:
    - segment (Object, required): Segment data containing:
        - identification.name (string): Display name of this segment
        - identification.code (string): Unique identifier for the segment
        - progress (Object): Status and evaluation data
    - index (Number, required): Zero-based index of this segment in the task sequence
    - totalSegments (Number, optional): Total number of segments in the task
    - segmentContent (Object, optional): Detailed segment data including blocks to render

  EMITS:
    - 'on-user-response': Fires when user response is updated within any block

  DISPATCHES:
    - 'on-segment-begin': Dispatched when student confirms segment start via dialog
    - 'on-segment-submit': Dispatched when student confirms segment submission via dialog

  FEATURES:
    - Sequential segment numbering (SEGMENT 1, SEGMENT 2, etc.)
    - Visual status badges (Not Started, In Progress, Submitted, Completed, etc.)
    - Expand/Collapse functionality
    - Block component integration for content display
    - SegmentDiscussion integration for help and discussions
    - Action buttons (Request Help, Begin, Submit, Submitted states)
    - Dispatch-driven architecture for task lifecycle events (on-segment-begin , on-segment-submit)
    - Segment-level state management for user responses
    - Handles 'on-task-begin' from blocks to trigger task begin dialog
-->

<template>
  <!-- SEGMENT CONTAINER -->
  <section
    class="mt-10 bg-white overflow-hidden col-start-2 col-end-12 border rounded-lg"
  >
    <!-- COLOR BAND at top -->
    <!-- <div :class="['h-2 w-full', currentStatus.colorClass]" /> -->

    <!-- SEGMENT HEADER -->
    <header
      :class="[
        'flex items-start py-4 bg-[#eef7ff] lg:px-[98px] px-6 flex-row justify-between',
        isExpanded ? 'border-b-[6px] border-[#306fd2]' : '',
      ]"
    >
      <div>
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-4">
            <!-- SEGMENT TITLE -->
            <p class="my-0 text-[#306fd2] text-xs font-semibold">
              Step {{ index + 1 }} of {{ props.totalSegments }}
            </p>
          </div>
        </div>

        <!-- SEGMENT NAME -->
        <p class="m-0 py-1 text-[16px] font-semibold text-[#233D51]">
          {{ segment.identification.name }}
        </p>
      </div>

      <!-- EXPAND/COLLAPSE BUTTON -->
      <button
        class="flex items-center justify-center w-10 h-10 mt-2 bg-grey-100 rounded-lg cursor-pointer transition-colors duration-150 hover:bg-grey-300 active:bg-grey-400"
        :aria-label="isExpanded ? 'Collapse' : 'Expand'"
        :aria-expanded="isExpanded"
        @click.prevent="toggleExpanded"
        @keydown.enter.prevent="toggleExpanded"
        @keydown.space.prevent="toggleExpanded"
        @keydown.escape.prevent="isExpanded && toggleExpanded"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-grey-700 transition-transform duration-200"
          :class="isExpanded ? 'rotate-0' : 'rotate-180'"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
    </header>

    <!-- EXPANDABLE CONTENT -->
    <div
      v-show="isExpanded"
      class="transition-all duration-300"
      role="region"
      :aria-label="`${segment.identification.name} content`"
    >
      <!-- CONTENT AREA -->
      <div class="lg:px-[176px] px-6 py-10">
        <template v-if="segmentContent?.blocks?.length > 0">
          <Block
            v-for="block in segmentContent.blocks"
            :key="block.id"
            :block="block"
            :segment-status="currentStatus.state"
            :index="activityQuestionIndex[block.id]"
            @on-user-response="_handleUserResponse"
            @on-task-begin="_handleTaskBegin"
          />
        </template>
        <h3 v-else class="m-0 body6-medium">....</h3>
      </div>

      <!-- ACTION BUTTONS -->
      <div
        class="flex justify-start gap-3 px-[clamp(80px,7.83vw,125px)] py-8 bg-white border-t border-grey-200"
      >
        <!-- MARK AS COMPLETE / SUBMIT -->
        <button
          class="body2 rounded-lg px-4 py-2 !leading-4 bg-[#2d5fa6] text-white hover:bg-[#1a3563] transition-colors duration-150"
          @click="
            index + 1 === props.totalSegments
              ? _handleConfirmTaskSubmit()
              : _handleTaskBegin()
          "
        >
          {{
            index + 1 === props.totalSegments ? "Submit" : "Mark as complete"
          }}
        </button>
      </div>
    </div>
  </section>

  <!-- SNACKBAR -->
  <Transition name="snackbar">
    <div
      v-if="isSnackbarVisible"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#1e1e1e] text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg min-w-[320px]"
      role="alert"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="shrink-0 opacity-80"
      >
        <path
          d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        />
      </svg>
      <span class="flex-1"
        >Feature not available or active for this version.</span
      >
      <button
        class="ml-2 opacity-60 hover:opacity-100 transition-opacity"
        @click="isSnackbarVisible = false"
        aria-label="Close"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
/**
 * PROPS
 */
const props = defineProps<{
  segment: any;
  index: number;
  totalSegments?: number;
  segmentContent?: any;
}>();

const SegmentStatus = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  SUBMITTED: "submitted",
  COMPLETED: "completed",
  RE_ATTEMPT: "re_attempt",
};

/**
 * SEGMENT STATUS CONSTANTS
 */
const segmentStatus = {
  COMPLETED: "completed",
  INCOMPLETE: "in_complete",
  NOT_STARTED: "not_started",
};

/**
 * GRADING STATUS CONSTANTS
 */
const gradingStatus = {
  SUBMITTED: "submitted",
  EVALUATED: "evaluated",
  RE_EVALUATE: "re-evaluate",
};

/**
 * REACTIVE VARIABLES
 */
const isExpanded = shallowRef(true);
const isSnackbarVisible = shallowRef(false);
const userResponsesState = shallowRef<Record<string, any>>({});

let _snackbarTimer: ReturnType<typeof setTimeout> | null = null;

const _showSnackbar = () => {
  isSnackbarVisible.value = true;
  if (_snackbarTimer) clearTimeout(_snackbarTimer);
  _snackbarTimer = setTimeout(() => {
    isSnackbarVisible.value = false;
  }, 4000);
};

/**
 * Maps each activity block's id → its 1-based question number among
 * all activity blocks in the segment (non-activity blocks are skipped).
 */
const activityQuestionIndex = computed(() => {
  const map: Record<string, number> = {};
  let counter = 1;
  for (const block of props.segmentContent?.blocks ?? []) {
    if (block.type === "activity") map[block.id] = counter++;
  }
  return map;
});

/**
 * COMPUTED PROPERTIES
 */
const currentStatus = computed(() => {
  const analytics = props.segment.progress;
  const status = analytics?.status || segmentStatus.NOT_STARTED;
  const completedOnce = analytics?.completedOnce || false;
  const reattemptRequested = analytics?.reattemptRequested || false;
  const lastGradingStatus = analytics?.evaluationStatus;

  let statusText = "In Progress";
  let colorClass = "bg-green-200";
  let state = SegmentStatus.IN_PROGRESS;

  if (
    reattemptRequested &&
    lastGradingStatus === gradingStatus.EVALUATED &&
    status === segmentStatus.COMPLETED
  ) {
    statusText = "Reattempt Requested";
    colorClass = "bg-yellow-100";
    state = SegmentStatus.RE_ATTEMPT;
  } else if (
    completedOnce === true &&
    !reattemptRequested &&
    lastGradingStatus === gradingStatus.EVALUATED &&
    status === segmentStatus.COMPLETED
  ) {
    statusText = "Completed";
    state = SegmentStatus.COMPLETED;
  } else if (
    lastGradingStatus === gradingStatus.SUBMITTED &&
    status === segmentStatus.INCOMPLETE
  ) {
    statusText = "Attempted";
    colorClass = "bg-yellow-100";
    state = SegmentStatus.SUBMITTED;
  } else if (status === segmentStatus.NOT_STARTED) {
    statusText = "Not Attempted";
    colorClass = "bg-grey-500";
    state = SegmentStatus.NOT_STARTED;
  }

  return { statusText, colorClass, status, state, analytics };
});

/** Formats the submission date for display. */
const submissionDate = computed(() => {
  const lastSubmitted = currentStatus.value.analytics?.lastSubmittedAt;
  if (!lastSubmitted) return "";
  return new Date(lastSubmitted).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
});

/**
 * PRIVATE FUNCTIONS / EVENT HANDLERS
 */

/** Handles user response from Block, updates state and emits to parent. */
const _handleUserResponse = (payload: {
  blockId: string;
  responses: Array<{ id: string; value: string }>;
}) => {
  const segmentId =
    props.segmentContent?.id || props.segment.identification.code;
  if (!userResponsesState.value[segmentId]) {
    userResponsesState.value[segmentId] = {};
  }
  userResponsesState.value[segmentId][payload.blockId] = {
    responses: payload.responses,
  };
  emit("on-user-response", {
    segmentId,
    data: userResponsesState.value[segmentId],
  });
};

/** Toggles expanded/collapsed state. */
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
};

/** Shows snackbar — begin/submit not available in testbench. */
const _handleTaskBegin = () => _showSnackbar();
const _handleConfirmTaskSubmit = () => _showSnackbar();

/**
 * EMITS
 */
const emit = defineEmits<{
  "on-user-response": [
    payload: { segmentId: string; data: Record<string, any> },
  ];
}>();
</script>

<style scoped>
.snackbar-enter-active,
.snackbar-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.snackbar-enter-from,
.snackbar-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}
</style>
