package authService

import (
	"context"
	"errors"

	"golang.org/x/crypto/bcrypt"

	"github.com/evanrmtl/miniDoc/models"
	"gorm.io/gorm"
)

var ErrUserExists = errors.New("user already exists")
var ErrUserNotExists = errors.New("user does not exist")
var ErrIncorrectPassword = errors.New("incorrect password")

func Register(ctx context.Context, username string, password string, db *gorm.DB) error {

	_, err := gorm.G[models.User](db).Where("username = ?", username).First(ctx)
	if err == nil {
		return ErrUserExists
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
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

func Login(ctx context.Context, username string, password string, db *gorm.DB) error {

	user, err := gorm.G[models.User](db).Where("username = ?", username).First(ctx)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrUserNotExists
	}
	if err != nil {
		return err
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return ErrIncorrectPassword
	}
	return err
}
