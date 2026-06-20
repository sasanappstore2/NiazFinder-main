package hub

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"

	"github.com/google/uuid"
	"github.com/niazfinder/chat-go/internal/protocol"
)

// Client represents one WebSocket connection.
type Client struct {
	ID     string
	UserID string
	Hub    *Hub
	Send   chan []byte
	Rooms  map[string]struct{}
	closed chan struct{}
}

// NewClient creates a hub-connected WebSocket client.
func NewClient(h *Hub, userID string) *Client {
	return &Client{
		ID:     uuid.NewString(),
		UserID: userID,
		Hub:    h,
		Send:   make(chan []byte, 256),
		Rooms:  make(map[string]struct{}),
		closed: make(chan struct{}),
	}
}

func newClient(h *Hub, userID string) *Client {
	return NewClient(h, userID)
}

// Close tears down the client send loop.
func (c *Client) Close() {
	select {
	case <-c.closed:
	default:
		close(c.closed)
	}
}

// JoinRoom subscribes the client to a logical room (user:* or conv:*).
func (c *Client) JoinRoom(room string) {
	c.Hub.mu.Lock()
	defer c.Hub.mu.Unlock()

	if _, ok := c.Rooms[room]; ok {
		return
	}
	c.Rooms[room] = struct{}{}

	if c.Hub.rooms[room] == nil {
		c.Hub.rooms[room] = make(map[string]*Client)
	}
	c.Hub.rooms[room][c.ID] = c

	if c.Hub.userSockets[c.UserID] == nil {
		c.Hub.userSockets[c.UserID] = make(map[string]*Client)
	}
	c.Hub.userSockets[c.UserID][c.ID] = c
}

// LeaveRoom unsubscribes the client from a room.
func (c *Client) LeaveRoom(room string) {
	c.Hub.mu.Lock()
	defer c.Hub.mu.Unlock()
	delete(c.Rooms, room)
	if members, ok := c.Hub.rooms[room]; ok {
		delete(members, c.ID)
		if len(members) == 0 {
			delete(c.Hub.rooms, room)
		}
	}
}

// Emit serializes and queues an outbound event.
func (c *Client) Emit(event string, data any) {
	payload, err := json.Marshal(protocol.Outbound{Event: event, Data: data})
	if err != nil {
		return
	}
	select {
	case c.Send <- payload:
	case <-c.closed:
	default:
		slog.Warn("client send buffer full; dropping message", "userId", c.UserID)
	}
}

// Hub manages in-memory rooms and fan-out to local clients.
type Hub struct {
	mu          sync.RWMutex
	rooms       map[string]map[string]*Client
	userSockets map[string]map[string]*Client
	register    chan *Client
	unregister  chan *Client
	shutdown    chan struct{}
	done        chan struct{}
	instanceID  string
	onLastDisconnect func(userID string)
}

// NewHub constructs a Hub with optional disconnect hook (e.g. mark user offline).
func NewHub(instanceID string, onLastDisconnect func(userID string)) *Hub {
	return &Hub{
		rooms:            make(map[string]map[string]*Client),
		userSockets:      make(map[string]map[string]*Client),
		register:         make(chan *Client),
		unregister:       make(chan *Client),
		shutdown:         make(chan struct{}),
		done:             make(chan struct{}),
		instanceID:       instanceID,
		onLastDisconnect: onLastDisconnect,
	}
}

// InstanceID returns the unique ID for this process (used to skip Redis echo).
func (h *Hub) InstanceID() string {
	return h.instanceID
}

// Run starts the hub event loop until Shutdown is called.
func (h *Hub) Run() {
	defer close(h.done)
	for {
		select {
		case client := <-h.register:
			client.JoinRoom("user:" + client.UserID)
		case client := <-h.unregister:
			h.removeClient(client)
		case <-h.shutdown:
			h.closeAll()
			return
		}
	}
}

// Register adds a connected client.
func (h *Hub) Register(client *Client) {
	h.register <- client
}

// Unregister removes a disconnected client.
func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}

// Shutdown gracefully closes all active sockets.
func (h *Hub) Shutdown(ctx context.Context) {
	close(h.shutdown)
	select {
	case <-h.done:
	case <-ctx.Done():
	}
}

func (h *Hub) removeClient(client *Client) {
	h.mu.Lock()
	for room := range client.Rooms {
		if members, ok := h.rooms[room]; ok {
			delete(members, client.ID)
			if len(members) == 0 {
				delete(h.rooms, room)
			}
		}
	}
	delete(h.userSockets[client.UserID], client.ID)
	remaining := len(h.userSockets[client.UserID])
	if remaining == 0 {
		delete(h.userSockets, client.UserID)
	}
	h.mu.Unlock()

	client.Close()
	close(client.Send)

	if remaining == 0 && h.onLastDisconnect != nil {
		h.onLastDisconnect(client.UserID)
	}
}

func (h *Hub) closeAll() {
	h.mu.Lock()
	clients := make([]*Client, 0)
	for _, set := range h.userSockets {
		for _, c := range set {
			clients = append(clients, c)
		}
	}
	h.mu.Unlock()

	for _, c := range clients {
		c.Emit("server:shutdown", map[string]string{"reason": "draining"})
		h.removeClient(c)
	}
}

// BroadcastRoom delivers a payload to all clients in a room on this instance.
func (h *Hub) BroadcastRoom(room string, payload []byte, excludeClientID string) {
	h.mu.RLock()
	members := h.rooms[room]
	clients := make([]*Client, 0, len(members))
	for id, c := range members {
		if id != excludeClientID {
			clients = append(clients, c)
		}
	}
	h.mu.RUnlock()

	for _, c := range clients {
		select {
		case c.Send <- payload:
		default:
		}
	}
}

// OnlineUsers returns the number of distinct online user IDs on this instance.
func (h *Hub) OnlineUsers() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.userSockets)
}

// ActiveSockets returns total socket count on this instance.
func (h *Hub) ActiveSockets() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	n := 0
	for _, set := range h.userSockets {
		n += len(set)
	}
	return n
}

// IsUserOnline checks local presence for a user ID.
func (h *Hub) IsUserOnline(userID string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	set := h.userSockets[userID]
	return len(set) > 0
}
