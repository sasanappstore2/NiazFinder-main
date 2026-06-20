package config

import (
	"os"
	"strconv"
	"time"
)

// Config holds runtime configuration loaded from environment variables.
type Config struct {
	Port              string
	DatabaseURL       string
	RedisURL          string
	RedisChannel      string
	InstanceID        string
	SendRatePerMin    int
	ReadHeaderTimeout time.Duration
	WriteTimeout      time.Duration
	IdleTimeout       time.Duration
	ShutdownTimeout   time.Duration
	InternalSecret    string
}

// Load reads configuration from the environment with sensible defaults.
func Load() Config {
	return Config{
		Port:              getEnv("PORT", "3004"),
		DatabaseURL:       os.Getenv("DATABASE_URL"),
		RedisURL:          os.Getenv("REDIS_URL"),
		RedisChannel:      getEnv("COMM_REDIS_CHANNEL", "comm:events"),
		InstanceID:        getEnv("CHAT_INSTANCE_ID", ""),
		SendRatePerMin:    getEnvInt("CHAT_SEND_RATE_PER_MIN", 60),
		ReadHeaderTimeout: 10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       120 * time.Second,
		ShutdownTimeout:   30 * time.Second,
		InternalSecret:    firstNonEmpty(os.Getenv("CHAT_INTERNAL_SECRET"), os.Getenv("INTERNAL_API_SECRET")),
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

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}
