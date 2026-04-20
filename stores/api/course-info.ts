/**
 * STORE: Course Info (Testbench Stub)
 *
 * No course info API needed — segments are derived directly from task content JSON.
 * Task content is fetched from S3 on mount.
 *
 * Configure via .env:
 *   NUXT_PUBLIC_DLS_ACCOUNT_ID=your-account-id
 *   NUXT_PUBLIC_S3_BASE_URL=https://gradpath-dev-assets.comprodls.com  (optional override)
 */

// ---------------------------------------------------------------------------
// Hardcoded CDN config — derived from:
// https://gradpath-dev-assets.comprodls.com/map1/content/async_survey_2_v1/1752727240946/1752727646245/content.json
//
// Change HARDCODED_TASK_ID to the task you want to test.
// Content URL built as: `${CDN_BASE}/${CDN_ACCOUNT}/content/${CDN_VARIATION}/${taskId}/content.json`
// ---------------------------------------------------------------------------
const CDN_BASE = 'https://gradpath-dev-assets.comprodls.com';
const CDN_ACCOUNT = 'map1';
const CDN_VARIATION = 'async_survey_2_v1';
export const HARDCODED_TASK_ID = '1752727240946/1752727646245';

// Module-level ref so state persists across component re-renders.
const taskDetails = ref<any>(null);

export const useCourseInfoStore = () => {
  /**
   * No-op in testbench — course info is not needed.
   */
  const load = async (_courseId: string, _forceReload = false): Promise<void> => {};

  /**
   * Fetches task content JSON from CDN and stores it in taskDetails.
   * URL: `${CDN_BASE}/${CDN_ACCOUNT}/content/${CDN_VARIATION}/${taskId}/content.json`
   */
  const loadTaskContent = async (taskId: string): Promise<void> => {
    if (!taskId || taskDetails.value?.id === taskId) return;

    const url = `${CDN_BASE}/${CDN_ACCOUNT}/content/${CDN_VARIATION}/${taskId}/content.json`;
    console.log('[store] Fetching task content from:', url);

    try {
      const taskContent = await $fetch<any>(url);
      taskDetails.value = { id: taskId, taskContent, userTaskResponse: {} };
      console.log('[store]', taskDetails.value);
    } catch (error) {
      console.error(`[store] Failed to load task content for ${taskId}:`, error);
    }
  };

  /**
   * Merges user responses into the current taskDetails state.
   */
  const updateTaskResponses = (_taskId: string, payload: any): void => {
    if (!taskDetails.value) return;
    taskDetails.value = {
      ...taskDetails.value,
      userTaskResponse: {
        ...(taskDetails.value.userTaskResponse ?? {}),
        [payload.segmentId]: payload.data,
      },
    };
  };

  return { taskDetails, load, loadTaskContent, updateTaskResponses };
};

