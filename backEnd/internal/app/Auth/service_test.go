package auth_test

import (
	"errors"
	"testing"

	auth "github.com/evanrmtl/miniDoc/internal/app/Auth"
	"github.com/evanrmtl/miniDoc/internal/app/models"
	testenv "github.com/evanrmtl/miniDoc/testEnv"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func TestRegister(t *testing.T) {

	testenv.CleanTables()

	// initialize required default values

	ctx := t.Context()
	db := testenv.DB

	// START TEST CASES

	// CASE new username
	username := "test"
	password := "123"

	err := auth.Register(ctx, username, password, db)
	require.NoError(t, err)

	user1, err := gorm.G[models.User](db).Where("username = ?", username).First(ctx)
	require.NoError(t, err)
	require.NotEmpty(t, user1.PasswordHash)

	err = bcrypt.CompareHashAndPassword([]byte(user1.PasswordHash), []byte(password))
	require.NoError(t, err)

	// CASE new username, same password
	username = "test2"
	password = "123"

	err = auth.Register(ctx, username, password, db)
	require.NoError(t, err)

	user2, err := gorm.G[models.User](db).Where("username = ?", username).First(ctx)
	require.NoError(t, err)
	require.NotEmpty(t, user2.PasswordHash)

	// CASE same username, different password
	username = "test"
	password = "456"

	err = auth.Register(ctx, username, password, db)
	require.Error(t, err)
	assert.True(t, errors.Is(err, auth.ErrUserExists))

	result, err := gorm.G[models.User](db).Where("username = ?", username).Find(ctx)
	assert.NoError(t, err)
	assert.Equal(t, 1, len(result))

	// Case same username, same password
	username = "test"
	password = "123"

	err = auth.Register(ctx, username, password, db)
	require.Error(t, err)
	assert.True(t, errors.Is(err, auth.ErrUserExists), "CASE4")
}

func TestLogin(t *testing.T) {
	testenv.CleanTables()
	db := testenv.DB

	username := "test"
	password := "123test"

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	require.NoError(t, err)

	db.Exec("INSERT INTO users (username, password_hash) VALUES (?, ?);", username, hashedPassword)

	ctx := t.Context()

	// CASE same username, same password
	err = auth.Login(ctx, username, password, db)
	require.NoError(t, err)

	// CASE same username, different password
	username = "test"
	password = "differentPassword"

	err = auth.Login(ctx, username, password, db)
	require.Error(t, err)
	assert.True(t, errors.Is(err, auth.ErrIncorrectPassword))

	// CASE different username, same password
	username = "differentUsername"
	password = "123test"

	err = auth.Login(ctx, username, password, db)
	require.Error(t, err)
	assert.True(t, errors.Is(err, auth.ErrUserNotExists))

	//CASE different username, different password
	username = "differentUsername"
	password = "differentPassword"

	err = auth.Login(ctx, username, password, db)
	require.Error(t, err)
	assert.True(t, errors.Is(err, auth.ErrUserNotExists))
}
