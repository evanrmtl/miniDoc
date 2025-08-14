package websocket

import (
	"encoding/json"
	"errors"
	"log"
	"time"

	"github.com/evanrmtl/miniDoc/internal/pkg/jwtUtils"
	sessionsUtils "github.com/evanrmtl/miniDoc/internal/pkg/sessionUtils"
	"github.com/gorilla/websocket"
	"gorm.io/gorm"
)

var newLine = []byte{'\n'}

func (manager *ConnectionManager) writePump() {
	websocketConnection := manager.clientSocket.socket.conn

	ticker := *time.NewTicker(manager.pingInterval)

	defer func() {
		ticker.Stop()
		websocketConnection.Close()
		manager.cancel()
	}()

	writeDeadline := time.Now().Add(time.Second * 5)

	for {
		select {
		case message, ok := <-manager.send:
			{
				websocketConnection.SetWriteDeadline(writeDeadline)
				if !ok {
					return
				}

				w, err := websocketConnection.NextWriter(websocket.BinaryMessage)
				if err != nil {
					return
				}

				n := len(manager.send)
				for i := 0; i < n; i++ {
					w.Write(newLine)
					w.Write(<-manager.send)
				}

				_, err = w.Write(message)
				if err != nil {
					return
				}
			}
		case <-ticker.C:
			{
				websocketConnection.SetWriteDeadline(writeDeadline)
				err := websocketConnection.WriteMessage(websocket.PingMessage, nil)
				if err != nil {
					return
				}
			}
		}
	}
}

func (manager *ConnectionManager) readPump(db *gorm.DB) {
	websocketConnection := manager.clientSocket.socket.conn

	ticker := *time.NewTicker(manager.pongTimeout)

	defer func() {
		ticker.Stop()
		websocketConnection.Close()
		manager.cancel()
	}()

	websocketConnection.SetPongHandler(func(appData string) error {
		err := websocketConnection.SetReadDeadline(time.Now().Add(time.Second * 5))
		return err
	})

	for {
		messageType, msg, err := websocketConnection.ReadMessage()
		if err != nil {
			return
		}
		go manager.clientSocket.handleIncomingMessage(messageType, msg, db)
	}
}

func (cs *ClientSocket) handleIncomingMessage(messageType int, msg []byte, db *gorm.DB) {
	switch messageType {
	case websocket.TextMessage:
		cs.handleTextMessage(msg, db)
	case websocket.PongMessage:

	}

}

func (cs *ClientSocket) handleTextMessage(msg []byte, db *gorm.DB) {
	var messageType struct {
		Type string
	}
	err := json.Unmarshal(msg, &messageType)
	if err != nil {
		log.Println("unmarshall type webosocket impossible")
		return
	}
	switch messageType.Type {
	case "auth":
		cs.handleAuthentication(msg, db)
	}
}

func (cs *ClientSocket) handleAuthentication(msg []byte, db *gorm.DB) {
	socketConnection := cs.socket.conn

	var authMessage struct {
		ClientData ClientData `json:"data"`
	}

	err := json.Unmarshal(msg, &authMessage)
	if err != nil {
		log.Println("Error unmarshalling token request:", err)
		return
	}

	ctx := cs.socket.ctx.Request.Context()
	agent := cs.socket.ctx.Request.UserAgent()

	err = jwtUtils.ValidJWT(authMessage.ClientData.Token, agent, ctx, db)

	if err != nil && !errors.Is(err, jwtUtils.ErrJWTExpired) {
		cs.sendAuthError()
		return
	}

	sessionsUtils.CreateSession(authMessage.ClientData.UserID, agent, ctx, db)

	if errors.Is(err, jwtUtils.ErrJWTExpired) {
		newToken, err := jwtUtils.CreateJWT(ctx, authMessage.ClientData.Username, db)
		if err != nil {
			cs.sendAuthError()
			return
		}

		response := AuthResponse{
			Type: MessageTypeAuthSuccess,
			Data: AuthSuccessData{
				Token:   newToken,
				Renewed: true,
			},
		}

		err = socketConnection.WriteJSON(response)
		if err != nil {
			log.Println("Failed to send auth success")
		}

		cs.client = ClientData{
			Token:     authMessage.ClientData.Token,
			Username:  authMessage.ClientData.Username,
			UserID:    authMessage.ClientData.UserID,
			SessionID: authMessage.ClientData.SessionID,
		}

		cs.storeSessionInRedis(ctx)
		cs.storeLocalConnection(authMessage.ClientData.SessionID)
		return
	}

	response := AuthResponse{
		Type: MessageTypeAuthSuccess,
		Data: AuthSuccessData{
			Renewed: false,
		},
	}

	err = socketConnection.WriteJSON(response)
	if err != nil {
		log.Println("Failed to send auth success")
	}

	cs.storeSessionInRedis(ctx)
	cs.storeLocalConnection(authMessage.ClientData.SessionID)
}

func (cs *ClientSocket) sendAuthError() {
	response := AuthResponse{
		Type: MessageTypeAuthFailed,
		Data: nil,
	}
	err := cs.socket.conn.WriteJSON(response)
	if err != nil {
		log.Println("Failed to send auth error")
	}
}
