package file

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/evanrmtl/miniDoc/internal/app/models"
	"github.com/evanrmtl/miniDoc/internal/common"
	"github.com/evanrmtl/miniDoc/internal/pkg/jwtUtils"
	"github.com/evanrmtl/miniDoc/internal/pkg/redisUtils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var (
	ErrFindFile = errors.New("errors while finding file")
	serverName  = os.Getenv("SERVER_NAME")
)

func CreateFileController(c *gin.Context, db *gorm.DB) {
	ctx := c.Request.Context()
	var req struct {
		FileUUID string `json:"file_uuid" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	file_uuid := req.FileUUID

	bearer := c.Request.Header.Get("Authorization")
	token := strings.TrimPrefix(bearer, "Bearer ")
	err := jwtUtils.ValidJWT(token, c.Request.UserAgent(), ctx, db)

	if err != nil && !errors.Is(err, jwtUtils.ErrTokenExpired) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err})
		return
	}
	if err != nil {
		TokenExpiredValidSession(token, c, ctx, db)
		return
	}

	currTime := time.Now().Unix()
	newFile := &models.File{
		FileUUID:      file_uuid,
		FileName:      "Untitled file",
		FileUpdatedAt: currTime,
	}

	err = gorm.G[models.File](db).Create(ctx, newFile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Couldn't create file"})
		return
	}

	currFile, err := gorm.G[models.File](db).Where("file_uuid = ?", file_uuid).First(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Couldn't create file"})
		return
	}

	userID, err := jwtUtils.GetUserID(token, ctx, db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}

	currUser, err := gorm.G[models.User](db).Where("user_id = ?", userID).First(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error while finding user"})
		return
	}

	newUsersFile := &models.UsersFile{
		UserID:   userID,
		FileUUID: currFile.FileUUID,
		Role:     models.RoleOwner,
		File:     currFile,
		User:     currUser,
	}
	err = gorm.G[models.UsersFile](db).Create(ctx, newUsersFile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error couldn't create usersFile"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": "File created"})

}

func UpdateTimeFileController(c *gin.Context, db *gorm.DB) {
	ctx := c.Request.Context()
	file_uuid := c.Query("uuid")

	currTime := time.Now().Unix()
	_, err := gorm.G[models.File](db).Where("file_uuid = ?", file_uuid).Updates(ctx, models.File{
		FileUpdatedAt: currTime,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Couldn't update time file"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": "File time updated"})
}

func DeleteFileController(c *gin.Context, db *gorm.DB) {
	ctx := c.Request.Context()
	file_uuid := c.Query("file_uuid")

	bearer := c.Request.Header.Get("Authorization")
	token := strings.TrimPrefix(bearer, "Bearer ")
	err := jwtUtils.ValidJWT(token, c.Request.UserAgent(), ctx, db)

	if err != nil && !errors.Is(err, jwtUtils.ErrTokenExpired) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err})
		return
	}
	if err != nil {
		TokenExpiredValidSession(token, c, ctx, db)
		return
	}

	userID, err := jwtUtils.GetUserID(token, ctx, db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}

	linkUserFile, err := gorm.G[models.UsersFile](db).Where("user_id = ?", userID).Where("file_uuid = ?", file_uuid).First(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}

	switch linkUserFile.Role {
	case models.RoleOwner:
		_, err = gorm.G[models.File](db).Where("file_uuid = ?", file_uuid).Delete(ctx)
		if err != nil {
			log.Println(err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err})
			return
		}

		newNotification := common.FileEvent{
			EventType: "file_deleted",
			FileUUID:  file_uuid,
		}

		err = redisUtils.PublishFileDeleteEvent(ctx, newNotification)
		if err != nil {
			break
		}

		c.JSON(http.StatusNoContent, nil)
		return
	case models.RoleCollaborator:
		_, err = gorm.G[models.UsersFile](db).Where("user_id = ?", userID).Where("file_uuid = ?", file_uuid).Delete(ctx)
		if err != nil {
			log.Println(err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err})
			return
		}
		c.JSON(http.StatusNoContent, nil)
		return
	}
	c.JSON(http.StatusForbidden, gin.H{"error": "You don't have acces to this file"})
}

func ShareFileController(c *gin.Context, db *gorm.DB) {
	ctx := c.Request.Context()

	var req struct {
		FileUUID  string   `json:"file_uuid" binding:"required"`
		Usernames []string `json:"usernames" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	bearer := c.Request.Header.Get("Authorization")
	token := strings.TrimPrefix(bearer, "Bearer ")
	err := jwtUtils.ValidJWT(token, c.Request.UserAgent(), ctx, db)

	if err != nil && !errors.Is(err, jwtUtils.ErrTokenExpired) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err})
		return
	}

	if err != nil {
		TokenExpiredValidSession(token, c, ctx, db)
		return
	}

	if len(req.Usernames) == 0 {
		c.JSON(http.StatusPreconditionFailed, gin.H{"error": "Must have at least 1 user to shares"})
		return
	}

	var userIDs []uint32
	err = db.Model(&models.User{}).Where("username IN ?", req.Usernames).Pluck("user_id", &userIDs).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}

	fileRequire, err := gorm.G[models.File](db).Where("file_uuid = ?", req.FileUUID).First(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}

	var errCreate error
	for _, userID := range userIDs {
		err := gorm.G[models.UsersFile](db).Create(ctx, &models.UsersFile{UserID: userID, FileUUID: req.FileUUID})
		if err != nil {
			errCreate = err
			break
		}
	}
	if errCreate != nil {
		c.JSON(http.StatusPartialContent, gin.H{"error": "Some user(s) couldn't be added"})
		return
	}

	var users []common.SharedUsers

	err = db.Table("users").
		Select("users.username, users_files.role").
		Joins("JOIN users_files ON users.user_id = users_files.user_id").
		Where("users_files.file_uuid = ?", fileRequire.FileUUID).
		Scan(&users).Error

	var errPublish error
	for _, userID := range userIDs {
		currTime := time.Now().Unix()

		newNotification := common.UserNotification{
			NotificationType: "file_shared",
			TargetUser:       userID,
			FileData: common.ShareFileData{
				FileUUID:      fileRequire.FileUUID,
				FileName:      fileRequire.FileName,
				FileUpdatedAt: currTime,
				SharedUser:    users,
			},
		}

		err = redisUtils.PublishUserSharedNotification(ctx, newNotification)
		if err != nil {
			errPublish = err
			break
		}
	}
	if errPublish != nil {
		c.JSON(http.StatusPartialContent, gin.H{"error": "Some user(s) couldn't be added"})
		return
	}
	c.JSON(http.StatusOK, "File shared with every user")
}

