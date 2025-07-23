package routes

import (
	auth "github.com/evanrmtl/miniDoc/Controllers"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func CreateRoutes(db *gorm.DB) *gin.Engine {
	router := gin.Default()
	router.POST("/register", func(c *gin.Context) {
		auth.RegisterController(c, db)
	})
	router.POST("/login", func(c *gin.Context) {
		auth.LoginController(c, db)
	})
	return router
}
