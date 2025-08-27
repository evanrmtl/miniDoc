package subroute

import (
	verify "github.com/evanrmtl/miniDoc/internal/app/Verify"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func CreateVerifyRoutes(router *gin.RouterGroup, db *gorm.DB) {
	docGroup := router.Group("/verify")

	docGroup.GET("/username", func(c *gin.Context) {
		verify.CreateUsernameController(c, db)
	})
}
