package routes

import (
	"time"

	auth "github.com/evanrmtl/miniDoc/Controllers"
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

	router.Use(cors.New(config))

	router.POST("/register", func(c *gin.Context) {
		auth.RegisterController(c, db)
	})
	router.POST("/login", func(c *gin.Context) {
		auth.LoginController(c, db)
	})
	return router
}
