package routes

import (
	"context"
	"time"

	"github.com/evanrmtl/miniDoc/internal/middleware/subroute"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func CreateRoutes(db *gorm.DB, ctx context.Context) *gin.Engine {
	router := gin.Default()

	router.Use(func(c *gin.Context) {
		c.Next()
	})

	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:4200"}
	config.AllowMethods = []string{"POST", "GET", "OPTIONS", "PATCH"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
	config.ExposeHeaders = []string{"Content-Length"}
	config.AllowCredentials = true
	config.MaxAge = 12 * time.Hour

	router.Use(cors.New(config))

	v1 := router.Group("/v1")
	subroute.CreateAuthRoutes(v1, db)
	subroute.CreateWSRoute(v1, db, ctx)
	subroute.CreateFileRoutes(v1, db)

	return router
}
