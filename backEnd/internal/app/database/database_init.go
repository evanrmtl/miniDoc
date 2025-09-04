package database

import (
	"fmt"
	"log"
	"os"

	"github.com/evanrmtl/miniDoc/internal/app/models"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func GenerateDB() *gorm.DB {

	err := godotenv.Load()
	if err != nil {
		panic(".env file not founded or error loading it")
	}

	host := os.Getenv("DB_HOST")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")
	port := os.Getenv("DB_PORT")
	sslmode := os.Getenv("DB_SSLMODE")

	dsnPostgres := fmt.Sprintf("host=%s user=%s password=%s port=%s sslmode=%s", host, user, password, port, sslmode)

	dbPostgres, err := gorm.Open(postgres.Open(dsnPostgres), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		log.Printf("couldn't open the database : %v", err)
	}

	var count int64
	err = dbPostgres.Raw("SELECT 1 FROM pg_database WHERE datname = ?", dbname).Count(&count).Error
	if err != nil {
		log.Printf("Error while lookup the database: %v", err)
	}

	if count == 0 {
		log.Printf("Creating database '%s'...", dbname)
		err = dbPostgres.Exec(fmt.Sprintf("CREATE DATABASE %s", dbname)).Error
		if err != nil {
			log.Fatalf("Error while creating the database: %v", err)
		}
		log.Printf("Database '%s' created with success", dbname)
	}

	sqlDB, _ := dbPostgres.DB()
	sqlDB.Close()

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("couldn't open the database %s: %v", dbname, err)
	}

	sqlDB, _ = dbPostgres.DB()
	sqlDB.Close()

	err = db.AutoMigrate(
		&models.UserMigration{},
		&models.FileMigration{},
		&models.SessionMigration{},
		&models.UsersFileMigration{},
		&models.FilesContentsMigration{},
	)
	if err != nil {
		log.Fatalln("error when migrating models")
	}

	err = db.Exec("ALTER TABLE users_files ADD CONSTRAINT fk_users_files_user_id FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE").Error
	if err != nil {
		log.Printf("Warning: constraint fk_users_files_user_id already exist or error while creating it : %v", err)
	}

	err = db.Exec("ALTER TABLE users_files ADD CONSTRAINT fk_users_files_file_uuid FOREIGN KEY (file_uuid) REFERENCES files(file_uuid) ON DELETE CASCADE").Error
	if err != nil {
		log.Printf("Warning: constraint fk_users_files_file_uuid already exist or error while creating it : %v", err)
	}

	err = db.Exec("ALTER TABLE sessions ADD CONSTRAINT fk_session_user_id FOREIGN KEY (user_id) REFERENCES users(user_id)").Error
	if err != nil {
		log.Printf("Warning: constraint fk_session_user_id already exist or error while creating it : %v", err)
	}

	err = db.Exec("ALTER TABLE files_contents ADD CONSTRAINT fk_files_contents_files_uuid FOREIGN KEY (file_uuid) REFERENCES files(file_uuid) ON DELETE CASCADE").Error
	if err != nil {
		log.Printf("Warning: constraint fk_files_contents_files_uuid already exist or error while creating it : %v", err)
	}

	fmt.Println("Migration successful")

	return db
}
