package subroute

import (
	"context"

	websocket "github.com/evanrmtl/miniDoc/internal/app/websocket"
	"gorm.io/gorm"

	"github.com/gin-gonic/gin"
)

func CreateWSRoute(router *gin.RouterGroup, db *gorm.DB, ctx context.Context) {
	router.GET("/ws", func(c *gin.Context) {
		websocket.WebSocketHandler(c, db, ctx)
	})
}
