package models

const TableNameSession = "sessions"

type SessionMigration struct {
	SessionID uint32 `gorm:"column:session_id;primaryKey" json:"session_id"`
	UserID    uint32 `gorm:"column:user_id" json:"user_id"`
	CreatedAt int64  `gorm:"column:created_at" json:"created_at"`
	ExpiresAt int64  `gorm:"column:expires_at" json:"expires_at"`
	Agent     string `gorm:"column:agent" json:"agent"`
}

func (*SessionMigration) TableName() string {
	return TableNameSession
}

type Session struct {
	SessionID uint32 `gorm:"column:session_id;primaryKey" json:"session_id"`
	UserID    uint32 `gorm:"column:user_id" json:"user_id"`
	CreatedAt int64  `gorm:"column:created_at" json:"created_at"`
	ExpiresAt int64  `gorm:"column:expires_at" json:"expires_at"`
	Agent     string `gorm:"column:agent" json:"agent"`
	User      User   `gorm:"foreignKey:UserID"`
}
