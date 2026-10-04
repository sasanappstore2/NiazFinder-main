/** Client helper for POST /api/chat/messages/:id/star */
export async function toggleMessageStar(
  messageId: string,
  unstar: boolean,
  authToken: string | null | undefined
): Promise<boolean> {
  const res = await fetch(`/api/chat/messages/${messageId}/star`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({ unstar }),
  });
  return res.ok;
}
