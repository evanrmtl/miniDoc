package redisUtils

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
)

var redisConnection struct {
	client *redis.Client
}

func CreateRedis(ctx context.Context) {

	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})

	err := redisClient.Set(ctx, "test_connection", "connected", 0).Err()
	if err != nil {
		panic(err)
	}

	ping, err := redisClient.Ping(ctx).Result()
	if err != nil {
		panic(err)
	}
	fmt.Println(ping)

	redisConnection.client = redisClient
}

func GetRedisClient() *redis.Client {
	return redisConnection.client
}
