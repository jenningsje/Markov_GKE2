package api

import (
	"context"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

// ReadAPIs reads API URLs from a file.
func ReadAPIs(filePath string) ([]string, error) {
	if filePath == "" {
		filePath = "apis.txt"
	}
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}
	lines := strings.Split(string(data), "\n")
	var apis []string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" {
			apis = append(apis, line)
		}
	}
	return apis, nil
}

// FetchAllAPIs concurrently fetches all APIs and returns a map[url]body
func FetchAllAPIs(ctx context.Context, urls []string, maxWorkers int) map[string]string {
	client := &http.Client{
		Timeout: 15 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: maxWorkers,
			IdleConnTimeout:     90 * time.Second,
		},
	}

	results := make(map[string]string)
	var mu sync.Mutex
	var wg sync.WaitGroup
	jobs := make(chan string)

	// Worker pool
	for i := 0; i < maxWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for u := range jobs {
				req, err := http.NewRequestWithContext(ctx, "GET", u, nil)
				if err != nil {
					log.Printf("Request error: %v", err)
					continue
				}
				resp, err := client.Do(req)
				if err != nil {
					log.Printf("HTTP error: %v", err)
					continue
				}
				body, err := io.ReadAll(resp.Body)
				resp.Body.Close()
				if err != nil {
					log.Printf("Read error: %v", err)
					continue
				}
				mu.Lock()
				results[u] = string(body)
				mu.Unlock()
			}
		}()
	}

	// Send jobs
	go func() {
		for _, u := range urls {
			jobs <- u
		}
		close(jobs)
	}()

	wg.Wait()
	return results
}

// ConsolidatedData reads APIs from file and fetches all concurrently
func ConsolidatedData(filePath string) map[string]string {
	apis, err := ReadAPIs(filePath)
	if err != nil {
		log.Printf("Failed to read APIs: %v", err)
		return nil
	}
	if len(apis) == 0 {
		log.Println("No APIs found in file")
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	return FetchAllAPIs(ctx, apis, 20) // 20 concurrent workers
}
