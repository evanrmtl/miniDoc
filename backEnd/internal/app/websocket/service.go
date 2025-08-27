package websocket

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/evanrmtl/miniDoc/internal/pkg/jwtUtils"
	"github.com/evanrmtl/miniDoc/internal/pkg/redisUtils"
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
				fmt.Println("message written: ", string(message))
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
		go manager.handleIncomingMessage(messageType, msg, db, manager.send)
	}
}

func (manager *ConnectionManager) handleIncomingMessage(messageType int, msg []byte, db *gorm.DB, sendChan chan []byte) {
	switch messageType {
	case websocket.TextMessage:
		manager.handleTextMessage(msg, db, sendChan)
	}
}

func (manager *ConnectionManager) handleTextMessage(msg []byte, db *gorm.DB, sendChan chan []byte) {
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
		manager.handleAuthentication(msg, db, sendChan)
	case "joinFile":
		manager.clientSocket.handleJoinFile(msg)
	case "exitFile":
		redisUtils.DeleteFileInSession(manager.clientSocket.client.SessionID, manager.clientSocket.socket.ctx)
	}
}

func (manager *ConnectionManager) handleAuthentication(msg []byte, db *gorm.DB, sendChan chan []byte) {

	var authMessage struct {
		Data ClientData `json:"data"`
	}

	err := json.Unmarshal(msg, &authMessage)
	if err != nil {
		log.Println("Error unmarshalling token request:", err)
		return
	}

	ctx := manager.clientSocket.socket.ctx.Request.Context()
	agent := manager.clientSocket.socket.ctx.Request.UserAgent()

	err = jwtUtils.ValidJWT(authMessage.Data.Token, agent, ctx, db)

	if err != nil && !errors.Is(err, jwtUtils.ErrJWTExpired) {
		fmt.Println(err)
		fmt.Println(authMessage.Data.Token)
		manager.clientSocket.sendResponse(sendChan, MessageTypeAuthFailed, nil)
		return
	}

	sessionsUtils.CreateSession(authMessage.Data.UserID, agent, ctx, db)

	manager.clientSocket.client = ClientData{
		Token:     authMessage.Data.Token,
		Username:  authMessage.Data.Username,
		UserID:    authMessage.Data.UserID,
		SessionID: authMessage.Data.SessionID,
	}

	if errors.Is(err, jwtUtils.ErrJWTExpired) {
		newToken, err := jwtUtils.CreateJWT(ctx, authMessage.Data.Username, db)
		if err != nil {
			manager.clientSocket.sendResponse(sendChan, MessageTypeAuthFailed, nil)
			return
		}

		data := AuthSuccessData{
			Token:   newToken,
			Renewed: true,
		}

		manager.clientSocket.sendResponse(sendChan, MessageTypeAuthSuccess, data)
		manager.storeLocalConnection()
		redisUtils.StoreSessionInRedis(manager.clientSocket.client.UserID, manager.clientSocket.client.SessionID, ctx)

		return
	}

	data := AuthSuccessData{
		Renewed: false,
	}

	manager.clientSocket.sendResponse(sendChan, MessageTypeAuthSuccess, data)
	manager.storeLocalConnection()
	redisUtils.StoreSessionInRedis(manager.clientSocket.client.UserID, manager.clientSocket.client.SessionID, ctx)
}

func (cs *ClientSocket) handleJoinFile(msg []byte) {
	var data struct {
		FileUUID string `json:"data"`
	}

	err := json.Unmarshal(msg, &data)
	if err != nil {
		fmt.Println("error while unmarshall data in handleJoinFile")
		return
	}
	redisUtils.AddFileInSession(data.FileUUID, cs.client.SessionID, cs.socket.ctx)
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

func FileDeleteByOwner() {
	//TODO
}
