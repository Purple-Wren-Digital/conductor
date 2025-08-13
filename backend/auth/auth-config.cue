ClientID: "ITcRb65alm6QmbEsuZjcgSwM0nIb5CML"
Domain: "dev-dq7x3qvzastuk3p2.us.auth0.com"

// An application running locally
if #Meta.Environment.Type == "development" && #Meta.Environment.Cloud == "local" {
	CallbackURL: "http://localhost:3000/callback"
	LogoutURL: "http://localhost:3000/"
}