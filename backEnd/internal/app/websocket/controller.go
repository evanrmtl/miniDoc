package websocket

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/evanrmtl/miniDoc/internal/pkg/redisUtils"
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

type Response struct {
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

type ClientCRDT struct {
	mu          sync.Mutex
	actionQueue []ClientAction
}

type ClientAction struct {
	Operation   string
	CharValue   string
	Path        []int
	SessionUUID string
	FileUUID    string
}

type ConnectionManager struct {
	ctx             context.Context
	cancel          context.CancelFunc
	clientSocket    ClientSocket
	send            chan []byte
	connections     *SafeConnectionPool
	clientCRDT      ClientCRDT
	pingInterval    time.Duration
	writeTimeout    time.Duration
	readTimeout     time.Duration
	currentFileUUID string
}

type SafeConnectionPool struct {
	pool        sync.Map // sessionID -> *Websocket.Conn
	userIndex   sync.Map // userID -> []string
	managers    sync.Map // sessionID -> *ConnectionManager
	docSessions sync.Map // docID -> []string
}

var sConnectionPool = &SafeConnectionPool{}

func WebSocketHandler(c *gin.Context, db *gorm.DB, ctx context.Context) {

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
		conn.Close()
	}()

	var manager = ConnectionManager{
		clientSocket: clientSocket,
		send:         make(chan []byte),
		connections:  sConnectionPool,
		clientCRDT:   ClientCRDT{mu: sync.Mutex{}, actionQueue: make([]ClientAction, 0)},
		pingInterval: time.Second * 30,
		readTimeout:  time.Second * 60,
		writeTimeout: time.Second * 10,
	}

	manager.Start(db, ctx)
}

func (manager *ConnectionManager) Start(db *gorm.DB, srvContext context.Context) {
	manager.ctx, manager.cancel = context.WithCancel(srvContext)

	go manager.writePump()
	go manager.readPump(db)

	fmt.Println("🟢 websocket connected")
	<-manager.ctx.Done()
	fmt.Println("🔴 websocket disconnected")
	Cleanupctx := context.Background()
	manager.DeleteLocal()
	redisUtils.DeleteSessionInRedis(manager.clientSocket.client.SessionID, Cleanupctx)
	var docSessionsList []string
	manager.connections.docSessions.Range(func(key, value interface{}) bool {
		docSessionsList = append(docSessionsList, fmt.Sprintf("%v: %v", key, value))
		return true
	})
	log.Println("manager docSession: ", docSessionsList)
}
