package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	database "github.com/evanrmtl/miniDoc/internal/app/database"
	routes "github.com/evanrmtl/miniDoc/internal/middleware"
	redisUtils "github.com/evanrmtl/miniDoc/internal/pkg/redisUtils"
	sessionsUtils "github.com/evanrmtl/miniDoc/internal/pkg/sessionUtils"
)

func main() {

	db := database.GenerateDB()
	_, err := db.DB()
	if err != nil {
		log.Panicf("error when connecting to the Database: %s", err.Error())
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go sessionsUtils.DeleteExpiredSession(ctx, db)

	srv := &http.Server{Addr: ":3000", Handler: routes.CreateRoutes(db)}

	redisUtils.CreateRedis(ctx)

	go func() {
		err := srv.ListenAndServe()
		if err != nil && err != http.ErrServerClosed {
			log.Fatalf("serveur arrêt: %v", err)
		}
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)

	<-sigCh
	cancel()

	shutdownCtx, _ := context.WithTimeout(context.Background(), 10*time.Second)
	srv.Shutdown(shutdownCtx)

	log.Println("Shutdown requested, server and routines shut down cleanly.")
}
