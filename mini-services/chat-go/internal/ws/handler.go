package ws

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/niazfinder/chat-go/internal/auth"
	"github.com/niazfinder/chat-go/internal/hub"
	"github.com/niazfinder/chat-go/internal/protocol"
	"github.com/niazfinder/chat-go/internal/store"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 64 * 1024
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	CheckOrigin: func(r *http.Request) bool {
		// Same permissive policy as existing Socket.io gateway; tighten in production via env.
		return true
	},
}

// Handler wires HTTP upgrade, auth, and hub lifecycle.
type Handler struct {
	Hub         *HubFacade
	Auth        *auth.Validator
	Store       *store.Repository
	RateLimiter RateLimiter
	SendLimit   int
}

// HubFacade abstracts local hub + optional Redis bridge.
type HubFacade struct {
	Local *hub.Hub
	Redis *hub.RedisBridge
}

// RateLimiter gates outbound message sends per user.
type RateLimiter interface {
	AllowSend(ctx context.Context, userID string, limit int) (bool, error)
}

type noopRateLimiter struct{}

func (noopRateLimiter) AllowSend(context.Context, string, int) (bool, error) { return true, nil }

// NewHandler constructs a WebSocket handler.
func NewHandler(h *HubFacade, validator *auth.Validator, repo *store.Repository, limiter RateLimiter, sendLimit int) *Handler {
	if limiter == nil {
		limiter = noopRateLimiter{}
	}
	return &Handler{
		Hub:         h,
		Auth:        validator,
		Store:       repo,
		RateLimiter: limiter,
		SendLimit:   sendLimit,
	}
}

// ServeHTTP upgrades the connection and runs read/write pumps.
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		token = auth.ExtractBearerToken(r.Header.Get("Authorization"))
	}
	if token == "" {
		http.Error(w, "authentication required", http.StatusUnauthorized)
		return
	}

	user, err := h.Auth.ValidateToken(r.Context(), token)
	if err != nil {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Warn("websocket upgrade failed", "error", err)
		return
	}

	client := &hubClient{
		conn:    conn,
		handler: h,
		user:    user,
		client:  hub.NewClient(h.Hub.Local, user.ID),
	}

	h.Hub.Local.Register(client.client)
	_ = h.Store.SetUserOnline(context.Background(), user.ID, true)

	go client.writePump()
	go client.readPump()
}

// hubClient bridges gorilla websocket with internal hub.Client.
type hubClient struct {
	conn    *websocket.Conn
	handler *Handler
	user    *auth.User
	client  *hub.Client
}

func (c *hubClient) readPump() {
	defer func() {
		h := c.handler.Hub.Local
		h.Unregister(c.client)
		_ = c.handler.Store.SetUserOnline(context.Background(), c.user.ID, false)
		_ = c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(pongWait))
	})

	// Auto-join user room + all conversations.
	ctx := context.Background()
	convIDs, err := c.handler.Store.ListConversationIDs(ctx, c.user.ID)
	if err == nil {
		for _, id := range convIDs {
			c.client.JoinRoom("conv:" + id)
		}
	}

	for {
		_, raw, err := c.conn.ReadMessage()
		if err != nil {
			return
		}
		var msg protocol.Inbound
		if err := json.Unmarshal(raw, &msg); err != nil {
			c.emit("error", map[string]string{"message": "invalid payload"})
			continue
		}
		c.dispatch(ctx, msg)
	}
}

func (c *hubClient) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()

	for {
		select {
		case payload, ok := <-c.client.Send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, payload); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *hubClient) emit(event string, data any) {
	payload, _ := json.Marshal(protocol.Outbound{Event: event, Data: data})
	select {
	case c.client.Send <- payload:
	default:
	}
}

func (c *hubClient) dispatch(ctx context.Context, msg protocol.Inbound) {
	switch msg.Event {
	case "join:conversation":
		var conversationID string
		_ = json.Unmarshal(msg.Data, &conversationID)
		conversationID = strings.TrimSpace(conversationID)
		if conversationID == "" {
			return
		}
		ok, err := c.handler.Store.IsConversationParticipant(ctx, conversationID, c.user.ID)
		if err != nil || !ok {
			c.emit("error", map[string]string{"message": "access denied"})
			return
		}
		c.client.JoinRoom("conv:" + conversationID)

	case "leave:conversation":
		var conversationID string
		_ = json.Unmarshal(msg.Data, &conversationID)
		if conversationID != "" {
			c.client.LeaveRoom("conv:" + conversationID)
		}

	case "message:send":
		var payload protocol.SendMessagePayload
		if err := json.Unmarshal(msg.Data, &payload); err != nil {
			c.emit("error", map[string]string{"message": "invalid message payload"})
			return
		}
		c.handleSend(ctx, payload)

	case "ping":
		c.emit("pong", map[string]int64{"ts": time.Now().UnixMilli()})

	default:
		c.emit("error", map[string]string{"message": "unknown event"})
	}
}

func (c *hubClient) handleSend(ctx context.Context, payload protocol.SendMessagePayload) {
	content := strings.TrimSpace(payload.Content)
	if payload.ConversationID == "" || content == "" {
		return
	}

	allowed, err := c.handler.RateLimiter.AllowSend(ctx, c.user.ID, c.handler.SendLimit)
	if err != nil {
		slog.Warn("rate limiter error", "error", err)
	}
	if !allowed {
		c.emit("error", map[string]string{"message": "rate limit exceeded"})
		return
	}

	tempID := payload.ClientTempID
	if tempID == "" {
		tempID = "tmp-" + c.user.ID + "-" + uuid.NewString()
	}

	msgType := payload.Type
	if msgType == "" {
		msgType = "TEXT"
	}

	room := "conv:" + payload.ConversationID
	createdAt := time.Now().UTC()

	broadcast := protocol.MessageBroadcast{
		ConversationID: payload.ConversationID,
		MessageID:      tempID,
		SenderID:       c.user.ID,
		Content:        content,
		ClientTempID:   tempID,
		Type:           msgType,
		CreatedAt:      createdAt.Format(time.RFC3339Nano),
	}

	outbound, _ := json.Marshal(protocol.Outbound{Event: "message:new", Data: broadcast})
	c.handler.Hub.Local.BroadcastRoom(room, outbound, c.client.ID)

	if c.handler.Hub.Redis != nil {
		_ = c.handler.Hub.Redis.PublishFanout(ctx, protocol.RedisFanoutEvent{
			Room:    room,
			Message: outbound,
			Exclude: c.client.ID,
		})
	}

	go func() {
		persistCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		id, persistedAt, err := c.handler.Store.InsertMessage(
			persistCtx,
			payload.ConversationID,
			c.user.ID,
			content,
			msgType,
			tempID,
		)
		if err != nil {
			slog.Warn("message persist failed", "error", err)
			return
		}
		ack, _ := json.Marshal(protocol.Outbound{
			Event: "message:ack",
			Data: map[string]string{
				"clientTempId": tempID,
				"messageId":    id,
				"createdAt":    persistedAt.Format(time.RFC3339Nano),
			},
		})
		select {
		case c.client.Send <- ack:
		default:
		}
	}()
}
