package subroute

import (
	websocket "github.com/evanrmtl/miniDoc/internal/app/WebSocket"
	"gorm.io/gorm"

	"github.com/gin-gonic/gin"
)

func CreateWSRoute(router *gin.Engine, db *gorm.DB) {
	router.GET("/ws", func(c *gin.Context) {
		websocket.WebSocketHandler(c, db)
	})
}
