package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"sync/atomic"
	"syscall"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/niazfinder/worker-go/internal/config"
	"github.com/niazfinder/worker-go/internal/mlx"
	"github.com/niazfinder/worker-go/internal/moderation"
	"github.com/niazfinder/worker-go/internal/notify"
	"github.com/niazfinder/worker-go/internal/processors"
	"github.com/niazfinder/worker-go/internal/queue"
	"github.com/niazfinder/worker-go/internal/store"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))

	cfg := config.Load()
	if cfg.DatabaseURL == "" || cfg.RabbitMQURL == "" {
		slog.Error("DATABASE_URL and RABBITMQ_URL are required")
		os.Exit(1)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

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

	intakeRepo := store.NewIntakeRepository(pool)
	analyticsRepo := store.NewAnalyticsRepository(pool)
	mlxClient := mlx.NewClient(cfg.MLXURL, cfg.MLXTimeout)

	redisNotifier, err := notify.NewRedisNotifier(cfg.RedisURL, cfg.RedisChannel)
	if err != nil {
		slog.Error("redis notifier init failed", "error", err)
		os.Exit(1)
	}
	if redisNotifier != nil {
		defer func() { _ = redisNotifier.Close() }()
	}

	intakeConsumer := queue.NewConsumer(cfg, cfg.IntakeQueue, "worker-go-intake", nil)
	if err := intakeConsumer.Connect(); err != nil {
		slog.Error("intake consumer connect failed", "error", err)
		os.Exit(1)
	}
	defer func() { _ = intakeConsumer.Close() }()

	analyticsConsumer := queue.NewConsumer(cfg, cfg.AnalyticsQueue, "worker-go-analytics", nil)
	if err := analyticsConsumer.Connect(); err != nil {
		slog.Error("analytics consumer connect failed", "error", err)
		os.Exit(1)
	}
	defer func() { _ = analyticsConsumer.Close() }()

	publishFn := func(ctx context.Context, routingKey string, body []byte, headers amqp.Table) error {
		return intakeConsumer.Channel().PublishWithContext(
			ctx,
			cfg.Exchange,
			routingKey,
			false,
			false,
			amqp.Publishing{
				Headers:      headers,
				ContentType:  "application/json",
				DeliveryMode: amqp.Persistent,
				Body:         body,
			},
		)
	}

	notifyFn := func(ctx context.Context, userID, serviceRequestID string) error {
		return redisNotifier.NotifyIntakeCompleted(ctx, userID, serviceRequestID)
	}

	intakeProcessor := processors.NewIntakeProcessor(
		cfg,
		mlxClient,
		intakeRepo,
		publishFn,
		notifyFn,
		moderation.NewClient(cfg.AppURL, cfg.InternalAPISecret),
	)
	analyticsProcessor := processors.NewAnalyticsProcessor(cfg, analyticsRepo)
	analyticsProcessor.Start(ctx)

	intakeConsumer.SetHandler(intakeProcessor.Handle)
	analyticsConsumer.SetHandler(analyticsProcessor.Handle)
	analyticsConsumer.SetManualAck(true)

	var analyticsBuffer atomic.Int64

	go func() {
		ticker := time.NewTicker(2 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				analyticsBuffer.Store(int64(analyticsProcessor.BufferSize()))
			}
		}
	}()

	go func() {
		if err := intakeConsumer.Run(ctx); err != nil && ctx.Err() == nil {
			slog.Error("intake consumer stopped", "error", err)
			cancel()
		}
	}()
	go func() {
		if err := analyticsConsumer.Run(ctx); err != nil && ctx.Err() == nil {
			slog.Error("analytics consumer stopped", "error", err)
			cancel()
		}
	}()

	go func() {
		mux := http.NewServeMux()
		mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"ok":true,"service":"worker-go"}`))
		})
		mux.HandleFunc("/metrics", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			payload, _ := json.Marshal(map[string]any{
				"analyticsBuffer": analyticsBuffer.Load(),
			})
			_, _ = w.Write(payload)
		})
		_ = http.ListenAndServe(":8081", mux)
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	slog.Info("shutdown signal received")
	cancel()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer shutdownCancel()

	_ = analyticsProcessor.Stop(shutdownCtx)
	_ = intakeConsumer.Close()
	_ = analyticsConsumer.Close()

	slog.Info("worker-go stopped cleanly")
}
