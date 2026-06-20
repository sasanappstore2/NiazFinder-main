package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/niazfinder/chat-go/internal/auth"
	"github.com/niazfinder/chat-go/internal/config"
	"github.com/niazfinder/chat-go/internal/hub"
	"github.com/niazfinder/chat-go/internal/server"
	"github.com/niazfinder/chat-go/internal/store"
	"github.com/niazfinder/chat-go/internal/ws"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))

	cfg := config.Load()
	if cfg.DatabaseURL == "" {
		slog.Error("DATABASE_URL is required")
		os.Exit(1)
	}

	instanceID := cfg.InstanceID
	if instanceID == "" {
		instanceID = uuid.NewString()
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("postgres connect failed", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		slog.Error("postgres ping failed", "error", err)
		os.Exit(1)
	}

	repo := store.NewRepository(pool)
	validator := auth.NewValidator(pool)

	chatHub := hub.NewHub(instanceID, func(userID string) {
		cctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		_ = repo.SetUserOnline(cctx, userID, false)
	})
	go chatHub.Run()

	var redisBridge *hub.RedisBridge
	var rateLimiter ws.RateLimiter
	if cfg.RedisURL != "" {
		bridge, err := hub.NewRedisBridge(cfg.RedisURL, cfg.RedisChannel, instanceID, chatHub)
		if err != nil {
			slog.Error("redis bridge init failed", "error", err)
			os.Exit(1)
		}
		redisBridge = bridge
		rateLimiter = bridge
		if err := bridge.Start(ctx); err != nil {
			slog.Error("redis bridge start failed", "error", err)
			os.Exit(1)
		}
		defer func() { _ = bridge.Close() }()
	}

	hubFacade := &ws.HubFacade{Local: chatHub, Redis: redisBridge}
	wsHandler := ws.NewHandler(hubFacade, validator, repo, rateLimiter, cfg.SendRatePerMin)
	srv := server.New(cfg, chatHub, redisBridge, repo, wsHandler)

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server stopped", "error", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	slog.Info("shutdown signal received")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()

	chatHub.Shutdown(shutdownCtx)
	_ = srv.Shutdown(shutdownCtx)
	slog.Info("chat-go stopped cleanly")
}
