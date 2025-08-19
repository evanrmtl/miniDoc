package subroute

import (
	auth "github.com/evanrmtl/miniDoc/internal/app/Auth"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func CreateAuthRoutes(router *gin.RouterGroup, db *gorm.DB) {
	router.POST("/register", func(c *gin.Context) {
		auth.RegisterController(c, db)
	})

	router.POST("/login", func(c *gin.Context) {
		auth.LoginController(c, db)
	})
}
