package notify

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/redis/go-redis/v9"
)

// RedisNotifier publishes intake completion events for websocket fan-out.
type RedisNotifier struct {
	client  *redis.Client
	channel string
}

func NewRedisNotifier(redisURL, channel string) (*RedisNotifier, error) {
	if redisURL == "" {
		return nil, nil
	}
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parse redis url: %w", err)
	}
	return &RedisNotifier{
		client:  redis.NewClient(opts),
		channel: channel,
	}, nil
}

func (n *RedisNotifier) NotifyIntakeCompleted(ctx context.Context, userID, serviceRequestID string) error {
	if n == nil || n.client == nil || userID == "" {
		return nil
	}
	payload, _ := json.Marshal(map[string]string{
		"type":             "intake.ai.completed",
		"userId":           userID,
		"serviceRequestId": serviceRequestID,
	})
	return n.client.Publish(ctx, n.channel, payload).Err()
}

func (n *RedisNotifier) Close() error {
	if n == nil || n.client == nil {
		return nil
	}
	return n.client.Close()
}
