package generate

import (
	"fmt"
	"log"
	"os"

	"github.com/evanrmtl/miniDoc/internal/app/models"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
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

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s", host, user, password, dbname, port, sslmode)
	fmt.Println(dsn)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		panic(fmt.Sprintf("couldn't open the database : %v", err))
	}

	err = db.AutoMigrate(
		&models.UserMigration{},
		&models.FileMigration{},
		&models.SessionMigration{},
		&models.UsersFileMigration{},
	)
	if err != nil {
		log.Fatalln("error when migrating models")
	}

	err = db.Exec("ALTER TABLE users_files ADD CONSTRAINT fk_users_files_user_id FOREIGN KEY (user_id) REFERENCES users(user_id)").Error
	if err != nil {
		log.Printf("Warning: constraint fk_users_files_user_id already exist or error while creating it : %v", err)
	}

	err = db.Exec("ALTER TABLE users_files ADD CONSTRAINT fk_users_files_file_id FOREIGN KEY (file_id) REFERENCES files(file_id)").Error
	if err != nil {
		log.Printf("Warning: constraint fk_users_files_file_id already exist or error while creating it : %v", err)
	}

	err = db.Exec("ALTER TABLE session ADD CONSTRAINT fk_session_user_id FOREIGN KEY (user_id) REFERENCES users(user_id)").Error
	if err != nil {
		log.Printf("Warning: constraint fk_session_user_id already exist or error while creating it : %v", err)
	}

	fmt.Println("Migration successful")

	return db
}
