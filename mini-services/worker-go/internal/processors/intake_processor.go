package processors

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/niazfinder/worker-go/internal/config"
	"github.com/niazfinder/worker-go/internal/mlx"
	"github.com/niazfinder/worker-go/internal/moderation"
	"github.com/niazfinder/worker-go/internal/store"
	"github.com/niazfinder/worker-go/internal/tasks"
)

// IntakeProcessor handles intake AI queue messages.
type IntakeProcessor struct {
	cfg      config.Config
	mlx      *mlx.Client
	repo          *store.IntakeRepository
	publish       func(ctx context.Context, routingKey string, body []byte, headers amqp.Table) error
	notifyFn      func(ctx context.Context, userID, serviceRequestID string) error
	moderationCli *moderation.Client
}

func NewIntakeProcessor(
	cfg config.Config,
	mlxClient *mlx.Client,
	repo *store.IntakeRepository,
	publish func(ctx context.Context, routingKey string, body []byte, headers amqp.Table) error,
	notifyFn func(ctx context.Context, userID, serviceRequestID string) error,
	moderationCli *moderation.Client,
) *IntakeProcessor {
	return &IntakeProcessor{
		cfg:           cfg,
		mlx:           mlxClient,
		repo:          repo,
		publish:       publish,
		notifyFn:      notifyFn,
		moderationCli: moderationCli,
	}
}

func (p *IntakeProcessor) Handle(ctx context.Context, delivery amqp.Delivery) error {
	var task tasks.IntakeAITask
	if err := json.Unmarshal(delivery.Body, &task); err != nil {
		return fmt.Errorf("decode intake task: %w", err)
	}
	if task.ServiceRequestID == "" {
		return fmt.Errorf("serviceRequestId required")
	}
	if task.Text == "" {
		return fmt.Errorf("text required")
	}

	result, err := p.mlx.Analyze(ctx, task)
	if err != nil {
		_ = p.repo.MarkFailed(ctx, task.ServiceRequestID, err.Error())
		return err
	}

	title := store.TruncateTitle(result.Summary)
	description := result.Summary
	aiJSON := result.Raw
	if len(aiJSON) == 0 {
		aiJSON, _ = json.Marshal(result)
	}

	autoApprove, err := p.repo.FinalizeAfterMLX(ctx, store.FinalizeInput{
		ServiceRequestID: task.ServiceRequestID,
		Title:            title,
		Description:      description,
		AIJSON:           aiJSON,
	})
	if err != nil {
		return err
	}

	if !autoApprove && p.moderationCli != nil {
		if err := p.moderationCli.EnqueueRequestModeration(ctx, task.ServiceRequestID); err != nil {
			slog.Warn("moderation enqueue failed", "error", err, "serviceRequestId", task.ServiceRequestID)
		}
	}

	matchBody, _ := json.Marshal(tasks.BusinessMatchTask{
		ServiceRequestID: task.ServiceRequestID,
		UserID:           task.UserID,
	})
	if p.publish != nil {
		if err := p.publish(ctx, p.cfg.RoutingMatching, matchBody, nil); err != nil {
			slog.Warn("business match publish failed", "error", err)
		}
	}

	if p.notifyFn != nil && task.UserID != "" {
		if err := p.notifyFn(ctx, task.UserID, task.ServiceRequestID); err != nil {
			slog.Warn("redis notify failed", "error", err)
		}
	}

	slog.Info("intake AI completed", "serviceRequestId", task.ServiceRequestID, "jobId", task.JobID)
	return nil
}
