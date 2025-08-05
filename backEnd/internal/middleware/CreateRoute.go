package routes

import (
	"time"

	"github.com/evanrmtl/miniDoc/internal/middleware/subroute"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func CreateRoutes(db *gorm.DB) *gin.Engine {
	router := gin.Default()

	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:4200"}
	config.AllowMethods = []string{"POST", "GET", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
	config.ExposeHeaders = []string{"Content-Length"}
	config.AllowCredentials = true
	config.MaxAge = 12 * time.Hour

	subroute.CreateAuthRoutes(router, db)
	subroute.CreateWSRoute(router)

	router.Use(cors.New(config))

	return router
}
