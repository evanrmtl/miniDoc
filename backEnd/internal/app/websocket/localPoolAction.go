package websocket

import "github.com/gorilla/websocket"

func (cs *ClientSocket) storeLocalConnection(sessionID string) {
	sConnectionPool.Add(sessionID, cs.socket.conn)
}

func (p *SafeConnectionPool) Add(sessionID string, conn *websocket.Conn) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.pool[sessionID] = conn
}

func (manager *ConnectionManager) deleteLocal() {
	manager.connections.mu.Lock()
	defer manager.connections.mu.Unlock()
	delete(manager.connections.pool, manager.clientSocket.client.SessionID)
}
