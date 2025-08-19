package subroute

import (
	file "github.com/evanrmtl/miniDoc/internal/app/File"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func CreateFileRoutes(router *gin.RouterGroup, db *gorm.DB) {
	docGroup := router.Group("/file")

	docGroup.GET("/create", func(c *gin.Context) {
		file.CreateFileController(c, db)
	})

	docGroup.GET("/delete", func(c *gin.Context) {
		file.DeleteFileController(c, db)
	})

	docGroup.GET("/get", func(c *gin.Context) {
		file.GetFileController(c, db)
	})
}
