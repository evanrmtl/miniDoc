package jwtUtils

import (
	"context"
	"crypto"
	"encoding/base64"
	"encoding/json"
	"errors"
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

type JWTToken = string

var signingMethod = golangjwt.SigningMethodRSA{
	Name: "generateSignature",
	Hash: crypto.SHA256,
}

var (
	ErrJWTHeaderMarshal    = errors.New("failed to marshal JWT header to JSON")
	ErrJWTPayloadMarshal   = errors.New("failed to marshal JWT payload to JSON")
	ErrUserNotFound        = errors.New("user not found in database")
	ErrInvalidPrivateKey   = errors.New("failed to parse RSA private key from PEM")
	ErrJWTSigning          = errors.New("failed to sign JWT")
	ErrInvalidJWTFormat    = errors.New("invalid JWT: incorrect number of segments")
	ErrSignatureDecode     = errors.New("failed to decode signature")
	ErrInvalidPublicKey    = errors.New("failed to parse public key")
	ErrInvalidJWTSignature = errors.New("invalid JWT: incorrect token")
	ErrPayloadDecode       = errors.New("failed to decode payload")
	ErrPayloadUnmarshal    = errors.New("failed to unmarshall payload")
	ErrTokenExpired        = errors.New("token expired and no active session found")
	ErrSessionLookup       = errors.New("session lookup failed")
	ErrJWTExpired          = errors.New("JWT has expired but session not expired")
)

func CreateJWT(ctx context.Context, username string, db *gorm.DB) (JWTToken, error) {
	var jwtToken JWTToken

	header := jwtHeader{
		Alg: "RS256",
		Typ: "JWT",
	}

	headerJSON, err := json.Marshal(header)
	if err != nil {
		return jwtToken, ErrJWTHeaderMarshal
	}

	headerBase64 := base64.RawURLEncoding.EncodeToString(headerJSON)

	user, err := gorm.G[models.User](db).Where("username = ?", username).First(ctx)
	if err != nil {
		return jwtToken, ErrUserNotFound
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
		return jwtToken, ErrJWTPayloadMarshal
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
	privateKeyPEM := []byte(strings.ReplaceAll(os.Getenv("RS256_PRIVATE_KEY"), `\n`, "\n"))
	privateKey, err := golangjwt.ParseRSAPrivateKeyFromPEM(privateKeyPEM)
	if err != nil {
		return "", ErrInvalidPrivateKey
	}

	dataToSign := header + "." + payload

	signature, err := signingMethod.Sign(dataToSign, privateKey)
	if err != nil {
		return "", ErrJWTSigning
	}

	signatureBase64 := base64.RawURLEncoding.EncodeToString(signature)

	return signatureBase64, nil
}

func ValidJWT(token string, agent string, ctx context.Context, db *gorm.DB) error {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return ErrInvalidJWTFormat
	}
	dataToVerify := parts[0] + "." + parts[1]

	dataToFind, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return ErrSignatureDecode
	}

	PEMPublicKey := []byte(strings.ReplaceAll(os.Getenv("RS256_PUBLIC_KEY"), `\n`, "\n"))
	publicKey, err := golangjwt.ParseRSAPublicKeyFromPEM(PEMPublicKey)
	if err != nil {
		return ErrInvalidPublicKey
	}

	err = signingMethod.Verify(dataToVerify, dataToFind, publicKey)
	if err != nil {
		return ErrInvalidJWTSignature
	}
	decodedPayload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return ErrPayloadDecode
	}
	var payload jwtPayload
	err = json.Unmarshal(decodedPayload, &payload)
	if err != nil {
		return ErrJWTPayloadMarshal
	}

	if time.Now().Unix() > payload.ExpiresAt {
		session, err := gorm.G[models.Session](db).
			Where("agent = ?", agent).
			Where("user_id = ?", payload.UserID).
			Where("expires_at > ?", time.Now().Unix()).
			Find(ctx)
		if err != nil {
			return ErrSessionLookup
		}
		if len(session) == 0 {
			return ErrTokenExpired
		}
		return ErrJWTExpired
	}
	return nil
}
