package redisUtils

import (
	"context"
	"log"
	"os"

	"github.com/evanrmtl/miniDoc/internal/common"
)

type SessionMetadata struct {
	UserID    uint32 `redis:"user_id"`
	SessionID string `redis:"session_id"`
	ServerID  string `redis:"server_id"`
	FileUUID  string `redis:"file_uuid"`
}

type FileMetadata = []string

var notificationRouter common.NotificationRouter

func StoreSessionInRedis(userID uint32, sessionUUID string, ctx context.Context) {
	serverID := os.Getenv("SERVER_ID")

	sessionMetadata := SessionMetadata{
		UserID:    userID,
		SessionID: sessionUUID,
		FileUUID:  "",
		ServerID:  serverID,
	}

	err := redisConnection.client.HSet(ctx, "session:"+sessionUUID, &sessionMetadata).Err()
	if err != nil {
		log.Println(err)
	}
}

func DeleteSessionInRedis(sessionUUID string, ctx context.Context) {
	redisConn := redisConnection.client
	err := redisConn.Del(ctx, "session:"+sessionUUID).Err()
	if err != nil {
		log.Println("Error deleting redis Hash")
	}
}

func AddFileInSession(fileUUID string, sessionUUID string, ctx context.Context) {
	err := redisConnection.client.HSet(ctx, "session:"+sessionUUID, "file_uuid", fileUUID).Err()
	if err != nil {
		log.Printf("Error updating file_uuid in session: %v", err)
		return
	}
}

func DeleteFileInSession(sessionUUID string, ctx context.Context) {
	err := redisConnection.client.HSet(ctx, "session:"+sessionUUID, "file_uuid", "").Err()
	if err != nil {
		log.Printf("Error updating file_uuid in session: %v", err)
		return
	}
}

func GetFileFromSession(sessionUUID string, ctx context.Context) string {
	return redisConnection.client.HGet(ctx, "session:"+sessionUUID, "file_uuid").Val()
}

func SetEventRouter(router common.NotificationRouter) {
	notificationRouter = router
}

func HandleUserNotification(ctx context.Context, notification common.UserNotification) {
	if notificationRouter != nil {
		notificationRouter.RouteEvent(notification)
	}
}

func HandleDocEvent(ctx context.Context, event common.FileEvent) {
	if notificationRouter != nil {
		notificationRouter.RouteEvent(event)
	}
}
