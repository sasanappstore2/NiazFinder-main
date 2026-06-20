package mlx

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/niazfinder/worker-go/internal/tasks"
)

// Client calls the MLX intake inference service.
type Client struct {
	baseURL    string
	httpClient *http.Client
}

// NewClient constructs an HTTP client with a hard timeout.
func NewClient(baseURL string, timeout time.Duration) *Client {
	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: timeout,
			Transport: &http.Transport{
				MaxIdleConns:        100,
				MaxIdleConnsPerHost: 100,
				IdleConnTimeout:     90 * time.Second,
			},
		},
	}
}

// Analyze posts the intake text to the MLX /analyze endpoint.
func (c *Client) Analyze(ctx context.Context, task tasks.IntakeAITask) (*tasks.MLXAnalyzeResponse, error) {
	body, err := json.Marshal(tasks.MLXAnalyzeRequest{
		Text:     task.Text,
		CitySlug: task.CitySlug,
		CityName: task.CityName,
	})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	res, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("mlx request: %w", err)
	}
	defer res.Body.Close()

	raw, err := io.ReadAll(io.LimitReader(res.Body, 2<<20))
	if err != nil {
		return nil, err
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, fmt.Errorf("mlx status %d: %s", res.StatusCode, string(raw))
	}

	var parsed tasks.MLXAnalyzeResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return nil, fmt.Errorf("mlx decode: %w", err)
	}
	parsed.Raw = raw
	return &parsed, nil
}
