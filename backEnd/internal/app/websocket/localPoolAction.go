package websocket

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/evanrmtl/miniDoc/internal/common"
	"github.com/evanrmtl/miniDoc/internal/pkg/redisUtils"
	"github.com/gorilla/websocket"
)

func (manager *ConnectionManager) storeLocalConnection() {
	sConnectionPool.addLocalSession(manager.clientSocket.client.SessionID, manager.clientSocket.socket.conn)
	sConnectionPool.addUserIndex(manager.clientSocket.client.UserID, manager.clientSocket.client.SessionID)
	manager.addManager(manager.clientSocket.client.SessionID)
}

func (p *SafeConnectionPool) addLocalSession(sessionID string, conn *websocket.Conn) {
	p.pool.Store(sessionID, conn)
}

func (p *SafeConnectionPool) addUserIndex(userID uint32, sessionID string) {

	value, ok := p.userIndex.Load(userID)
	if ok {
		sessions := value.([]string)
		newSession := make([]string, len(sessions)+1)
		copy(newSession, sessions)
		newSession[len(sessions)] = sessionID
		p.userIndex.Store(userID, newSession)
	} else {
		p.userIndex.Store(userID, []string{sessionID})
	}
}

func (manager *ConnectionManager) addManager(sessionID string) {
	manager.connections.managers.Store(sessionID, manager)
}

func (manager *ConnectionManager) DeleteLocal() {
	manager.deleteLocalSession()
	manager.deleteUserIndex()
	manager.deleteManagersMap()
}

func (manager *ConnectionManager) deleteLocalSession() {
	manager.connections.pool.Delete(manager.clientSocket.client.SessionID)
}

func (manager *ConnectionManager) deleteUserIndex() {
	userID := manager.clientSocket.client.UserID
	sessionID := manager.clientSocket.client.SessionID

	value, ok := manager.connections.userIndex.Load(userID)
	if !ok {
		return
	}

	sessions := value.([]string)

	idx := searchIndex(sessionID, sessions)
	if idx == -1 {
		return
	}

	newSessions := make([]string, 0, len(sessions)-1)
	newSessions = append(newSessions, sessions[:idx]...)
	newSessions = append(newSessions, sessions[idx+1:]...)

	if len(newSessions) == 0 {
		manager.connections.userIndex.Delete(userID)
	} else {
		manager.connections.userIndex.Store(userID, newSessions)
	}
}

func (manager *ConnectionManager) deleteManagersMap() {
	sessionID := manager.clientSocket.client.SessionID
	manager.connections.managers.Delete(sessionID)
}

func searchIndex(searchSession string, sessions []string) int {
	for i, session := range sessions {
		if session == searchSession {
			return i
		}
	}
	return -1
}

func (p *SafeConnectionPool) RouteToUser(notification common.UserNotification) {
	value, ok := p.userIndex.Load(notification.TargetUser)
	if !ok {
		log.Println("targetUser is not in the map userIndex")
		return
	}
	sessionsTargetUser := value.([]string)
	responseStruct := Response{
		Type: "notification",
		Data: notification,
	}
	fmt.Println("notification in RouteToUser: ", notification)
	bResponse, err := json.Marshal(responseStruct)
	if err != nil {
		log.Println("error marshaling response notification")
	}

	for _, sessionID := range sessionsTargetUser {
		managerValue, ok := p.managers.Load(sessionID)
		if ok {
			manager := managerValue.(*ConnectionManager)
			go func(mgr *ConnectionManager) {
				select {
				case mgr.send <- bResponse:
					// Message envoyé
				default:
					// Channel plein, on drop
				}
			}(manager)
		}
	}
}

func Init() {
	redisUtils.SetNotificationRouter(sConnectionPool)
}
