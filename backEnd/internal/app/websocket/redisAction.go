package websocket

import (
	"context"
	"log"
	"os"

	modelsredis "github.com/evanrmtl/miniDoc/internal/app/modelsRedis"
	"github.com/evanrmtl/miniDoc/internal/pkg/redisUtils"
)

func (cs *ClientSocket) storeSessionInRedis(ctx context.Context) {
	redisConn := redisUtils.GetRedisClient()
	serverID := os.Getenv("SERVER_ID")

	sessionMetadata := modelsredis.SessionMetadata{
		UserID:    cs.client.UserID,
		SessionID: cs.client.SessionID,
		DocIDs:    "",
		ServerID:  serverID,
	}

	err := sessionMetadata.SetDocIDs([]uint32{})
	if err != nil {
		log.Println("Failed to set DocIDs:", err)
	}

	err = redisConn.HSet(ctx, "session:"+cs.client.SessionID, &sessionMetadata).Err()
	if err != nil {
		log.Println(err)
	}
}

func (cs *ClientSocket) deleteSessionInRedis(ctx context.Context) {
	redisConn := redisUtils.GetRedisClient()
	redisConn.HDel(ctx, cs.client.SessionID, "server_id", "user_id", "docs_id", "session_id")
}
