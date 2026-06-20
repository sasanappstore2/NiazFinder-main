package queue

import (
	"context"
	"fmt"
	"log/slog"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/niazfinder/worker-go/internal/config"
)

// Handler processes a single AMQP delivery.
type Handler func(ctx context.Context, delivery amqp.Delivery) error

// Consumer reads messages from a RabbitMQ queue.
type Consumer struct {
	cfg         config.Config
	queueName   string
	conn        *amqp.Connection
	channel     *amqp.Channel
	handler     Handler
	manualAck   bool
	consumerTag string
}

// SetHandler assigns the message handler after connect (used when publish fn needs channel).
func (c *Consumer) SetHandler(handler Handler) {
	c.handler = handler
}

// SetManualAck skips automatic Ack on success (handler acks/nacks itself).
func (c *Consumer) SetManualAck(manual bool) {
	c.manualAck = manual
}

// NewConsumer builds a RabbitMQ consumer for a single queue.
func NewConsumer(cfg config.Config, queueName, consumerTag string, handler Handler) *Consumer {
	return &Consumer{
		cfg:         cfg,
		queueName:   queueName,
		handler:     handler,
		consumerTag: consumerTag,
	}
}
func (c *Consumer) Connect() error {
	conn, err := amqp.Dial(c.cfg.RabbitMQURL)
	if err != nil {
		return fmt.Errorf("amqp dial: %w", err)
	}
	ch, err := conn.Channel()
	if err != nil {
		_ = conn.Close()
		return fmt.Errorf("amqp channel: %w", err)
	}
	if err := ch.Qos(c.cfg.PrefetchCount, 0, false); err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return fmt.Errorf("amqp qos: %w", err)
	}
	if err := AssertTopology(ch, c.cfg); err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return err
	}
	c.conn = conn
	c.channel = ch
	return nil
}

// Channel exposes the AMQP channel for republish retries.
func (c *Consumer) Channel() *amqp.Channel {
	return c.channel
}

// Run blocks until context cancellation.
func (c *Consumer) Run(ctx context.Context) error {
	deliveries, err := c.channel.Consume(
		c.queueName,
		c.consumerTag,
		false,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		return fmt.Errorf("consume: %w", err)
	}

	slog.Info("rabbitmq consumer started", "queue", c.queueName, "tag", c.consumerTag)
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case delivery, ok := <-deliveries:
			if !ok {
				return fmt.Errorf("delivery channel closed: %s", c.queueName)
			}
			c.handleDelivery(ctx, delivery)
		}
	}
}

func (c *Consumer) handleDelivery(ctx context.Context, delivery amqp.Delivery) {
	if c.handler == nil {
		_ = delivery.Nack(false, false)
		return
	}
	err := c.handler(ctx, delivery)
	if err == nil {
		if c.manualAck {
			return
		}
		_ = delivery.Ack(false)
		return
	}

	retryCount := headerInt(delivery.Headers, c.cfg.RetryHeader)
	slog.Error("task failed", "queue", c.queueName, "retry", retryCount, "error", err)

	if retryCount < c.cfg.MaxRetries {
		headers := amqp.Table{}
		for k, v := range delivery.Headers {
			headers[k] = v
		}
		headers[c.cfg.RetryHeader] = int32(retryCount + 1)

		pubErr := c.channel.PublishWithContext(
			ctx,
			c.cfg.Exchange,
			delivery.RoutingKey,
			false,
			false,
			amqp.Publishing{
				Headers:      headers,
				ContentType:  delivery.ContentType,
				DeliveryMode: amqp.Persistent,
				Body:         delivery.Body,
				MessageId:    delivery.MessageId,
				CorrelationId: delivery.CorrelationId,
			},
		)
		if pubErr != nil {
			slog.Error("retry republish failed", "error", pubErr)
			_ = delivery.Nack(false, false)
			return
		}
		_ = delivery.Ack(false)
		return
	}

	_ = delivery.Nack(false, false)
}

func headerInt(headers amqp.Table, key string) int {
	if headers == nil {
		return 0
	}
	raw, ok := headers[key]
	if !ok {
		return 0
	}
	switch v := raw.(type) {
	case int:
		return v
	case int32:
		return int(v)
	case int64:
		return int(v)
	case float64:
		return int(v)
	default:
		return 0
	}
}

// Close shuts down AMQP resources.
func (c *Consumer) Close() error {
	if c.channel != nil {
		_ = c.channel.Close()
	}
	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}
