package pkg

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"errors"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/evanrmtl/miniDoc/internal/app/models"
	testenv "github.com/evanrmtl/miniDoc/testEnv"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestMain(m *testing.M) {
	setupTestRS256KeyPair()

	err := testenv.Setup()
	if err != nil {
		panic(err)
	}

	insertOneUser()

	code := m.Run()

	testenv.Teardown()

	os.Exit(code)
}

func insertOneUser() {
	result := testenv.DB.Exec("INSERT INTO users (username, password_hash) VALUES (?, ?)", "test", "test123")
	if result.Error != nil {
		panic(fmt.Sprintf("Failed to create  user: %v", result.Error))
	}
}

func setupTestRS256KeyPair() {
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		panic(fmt.Sprintf("Failed to generate  privateRSA key: %v", err))
	}

	privateKeyDER := x509.MarshalPKCS1PrivateKey(privateKey)
	if err != nil {
		panic(fmt.Sprintf("Failed to generate  privateDER key: %v", err))
	}

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

func TestCreateJWT(t *testing.T) {

	db := testenv.DB
	ctx := t.Context()
	username := "test"

	// CASE unknow user
	unknowUsername := "unknow"
	token, err := CreateJWT(ctx, unknowUsername, db)
	require.True(t, errors.Is(err, ErrUserNotFound))
	require.Empty(t, token)

	// CASE normal use
	token, err = CreateJWT(ctx, username, db)
	require.NoError(t, err)
	require.NotEmpty(t, token)

	parts := strings.Split(token.Token, ".")
	require.True(t, len(parts) == 3)

}

