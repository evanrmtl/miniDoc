package verify

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/evanrmtl/miniDoc/internal/app/models"
	"github.com/evanrmtl/miniDoc/internal/pkg/jwtUtils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func CreateUsernameController(c *gin.Context, db *gorm.DB) {
	ctx := c.Request.Context()
	username := c.Query("username")
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

	sharedUser, err := gorm.G[models.User](db).Where("username = ?", username).First(ctx)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err})
		return
	}

	nbUser, err := gorm.G[models.UsersFile](db).Where("user_id = ?", sharedUser.UserID).Where("file_uuid = ?", fileUUID).Count(ctx, "user_id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err})
		return
	}
	if nbUser != 0 {
		c.JSON(http.StatusPreconditionFailed, gin.H{"error": err})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": "user exist"})
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
