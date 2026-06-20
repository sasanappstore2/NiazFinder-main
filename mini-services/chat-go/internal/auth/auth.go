package auth

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrInvalidToken = errors.New("invalid or expired token")

// User is the authenticated principal attached to a WebSocket session.
type User struct {
	ID        string
	FirstName string
	LastName  string
	Avatar    *string
}

// Validator checks bearer tokens against PostgreSQL (Prisma AuthToken table).
type Validator struct {
	pool *pgxpool.Pool
}

func NewValidator(pool *pgxpool.Pool) *Validator {
	return &Validator{pool: pool}
}

// ValidateToken ensures the token exists, is unexpired, and belongs to an active user.
func (v *Validator) ValidateToken(ctx context.Context, token string) (*User, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return nil, ErrInvalidToken
	}

	const q = `
		SELECT u.id, u."firstName", u."lastName", u.avatar, u."isActive", u."isBanned", t."expiresAt"
		FROM "AuthToken" t
		INNER JOIN "User" u ON u.id = t."userId"
		WHERE t.token = $1
		LIMIT 1
	`

	var (
		user                          User
		avatar                        *string
		isActive, isBanned            bool
		expiresAt                     time.Time
	)

	err := v.pool.QueryRow(ctx, q, token).Scan(
		&user.ID,
		&user.FirstName,
		&user.LastName,
		&avatar,
		&isActive,
		&isBanned,
		&expiresAt,
	)
	if err != nil {
		return nil, ErrInvalidToken
	}
	if !isActive || isBanned || time.Now().After(expiresAt) {
		return nil, ErrInvalidToken
	}

	user.Avatar = avatar
	return &user, nil
}

// ExtractBearerToken parses Authorization header or raw token string.
func ExtractBearerToken(authorization string) string {
	authorization = strings.TrimSpace(authorization)
	if authorization == "" {
		return ""
	}
	if strings.HasPrefix(strings.ToLower(authorization), "bearer ") {
		return strings.TrimSpace(authorization[7:])
	}
	return authorization
}
