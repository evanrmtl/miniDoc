package websocket_test

import (
	"bytes"
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/evanrmtl/miniDoc/internal/app/models"
	websocket "github.com/evanrmtl/miniDoc/internal/app/websocket"
	"github.com/evanrmtl/miniDoc/internal/middleware/subroute"
	"github.com/evanrmtl/miniDoc/internal/pkg/jwtUtils"
	"github.com/evanrmtl/miniDoc/internal/pkg/redisUtils"
	testenv "github.com/evanrmtl/miniDoc/testEnv"
	"github.com/gin-gonic/gin"
	golangjwt "github.com/golang-jwt/jwt/v5"
	gorillaws "github.com/gorilla/websocket"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

var responseSuccessObj struct {
	Type string                    `json:"type"`
	Data websocket.AuthSuccessData `json:"data"`
}

var responseObj struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}
var ts *httptest.Server

func TestMain(m *testing.M) {

	err := testenv.Setup()
	if err != nil {
		panic(err)
	}

	redisUtils.CreateRedis(context.Background())
	setupTestRS256KeyPair()

	ts = httptest.NewServer(createTestRoute())

	code := m.Run()

	ts.Close()
	os.Exit(code)
}

func createTestRoute() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	subroute.CreateWSRoute(r.Group("/"), testenv.DB, context.Background())
	return r
}

