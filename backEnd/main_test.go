package main

import (
	"os"
	"testing"

	testenv "github.com/evanrmtl/miniDoc/testEnv"
)

func TestMain(m *testing.M) {
	err := testenv.Setup()
	if err != nil {
		panic(err)
	}

	code := m.Run()

	testenv.Teardown()

	os.Exit(code)
}
