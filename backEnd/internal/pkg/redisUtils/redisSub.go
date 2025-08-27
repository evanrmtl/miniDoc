package redisUtils

import (
	"context"
	"fmt"
	"log"
	"time"
)

func StartSubscriber(ctx context.Context) {

	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			default:
				err := subRedis(ctx)
				if err != nil {
					log.Printf("Subscriber error: %v, retrying in 5s...", err)
					time.Sleep(5 * time.Second)
				} else {
					return
				}
			}
		}
	}()
}

func subRedis(ctx context.Context) error {
	pubsub := redisConnection.client.Subscribe(ctx, ChanUserNotification, ChanFileEvent)
	defer pubsub.Close()

	_, err := pubsub.Receive(ctx)
	if err != nil {
		log.Printf("error subscribing to Redis: %v", err)
		return err
	}

	if err := redisConnection.client.Ping(ctx).Err(); err != nil {
		log.Printf("Redis ping failed: %v", err)
		return err
	}

	for {
		select {
		case <-ctx.Done():
			log.Println("Context cancelled, stopping Redis subscriber")
			return nil
		case msg, ok := <-pubsub.Channel():
			if !ok {
				log.Println("Redis channel close")
				return fmt.Errorf("channel closed")
			}
			if msg == nil {
				log.Println("Received nil message")
				continue
			}
			switch msg.Channel {
			case ChanUserNotification:
				go HandleUserNotification(ctx, msg.Payload)
			case ChanFileEvent:
				// handle file event
			}
		}
	}
}
