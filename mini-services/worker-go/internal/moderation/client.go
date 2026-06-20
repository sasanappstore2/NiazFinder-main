package moderation

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// Client triggers internal auto-moderation after intake AI completes.
type Client struct {
	baseURL string
	secret  string
	http    *http.Client
}

func NewClient(appURL, secret string) *Client {
	if appURL == "" || secret == "" {
		return nil
	}
	return &Client{
		baseURL: appURL,
		secret:  secret,
		http: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (c *Client) EnqueueRequestModeration(ctx context.Context, requestID string) error {
	if c == nil || requestID == "" {
		return nil
	}
	body, _ := json.Marshal(map[string]string{"requestId": requestID})
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		c.baseURL+"/api/internal/request-moderation",
		bytes.NewReader(body),
	)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-internal-secret", c.secret)

	res, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("moderation request: %w", err)
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		return fmt.Errorf("moderation status %d", res.StatusCode)
	}
	return nil
}
