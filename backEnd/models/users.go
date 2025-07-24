package models

const TableNameUser = "users"

// User mapped from table <users>
type UserMigration struct {
	UserID       int32  `gorm:"column:user_id;primaryKey" json:"user_id"`
	Username     string `gorm:"column:username;not null;uniqueIndex;size:20" json:"username" binding:"required,min=3,max=20"`
	PasswordHash string `gorm:"column:password_hash;not null" json:"password_hash"`
}

// TableName User's table name
func (*UserMigration) TableName() string {
	return TableNameUser
}

type User struct {
	UserID       int32       `gorm:"column:user_id;primaryKey" json:"user_id"`
	Username     string      `gorm:"column:username;not null" json:"username"`
	PasswordHash string      `gorm:"column:password_hash;not null" json:"password_hash"`
	UsersFiles   []UsersFile `gorm:"foreignKey:UserID"`
	Sessions     []Session   `gorm:"foreignKey:UserID"`
}
