package pkg

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/evanrmtl/miniDoc/internal/app/models"
	"gorm.io/gorm"
)

func CreateSession(userID uint32, agent string, ctx context.Context, db *gorm.DB) {
	session, err := gorm.G[models.Session](db).
		Where("user_id = ?", userID).
		Where("agent = ?", agent).
		First(ctx)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		log.Println("error on retrieve session request")
		return
	}
	// If no record found, then create
	if errors.Is(err, gorm.ErrRecordNotFound) {
		currentTime := time.Now()
		err = gorm.G[models.Session](db).Create(ctx, &models.Session{
			UserID:    userID,
			CreatedAt: currentTime.Unix(),
			ExpiresAt: currentTime.Add(time.Hour * 24 * 15).Unix(),
			Agent:     agent,
		})
		if err != nil {
			log.Println("erros while creating the session")
		}
		return
	}
	err = UpdateSessionTime(&session, ctx, db)
	if err != nil {
		log.Println(err)
		return
	}
}

func UpdateSessionTime(session *models.Session, ctx context.Context, db *gorm.DB) error {
	newExpiration := time.Now().Add(time.Hour * 24 * 15).Unix()
	_, err := gorm.G[models.Session](db).
		Where("session_id = ?", session.SessionID).
		Updates(ctx, models.Session{
			ExpiresAt: newExpiration,
		})
	if err != nil {
		return errors.New("error on update time")
	}
	return nil
}

func DeleteExpiredSession(ctx context.Context, db *gorm.DB) {
	ticker := time.NewTicker(time.Hour * 24)
	defer ticker.Stop()

	deleteExpiredSessions(ctx, db)

	for {
		select {
		case <-ctx.Done():
			fmt.Println("DeleteExpiredSession stopped:", ctx.Err())
			return

		case <-ticker.C:
			deleteExpiredSessions(ctx, db)
		}
	}
}

func deleteExpiredSessions(ctx context.Context, db *gorm.DB) {
	_, err := gorm.G[models.Session](db).
		Where("expires_at < ?", time.Now().Unix()).
		Delete(ctx)
	if err != nil {
		fmt.Printf("Error deleting expired sessions: %v\n", err)
		return
	}
}
