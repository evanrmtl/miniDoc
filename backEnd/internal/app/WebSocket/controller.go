package websocket

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/evanrmtl/miniDoc/internal/pkg"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"gorm.io/gorm"
)

const (
	MessageTypeAuthSuccess = "Auth_success"
	MessageTypeAuthFailed  = "Auth_failed"
)

type Socket struct {
	conn *websocket.Conn
	c    *gin.Context
}

type AuthResponse struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type AuthSuccessData struct {
	Token   string `json:"token,omitempty"`
	Renewed bool   `json:"renewed"`
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

	defer conn.Close()
	socket := Socket{conn: conn, c: c}
	for {
		messageType, msg, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			return
		}
		go processMessage(messageType, msg, socket, db)
	}
}

func processMessage(messageType int, msg []byte, socket Socket, db *gorm.DB) {
	switch messageType {
	case websocket.TextMessage:
		processTextMessage(msg, socket, db)
	}
}

func processTextMessage(msg []byte, socket Socket, db *gorm.DB) {
	var typeMessage struct {
		Type string
	}
	err := json.Unmarshal(msg, &typeMessage)
	if err != nil {
		log.Println("unmarshall type webosocket impossible")
		return
	}
	switch typeMessage.Type {
	case "auth":
		processAuthRequest(msg, socket, db)
	}
}

func processAuthRequest(msg []byte, socket Socket, db *gorm.DB) {
	type DataRequest struct {
		Token    string
		Username string
		UserID   uint32
	}

	var data struct {
		DataRequest DataRequest
	}

	err := json.Unmarshal(msg, &data)
	if err != nil {
		log.Println("Error unmarshalling token request:", err)
		return
	}

	ctx := socket.c.Request.Context()
	agent := socket.c.Request.UserAgent()

	err = pkg.ValidJWT(data.DataRequest.Token, agent, ctx, db)

	if err != nil && !errors.Is(err, pkg.ErrJWTExpired) {
		socket.sendAuthError()
		return
	}

	pkg.CreateSession(data.DataRequest.UserID, agent, ctx, db)

	if errors.Is(err, pkg.ErrJWTExpired) {
		newToken, err := pkg.CreateJWT(ctx, data.DataRequest.Username, db)
		if err != nil {
			socket.sendAuthError()
			return
		}

		response := AuthResponse{
			Type: MessageTypeAuthSuccess,
			Data: AuthSuccessData{
				Token:   newToken.Token,
				Renewed: true,
			},
		}

		err = socket.conn.WriteJSON(response)
		if err != nil {
			log.Println("Failed to send auth success")
		}
		return
	}

	response := AuthResponse{
		Type: MessageTypeAuthSuccess,
		Data: AuthSuccessData{
			Renewed: false,
		},
	}

	err = socket.conn.WriteJSON(response)
	if err != nil {
		log.Println("Failed to send auth success")
	}
}

func (s *Socket) sendAuthError() {
	response := AuthResponse{
		Type: MessageTypeAuthFailed,
		Data: nil,
	}
	err := s.conn.WriteJSON(response)
	if err != nil {
		log.Println("Failed to send auth error")
	}
}
