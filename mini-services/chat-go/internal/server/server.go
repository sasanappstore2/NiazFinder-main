package server

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/niazfinder/chat-go/internal/config"
	"github.com/niazfinder/chat-go/internal/hub"
	"github.com/niazfinder/chat-go/internal/protocol"
	"github.com/niazfinder/chat-go/internal/store"
)

const maxFanoutBody = 64 * 1024

// Server is the HTTP server for health checks and WebSocket upgrades.
type Server struct {
	cfg     config.Config
	hub     *hub.Hub
	redis   *hub.RedisBridge
	store   *store.Repository
	ws      http.Handler
	mux     *http.ServeMux
	http    *http.Server
}

// New builds the HTTP server.
func New(cfg config.Config, h *hub.Hub, redisBridge *hub.RedisBridge, repo *store.Repository, wsHandler http.Handler) *Server {
	s := &Server{
		cfg:   cfg,
		hub:   h,
		redis: redisBridge,
		store: repo,
		ws:    wsHandler,
		mux:   http.NewServeMux(),
	}
	s.routes()
	s.http = &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           s.mux,
		ReadHeaderTimeout: cfg.ReadHeaderTimeout,
		WriteTimeout:      cfg.WriteTimeout,
		IdleTimeout:       cfg.IdleTimeout,
	}
	return s
}

func (s *Server) routes() {
	s.mux.HandleFunc("/health", s.handleHealth)
	s.mux.HandleFunc("/metrics", s.handleMetrics)
	s.mux.HandleFunc("/presence", s.handlePresence)
	s.mux.HandleFunc("/internal/fanout", s.handleInternalFanout)
	s.mux.Handle("/ws", s.ws)
	// Alias for gradual migration from Socket.io path.
	s.mux.Handle("/socket.io/ws", s.ws)
}

// ListenAndServe starts the HTTP server.
func (s *Server) ListenAndServe() error {
	slog.Info("chat-go listening", "port", s.cfg.Port)
	return s.http.ListenAndServe()
}

// Shutdown gracefully stops the HTTP server.
func (s *Server) Shutdown(ctx context.Context) error {
	return s.http.Shutdown(ctx)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	status := map[string]any{
		"ok":      true,
		"service": "chat-go",
		"port":    s.cfg.Port,
	}
	if s.store != nil {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := s.store.Pool().Ping(ctx); err != nil {
			status["ok"] = false
			status["database"] = err.Error()
		}
	}
	if s.redis != nil {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := s.redis.Client().Ping(ctx).Err(); err != nil {
			status["ok"] = false
			status["redis"] = err.Error()
		}
	}
	writeJSON(w, http.StatusOK, status)
}

func (s *Server) handleMetrics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"onlineUsers":   s.hub.OnlineUsers(),
		"activeSockets": s.hub.ActiveSockets(),
	})
}

func (s *Server) handlePresence(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	ids := strings.Split(r.URL.Query().Get("userIds"), ",")
	presence := make(map[string]bool, len(ids))
	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id == "" {
			continue
		}
		presence[id] = s.hub.IsUserOnline(id)
	}
	writeJSON(w, http.StatusOK, map[string]any{"presence": presence})
}

func (s *Server) handleInternalFanout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	if s.cfg.InternalSecret == "" || r.Header.Get("x-internal-secret") != s.cfg.InternalSecret {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	body, err := io.ReadAll(io.LimitReader(r.Body, maxFanoutBody))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	var parsed struct {
		Type    string          `json:"type"`
		Payload json.RawMessage `json:"payload"`
		Room    string          `json:"room"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	room := parsed.Room
	if room == "" && parsed.Type != "" {
		// Backward-compatible with comm:events {type,payload} from Next.js BFF.
		var payload map[string]any
		_ = json.Unmarshal(parsed.Payload, &payload)
		if convID, ok := payload["conversationId"].(string); ok {
			room = "conv:" + convID
		}
	}
	if room == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "room required"})
		return
	}
	outbound, _ := json.Marshal(protocol.Outbound{Event: parsed.Type, Data: json.RawMessage(parsed.Payload)})
	s.hub.BroadcastRoom(room, outbound, "")
	if s.redis != nil {
		_ = s.redis.PublishFanout(r.Context(), protocol.RedisFanoutEvent{Room: room, Message: outbound})
	}
	w.WriteHeader(http.StatusNoContent)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func methodNotAllowed(w http.ResponseWriter) {
	writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
}
