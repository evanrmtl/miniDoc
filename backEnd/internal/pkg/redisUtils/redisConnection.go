package redisUtils

import (
	"context"
	"fmt"
	"os"
	"strconv"

	"github.com/redis/go-redis/v9"
)

var redisConnection struct {
	client *redis.Client
}

func CreateRedis(ctx context.Context) {
	host := os.Getenv("REDIS_HOST")
	if host == "" {
		host = "localhost"
	}

	port := os.Getenv("REDIS_PORT")
	if port == "" {
		port = "6379"
	}

	dbStr := os.Getenv("REDIS_DB")
	db := 0
	if dbStr != "" {
		if parsed, err := strconv.Atoi(dbStr); err == nil {
			db = parsed
		}
	}

	password := os.Getenv("REDIS_PASSWORD")

	redisClient := redis.NewClient(&redis.Options{
		Addr:     host + ":" + port,
		Password: password,
		DB:       db,
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
