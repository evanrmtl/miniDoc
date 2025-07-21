package generate

import (
	"github.com/glebarez/sqlite"
	"gorm.io/gen"
	"gorm.io/gorm"
)

func GenerateDB() {
	db, err := gorm.Open(sqlite.Open("../miniDoc.db"), &gorm.Config{})
	if err != nil {
		panic("Database does not exist")
	}

	g := gen.NewGenerator(gen.Config{
		OutPath:      "models",
		ModelPkgPath: "models",
	})
	g.UseDB(db)
	g.GenerateModel("users")
	g.GenerateModel("session")
	g.GenerateModel("files")
	g.GenerateModel("users_files")
	g.Execute()
}
