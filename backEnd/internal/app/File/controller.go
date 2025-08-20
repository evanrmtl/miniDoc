package file

import (
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/evanrmtl/miniDoc/internal/app/models"
	"github.com/evanrmtl/miniDoc/internal/pkg/jwtUtils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var (
	ErrFindFile = errors.New("errors while finding file")
)

func CreateFileController(c *gin.Context, db *gorm.DB) {
	ctx := c.Request.Context()
	uuid := c.Query("uuid")

	bearer := c.Request.Header.Get("Authorization")
	token := strings.TrimPrefix(bearer, "Bearer ")
	err := jwtUtils.ValidJWT(token, c.Request.UserAgent(), ctx, db)

	if err != nil && !errors.Is(err, jwtUtils.ErrTokenExpired) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err})
		return
	}
	if err != nil {
		username, err := jwtUtils.GetUsername(token, ctx, db)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err})
			return
		}
		newJWT, err := jwtUtils.CreateJWT(ctx, username, db)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err})
			return
		}
		c.JSON(http.StatusConflict, gin.H{
			"error":  jwtUtils.ErrTokenExpired,
			"newJWT": newJWT,
		})
		return
	}

	currTime := time.Now().Unix()
	newFile := &models.File{
		FileUUID:      uuid,
		FileName:      "Untitled file",
		FileUpdatedAt: currTime,
	}

	err = gorm.G[models.File](db).Create(ctx, newFile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Couldn't create file"})
		return
	}

	currFile, err := gorm.G[models.File](db).Where("file_uuid = ?", uuid).First(ctx)
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
	uuid := c.Query("uuid")

	currTime := time.Now().Unix()
	_, err := gorm.G[models.File](db).Where("file_uuid = ?", uuid).Updates(ctx, models.File{
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
	file_uuid := c.Query("uuid")

	bearer := c.Request.Header.Get("Authorization")
	token := strings.TrimPrefix(bearer, "Bearer ")
	err := jwtUtils.ValidJWT(token, c.Request.UserAgent(), ctx, db)

	if err != nil && !errors.Is(err, jwtUtils.ErrTokenExpired) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err})
		return
	}
	if err != nil {
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
		return
	}

	_, err = gorm.G[models.File](db).Where("file_uuid = ?", file_uuid).Delete(ctx)
	if err != nil {
		log.Println(err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": "File deleted"})
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
