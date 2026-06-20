package tasks

import "encoding/json"

// IntakeAITask is the JSON payload published by the Next.js BFF.
type IntakeAITask struct {
	JobID            string `json:"jobId"`
	ServiceRequestID string `json:"serviceRequestId"`
	Text             string `json:"text"`
	CitySlug         string `json:"citySlug,omitempty"`
	CityName         string `json:"cityName,omitempty"`
	UserID           string `json:"userId,omitempty"`
}

// MLXAnalyzeRequest is sent to the Python MLX intake service.
type MLXAnalyzeRequest struct {
	Text     string `json:"text"`
	CitySlug string `json:"city_slug,omitempty"`
	CityName string `json:"city_name,omitempty"`
}

// MLXAnalyzeResponse is returned by /analyze.
type MLXAnalyzeResponse struct {
	Entities map[string]any `json:"entities"`
	Summary  string         `json:"summary,omitempty"`
	Raw      json.RawMessage `json:"-"`
}

// AnalyticsTelemetryMessage is the enriched payload from the BFF.
type AnalyticsTelemetryMessage struct {
	SessionID       string                 `json:"sessionId"`
	VisitorID       string                 `json:"visitorId"`
	UserID          *string                `json:"userId"`
	Type            string                 `json:"type"`
	Name            *string                `json:"name"`
	Path            string                 `json:"path"`
	Title           *string                `json:"title"`
	Referrer        *string                `json:"referrer"`
	DurationMs      *int                   `json:"durationMs"`
	Properties      map[string]any         `json:"properties"`
	UTM             map[string]string      `json:"utm"`
	Device          *string                `json:"device"`
	Browser         *string                `json:"browser"`
	OS              *string                `json:"os"`
	Country         *string                `json:"country"`
	Province        *string                `json:"province"`
	City            *string                `json:"city"`
	Dimensions      map[string]any         `json:"dimensions"`
	EventProperties map[string]any         `json:"eventProperties"`
	EnrichedAt      string                 `json:"enrichedAt"`
}

// BusinessMatchTask is published after intake AI completes.
type BusinessMatchTask struct {
	ServiceRequestID string `json:"serviceRequestId"`
	UserID           string `json:"userId,omitempty"`
}
