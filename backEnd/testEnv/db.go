package testenv

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/evanrmtl/miniDoc/internal/app/models"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var (
	DB        *gorm.DB
	container testcontainers.Container
)

func Setup() error {
	ctx := context.Background()

	req := testcontainers.ContainerRequest{
		Image:        "postgres:15",
		ExposedPorts: []string{"5432/tcp"},
		Env: map[string]string{
			"POSTGRES_DB":       "testdb",
			"POSTGRES_PASSWORD": "password",
			"POSTGRES_USER":     "postgres",
		},
		WaitingFor: wait.ForLog("database system is ready to accept connections").
			WithOccurrence(2).WithStartupTimeout(30 * time.Second),
	}

	var err error
	container, err = testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	if err != nil {
		return fmt.Errorf("failed to start container: %w", err)
	}

	host, err := container.Host(ctx)
	if err != nil {
		return fmt.Errorf("failed to get container host: %w", err)
	}

	port, err := container.MappedPort(ctx, "5432")
	if err != nil {
		return fmt.Errorf("failed to get container port: %w", err)
	}

	dsn := fmt.Sprintf("host=%s port=%s user=postgres password=password dbname=testdb sslmode=disable",
		host, port.Port())

	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	err = DB.AutoMigrate(
		&models.UserMigration{},
		&models.FileMigration{},
		&models.SessionMigration{},
		&models.UsersFileMigration{},
	)
	if err != nil {
		log.Fatalln("error when migrating models")
	}

	err = DB.Exec("ALTER TABLE users_files ADD CONSTRAINT fk_users_files_user_id FOREIGN KEY (user_id) REFERENCES users(user_id)").Error
	if err != nil {
		log.Printf("Warning: constraint fk_users_files_user_id already exist or error while creating it : %v", err)
	}

	err = DB.Exec("ALTER TABLE users_files ADD CONSTRAINT fk_users_files_file_id FOREIGN KEY (file_id) REFERENCES files(file_id)").Error
	if err != nil {
		log.Printf("Warning: constraint fk_users_files_file_id already exist or error while creating it : %v", err)
	}

	err = DB.Exec("ALTER TABLE sessions ADD CONSTRAINT fk_session_user_id FOREIGN KEY (user_id) REFERENCES users(user_id)").Error
	if err != nil {
		log.Printf("Warning: constraint fk_session_user_id already exist or error while creating it : %v", err)
	}

	return nil
}

func Teardown() {
	if container != nil {
		container.Terminate(context.Background())
	}
}

func CleanTables() {
	if DB != nil {
		DB.Exec("TRUNCATE users RESTART IDENTITY CASCADE")
		DB.Exec("TRUNCATE users_files RESTART IDENTITY CASCADE")
		DB.Exec("TRUNCATE files RESTART IDENTITY CASCADE")
		DB.Exec("TRUNCATE session RESTART IDENTITY CASCADE")
	}
}

func GetDSN() string {
	if container == nil {
		return ""
	}

	ctx := context.Background()
	host, _ := container.Host(ctx)
	port, _ := container.MappedPort(ctx, "5432")

	return fmt.Sprintf("host=%s port=%s user=postgres password=password dbname=testdb sslmode=disable",
		host, port.Port())
}

func InsertOneUser() {
	result := DB.Exec("INSERT INTO users (username, password_hash) VALUES (?, ?)", "test", "test123")
	if result.Error != nil {
		panic(fmt.Sprintf("Failed to create  user: %v", result.Error))
	}
}
