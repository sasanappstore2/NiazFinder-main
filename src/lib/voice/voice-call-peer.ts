/** Minimal user info for in-app voice calls */
export interface VoiceCallPeer {
  id: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  avatar?: string;
  online?: boolean;
}

export function toVoiceCallPeer(p: {
  id: string;
  firstName: string;
  lastName: string;
  displayName?: string | null;
  avatar?: string | null;
  online?: boolean;
}): VoiceCallPeer {
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    ...(p.displayName ? { displayName: p.displayName } : {}),
    ...(p.avatar ? { avatar: p.avatar } : {}),
    ...(p.online !== undefined ? { online: p.online } : {}),
  };
}
