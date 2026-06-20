package store

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// IntakeRepository updates ServiceRequest rows after MLX processing.
type IntakeRepository struct {
	pool *pgxpool.Pool
}

func NewIntakeRepository(pool *pgxpool.Pool) *IntakeRepository {
	return &IntakeRepository{pool: pool}
}

type FinalizeInput struct {
	ServiceRequestID string
	Title            string
	Description      string
	AIJSON           []byte
}

// FinalizeAfterMLX promotes a PENDING_AI_REVIEW request after MLX enrichment.
func (r *IntakeRepository) FinalizeAfterMLX(ctx context.Context, input FinalizeInput) (bool, error) {
	const selectQ = `
		SELECT "aiExtractedData"
		FROM "ServiceRequest"
		WHERE id = $1 AND status = 'PENDING_AI_REVIEW'::"RequestStatus"
	`
	var existingAI *string
	if err := r.pool.QueryRow(ctx, selectQ, input.ServiceRequestID).Scan(&existingAI); err != nil {
		return false, fmt.Errorf("load service request: %w", err)
	}

	autoApprove := false
	mergedAI := input.AIJSON
	if existingAI != nil && *existingAI != "" {
		var meta map[string]any
		if err := json.Unmarshal([]byte(*existingAI), &meta); err == nil {
			if v, ok := meta["autoApprove"].(bool); ok {
				autoApprove = v
			}
		}
		if len(input.AIJSON) > 0 {
			var mlx map[string]any
			if err := json.Unmarshal(input.AIJSON, &mlx); err == nil {
				if meta == nil {
					meta = map[string]any{}
				}
				meta["mlx"] = mlx
				meta["mlxProcessedAt"] = time.Now().UTC().Format(time.RFC3339)
				if b, err := json.Marshal(meta); err == nil {
					mergedAI = b
				}
			}
		}
	}

	status := "PENDING_REVIEW"
	moderationStatus := "PENDING"
	if autoApprove {
		status = "OPEN"
		moderationStatus = "APPROVED"
	}

	const updateQ = `
		UPDATE "ServiceRequest"
		SET title = CASE WHEN $2 = '' THEN title ELSE $2 END,
		    description = CASE WHEN $3 = '' THEN description ELSE $3 END,
		    "aiExtractedData" = $4,
		    status = $5::"RequestStatus",
		    "moderationStatus" = $6::"ModerationStatus",
		    "updatedAt" = $7
		WHERE id = $1 AND status = 'PENDING_AI_REVIEW'::"RequestStatus"
	`
	tag, err := r.pool.Exec(
		ctx,
		updateQ,
		input.ServiceRequestID,
		input.Title,
		input.Description,
		string(mergedAI),
		status,
		moderationStatus,
		time.Now().UTC(),
	)
	if err != nil {
		return false, err
	}
	if tag.RowsAffected() == 0 {
		return false, fmt.Errorf("service request not found or not pending AI review: %s", input.ServiceRequestID)
	}
	return autoApprove, nil
}

// MarkFailed stores failure metadata on the request row.
func (r *IntakeRepository) MarkFailed(ctx context.Context, serviceRequestID, reason string) error {
	const selectQ = `SELECT "aiExtractedData" FROM "ServiceRequest" WHERE id = $1`
	var existing *string
	_ = r.pool.QueryRow(ctx, selectQ, serviceRequestID).Scan(&existing)

	meta := map[string]any{}
	if existing != nil && *existing != "" {
		_ = json.Unmarshal([]byte(*existing), &meta)
	}
	meta["error"] = reason
	meta["failedAt"] = time.Now().UTC().Format(time.RFC3339)
	meta["processor"] = "worker-go"
	payload, _ := json.Marshal(meta)

	const q = `
		UPDATE "ServiceRequest"
		SET "aiExtractedData" = $2,
		    status = 'PENDING_REVIEW'::"RequestStatus",
		    "moderationStatus" = 'PENDING'::"ModerationStatus",
		    "updatedAt" = $3
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, q, serviceRequestID, string(payload), time.Now().UTC())
	return err
}

func TruncateTitle(summary string) string {
	s := strings.TrimSpace(summary)
	if s == "" {
		return ""
	}
	if len([]rune(s)) <= 80 {
		return s
	}
	return string([]rune(s)[:80])
}
