package auth

import (
	"errors"
	"net/http"

	"github.com/evanrmtl/miniDoc/models"
	jwt "github.com/evanrmtl/miniDoc/services/JWT"
	jwtService "github.com/evanrmtl/miniDoc/services/JWT"
	authService "github.com/evanrmtl/miniDoc/services/auth"
	sessionService "github.com/evanrmtl/miniDoc/services/session"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterController(c *gin.Context, db *gorm.DB) {

	ctx := c.Request.Context()

	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindBodyWithJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := authService.Register(ctx, req.Username, req.Password, db)
	if err != nil {
		if errors.Is(err, authService.ErrUserExists) {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Operation unavailable"})
		return
	}

	token, err := jwtService.CreateJWT(ctx, req.Username, db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Couldn't connect, please try again"})
		return
	}

	c.JSON(http.StatusCreated,
		gin.H{
			"success": "User created",
			"JWT":     token.Token,
		},
	)

	currUser, err := gorm.G[models.User](db).Where("username = ?", req.Username).First(ctx)
	if err != nil {
		return
	}

	agentUsed := c.GetHeader("User-Agent")

	sessionService.CreateSession(currUser.UserID, agentUsed, ctx, db)
}

func LoginController(c *gin.Context, db *gorm.DB) {

	ctx := c.Request.Context()

	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := authService.Login(ctx, req.Username, req.Password, db)
	if err != nil {
		if errors.Is(err, authService.ErrUserExists) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "incorrect username"})
			return
		}
		if errors.Is(err, authService.ErrIncorrectPassword) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "incorrect password"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	token, err := jwt.CreateJWT(ctx, req.Username, db)
	if err == jwt.ErrJWTExpired {

	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Couldn't connect, please log in again"})
		return
	}

	c.JSON(http.StatusAccepted,
		gin.H{
			"success": "User connected",
			"JWT":     token.Token,
		},
	)

	currUser, err := gorm.G[models.User](db).Where("username = ?", req.Username).First(ctx)
	if err != nil {
		return
	}

	agentUsed := c.GetHeader("User-Agent")

	sessionService.CreateSession(currUser.UserID, agentUsed, ctx, db)
}
