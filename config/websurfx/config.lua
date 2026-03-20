-- Websurfx config for ZENO Browser

-- ### General ###
logging = true
debug = false
threads = 10
adaptive_window = 10

-- ### Server ###
port = "8080"
binding_ip = "0.0.0.0"
production_use = false
request_timeout = 30
tcp_connection_keep_alive = 30
pool_idle_connection_timeout = 30

rate_limiter = {
	number_of_requests = 20,
	time_limit = 3,
}

https_adaptive_window_size = true
operating_system_tls_certificates = true
number_of_https_connections = 10
client_connection_keep_alive = 120

-- ### Search ###
safe_search = 2

-- ### Website ###
colorscheme = "catppuccin-mocha"
theme = "simple"
animation = "simple-frosted-glow"

-- ### Caching ###
redis_url = "redis://zeno-searxng-redis:6379"
cache_expiry_time = 600

-- ### Search Engines ###
upstream_search_engines = {
	DuckDuckGo = true,
	Searx = false,
	Brave = true,
	Startpage = false,
	LibreX = false,
	Mojeek = false,
	Bing = false,
	Wikipedia = true,
	Yahoo = false,
}

proxy = nil
