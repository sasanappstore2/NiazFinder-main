package store

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotParticipant = errors.New("not a conversation participant")

// Repository provides PostgreSQL access via pgx.
type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// Pool exposes the underlying pgx pool for health checks.
func (r *Repository) Pool() *pgxpool.Pool {
	return r.pool
}

// IsConversationParticipant checks membership in Conversation.
func (r *Repository) IsConversationParticipant(ctx context.Context, conversationID, userID string) (bool, error) {
	const q = `
		SELECT 1
		FROM "Conversation"
		WHERE id = $1 AND ("userId1" = $2 OR "userId2" = $2)
		LIMIT 1
	`
	var one int
	err := r.pool.QueryRow(ctx, q, conversationID, userID).Scan(&one)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	return err == nil, err
}

// ListConversationIDs returns all conversations for a user (used on connect).
func (r *Repository) ListConversationIDs(ctx context.Context, userID string) ([]string, error) {
	const q = `
		SELECT id
		FROM "Conversation"
		WHERE "userId1" = $1 OR "userId2" = $1
	`
	rows, err := r.pool.Query(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ids := make([]string, 0)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// InsertMessage persists a chat message and returns the generated ID.
func (r *Repository) InsertMessage(ctx context.Context, conversationID, senderID, content, msgType, clientTempID string) (string, time.Time, error) {
	ok, err := r.IsConversationParticipant(ctx, conversationID, senderID)
	if err != nil {
		return "", time.Time{}, err
	}
	if !ok {
		return "", time.Time{}, ErrNotParticipant
	}

	if msgType == "" {
		msgType = "TEXT"
	}
	id := uuid.NewString()
	now := time.Now().UTC()

	const q = `
		INSERT INTO "Message" (
			id, "conversationId", "senderId", content, type, "clientTempId", "createdAt"
		) VALUES ($1, $2, $3, $4, $5::"MessageType", $6, $7)
	`
	_, err = r.pool.Exec(ctx, q, id, conversationID, senderID, content, msgType, nullIfEmpty(clientTempID), now)
	if err != nil {
		return "", time.Time{}, err
	}

	const updateConv = `
		UPDATE "Conversation"
		SET "lastMessage" = $2, "lastMessageAt" = $3, "updatedAt" = $3
		WHERE id = $1
	`
	_, _ = r.pool.Exec(ctx, updateConv, conversationID, content, now)

	return id, now, nil
}

// SetUserOnline updates presence fields on connect/disconnect.
func (r *Repository) SetUserOnline(ctx context.Context, userID string, online bool) error {
	now := time.Now().UTC()
	const q = `
		UPDATE "User"
		SET online = $2, "lastSeenAt" = $3, "updatedAt" = $3
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, q, userID, online, now)
	return err
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}
