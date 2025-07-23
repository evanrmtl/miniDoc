package auth

import (
	"errors"
	"net/http"

	authService "github.com/evanrmtl/miniDoc/services/auth"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterController(c *gin.Context, db *gorm.DB) {

	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindBodyWithJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := authService.Register(c.Request.Context(), req.Username, req.Password, db)
	if err != nil {
		if errors.Is(err, authService.ErrUserExists) {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Operation unavailable"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": "User created"})
}

func LoginController(c *gin.Context, db *gorm.DB) {

	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := authService.Login(c.Request.Context(), req.Username, req.Password, db)
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
	c.JSON(http.StatusAccepted, gin.H{"success": "User connected"})
}
