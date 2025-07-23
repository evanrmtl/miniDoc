package main

import (
	"log"

	"github.com/evanrmtl/miniDoc/database/generate"
	"github.com/evanrmtl/miniDoc/routes"
)

func main() {

	db := generate.GenerateDB()
	_, err := db.DB()
	if err != nil {
		log.Panicf("error when connecting to the Database:", err)
	}
	engine := routes.CreateRoutes(db)
	engine.Run()
}
