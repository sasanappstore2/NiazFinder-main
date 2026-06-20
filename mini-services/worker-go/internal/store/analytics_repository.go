package store

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/niazfinder/worker-go/internal/tasks"
)

// AnalyticsRepository performs batched analytics writes.
type AnalyticsRepository struct {
	pool *pgxpool.Pool
}

func NewAnalyticsRepository(pool *pgxpool.Pool) *AnalyticsRepository {
	return &AnalyticsRepository{pool: pool}
}

// InsertBatch persists analytics sessions and events in a single transaction.
func (r *AnalyticsRepository) InsertBatch(ctx context.Context, messages []tasks.AnalyticsTelemetryMessage) error {
	if len(messages) == 0 {
		return nil
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	seenSessions := map[string]bool{}
	for _, msg := range messages {
		if seenSessions[msg.SessionID] {
			continue
		}
		seenSessions[msg.SessionID] = true
		if err := upsertSession(ctx, tx, msg); err != nil {
			return err
		}
	}

	if err := insertEvents(ctx, tx, messages); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func upsertSession(ctx context.Context, tx pgx.Tx, msg tasks.AnalyticsTelemetryMessage) error {
	utm := msg.UTM
	const q = `
		INSERT INTO "AnalyticsSession" (
			id, "sessionId", "visitorId", "userId", device, browser, os,
			country, province, city, "landingPath", referrer,
			"utmSource", "utmMedium", "utmCampaign", "utmContent", "utmTerm",
			"pageViewCount", "eventCount", "totalDurationMs", "firstSeen", "lastSeen"
		)
		VALUES (
			gen_random_uuid()::text, $1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10, $11,
			$12, $13, $14, $15, $16,
			CASE WHEN $17 = 'page_view' THEN 1 ELSE 0 END,
			CASE WHEN $17 = 'event' THEN 1 ELSE 0 END,
			COALESCE($18, 0),
			NOW(), NOW()
		)
		ON CONFLICT ("sessionId") DO UPDATE SET
			"lastSeen" = NOW(),
			"userId" = COALESCE(EXCLUDED."userId", "AnalyticsSession"."userId"),
			"pageViewCount" = "AnalyticsSession"."pageViewCount" + CASE WHEN $17 = 'page_view' THEN 1 ELSE 0 END,
			"eventCount" = "AnalyticsSession"."eventCount" + CASE WHEN $17 = 'event' THEN 1 ELSE 0 END,
			"totalDurationMs" = "AnalyticsSession"."totalDurationMs" + COALESCE($18, 0)
	`
	duration := 0
	if msg.DurationMs != nil {
		duration = *msg.DurationMs
	}
	_, err := tx.Exec(
		ctx,
		q,
		msg.SessionID,
		msg.VisitorID,
		msg.UserID,
		msg.Device,
		msg.Browser,
		msg.OS,
		msg.Country,
		msg.Province,
		msg.City,
		truncate(msg.Path, 2048),
		ptrOrNil(truncatePtr(msg.Referrer, 2048)),
		utmValue(utm, "source"),
		utmValue(utm, "medium"),
		utmValue(utm, "campaign"),
		utmValue(utm, "content"),
		utmValue(utm, "term"),
		msg.Type,
		duration,
	)
	return err
}

func insertEvents(ctx context.Context, tx pgx.Tx, messages []tasks.AnalyticsTelemetryMessage) error {
	const q = `
		INSERT INTO "AnalyticsEvent" (
			id, "sessionId", "visitorId", "userId", type, name, path, title, referrer,
			"durationMs", properties, dimensions, device, browser, os, country, province, city, "createdAt"
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9,
			$10, $11::jsonb, $12::jsonb, $13, $14, $15, $16, $17, $18, NOW()
		)
	`

	for _, msg := range messages {
		props := msg.EventProperties
		if props == nil {
			props = map[string]any{}
		}
		dims := msg.Dimensions
		if dims == nil {
			dims = map[string]any{}
		}
		propsJSON, _ := json.Marshal(props)
		dimsJSON, _ := json.Marshal(dims)
		name := msg.Name
		if name == nil && msg.Type == "page_view" {
			defaultName := "page_view"
			name = &defaultName
		}
		id := newEventID()
		_, err := tx.Exec(
			ctx,
			q,
			id,
			msg.SessionID,
			msg.VisitorID,
			msg.UserID,
			msg.Type,
			name,
			truncate(msg.Path, 2048),
			ptrOrNil(truncatePtr(msg.Title, 512)),
			ptrOrNil(truncatePtr(msg.Referrer, 2048)),
			msg.DurationMs,
			string(propsJSON),
			string(dimsJSON),
			msg.Device,
			msg.Browser,
			msg.OS,
			msg.Country,
			msg.Province,
			msg.City,
		)
		if err != nil {
			return fmt.Errorf("insert analytics event: %w", err)
		}
	}
	return nil
}

func newEventID() string {
	return fmt.Sprintf("c%x", time.Now().UnixNano())
}

func utmValue(utm map[string]string, key string) *string {
	if utm == nil {
		return nil
	}
	v := strings.TrimSpace(utm[key])
	if v == "" {
		return nil
	}
	return &v
}

func truncate(s string, max int) string {
	r := []rune(s)
	if len(r) <= max {
		return s
	}
	return string(r[:max])
}

func truncatePtr(s *string, max int) *string {
	if s == nil {
		return nil
	}
	out := truncate(*s, max)
	return &out
}

func ptrOrNil(s *string) any {
	if s == nil {
		return nil
	}
	return *s
}
