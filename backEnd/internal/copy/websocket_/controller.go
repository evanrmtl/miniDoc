package websocket

import (
	"context"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"gorm.io/gorm"
)

const (
	MessageTypeAuthSuccess = "Auth_success"
	MessageTypeAuthFailed  = "Auth_failed"
	MessageTypePingRequest = "Ping"
)

type Socket struct {
	conn *websocket.Conn
	ctx  *gin.Context
}

type AuthResponse struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type AuthSuccessData struct {
	Token   string `json:"token,omitempty"`
	Renewed bool   `json:"renewed"`
}

type ClientSocket struct {
	socket Socket
	client ClientData
}

type ClientData struct {
	Token     string
	Username  string
	UserID    uint32
	SessionID string
}

type ConnectionManager struct {
	ctx          context.Context
	cancel       context.CancelFunc
	clientSocket ClientSocket
	send         chan []byte
	connections  *SafeConnectionPool
	pingInterval time.Duration
	pongTimeout  time.Duration
}

type SafeConnectionPool struct {
	mu   sync.RWMutex
	pool map[string]*websocket.Conn
}

var sConnectionPool = &SafeConnectionPool{
	mu:   sync.RWMutex{},
	pool: make(map[string]*websocket.Conn),
}

func WebSocketHandler(c *gin.Context, db *gorm.DB) {

	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
		EnableCompression: true,
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

	clientSocket := ClientSocket{
		socket: Socket{conn: conn, ctx: c},
		client: ClientData{},
	}

	defer func() {
		log.Println("🔴 WebSocket handler terminé, fermeture connexion")
		conn.Close()
	}()

	var manager = ConnectionManager{
		clientSocket: clientSocket,
		send:         make(chan []byte),
		connections:  sConnectionPool,
		pingInterval: time.Second * 25,
		pongTimeout:  time.Second * 5,
	}

	manager.Start(db)
}

func (manager *ConnectionManager) Start(db *gorm.DB) {
	manager.ctx, manager.cancel = context.WithCancel(context.Background())

	go manager.writePump()
	go manager.readPump(db)

	<-manager.ctx.Done()

	manager.deleteLocal()
	ctx := context.Background()
	manager.clientSocket.deleteSessionInRedis(ctx)
	ctx.Done()
}