func GetFileController(c *gin.Context, db *gorm.DB) {
	ctx := c.Request.Context()

	bearer := c.Request.Header.Get("Authorization")
	token := strings.TrimPrefix(bearer, "Bearer ")
	err := jwtUtils.ValidJWT(token, c.Request.UserAgent(), ctx, db)

	if err != nil && !errors.Is(err, jwtUtils.ErrTokenExpired) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err})
		return
	}

	if err != nil {
		TokenExpiredValidSession(token, c, ctx, db)
		return
	}
	userID, err := jwtUtils.GetUserID(token, ctx, db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}

	userfiles, err := gorm.G[models.UsersFile](db).Where("user_id = ?", userID).Find(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error while finding usersfiles"})
		return
	}

	fileUUIDs := make([]string, len(userfiles))

	for i, userfile := range userfiles {
		fileUUIDs[i] = userfile.FileUUID
	}

	files, err := gorm.G[models.File](db).Select("file_uuid", "file_name", "file_updated_at").Where("file_uuid IN ?", fileUUIDs).Order("file_updated_at desc").Find(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error while finding files"})
		return
	}
	c.JSON(http.StatusOK, files)
}

func GetSharedUserController(c *gin.Context, db *gorm.DB) {
	ctx := c.Request.Context()
	fileUUID := c.Query("file_uuid")

	bearer := c.Request.Header.Get("Authorization")
	token := strings.TrimPrefix(bearer, "Bearer ")
	err := jwtUtils.ValidJWT(token, c.Request.UserAgent(), ctx, db)

	if err != nil && !errors.Is(err, jwtUtils.ErrTokenExpired) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err})
		return
	}

	if err != nil {
		TokenExpiredValidSession(token, c, ctx, db)
		return
	}

	currUserID, err := jwtUtils.GetUserID(token, ctx, db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}

	var users []common.SharedUsers

	err = db.Table("users").
		Select("users.username, users_files.role").
		Joins("JOIN users_files ON users.user_id = users_files.user_id").
		Where("users_files.file_uuid = ?", fileUUID).
		Where("users.user_id != ?", currUserID).
		Scan(&users).Error
	if err != nil {
		fmt.Println(err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}
	c.JSON(http.StatusOK, users)
}

func RemovedUserController(c *gin.Context, db *gorm.DB) {
	ctx := c.Request.Context()
	fileUUID := c.Query("file_uuid")
	username := c.Query("username")

	bearer := c.Request.Header.Get("Authorization")
	token := strings.TrimPrefix(bearer, "Bearer ")
	err := jwtUtils.ValidJWT(token, c.Request.UserAgent(), ctx, db)

	if err != nil && !errors.Is(err, jwtUtils.ErrTokenExpired) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err})
		return
	}

	if err != nil {
		TokenExpiredValidSession(token, c, ctx, db)
		return
	}

	fmt.Println("fileUUID: ", fileUUID, "   username: ", username)
	rowsAffected, err := gorm.G[models.UsersFile](db).Where(`user_id = (
		SELECT user_id FROM users WHERE username = ?
		) AND file_uuid = ?`, username, fileUUID).
		Delete(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "No access found for this user"})
		return
	}

	user, err := gorm.G[models.User](db).Where("username = ?", username).First(ctx)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No access found for this user"})
		return
	}

	newNotification := common.UserNotification{
		NotificationType: "file_revoke",
		TargetUser:       user.UserID,
		FileData: common.RevokeFileData{
			FileUUID: fileUUID,
		},
	}

	err = redisUtils.PublishUserRevokeNotification(ctx, newNotification)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "couldn't revoke user from file"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": "Access removed successfully"})
}

func TokenExpiredValidSession(token string, c *gin.Context, ctx context.Context, db *gorm.DB) {
	username, err := jwtUtils.GetUsername(token, ctx, db)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err})
		return
	}
	newJWT, err := jwtUtils.CreateJWT(ctx, username, db)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err})
		return
	}
	c.JSON(http.StatusConflict, gin.H{
		"error":  jwtUtils.ErrTokenExpired,
		"newJWT": newJWT,
	})
}

func DisconnectFromFile(c *gin.Context, db *gorm.DB) {
	ctx := c.Request.Context()

	bearer := c.Request.Header.Get("Authorization")
	token := strings.TrimPrefix(bearer, "Bearer ")
	err := jwtUtils.ValidJWT(token, c.Request.UserAgent(), ctx, db)

	if err != nil && !errors.Is(err, jwtUtils.ErrTokenExpired) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err})
		return
	}
	if err != nil {
		TokenExpiredValidSession(token, c, ctx, db)
		return
	}

}
