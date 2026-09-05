package executor

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/docker/go-connections/nat"
	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/launcher"
	"github.com/go-rod/rod/lib/proto"
	"github.com/golang-jwt/jwt/v5"
	"github.com/semanser/ai-coder/assets"
	"github.com/semanser/ai-coder/database"
	"github.com/semanser/ai-coder/templates"
)

var (
	browser *rod.Browser
)

const port = "9222"

// ============================================================
// GET USER ID FROM THE SAME JWT COOKIE AS SERVER_ONE.JS
// ============================================================

func GetUserIDFromRequest(
	r *http.Request,
) (string, error) {
	if r == nil {
		return "",
			fmt.Errorf("request is nil")
	}

	cookie, err := r.Cookie("token")

	if err != nil {
		return "",
			fmt.Errorf(
				"token cookie not found: %w",
				err,
			)
	}

	tokenString := cookie.Value

	jwtSecret := os.Getenv("JWT_SECRET")

	if jwtSecret == "" {
		return "",
			fmt.Errorf(
				"JWT_SECRET environment variable is not set",
			)
	}

	token, err := jwt.Parse(
		tokenString,
		func(t *jwt.Token) (interface{}, error) {
			return []byte(jwtSecret), nil
		},
	)

	if err != nil {
		return "",
			fmt.Errorf(
				"JWT verification failed: %w",
				err,
			)
	}

	if !token.Valid {
		return "",
			fmt.Errorf(
				"JWT is invalid",
			)
	}

	claims, ok :=
		token.Claims.(jwt.MapClaims)

	if !ok {
		return "",
			fmt.Errorf(
				"invalid JWT claims",
			)
	}

	userIDClaim, ok :=
		claims["id"]

	if !ok {
		return "",
			fmt.Errorf(
				"user id missing from JWT",
			)
	}

	switch value := userIDClaim.(type) {

	case float64:
		return strconv.FormatInt(
			int64(value),
			10,
		), nil

	case string:
		if value == "" {
			return "",
				fmt.Errorf(
					"user id in JWT is empty",
				)
		}

		return value, nil

	case int:
		return strconv.Itoa(value), nil

	case int64:
		return strconv.FormatInt(
			value,
			10,
		), nil

	default:
		return "",
			fmt.Errorf(
				"unsupported user id type in JWT: %T",
				userIDClaim,
			)
	}
}

// ============================================================
// STARTUP INITIALIZATION
//
// This preserves the existing call:
//
//     executor.InitBrowser(queries)
//
// There is no HTTP request at process startup, so there is no
// browser cookie available here.
//
// The startup function therefore only initializes the Docker
// client/browser infrastructure if a user ID is available from
// the environment.
//
// User-specific JWT initialization is handled by
// InitBrowserForRequest() below.
// ============================================================

func InitBrowser(
	db *database.Queries,
) error {
	userID := os.Getenv("CODEL_USER_ID")

	if userID == "" {
		log.Println(
			"No CODEL_USER_ID available during startup; " +
				"waiting for authenticated user request",
		)

		return nil
	}

	return initBrowserForUser(
		userID,
		db,
	)
}

// ============================================================
// REQUEST-BASED INITIALIZATION
//
// This is the function that should be used when an authenticated
// HTTP request is available.
//
// It gets the JWT from the same "token" cookie used by
// server_one.js and extracts the JWT "id" claim.
// ============================================================

func InitBrowserForRequest(
	r *http.Request,
	db *database.Queries,
) error {
	userID, err :=
		GetUserIDFromRequest(r)

	if err != nil {
		return fmt.Errorf(
			"failed to get user ID from JWT: %w",
			err,
		)
	}

	log.Printf(
		"Authenticated user ID: %s",
		userID,
	)

	return initBrowserForUser(
		userID,
		db,
	)
}

// ============================================================
// USER-SPECIFIC BROWSER INITIALIZATION
// ============================================================

