package main

import (
	"database/sql"
	"embed"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"context"

	_ "github.com/mattn/go-sqlite3"
	"github.com/pressly/goose/v3"
	"github.com/semanser/ai-coder/assets"
	"github.com/semanser/ai-coder/config"
	"github.com/semanser/ai-coder/database"
	"github.com/semanser/ai-coder/executor"
	"github.com/semanser/ai-coder/router"
	"github.com/golang-jwt/jwt/v5"
)

//go:embed templates/prompts/*.tmpl
var promptTemplates embed.FS

//go:embed templates/scripts/*.js
var scriptTemplates embed.FS

//go:embed migrations/*.sql
var embedMigrations embed.FS

// =========================
// JWT AUTH SETUP
// =========================

var jwtSecret = []byte("d3bbfd8f0662c7dc7b48786722ce7aaa8e658ed4628f767ee448a8fab8e3bf61a9fb8fad863fec7476d51fc7822933d0d356812a41f71371f55bfc628050d84f")

func authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		cookie, err := r.Cookie("token")
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		tokenStr := cookie.Value

		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		ctx := context.WithValue(r.Context(), "user", token.Claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// =========================

func main() {
	config.Init()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	db, err := sql.Open("sqlite3", config.Config.DatabaseURL)
	queries := database.New(db)

	goose.SetBaseFS(embedMigrations)

	if err := goose.SetDialect("sqlite3"); err != nil {
		log.Fatalf("Unable to set dialect: %v\n", err)
	}

	if err := goose.Up(db, "migrations"); err != nil {
		log.Fatalf("Unable to run migrations: %v\n", err)
	}

	log.Println("Migrations ran successfully")

	port := strconv.Itoa(config.Config.Port)

	assets.Init(promptTemplates, scriptTemplates)

	err = executor.InitClient()
	if err != nil {
		log.Fatalf("failed to initialize Docker client: %v", err)
	}

	err = executor.InitBrowser(queries)
	if err != nil {
		log.Fatalf("failed to initialize browser container: %v", err)
	}

	// =========================
	// ROUTER + AUTH WRAP
	// =========================

	r := router.New(queries)
	protectedRouter := authenticate(r)

	// =========================

	go func() {
		log.Printf("connect to http://localhost:%s/playground for GraphQL playground", port)
		if err := http.ListenAndServe(":"+port, protectedRouter); err != nil {
			log.Fatalf("HTTP server error: %v", err)
		}
	}()

	<-sigChan
	log.Println("Shutting down...")

	if err := executor.Cleanup(queries); err != nil {
		log.Printf("Error during cleanup: %v", err)
	}

	log.Println("Shutdown complete")
}