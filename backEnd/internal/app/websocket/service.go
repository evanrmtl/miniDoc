package websocket

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/evanrmtl/miniDoc/internal/pkg/jwtUtils"
	sessionsUtils "github.com/evanrmtl/miniDoc/internal/pkg/sessionUtils"
	"github.com/gorilla/websocket"
	"gorm.io/gorm"
)

func (manager *ConnectionManager) writePump() {
	websocketConnection := manager.clientSocket.socket.conn

	ticker := time.NewTicker(manager.pingInterval)

	defer func() {
		ticker.Stop()
		websocketConnection.Close()
		manager.cancel()
	}()

	for {
		select {
		case message, ok := <-manager.send:
			{
				writeDeadline := time.Now().Add(time.Second * 5)
				websocketConnection.SetWriteDeadline(writeDeadline)
				if !ok {
					return
				}

				w, err := websocketConnection.NextWriter(websocket.TextMessage)
				if err != nil {
					return
				}
				_, err = w.Write(message)
				if err != nil {
					return
				}

				err = w.Close()
				if err != nil {
					return
				}
			}
		case <-ticker.C:
			{
				writeDeadline := time.Now().Add(time.Second * 5)
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

	websocketConnection.SetReadDeadline(time.Now().Add(manager.readTimeout))

	defer func() {
		websocketConnection.Close()
		manager.cancel()
	}()

	websocketConnection.SetPongHandler(func(appData string) error {
		err := websocketConnection.SetReadDeadline(time.Now().Add(manager.readTimeout))
		return err
	})

	for {
		messageType, msg, err := websocketConnection.ReadMessage()
		if err != nil {
			return
		}
		go manager.clientSocket.handleIncomingMessage(messageType, msg, db, manager.send)
	}
}

func (cs *ClientSocket) handleIncomingMessage(messageType int, msg []byte, db *gorm.DB, sendChan chan []byte) {
	switch messageType {
	case websocket.TextMessage:
		cs.handleTextMessage(msg, db, sendChan)
	}
}

func (cs *ClientSocket) handleTextMessage(msg []byte, db *gorm.DB, sendChan chan []byte) {
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
		cs.handleAuthentication(msg, db, sendChan)
	}
}

func (cs *ClientSocket) handleAuthentication(msg []byte, db *gorm.DB, sendChan chan []byte) {

	var authMessage struct {
		Data ClientData `json:"data"`
	}

	err := json.Unmarshal(msg, &authMessage)
	if err != nil {
		log.Println("Error unmarshalling token request:", err)
		return
	}

	ctx := cs.socket.ctx.Request.Context()
	agent := cs.socket.ctx.Request.UserAgent()

	err = jwtUtils.ValidJWT(authMessage.Data.Token, agent, ctx, db)

	if err != nil && !errors.Is(err, jwtUtils.ErrJWTExpired) {
		fmt.Println(err)
		fmt.Println(authMessage.Data.Token)
		cs.sendResponse(sendChan, MessageTypeAuthFailed, nil)
		return
	}

	sessionsUtils.CreateSession(authMessage.Data.UserID, agent, ctx, db)

	cs.client = ClientData{
		Token:     authMessage.Data.Token,
		Username:  authMessage.Data.Username,
		UserID:    authMessage.Data.UserID,
		SessionID: authMessage.Data.SessionID,
	}

	if errors.Is(err, jwtUtils.ErrJWTExpired) {
		newToken, err := jwtUtils.CreateJWT(ctx, authMessage.Data.Username, db)
		if err != nil {
			cs.sendResponse(sendChan, MessageTypeAuthFailed, nil)
			return
		}

		data := AuthSuccessData{
			Token:   newToken,
			Renewed: true,
		}

		cs.sendResponse(sendChan, MessageTypeAuthSuccess, data)

		cs.storeSessionInRedis(ctx)
		cs.storeLocalConnection(authMessage.Data.SessionID)
		return
	}

	data := AuthSuccessData{
		Renewed: false,
	}

	cs.sendResponse(sendChan, MessageTypeAuthSuccess, data)
	cs.storeSessionInRedis(ctx)
	cs.storeLocalConnection(authMessage.Data.SessionID)
}

func (cs *ClientSocket) sendResponse(sendChan chan []byte, msgType string, data interface{}) {
	response := Response{
		Type: msgType,
		Data: data,
	}

	jsonData, err := json.Marshal(response)
	if err != nil {
		log.Printf("Marshal error: %v", err)
		return
	}

	select {
	case sendChan <- jsonData:
	default:
		log.Printf("Failed to send %s: channel full", msgType)
	}
}