func initBrowserForUser(
	userID string,
	db *database.Queries,
) error {
	if userID == "" {
		return fmt.Errorf(
			"user ID is empty",
		)
	}

	browserContainerName :=
		BrowserName(userID)

	log.Printf(
		"User %s browser container: %s",
		userID,
		browserContainerName,
	)

	// Check whether this user's browser container
	// already exists.
	_, err :=
		dockerClient.ContainerInspect(
			context.Background(),
			browserContainerName,
		)

	if err == nil {
		log.Printf(
			"Browser container %s already exists",
			browserContainerName,
		)

		return nil
	}

	if !client.IsErrNotFound(err) {
		return fmt.Errorf(
			"error checking browser container %s: %w",
			browserContainerName,
			err,
		)
	}

	portBinding :=
		nat.Port(
			fmt.Sprintf(
				"%s/tcp",
				port,
			),
		)

	_, err =
		SpawnContainer(
			context.Background(),
			browserContainerName,
			&container.Config{
				Image:
					"ghcr.io/go-rod/rod",

				ExposedPorts:
					nat.PortSet{
						portBinding: struct{}{},
					},

				Cmd: []string{
					"chrome",
					"--headless",
					"--no-sandbox",
					fmt.Sprintf(
						"--remote-debugging-port=%s",
						port,
					),
					"--remote-debugging-address=0.0.0.0",
				},
			},
			&container.HostConfig{
				PortBindings:
					nat.PortMap{
						portBinding:
							[]nat.PortBinding{
								{
									HostIP:
										"0.0.0.0",

									HostPort:
										port,
								},
							},
					},
			},
			db,
		)

	if err != nil {
		return fmt.Errorf(
			"failed to spawn browser container %s: %w",
			browserContainerName,
			err,
		)
	}

	return nil
}

// ============================================================
// BROWSER NAME
// ============================================================

func BrowserName(
	userID string,
) string {
	if userID == "" {
		return "codel-browser"
	}

	return "browser-" + userID
}

// ============================================================
// CONTENT
// ============================================================

func Content(
	url string,
) (
	result string,
	screenshotName string,
	err error,
) {
	log.Println(
		"Trying to get content from",
		url,
	)

	page, err :=
		loadPage()

	if err != nil {
		return "",
			"",
			fmt.Errorf(
				"error loading page: %w",
				err,
			)
	}

	err =
		loadUrl(
			page,
			url,
		)

	if err != nil {
		return "",
			"",
			fmt.Errorf(
				"error loading url: %w",
				err,
			)
	}

	script, err :=
		templates.Render(
			assets.ScriptTemplates,
			"scripts/content.js",
			nil,
		)

	if err != nil {
		return "",
			"",
			fmt.Errorf(
				"error reading script: %w",
				err,
			)
	}

	pageText, err :=
		page.Eval(
			string(script),
		)

	if err != nil {
		return "",
			"",
			fmt.Errorf(
				"error evaluating script: %w",
				err,
			)
	}

	screenshot, err :=
		page.Screenshot(
			false,
			nil,
		)

	if err != nil {
		return "",
			"",
			fmt.Errorf(
				"error taking screenshot: %w",
				err,
			)
	}

	screenshotName, err =
		writeScreenshotToFile(
			screenshot,
		)

	if err != nil {
		return "",
			"",
			fmt.Errorf(
				"error writing screenshot to file: %w",
				err,
			)
	}

	return pageText.Value.Str(),
		screenshotName,
		nil
}

// ============================================================
// URLS
// ============================================================

func URLs(
	url string,
) (
	result string,
	screenshotName string,
	err error,
) {
	log.Println(
		"Trying to get urls from",
		url,
	)

	page, err :=
		loadPage()

	if err != nil {
		return "",
			"",
			fmt.Errorf(
				"error loading page: %w",
				err,
			)
	}

	err =
		loadUrl(
			page,
			url,
		)

	if err != nil {
		return "",
			"",
			fmt.Errorf(
				"error loading url: %w",
				err,
			)
	}

	script, err :=
		templates.Render(
			assets.ScriptTemplates,
			"scripts/urls.js",
			nil,
		)

	if err != nil {
		return "",
			"",
			fmt.Errorf(
				"error reading script: %w",
				err,
			)
	}

	urls, err :=
		page.Eval(
			string(script),
		)

	if err != nil {
		return "",
			"",
			fmt.Errorf(
				"error evaluating script: %w",
				err,
			)
	}

	screenshot, err :=
		page.Screenshot(
			true,
			nil,
		)

	if err != nil {
		return "",
			"",
			fmt.Errorf(
				"error taking screenshot: %w",
				err,
			)
	}

	screenshotName, err =
		writeScreenshotToFile(
			screenshot,
		)

	if err != nil {
		return "",
			"",
			fmt.Errorf(
				"error writing screenshot to file: %w",
				err,
			)
	}

	return urls.Value.Str(),
		screenshotName,
		nil
}

