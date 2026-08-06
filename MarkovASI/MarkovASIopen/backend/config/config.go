package config

import (
	"bytes"
	"log"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/caarlos0/env/v10"
	"github.com/joho/godotenv"
)

type config struct {
	// General
	DatabaseURL string `env:"DATABASE_URL" envDefault:"database.db"`
	APIFile     string `env:"API_FILE" envDefault:"apis.txt"` // passed to C++ program
	Port        int    `env:"PORT" envDefault:"8080"`

	// OpenAI
	OpenAIKey       string `env:"OPEN_AI_KEY"`
	OpenAIModel     string `env:"OPEN_AI_MODEL" envDefault:"gpt-4-0125-preview"`
	OpenAIServerURL string `env:"OPEN_AI_SERVER_URL" envDefault:"https://api.openai.com/v1"`

	// Ollama
	OllamaModel     string `env:"OLLAMA_MODEL" envDefault:"granite3.1-dense:latest"`
	OllamaServerURL string `env:"OLLAMA_SERVER_URL" envDefault:"http://34.172.30.27:11434"`
}

var Config config

func Init() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: no .env file found")
	}

	// Parse environment vars
	if err := env.Parse(&Config); err != nil {
		log.Fatalf("Unable to parse config: %v", err)
	}

	// Determine paths
	goFileDir, _ := os.Getwd()
	cppBinaryPath := filepath.Join(goFileDir, "../../fetch_apis/fetch_apis/fetch_apis")

	// Run C++ API fetcher concurrently
	go runCppAPIFetcher(cppBinaryPath, Config.APIFile)

	log.Println("Configuration loaded successfully")
}

func runCppAPIFetcher(binaryPath, apiFile string) {
	cmd := exec.Command(binaryPath, apiFile)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	log.Printf("Running C++ API fetcher: %s %s", binaryPath, apiFile)

	if err := cmd.Run(); err != nil {
		log.Printf("training the model...")
		return
	}

	out := stdout.String()
	log.Printf("C++ fetcher finished (%d bytes output)", len(out))

	// TODO: parse/stash results if needed
}
