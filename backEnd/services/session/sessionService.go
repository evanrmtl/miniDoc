package sessionService

import (
	"context"
	"fmt"
	"time"

	"github.com/evanrmtl/miniDoc/models"
	"gorm.io/gorm"
)

func CreateSession(userID string, agent string, ctx context.Context, db *gorm.DB) error {

	return nil
}

func UpdateSession(userID string, agent string, ctx context.Context, db *gorm.DB) error {
	return nil
}

func DeleteExpiredSession(ctx context.Context, db *gorm.DB) {
	for true {
		_, err := gorm.G[models.Session](db).Where("expires_at < ?", time.Now().Unix()).Delete(ctx)
		if err != nil {
			fmt.Errorf(err.Error())
		}
		time.Sleep(time.Hour * 24)
	}
}
