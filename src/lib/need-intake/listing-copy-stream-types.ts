/** SSE event shapes for listing copy streaming (client + server). */
export type ListingCopyStreamEvent =
  | { type: 'baseline'; title: string; description: string }
  | { type: 'title'; title: string; titleSource: 'template' | 'qwen' }
  | { type: 'description_delta'; text: string }
  | {
      type: 'done';
      title: string;
      description: string;
      titleSource: 'template' | 'qwen';
      descriptionSource: 'template' | 'qwen';
    }
  | { type: 'error'; message: string };
