/**
 * Calls the SSE streaming chat endpoint and invokes callbacks as tokens arrive.
 * Returns a Promise that resolves when the stream completes.
 *
 *   await streamChat("hello", {
 *     onToken: (t) => append(t),
 *     onDone:  (meta) => maybeShowSuggestedAction(meta.suggestedAction),
 *     onError: (err) => showError(err),
 *   });
 */
export const streamChat = async (message, { onToken, onDone, onError } = {}) => {
  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Stream failed (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events are blocks separated by a blank line ("\n\n").
      let sep;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);

        let evName = 'message';
        let evData = '';
        for (const line of block.split('\n')) {
          if (line.startsWith('event:')) evName = line.slice(6).trim();
          else if (line.startsWith('data:')) evData += line.slice(5).trim();
        }
        if (!evData) continue;

        try {
          if (evName === 'token') {
            onToken?.(JSON.parse(evData));
          } else if (evName === 'done') {
            onDone?.(JSON.parse(evData));
          }
        } catch {
          /* ignore malformed SSE chunk */
        }
      }
    }
  } catch (err) {
    onError?.(err);
  }
};
