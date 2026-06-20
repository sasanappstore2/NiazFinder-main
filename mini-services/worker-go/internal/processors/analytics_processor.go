package processors

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/niazfinder/worker-go/internal/config"
	"github.com/niazfinder/worker-go/internal/store"
	"github.com/niazfinder/worker-go/internal/tasks"
)

type pendingDelivery struct {
	msg      tasks.AnalyticsTelemetryMessage
	delivery amqp.Delivery
}

// AnalyticsProcessor batches analytics telemetry writes.
type AnalyticsProcessor struct {
	cfg       config.Config
	repo      *store.AnalyticsRepository
	batchSize int
	flushEvery time.Duration

	mu       sync.Mutex
	buffer   []pendingDelivery
	flushCh  chan struct{}
	stopCh   chan struct{}
	wg       sync.WaitGroup
}

func NewAnalyticsProcessor(cfg config.Config, repo *store.AnalyticsRepository) *AnalyticsProcessor {
	return &AnalyticsProcessor{
		cfg:        cfg,
		repo:       repo,
		batchSize:  cfg.AnalyticsBatchSize,
		flushEvery: cfg.AnalyticsFlushEvery,
		flushCh:    make(chan struct{}, 1),
		stopCh:     make(chan struct{}),
	}
}

func (p *AnalyticsProcessor) Start(ctx context.Context) {
	p.wg.Add(1)
	go p.flushLoop(ctx)
}

func (p *AnalyticsProcessor) Stop(ctx context.Context) error {
	close(p.stopCh)
	p.wg.Wait()
	return p.flush(ctx)
}

func (p *AnalyticsProcessor) BufferSize() int {
	p.mu.Lock()
	defer p.mu.Unlock()
	return len(p.buffer)
}

func (p *AnalyticsProcessor) ManualAck() bool { return true }

func (p *AnalyticsProcessor) Handle(ctx context.Context, delivery amqp.Delivery) error {
	var msg tasks.AnalyticsTelemetryMessage
	if err := json.Unmarshal(delivery.Body, &msg); err != nil {
		return fmt.Errorf("decode analytics message: %w", err)
	}

	p.mu.Lock()
	p.buffer = append(p.buffer, pendingDelivery{msg: msg, delivery: delivery})
	shouldFlush := len(p.buffer) >= p.batchSize
	p.mu.Unlock()

	if shouldFlush {
		p.requestFlush()
	}
	return nil
}

func (p *AnalyticsProcessor) requestFlush() {
	select {
	case p.flushCh <- struct{}{}:
	default:
	}
}

func (p *AnalyticsProcessor) flushLoop(ctx context.Context) {
	defer p.wg.Done()
	ticker := time.NewTicker(p.flushEvery)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-p.stopCh:
			return
		case <-ticker.C:
			_ = p.flush(ctx)
		case <-p.flushCh:
			_ = p.flush(ctx)
		}
	}
}

func (p *AnalyticsProcessor) flush(ctx context.Context) error {
	p.mu.Lock()
	if len(p.buffer) == 0 {
		p.mu.Unlock()
		return nil
	}
	batch := p.buffer
	p.buffer = nil
	p.mu.Unlock()

	messages := make([]tasks.AnalyticsTelemetryMessage, len(batch))
	for i, item := range batch {
		messages[i] = item.msg
	}

	if err := p.repo.InsertBatch(ctx, messages); err != nil {
		for _, item := range batch {
			_ = item.delivery.Nack(false, false)
		}
		return err
	}

	for _, item := range batch {
		_ = item.delivery.Ack(false)
	}
	return nil
}
