package common

type UserNotification struct {
	NotificationType string      `json:"notificationType"`
	TargetUser       uint32      `json:"targetUser"`
	FileData         interface{} `json:"fileData"`
}

type ShareFileData struct {
	FileUUID      string        `json:"fileUUID"`
	FileName      string        `json:"fileName"`
	FileUpdatedAt int64         `json:"updatedAt"`
	SharedUser    []SharedUsers `json:"sharedUsers"`
}

type SharedUsers struct {
	Username string `json:"username"`
	Role     string `json:"role"`
}

type RevokeFileData struct {
	FileUUID string `json:"fileUUID"`
}

type NotificationRouter interface {
	RouteToUser(notification UserNotification)
}
