package auth_test

import (
	"bytes"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	auth "github.com/evanrmtl/miniDoc/internal/app/Auth"
	"github.com/evanrmtl/miniDoc/internal/middleware/subroute"
	testenv "github.com/evanrmtl/miniDoc/testEnv"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestMain(m *testing.M) {

	setupTestRS256Key()

	err := testenv.Setup()
	if err != nil {
		panic(err)
	}

	code := m.Run()

	testenv.Teardown()

	os.Exit(code)
}

func setupTestRS256Key() {
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		panic(fmt.Sprintf("Failed to generate test RSA key: %v", err))
	}

	privateKeyPEM := &pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: x509.MarshalPKCS1PrivateKey(privateKey),
	}

	var buf bytes.Buffer
	pem.Encode(&buf, privateKeyPEM)

	os.Setenv("RS256_PRIVATE_KEY", buf.String())
}

func createTestRoute() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	rg := r.Group("/v1")
	subroute.CreateAuthRoutes(rg, testenv.DB)
	return r
}

func createTestContext(method string, path string, body string) (*gin.Context, *httptest.ResponseRecorder) {
	router := createTestRoute()
	writer := httptest.NewRecorder()

	ctx := gin.CreateTestContextOnly(writer, router)

	ctx.Request = httptest.NewRequest(method, path, strings.NewReader(body))
	ctx.Request.Header.Set("Content-Type", "application/json")

	return ctx, writer
}

func TestRegisterController(t *testing.T) {

	testenv.CleanTables()

	gin.SetMode(gin.TestMode)

	// CASE new user
	userRequest := `{"username": "test", "password": "test123"}`

	ctx, writer := createTestContext("POST", "/register", userRequest)

	auth.RegisterController(ctx, testenv.DB)
	require.Equal(t, http.StatusCreated, writer.Code)

	// CASE username already taken
	userRequest = `{"username": "test", "password": "differentPassword"}`

	ctx, writer = createTestContext("POST", "/register", userRequest)
	auth.RegisterController(ctx, testenv.DB)
	require.Equal(t, http.StatusConflict, writer.Code)

	// CASE bad JSON
	userRequest = `{"user": "test", "password": "differentPassword"}`
	ctx, writer = createTestContext("POST", "/register", userRequest)
	auth.RegisterController(ctx, testenv.DB)
	require.Equal(t, http.StatusBadRequest, writer.Code)

	// CASE db Closed
	db, err := testenv.DB.DB()
	require.NoError(t, err)

	// force close database
	err = db.Close()
	require.NoError(t, err)

	userRequest = `{"username": "test", "password": "test123"}`

	ctx, writer = createTestContext("POST", "/register", userRequest)
	auth.RegisterController(ctx, testenv.DB)
	require.Equal(t, http.StatusInternalServerError, writer.Code)

	// restart database
	newDB, err := gorm.Open(postgres.Open(testenv.GetDSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	testenv.DB = newDB

	// CASE username > 20
	username := strings.Repeat("a", 21)
	userRequest = fmt.Sprintf(`{"username": "%s", "password": "differentPassword"}`, username)
	ctx, writer = createTestContext("POST", "/register", userRequest)
	auth.RegisterController(ctx, testenv.DB)
	require.Equal(t, http.StatusBadRequest, writer.Code)

	// CASE password < 6
	password := strings.Repeat("a", 5)
	userRequest = fmt.Sprintf(`{"username": "anyway", "password": "%s"}`, password)
	ctx, writer = createTestContext("POST", "/register", userRequest)
	auth.RegisterController(ctx, testenv.DB)
	require.Equal(t, http.StatusBadRequest, writer.Code)
}

func TestLoginController(t *testing.T) {
	testenv.CleanTables()

	db := testenv.DB
	username := "test"
	password := "123test"

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	require.NoError(t, err)

	db.Exec("INSERT INTO users (username, password_hash) VALUES (?, ?);", username, hashedPassword)

	gin.SetMode(gin.TestMode)

	// CASE same username, same password
	userRequest := `{"username": "test", "password": "123test"}`

	ctx, writer := createTestContext("POST", "/login", userRequest)

	auth.LoginController(ctx, testenv.DB)
	require.Equal(t, http.StatusAccepted, writer.Code)

	// CASE same username, different password
	userRequest = `{"username": "test", "password": "differentPassword"}`

	ctx, writer = createTestContext("POST", "/login", userRequest)
	auth.LoginController(ctx, testenv.DB)
	require.Equal(t, http.StatusUnauthorized, writer.Code)

	// CASE different username
	userRequest = `{"username": "notTheSame", "password": "123test"}`
	ctx, writer = createTestContext("POST", "/login", userRequest)
	auth.LoginController(ctx, testenv.DB)
	require.Equal(t, http.StatusUnauthorized, writer.Code)

	// CASE bad JSON
	userRequest = `{"user": "test", "password": "123test"}`
	ctx, writer = createTestContext("POST", "/login", userRequest)
	auth.LoginController(ctx, testenv.DB)
	require.Equal(t, http.StatusBadRequest, writer.Code)

	// CASE db Closed
	sqlDB, err := testenv.DB.DB()
	require.NoError(t, err)

	// force close database
	err = sqlDB.Close()
	require.NoError(t, err)

	userRequest = `{"username": "test", "password": "123"}`

	ctx, writer = createTestContext("POST", "/login", userRequest)
	auth.LoginController(ctx, testenv.DB)
	require.Equal(t, http.StatusInternalServerError, writer.Code)

	// restart database
	newDB, err := gorm.Open(postgres.Open(testenv.GetDSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	testenv.DB = newDB
}
