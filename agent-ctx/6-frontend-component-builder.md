---
Task ID: 6
Agent: Frontend Component Builder
Task: Build VoiceCallOverlay component

Work Log:
- Created /src/components/chat/VoiceCallOverlay.tsx
- Three call states: ringing (incoming), active (in-call bar), ended (summary)
- Incoming call: full-screen overlay with backdrop blur, pulsing avatar rings, accept/decline/message buttons
- Active call: compact floating bar at top, duration counter, mute/speaker/hangup controls
- Call ended: summary card with duration + call back button, auto-dismiss after 5 seconds
- Outgoing calls auto-answer after simulated delay (2.5s)
- Uses useAppStore for navigateTo, framer-motion for entrance/exit animations
- Emerald/green theme for accept/active states, red for decline/hangup
- All text in Persian (Farsi), RTL layout
- Helper components: RingingAvatar (3-layer pulsing rings), IncomingCallView, ActiveCallBar, CallEndedView
- Props: isOpen, onClose, targetUser, callType
- Named export: VoiceCallOverlay

Stage Summary:
- VoiceCallOverlay component created successfully at /src/components/chat/VoiceCallOverlay.tsx
- 0 lint errors, 0 warnings
- Dev server compiles successfully