func TestCreateSignatureAndValidateSignature(t *testing.T) {
	db := testenv.DB
	userAgent := "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
	ctx := t.Context()

	// Get  user from database
	testUser, err := gorm.G[models.User](db).Where("username = ?", "test").First(ctx)
	require.NoError(t, err)
	testUserID := testUser.UserID

	// Create valid JWT components
	jwtHeader := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"RS256","typ":"JWT"}`))
	currentTimestamp := time.Now().Unix()

	validPayload := base64.RawURLEncoding.EncodeToString([]byte(fmt.Sprintf(
		`{"username":"test","userID":%d,"iat":%d,"expiresAt":%d}`,
		testUserID, currentTimestamp, currentTimestamp+3600,
	)))

	validSignature, err := createSignature(jwtHeader, validPayload)
	require.NoError(t, err)
	assert.NotEmpty(t, validSignature)

	// Create expired JWT payload
	expiredPayload := base64.RawURLEncoding.EncodeToString([]byte(fmt.Sprintf(
		`{"username":"test","userID":%d,"iat":%d,"expiresAt":%d}`,
		testUserID, currentTimestamp-7200, currentTimestamp-3600,
	)))

	expiredSignature, err := createSignature(jwtHeader, expiredPayload)
	require.NoError(t, err)
	assert.NotEmpty(t, expiredSignature)

	// CASE Invalid JWT format (less than 3 parts)
	tokenWithTwoParts := jwtHeader + "." + validPayload
	err = ValidJWT(tokenWithTwoParts, userAgent, ctx, testenv.DB)
	require.True(t, errors.Is(err, ErrInvalidJWTFormat))

	// CASE: Invalid JWT format (more than 3 parts)
	tokenWithFourParts := jwtHeader + "." + validPayload + "." + validSignature + "." + validSignature
	err = ValidJWT(tokenWithFourParts, userAgent, ctx, testenv.DB)
	require.True(t, errors.Is(err, ErrInvalidJWTFormat))

	// CASE: Invalid base64 signature
	invalidBase64String := "A"
	tokenWithInvalidBase64 := jwtHeader + "." + validPayload + "." + invalidBase64String
	err = ValidJWT(tokenWithInvalidBase64, userAgent, ctx, testenv.DB)
	require.True(t, errors.Is(err, ErrSignatureDecode))

	// CASE: Invalid JWT signature (corrupted signature)
	validCompleteToken := jwtHeader + "." + validPayload + "." + validSignature
	corruptedSignature := []byte(validSignature)
	if corruptedSignature[0] == 'a' {
		corruptedSignature[0] = 'b'
	} else {
		corruptedSignature[0] = 'a'
	}
	tokenWithCorruptedSignature := jwtHeader + "." + validPayload + "." + string(corruptedSignature)
	err = ValidJWT(tokenWithCorruptedSignature, userAgent, ctx, testenv.DB)
	require.True(t, errors.Is(err, ErrInvalidJWTSignature))

	// CASE: Invalid payload format (missing userID field)
	malformedPayload := base64.RawURLEncoding.EncodeToString([]byte(fmt.Sprintf(
		`{"username":"test","boolean": false, iat":%d,"expiresAt":%d}`,
		currentTimestamp, currentTimestamp+3600,
	)))
	tokenWithMalformedPayload := jwtHeader + "." + malformedPayload + "." + validSignature
	err = ValidJWT(tokenWithMalformedPayload, userAgent, ctx, testenv.DB)
	require.True(t, errors.Is(err, ErrInvalidJWTSignature))

	// CASE: Expired token with non-expired session in database
	db.Exec("INSERT INTO sessions (user_id, created_at, expires_at, agent) VALUES (?, ?, ?, ?)",
		testUserID, currentTimestamp-3600, currentTimestamp+3600, userAgent)
	expiredTokenWithValidSession := jwtHeader + "." + expiredPayload + "." + expiredSignature

	err = ValidJWT(expiredTokenWithValidSession, userAgent, ctx, testenv.DB)
	require.True(t, errors.Is(err, ErrJWTExpired))
	testenv.CleanTables()
	insertOneUser()

	// CASE: Expired token with expired session in database
	db.Exec("INSERT INTO sessions (user_id, created_at, expires_at, agent) VALUES (?, ?, ?, ?)",
		testUserID, currentTimestamp-7200, currentTimestamp-3600, userAgent)

	err = ValidJWT(expiredTokenWithValidSession, userAgent, ctx, testenv.DB)
	require.True(t, errors.Is(err, ErrTokenExpired))

	// CASE: Valid token (not expired)
	err = ValidJWT(validCompleteToken, userAgent, ctx, testenv.DB)
	require.NoError(t, err)

	// CASE: Token validation with closed database connection
	dbConnection, err := testenv.DB.DB()
	require.NoError(t, err)
	dbConnection.Close()

	err = ValidJWT(expiredTokenWithValidSession, userAgent, ctx, testenv.DB)
	require.True(t, errors.Is(err, ErrSessionLookup))

	// restart database
	newDB, err := gorm.Open(postgres.Open(testenv.GetDSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	testenv.DB = newDB
}

func BenchmarkJWTOperations(b *testing.B) {
	db := testenv.DB
	ctx := context.Background()
	username := "test"
	userAgent := "BenchmarkAgent/1.0"

	testUser, err := gorm.G[models.User](db).Where("username = ?", username).First(ctx)
	if err != nil {
		b.Fatal(err)
	}
	testUserID := testUser.UserID

	b.Run("CreateJWT", func(b *testing.B) {
		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			token, err := CreateJWT(ctx, username, db)
			if err != nil {
				b.Fatal(err)
			}
			_ = token
		}
	})

	b.Run("ValidJWT_Valid", func(b *testing.B) {
		token, err := CreateJWT(ctx, username, db)
		require.NoError(b, err)

		currentTime := time.Now().Unix()
		db.Exec("INSERT INTO sessions (user_id, created_at, expires_at, agent) VALUES (?, ?, ?, ?)",
			testUserID, currentTime, currentTime+3600, userAgent)

		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			err := ValidJWT(token.Token, userAgent, ctx, db)
			if err != nil {
				b.Fatal(err)
			}
		}
	})

	b.Run("CreateSignature", func(b *testing.B) {
		jwtHeader := "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9"
		payload := fmt.Sprintf(`{"username":"test","userID":%d,"iat":%d,"expiresAt":%d}`,
			testUserID, time.Now().Unix(), time.Now().Unix()+3600)
		encodedPayload := base64.RawURLEncoding.EncodeToString([]byte(payload))

		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			signature, err := createSignature(jwtHeader, encodedPayload)
			if err != nil {
				b.Fatal(err)
			}
			_ = signature
		}
	})
}
