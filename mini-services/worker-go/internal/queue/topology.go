package queue

import (
	"fmt"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/niazfinder/worker-go/internal/config"
)

// AssertTopology declares exchanges, DLQ, work queues, and bindings.
func AssertTopology(ch *amqp.Channel, cfg config.Config) error {
	if err := ch.ExchangeDeclare(cfg.DLXExchange, "direct", true, false, false, false, nil); err != nil {
		return fmt.Errorf("declare dlx: %w", err)
	}
	if _, err := ch.QueueDeclare(cfg.DLQQueue, true, false, false, false, nil); err != nil {
		return fmt.Errorf("declare dlq: %w", err)
	}
	if err := ch.QueueBind(cfg.DLQQueue, cfg.DLQQueue, cfg.DLXExchange, false, nil); err != nil {
		return fmt.Errorf("bind dlq: %w", err)
	}

	if err := ch.ExchangeDeclare(cfg.Exchange, "topic", true, false, false, false, nil); err != nil {
		return fmt.Errorf("declare exchange: %w", err)
	}

	queueArgs := amqp.Table{
		"x-dead-letter-exchange":    cfg.DLXExchange,
		"x-dead-letter-routing-key": cfg.DLQQueue,
	}

	queues := []struct {
		name       string
		routingKey string
	}{
		{cfg.IntakeQueue, cfg.RoutingIntake},
		{cfg.AnalyticsQueue, cfg.RoutingAnalytics},
		{cfg.MatchingQueue, cfg.RoutingMatching},
	}

	for _, q := range queues {
		if _, err := ch.QueueDeclare(q.name, true, false, false, false, queueArgs); err != nil {
			return fmt.Errorf("declare queue %s: %w", q.name, err)
		}
		if err := ch.QueueBind(q.name, q.routingKey, cfg.Exchange, false, nil); err != nil {
			return fmt.Errorf("bind queue %s: %w", q.name, err)
		}
	}

	return nil
}
