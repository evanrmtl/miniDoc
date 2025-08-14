package sessionsUtils

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/evanrmtl/miniDoc/internal/app/models"
	testenv "github.com/evanrmtl/miniDoc/testEnv"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestMain(m *testing.M) {
	setupTestRS256KeyPair()

	err := testenv.Setup()
	if err != nil {
		panic(err)
	}

	testenv.InsertOneUser()

	code := m.Run()

	testenv.Teardown()

	os.Exit(code)
}

func setupTestRS256KeyPair() {
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		panic(fmt.Sprintf("Failed to generate  privateRSA key: %v", err))
	}

	privateKeyDER := x509.MarshalPKCS1PrivateKey(privateKey)

	privateKeyPEM := &pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: privateKeyDER,
	}

	var privateKeyBuf bytes.Buffer
	pem.Encode(&privateKeyBuf, privateKeyPEM)

	publicKey := privateKey.PublicKey
	publicKeyDER, err := x509.MarshalPKIXPublicKey(&publicKey)
	if err != nil {
		panic(fmt.Sprintf("Failed to generate  publicRSA key: %v", err))
	}

	publicKeyPEM := &pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: publicKeyDER,
	}

	var publicKeyBuf bytes.Buffer
	pem.Encode(&publicKeyBuf, publicKeyPEM)

	os.Setenv("RS256_PRIVATE_KEY", privateKeyBuf.String())
	os.Setenv("RS256_PUBLIC_KEY", publicKeyBuf.String())
}

func TestCreateSessionAndUpdate(t *testing.T) {
	testenv.CleanTables()
	testenv.InsertOneUser()

	db := testenv.DB
	userAgent := "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"

	ctx := t.Context()
	testUser, err := gorm.G[models.User](db).Where("username = ?", "test").First(ctx)
	require.NoError(t, err)

	userID := testUser.UserID

	CreateSession(userID, userAgent, ctx, db)

	s, err := gorm.G[models.Session](db).Where("user_id = ?", userID).Find(ctx)
	require.NoError(t, err)
	require.True(t, len(s) == 1)
	currSession := s[0]

	createdAt := currSession.CreatedAt
	expiresIn := currSession.ExpiresAt
	require.True(t, createdAt < expiresIn)

	// CASE session already exist, update it
	time.Sleep(3 * time.Second)

	CreateSession(userID, userAgent, ctx, db)

	s2, err := gorm.G[models.Session](db).Where("user_id = ?", userID).Find(ctx)
	require.NoError(t, err)
	require.True(t, len(s2) == 1)
	newSession := s2[0]

	newExpiresIn := newSession.ExpiresAt
	require.True(t, newExpiresIn > expiresIn)
}

func TestDeleteExpiredSession(t *testing.T) {
	testenv.CleanTables()
	testenv.InsertOneUser()

	db := testenv.DB
	userAgent := "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"

	baseCtx := t.Context()

	testUser, err := gorm.G[models.User](db).Where("username = ?", "test").First(baseCtx)
	require.NoError(t, err)

	userID := testUser.UserID

	// CASE not expired
	ctx1, cancel1 := context.WithCancel(baseCtx)
	currTime := time.Now().Unix()
	db.Exec("INSERT INTO sessions (user_id, created_at, expires_at, agent) VALUES (?, ?, ?, ?)", userID, currTime-300, currTime+300, userAgent)

	go DeleteExpiredSession(ctx1, db)
	time.Sleep(200 * time.Millisecond)
	cancel1()
	time.Sleep(100 * time.Millisecond)
	sessions, err := gorm.G[models.Session](db).Find(baseCtx)
	require.NoError(t, err)
	require.True(t, len(sessions) == 1)

	// CASE 1 expired
	ctx2, cancel2 := context.WithCancel(baseCtx)
	db.Exec("INSERT INTO sessions (user_id, created_at, expires_at, agent) VALUES (?, ?, ?, ?)", userID, currTime-900, currTime-300, userAgent)

	go DeleteExpiredSession(ctx2, db)
	time.Sleep(200 * time.Millisecond)
	cancel2()
	time.Sleep(100 * time.Millisecond)
	sessions, err = gorm.G[models.Session](db).Find(baseCtx)
	require.NoError(t, err)
	require.True(t, len(sessions) == 1)

	// CASE multiple expired
	ctx3, cancel3 := context.WithCancel(baseCtx)
	db.Exec("INSERT INTO sessions (user_id, created_at, expires_at, agent) VALUES (?, ?, ?, ?)", userID, currTime-900, currTime-241, userAgent)
	db.Exec("INSERT INTO sessions (user_id, created_at, expires_at, agent) VALUES (?, ?, ?, ?)", userID, currTime-309212, currTime-269212, userAgent)
	db.Exec("INSERT INTO sessions (user_id, created_at, expires_at, agent) VALUES (?, ?, ?, ?)", userID, currTime-900, currTime-773, userAgent)

	go DeleteExpiredSession(ctx3, db)
	time.Sleep(200 * time.Millisecond)
	cancel3()
	time.Sleep(100 * time.Millisecond)
	sessions, err = gorm.G[models.Session](db).Find(baseCtx)
	require.NoError(t, err)
	require.True(t, len(sessions) == 1)

}

func BenchmarkCreateSession(b *testing.B) {

	testenv.CleanTables()
	testenv.InsertOneUser()

	db := testenv.DB
	ctx := context.Background()
	userAgent := "BenchmarkAgent/1.0"
	userID := uint32(1)

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		CreateSession(userID, userAgent, ctx, db)

		if i%2 == 0 {
			db.Exec("DELETE FROM sessions WHERE user_id = ?", userID)
		}
	}
}

func BenchmarkDeleteExpiredSessions(b *testing.B) {
	testenv.CleanTables()
	testenv.InsertOneUser()

	db := testenv.DB
	userAgent := "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"

	baseCtx := context.Background()

	testUser, err := gorm.G[models.User](db).Where("username = ?", "test").First(baseCtx)
	require.NoError(b, err)
	userID := testUser.UserID

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		b.StopTimer()
		if i%10 == 0 {
			fmt.Printf("Iteration %d/%d\n", i, b.N)
		}
		currTime := time.Now().Unix()
		for j := 0; j < 1000; j++ {
			db.Exec("INSERT INTO sessions (user_id, created_at, expires_at, agent) VALUES (?, ?, ?, ?)",
				userID, currTime-900, currTime-300, userAgent)
		}

		b.StartTimer()
		deleteExpiredSessions(baseCtx, db)
	}
}
