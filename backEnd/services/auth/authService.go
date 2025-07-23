package authService

import (
	"context"
	"errors"

	"golang.org/x/crypto/bcrypt"

	"github.com/evanrmtl/miniDoc/models"
	"gorm.io/gorm"
)

var ErrUserExists = errors.New("user already exists")

func Register(ctx context.Context, username string, password string, db *gorm.DB) error {

	_, err := gorm.G[models.User](db).Where("username = ?", username).First(ctx)
	if err == nil {
		return ErrUserExists
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	err = gorm.G[models.User](db).Create(ctx, &models.User{
		Username:     username,
		PasswordHash: string(hashedPassword),
	})
	return err
}
