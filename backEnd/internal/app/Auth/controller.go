package auth

import (
	"errors"
	"net/http"

	"github.com/evanrmtl/miniDoc/internal/app/models"
	"github.com/evanrmtl/miniDoc/internal/pkg"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterController(c *gin.Context, db *gorm.DB) {

	ctx := c.Request.Context()

	var req struct {
		Username string `json:"username" binding:"required,min=3,max=20"`
		Password string `json:"password" binding:"required,min=6"`
	}

	err := c.ShouldBindBodyWithJSON(&req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = Register(ctx, req.Username, req.Password, db)
	if err != nil {
		if errors.Is(err, ErrUserExists) {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Operation unavailable"})
		return
	}

	token, err := pkg.CreateJWT(ctx, req.Username, db)
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

	pkg.CreateSession(currUser.UserID, agentUsed, ctx, db)
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

	err := Login(ctx, req.Username, req.Password, db)
	if err != nil {
		if errors.Is(err, ErrUserNotExists) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "incorrect username"})
			return
		}
		if errors.Is(err, ErrIncorrectPassword) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "incorrect password"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	token, err := pkg.CreateJWT(ctx, req.Username, db)
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

	pkg.CreateSession(currUser.UserID, agentUsed, ctx, db)
}
