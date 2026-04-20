<!--
  PAGE: TASK CONTENT PAGE

  PURPOSE:
  This page displays a specific task within a course item for students to complete.
  It serves as the main container for task content, handles communication between
  child components and the course store via event subscribers, and integrates xAPI analytics
  to track and report task lifecycle events (launch, submit) to the LRS.

  LAYOUT: default Layout

  LAYOUT STRUCTURE:
    - This page uses a single-column layout that renders task content directly.
    - Task content is rendered using TaskMetaData and Segment components.

  COMPONENTS:
    - TaskMetaData (renders task metadata with segment navigation)
    - Segment (renders individual task segments with block content and discussions)

  ROUTE PARAMETERS:
    - courseId (string): Required. Unique ID of the course containing this task.
    - itemId (string): Required. Unique ID of the item (folder) containing this task.
    - taskId (string): Required. Unique ID of the task.

  QUERY PARAMETERS:
    - None (currently)

  DATA FLOW:
    - On page load, extracts courseId, itemId, and taskId from route parameters
    - Loads course information from useCourseInfoStore; throws 404 if task not found
    - Loads task content and initializes xAPI analytics on mount
    - Posts a resume point to track the student's last visited task
    - Subscribes to child component events via event bus (on-segment-begin, on-segment-submit)
    - Generates and posts xAPI statements for task events (launch, submit) via XAPIService
    - Updates breadcrumbs with course/folder/task info
    - Updates mobile headings with course/folder/task info.

  EVENTS:
    - 'on-segment-click': User clicks segment in TaskMetaData → scrolls to that segment
    - 'on-segment-begin': Student starts segment in Segment component → tracks analytics
    - 'on-segment-submit': Student submits segment in Segment component → tracks analytics
    - 'on-user-response': User interacts with content in Block component → update response data

  XAPI INTEGRATION:
    - Initializes xAPI analytics on mount via XAPIService.initXAPIAnalytics()
    - Generates and posts xAPI statements to the LRS via XAPIService.postStatements()
    - Performs optimistic UI updates in the course store after each tracked event
-->

<template>
  <!-- MAIN CONTENT CONTAINER -->
  <div class="bg-[#e6eef3] min-h-screen">
    <!-- TASK HEADER -->
    <!-- <div class="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
      <h1 class="text-xl font-semibold m-0">Task</h1>
    </div> -->

    <!-- MAIN TASK CONTENT AREA -->
    <section
      class="content-area lg:p-5 max-w-[1600px] mx-auto w-full lg:px-[clamp(40px,4vw,64px)] lg:grid lg:grid-cols-12 lg:gap-x-[clamp(20px,2vw,32px)]"
    >
      <template v-if="segments.length > 0">
        <div
          v-for="(segment, idx) in segments"
          :key="segment.identification.code"
          :ref="
            (el) =>
              (segmentRefs[segment.identification.code] =
                el as HTMLElement | null)
          "
          class="col-start-2 col-end-12 scroll-mt-32"
        >
          <Segment
            :segment="segment"
            :segment-content="getSegmentContent(segment)"
            :index="idx as number"
            :total-segments="segments.length"
            @on-user-response="_handleUserResponse"
          />
        </div>

        <!-- <button
          class="px-3 py-2 mx-6 lg:mx-0 !leading-4 mt-8 mb-8 text-white bg-blue-200 hover:bg-blue-400 rounded-lg body2 uppercase col-start-3 col-span-2 w-fit"
          aria-label="Submit Task"
          @click.stop="_featureNotAvailable"
          @keydown.enter.stop="_featureNotAvailable"
          @keydown.space.stop="_featureNotAvailable"
        >
          Submit Task
        </button> -->
      </template>

      <!-- Loading / not yet fetched -->
      <div
        v-else
        class="col-span-full flex items-center justify-center min-h-screen"
      >
        <div
          v-if="taskDetails === null"
          class="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-500"
        />
        <p v-else class="text-gray-400">No segments found in task content.</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * IMPORTS
 */
import {
  useCourseInfoStore,
  HARDCODED_TASK_ID,
} from "~/stores/api/course-info";
import { getSharedStyles } from "@comprodls/w-theme";

function injectTheme(): void {
  const themeCss = getSharedStyles(".content-area", {});
  const style = document.createElement("style");
  style.id = "w-theme-styles";
  style.textContent = themeCss;
  document.head.appendChild(style);
}
/**
 * SETUP
 */
definePageMeta({
  title: "Task Content",
  name: "CONTENT DELIVERY",
});

const route = useRoute();

/**
 * REACTIVE VARIABLES
 */
const segmentRefs = shallowRef<Record<string, HTMLElement | null>>({});

/**
 * STORE
 */
const courseInfoStore = useCourseInfoStore();
const { taskDetails } = courseInfoStore;

/**
 * ROUTE PARAMS
 * Fallback to HARDCODED_TASK_ID when accessed directly without route params.
 */
const taskKey =
  route.params.itemId && route.params.taskId
    ? `${route.params.itemId}/${route.params.taskId}`
    : HARDCODED_TASK_ID;

/**
 * COMPUTED
 * Derive segments from task content JSON.
 * Each segment gets:
 *   identification.code  = item-code from JSON (used to match segment content)
 *   identification.name  = hardcoded "Segment N" (name field in JSON is blank)
 *   progress             = default not-started state
 */
const SEGMENT_NAMES: Record<number, string> = {
  0: "Introduction to Rational Expressions",
  1: "Adding Rational Expressions",
  2: "Adding Expressions When Denominators are Different",
};

const segments = computed(() =>
  (taskDetails.value?.taskContent?.segments ?? []).map(
    (seg: any, idx: number) => ({
      identification: {
        code: seg["item-code"],
        name: SEGMENT_NAMES[idx] ?? `Segment ${idx + 1}`,
      },
      progress: {
        status: "not_started",
        evaluationStatus: null,
        completedOnce: false,
        reattemptRequested: false,
      },
    }),
  ),
);

/**
 * PRIVATE FUNCTIONS
 */

const _featureNotAvailable = () => {
  console.log("[testbench] Feature not available");
};

/**
 * Returns the raw segment object from taskContent matching this segment's item-code.
 */
const getSegmentContent = (segment: any) => {
  return taskDetails.value?.taskContent?.segments?.find(
    (s: any) => s["item-code"] === segment.identification.code,
  );
};

const _handleUserResponse = (payload: {
  segmentId: string;
  data: any;
}): void => {
  courseInfoStore.updateTaskResponses(taskKey, payload);
};

/**
 * LIFECYCLE
 */
onMounted(async () => {
  await courseInfoStore.loadTaskContent(taskKey);
  injectTheme();
});
</script>
