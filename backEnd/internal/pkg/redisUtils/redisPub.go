package redisUtils

import (
	"context"
	"encoding/json"
	"log"

	"github.com/evanrmtl/miniDoc/internal/common"
)

const (
	ChanUserNotification string = "user_notifications"
	ChanFileEvent        string = "file_events"
)

func PubRedis(ctx context.Context, channel string, msg interface{}) error {
	payload, err := json.Marshal(msg)
	if err != nil {
		log.Printf("error marshaling message : %v\n", msg)
		return err
	}
	err = redisConnection.client.Publish(ctx, channel, payload).Err()
	if err != nil {
		log.Printf("Error publishing to Redis channel %s: %v", channel, err)
		return err
	}
	return nil
}

func PublishUserSharedNotification(ctx context.Context, notification common.UserNotification) error {
	return PubRedis(ctx, ChanUserNotification, notification)
}

func PublishUserRevokeNotification(ctx context.Context, notification common.UserNotification) error {
	return PubRedis(ctx, ChanUserNotification, notification)
}
