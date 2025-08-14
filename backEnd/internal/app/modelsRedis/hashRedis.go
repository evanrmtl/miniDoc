package modelsredis

import (
	"encoding/json"
)

type SessionMetadata struct {
	UserID    uint32 `redis:"user_id"`
	SessionID string `redis:"session_id"`
	ServerID  string `redis:"server_id"`
	DocIDs    string `redis:"docs_id"`
}

func (s *SessionMetadata) SetDocIDs(docIDs []uint32) error {
	jsonData, err := json.Marshal(docIDs)
	if err != nil {
		return err
	}
	s.DocIDs = string(jsonData)
	return nil
}
