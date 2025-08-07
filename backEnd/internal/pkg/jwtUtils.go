package pkg

import (
	"context"
	"crypto"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"

	"time"

	"github.com/evanrmtl/miniDoc/internal/app/models"
	golangjwt "github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

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

type JWTToken struct {
	Token string
}

var signingMethod = golangjwt.SigningMethodRSA{
	Name: "generateSignature",
	Hash: crypto.SHA256,
}

var ErrJWTExpired = errors.New("JWT has expired but session not expired")

func CreateJWT(ctx context.Context, username string, db *gorm.DB) (JWTToken, error) {
	var jwtToken JWTToken

	header := jwtHeader{
		Alg: "RS256",
		Typ: "JWT",
	}

	headerJSON, err := json.Marshal(header)
	if err != nil {
		return jwtToken, errors.New("failed to marshal JWT header to JSON")
	}

	headerBase64 := base64.RawURLEncoding.EncodeToString(headerJSON)

	user, err := gorm.G[models.User](db).Where("username = ?", username).First(ctx)
	if err != nil {
		return jwtToken, errors.New("user not found in database")
	}

	currentTime := time.Now()
	payload := jwtPayload{
		Username:  username,
		UserID:    user.UserID,
		Iat:       currentTime.Unix(),
		ExpiresAt: currentTime.Add(time.Hour * 24 * 15).Unix(),
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return jwtToken, errors.New("failed to marshal JWT payload to JSON")
	}

	payloadBase64 := base64.RawURLEncoding.EncodeToString(payloadJSON)

	signatureBase64, err := createSignature(headerBase64, payloadBase64)
	if err != nil {
		return jwtToken, err
	}

	fullJWT := headerBase64 + "." + payloadBase64 + "." + signatureBase64
	jwtToken.Token = fullJWT

	return jwtToken, nil
}

func createSignature(header string, payload string) (string, error) {
	privateKeyPEM := []byte(strings.ReplaceAll(os.Getenv("RS256_PRIVATE_KEY"), `\n`, "\n"))
	privateKey, err := golangjwt.ParseRSAPrivateKeyFromPEM(privateKeyPEM)
	if err != nil {
		return "", errors.New("failed to parse RSA private key from PEM")
	}

	dataToSign := header + "." + payload

	signature, err := signingMethod.Sign(dataToSign, privateKey)
	if err != nil {
		return "", errors.New("failed to sign JWT")
	}

	signatureBase64 := base64.RawURLEncoding.EncodeToString(signature)

	return signatureBase64, nil
}

func ValidJWT(token string, agent string, ctx context.Context, db *gorm.DB) error {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return errors.New("invalid JWT: incorrect number of segments")
	}
	fmt.Println("ici")
	dataToVerify := parts[0] + "." + parts[1]

	dataToFind, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return errors.New("failed to decode signature")
	}

	PEMPublicKey := []byte(strings.ReplaceAll(os.Getenv("RS256_PUBLIC_KEY"), `\n`, "\n"))
	publicKey, err := golangjwt.ParseRSAPublicKeyFromPEM(PEMPublicKey)
	if err != nil {
		return errors.New("failed to parse public key")
	}

	err = signingMethod.Verify(dataToVerify, dataToFind, publicKey)
	if err != nil {
		fmt.Println("dataToVerify : " + dataToVerify)
		fmt.Println()
		fmt.Println("dataToFind : " + string(dataToFind))
		fmt.Println("invalid JWT: incorrect token")
		return errors.New("invalid JWT: incorrect token")
	}
	decodedPayload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return errors.New("failed to decode payload")
	}
	var payload jwtPayload
	err = json.Unmarshal(decodedPayload, &payload)
	if err != nil {
		return errors.New("failed to unmarshall payload")
	}

	if time.Now().Unix() > payload.ExpiresAt {
		sessions, err := gorm.G[models.Session](db).
			Where("agent = ?", agent).
			Where("user_id = ?", payload.UserID).
			Where("expires_at > ?", time.Now().Unix()).
			Find(ctx)
		if err != nil {
			return errors.New("session lookup failed")
		}
		if len(sessions) > 0 {
			return ErrJWTExpired
		}
		return errors.New("token expired and no active session found")
	}
	return nil
}
