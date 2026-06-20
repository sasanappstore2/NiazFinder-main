package hub

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/niazfinder/chat-go/internal/protocol"
	"github.com/redis/go-redis/v9"
)

// RedisBridge fans out events across horizontally scaled chat instances.
type RedisBridge struct {
	client    *redis.Client
	channel   string
	instance  string
	hub       *Hub
	pubsub    *redis.PubSub
	cancel    context.CancelFunc
}

// NewRedisBridge connects to Redis for cross-instance pub/sub.
func NewRedisBridge(redisURL, channel, instanceID string, hub *Hub) (*RedisBridge, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parse redis url: %w", err)
	}
	client := redis.NewClient(opts)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis ping: %w", err)
	}

	return &RedisBridge{
		client:   client,
		channel:  channel,
		instance: instanceID,
		hub:      hub,
	}, nil
}

// Start subscribes to the fan-out channel.
func (b *RedisBridge) Start(ctx context.Context) error {
	ctx, b.cancel = context.WithCancel(ctx)
	b.pubsub = b.client.Subscribe(ctx, b.channel)

	if _, err := b.pubsub.Receive(ctx); err != nil {
		return fmt.Errorf("redis subscribe: %w", err)
	}

	go b.listen(ctx)
	slog.Info("redis pub/sub bridge started", "channel", b.channel)
	return nil
}

func (b *RedisBridge) listen(ctx context.Context) {
	ch := b.pubsub.Channel()
	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}
			var event protocol.RedisFanoutEvent
			if err := json.Unmarshal([]byte(msg.Payload), &event); err != nil {
				slog.Warn("invalid redis fanout payload", "error", err)
				continue
			}
			if event.Origin == b.instance {
				continue
			}
			if event.Room == "" || len(event.Message) == 0 {
				continue
			}
			b.hub.BroadcastRoom(event.Room, event.Message, event.Exclude)
		}
	}
}

// PublishFanout sends an event to all other chat instances.
func (b *RedisBridge) PublishFanout(ctx context.Context, event protocol.RedisFanoutEvent) error {
	event.Origin = b.instance
	raw, err := json.Marshal(event)
	if err != nil {
		return err
	}
	return b.client.Publish(ctx, b.channel, raw).Err()
}

// AllowSend implements a distributed per-minute send rate limit using Redis INCR.
func (b *RedisBridge) AllowSend(ctx context.Context, userID string, limit int) (bool, error) {
	if limit <= 0 {
		return true, nil
	}
	key := fmt.Sprintf("chat:rate:%s:%d", userID, time.Now().Unix()/60)
	count, err := b.client.Incr(ctx, key).Result()
	if err != nil {
		return true, err
	}
	if count == 1 {
		_ = b.client.Expire(ctx, key, 2*time.Minute).Err()
	}
	return count <= int64(limit), nil
}

// Close stops the subscriber and Redis client.
func (b *RedisBridge) Close() error {
	if b.cancel != nil {
		b.cancel()
	}
	if b.pubsub != nil {
		_ = b.pubsub.Close()
	}
	return b.client.Close()
}

// Client exposes the underlying Redis client for health checks.
func (b *RedisBridge) Client() *redis.Client {
	return b.client
}
