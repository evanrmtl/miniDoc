package subroute

import (
	websocket "github.com/evanrmtl/miniDoc/internal/app/WebSocket"

	"github.com/gin-gonic/gin"
)

func CreateWSRoute(router *gin.Engine) {
	router.GET("/ws", func(c *gin.Context) {
		websocket.WebSocketHandler(c)
	})
}
