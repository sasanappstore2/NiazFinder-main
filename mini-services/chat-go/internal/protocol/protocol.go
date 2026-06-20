package protocol

import "encoding/json"

// Inbound WebSocket envelope from clients.
type Inbound struct {
	Event string          `json:"event"`
	Data  json.RawMessage `json:"data"`
}

// Outbound WebSocket envelope to clients.
type Outbound struct {
	Event string `json:"event"`
	Data  any    `json:"data"`
}

// SendMessagePayload mirrors the existing chat-service contract.
type SendMessagePayload struct {
	ConversationID string `json:"conversationId"`
	Content        string `json:"content"`
	ClientTempID   string `json:"clientTempId"`
	Type           string `json:"type"`
	ReplyToID      string `json:"replyToId,omitempty"`
}

// MessageBroadcast is emitted to conversation participants.
type MessageBroadcast struct {
	ConversationID string `json:"conversationId"`
	MessageID      string `json:"messageId"`
	SenderID       string `json:"senderId"`
	Content        string `json:"content"`
	ClientTempID   string `json:"clientTempId"`
	Type           string `json:"type"`
	CreatedAt      string `json:"createdAt"`
}

// RedisFanoutEvent is published across chat instances.
type RedisFanoutEvent struct {
	Origin  string          `json:"origin"`
	Room    string          `json:"room"`
	Message json.RawMessage `json:"message"`
	Exclude string          `json:"exclude,omitempty"`
}