func TestWebSocketAuth(t *testing.T) {
	testenv.CleanTables()

	db := testenv.DB

	header := http.Header{}
	header.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36")

	router := createTestRoute()
	ts := httptest.NewServer(router)
	defer ts.Close()

	url := "ws" + strings.TrimPrefix(ts.URL, "http") + "/ws"

	ws, _, err := gorillaws.DefaultDialer.Dial(url, header)
	require.NoError(t, err)
	defer ws.Close()

	fmt.Print("websocket test")

	// CASE Empty db
	authMsg := `{"type":"auth","data":{"Token":"token_test","Username":"user","SessionID":"123456-123456-123456"}}`

	err = ws.WriteMessage(gorillaws.TextMessage, []byte(authMsg))
	require.NoError(t, err)

	_, resp, err := ws.ReadMessage()
	require.NoError(t, err)

	require.NoError(t, json.Unmarshal(resp, &responseObj))
	require.Equal(t, websocket.MessageTypeAuthFailed, responseObj.Type)

	// CASE User exist but no session linked to him
	insertOneUser()
	authMsg = `{"type":"auth","data":{"Token": "test_token","Username":"test","SessionID":"123456-123456-123456"}}`

	err = ws.WriteMessage(gorillaws.TextMessage, []byte(authMsg))
	require.NoError(t, err)

	_, resp, err = ws.ReadMessage()
	require.NoError(t, err)

	require.NoError(t, json.Unmarshal(resp, &responseObj))
	require.Equal(t, websocket.MessageTypeAuthFailed, responseObj.Type)

	// CASE User exist with valid and not expired JWT and a session not expired
	testUser, err := gorm.G[models.User](db).Where("username = ?", "test").First(t.Context())
	require.NoError(t, err)
	userAgent := "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"

	userID := testUser.UserID
	initTime := time.Now().Unix()

	db.Exec("INSERT INTO sessions (user_id, created_at, expires_at, agent) VALUES (?, ?, ?, ?)", userID, initTime-300, initTime+300, userAgent)

	jwt, err := jwtUtils.CreateJWT(t.Context(), "test", db)
	require.NoError(t, err)

	authMsg = fmt.Sprintf(`{"type":"auth","data":{"Token": "%s","Username":"test", "SessionID":"123456-123456-123456"}}`, jwt)

	err = ws.WriteMessage(gorillaws.TextMessage, []byte(authMsg))
	require.NoError(t, err)

	time.Sleep(time.Second)

	_, resp, err = ws.ReadMessage()
	require.NoError(t, err)

	require.NoError(t, json.Unmarshal(resp, &responseSuccessObj))
	require.Equal(t, websocket.MessageTypeAuthSuccess, responseSuccessObj.Type)
	data := responseSuccessObj.Data
	require.Equal(t, false, data.Renewed)

	sessionUsed, err := gorm.G[models.Session](db).Where("user_id = ?", userID).First(t.Context())
	require.NoError(t, err)
	require.True(t, sessionUsed.ExpiresAt > initTime)

	// CASE User exist, a session exist, but an expired valid JWT

	currTime := time.Now().Unix()
	jwt, err = createJWTWithCustomExpiry(t.Context(), "test", currTime-300, db)

	require.NoError(t, err)

	authMsg = fmt.Sprintf(`{"type":"auth","data":{"Token": "%s","Username":"test", "SessionID":"123456-123456-123456"}}`, jwt)

	err = ws.WriteMessage(gorillaws.TextMessage, []byte(authMsg))
	require.NoError(t, err)

	_, resp, err = ws.ReadMessage()
	require.NoError(t, err)

	require.NoError(t, json.Unmarshal(resp, &responseSuccessObj))
	require.Equal(t, websocket.MessageTypeAuthSuccess, responseSuccessObj.Type)
	data = responseSuccessObj.Data
	require.Equal(t, true, data.Renewed)
	err = jwtUtils.ValidJWT(data.Token, userAgent, t.Context(), db)
	require.NoError(t, err)

	// CASE incorrect JWT

	currTime = time.Now().Unix()
	jwt, err = createJWTWithCustomExpiry(t.Context(), "test", currTime-300, db)
	fmt.Println(jwt)

	require.NoError(t, err)

	if jwt[1] == 'A' {
		jwt = jwt[:1] + "B" + jwt[2:]
	} else {
		jwt = jwt[:1] + "A" + jwt[2:]
	}

	authMsg = fmt.Sprintf(`{"type":"auth","data":{"Token": "%s","Username":"test", "SessionID":"123456-123456-123456"}}`, jwt)

	err = ws.WriteMessage(gorillaws.TextMessage, []byte(authMsg))
	require.NoError(t, err)

	_, resp, err = ws.ReadMessage()
	require.NoError(t, err)

	require.NoError(t, json.Unmarshal(resp, &responseObj))
	require.Equal(t, websocket.MessageTypeAuthFailed, responseObj.Type)
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

func createJWTWithCustomExpiry(ctx context.Context, username string, expireTime int64, db *gorm.DB) (jwtUtils.JWTToken, error) {
	var jwtToken jwtUtils.JWTToken

	type jwtHeader struct {
		Alg string `json:"alg"`
		Typ string `json:"typ"`
	}

	type jwtPayload struct {
		Username  string `json:"username"`
		UserID    uint32 `json:"userId"`
		Iat       int64  `json:"iat"`
		ExpiresAt int64  `json:"expiresAt"`
	}

	header := jwtHeader{
		Alg: "RS256",
		Typ: "JWT",
	}

	headerJSON, err := json.Marshal(header)
	if err != nil {
		return jwtToken, jwtUtils.ErrJWTHeaderMarshal
	}

	headerBase64 := base64.RawURLEncoding.EncodeToString(headerJSON)

	user, err := gorm.G[models.User](db).Where("username = ?", username).First(ctx)
	if err != nil {
		return jwtToken, jwtUtils.ErrUserNotFound
	}

	payload := jwtPayload{
		Username:  username,
		UserID:    user.UserID,
		Iat:       expireTime - 300,
		ExpiresAt: expireTime,
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return jwtToken, jwtUtils.ErrJWTPayloadMarshal
	}

	payloadBase64 := base64.RawURLEncoding.EncodeToString(payloadJSON)

	signatureBase64, err := createSignature(headerBase64, payloadBase64)
	if err != nil {
		return jwtToken, err
	}

	fullJWT := headerBase64 + "." + payloadBase64 + "." + signatureBase64
	jwtToken = fullJWT

	return jwtToken, nil
}

func createSignature(header string, payload string) (string, error) {

	var signingMethod = golangjwt.SigningMethodRSA{
		Name: "generateSignature",
		Hash: crypto.SHA256,
	}

	privateKeyPEM := []byte(strings.ReplaceAll(os.Getenv("RS256_PRIVATE_KEY"), `\n`, "\n"))
	privateKey, err := golangjwt.ParseRSAPrivateKeyFromPEM(privateKeyPEM)
	if err != nil {
		return "", jwtUtils.ErrInvalidPrivateKey
	}

	dataToSign := header + "." + payload

	signature, err := signingMethod.Sign(dataToSign, privateKey)
	if err != nil {
		return "", jwtUtils.ErrJWTSigning
	}

	signatureBase64 := base64.RawURLEncoding.EncodeToString(signature)

	return signatureBase64, nil
}
