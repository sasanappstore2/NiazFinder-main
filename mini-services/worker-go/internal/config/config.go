package config

import (
	"os"
	"strconv"
	"time"
)

// Config holds worker runtime configuration.
type Config struct {
	DatabaseURL           string
	RabbitMQURL           string
	Exchange              string
	IntakeQueue           string
	AnalyticsQueue        string
	MatchingQueue         string
	DLXExchange           string
	DLQQueue              string
	RoutingIntake         string
	RoutingAnalytics      string
	RoutingMatching       string
	MLXURL                string
	MLXTimeout            time.Duration
	WorkerConcurrency     int
	PrefetchCount         int
	ShutdownTimeout       time.Duration
	AnalyticsBatchSize    int
	AnalyticsFlushEvery   time.Duration
	RedisURL              string
	RedisChannel          string
	AppURL                string
	InternalAPISecret     string
	MaxRetries            int
	RetryHeader           string
}

// Load reads environment variables.
func Load() Config {
	flushInterval := 5 * time.Second
	if raw := os.Getenv("ANALYTICS_FLUSH_INTERVAL"); raw != "" {
		if d, err := time.ParseDuration(raw); err == nil {
			flushInterval = d
		}
	}

	return Config{
		DatabaseURL:         os.Getenv("DATABASE_URL"),
		RabbitMQURL:         os.Getenv("RABBITMQ_URL"),
		Exchange:            getEnv("RABBITMQ_EXCHANGE", "niazfinder_topic"),
		IntakeQueue:         getEnv("INTAKE_QUEUE", "intake_ai_processing"),
		AnalyticsQueue:      getEnv("ANALYTICS_QUEUE", "analytics_telemetry"),
		MatchingQueue:       getEnv("MATCHING_QUEUE", "business_matching"),
		DLXExchange:         getEnv("DLX_EXCHANGE", "dlx_niazfinder"),
		DLQQueue:            getEnv("DLQ_QUEUE", "dlq_failed_tasks"),
		RoutingIntake:       getEnv("RABBITMQ_ROUTING_INTAKE", "intake.ai"),
		RoutingAnalytics:    getEnv("RABBITMQ_ROUTING_ANALYTICS", "analytics.telemetry"),
		RoutingMatching:     getEnv("RABBITMQ_ROUTING_MATCHING", "business.match"),
		MLXURL:              getEnv("MLX_INTAKE_URL", "http://gemma4-intake:8100/analyze"),
		MLXTimeout:          time.Duration(getEnvInt("MLX_TIMEOUT_SECONDS", 120)) * time.Second,
		WorkerConcurrency:   getEnvInt("WORKER_CONCURRENCY", 100),
		PrefetchCount:       getEnvInt("RABBITMQ_PREFETCH", 100),
		ShutdownTimeout:     30 * time.Second,
		AnalyticsBatchSize:  getEnvInt("ANALYTICS_BATCH_SIZE", 1000),
		AnalyticsFlushEvery: flushInterval,
		RedisURL:            os.Getenv("REDIS_URL"),
		RedisChannel:        getEnv("COMM_REDIS_CHANNEL", "comm:events"),
		AppURL:              getEnv("APP_URL", getEnv("NEXT_PUBLIC_APP_URL", "http://127.0.0.1:3000")),
		InternalAPISecret:   os.Getenv("INTERNAL_API_SECRET"),
		MaxRetries:          getEnvInt("RABBITMQ_MAX_RETRIES", 3),
		RetryHeader:         getEnv("RABBITMQ_RETRY_HEADER", "x-retry-count"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback
	}
	n, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return n
}