// ============================================================
// SCREENSHOT
// ============================================================

func writeScreenshotToFile(
	screenshot []byte,
) (
	filename string,
	err error,
) {
	filename =
		fmt.Sprintf(
			"%s.png",
			time.Now().Format(
				"2006-01-02-15-04-05",
			),
		)

	path :=
		"./tmp/browser/"

	filepath :=
		fmt.Sprintf(
			"./tmp/browser/%s",
			filename,
		)

	err =
		os.MkdirAll(
			path,
			os.ModePerm,
		)

	if err != nil {
		return "",
			fmt.Errorf(
				"error creating directory: %w",
				err,
			)
	}

	file, err :=
		os.Create(
			filepath,
		)

	if err != nil {
		return "",
			fmt.Errorf(
				"error creating file: %w",
				err,
			)
	}

	defer file.Close()

	_, err =
		file.Write(
			screenshot,
		)

	if err != nil {
		return "",
			fmt.Errorf(
				"error writing to file: %w",
				err,
			)
	}

	return filename, nil
}

// ============================================================
// LOAD PAGE
// ============================================================

func loadPage() (*rod.Page, error) {
	u, err :=
		launcher.ResolveURL("")

	if err != nil {
		return nil,
			fmt.Errorf(
				"error resolving url: %w",
				err,
			)
	}

	browser :=
		rod.New().ControlURL(u)

	err =
		browser.Connect()

	if err != nil {
		return nil,
			fmt.Errorf(
				"error connecting to browser: %w",
				err,
			)
	}

	version, err :=
		browser.Version()

	if err != nil {
		return nil,
			fmt.Errorf(
				"error getting browser version: %w",
				err,
			)
	}

	log.Printf(
		"Connected to browser %s",
		version.Product,
	)

	page, err :=
		browser.Page(
			proto.TargetCreateTarget{},
		)

	if err != nil {
		return nil,
			fmt.Errorf(
				"error opening page: %w",
				err,
			)
	}

	return page, nil
}

// ============================================================
// LOAD URL
// ============================================================

func loadUrl(
	page *rod.Page,
	url string,
) error {
	pageRouter :=
		page.HijackRequests()

	pageRouter.MustAdd(
		"*",
		func(ctx *rod.Hijack) {
			if ctx.Request.Type() ==
				proto.NetworkResourceTypeImage ||
				ctx.Request.Type() ==
					proto.NetworkResourceTypeStylesheet ||
				ctx.Request.Type() ==
					proto.NetworkResourceTypeFont ||
				ctx.Request.Type() ==
					proto.NetworkResourceTypeMedia ||
				ctx.Request.Type() ==
					proto.NetworkResourceTypeManifest ||
				ctx.Request.Type() ==
					proto.NetworkResourceTypeOther {

				ctx.Response.Fail(
					proto.NetworkErrorReasonBlockedByClient,
				)

				return
			}

			ctx.ContinueRequest(
				&proto.FetchContinueRequest{},
			)
		},
	)

	go pageRouter.Run()

	err := page.Navigate(url)

	if err != nil {
		return fmt.Errorf(
			"error navigating to page: %w",
			err,
		)
	}

	err =
		page.WaitDOMStable(
			time.Second*1,
			5,
		)

	if err != nil {
		return fmt.Errorf(
			"error waiting for page to stabilize: %w",
			err,
		)
	}

	return nil
}