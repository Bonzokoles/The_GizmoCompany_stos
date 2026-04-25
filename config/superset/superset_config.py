# Superset Configuration for ZENO Browser
# Dark theme, PUMO Finance Analytics integration

import os
from typing import Optional

# ─────────────────────────────────────────────────────────────
# SECURITY
# ─────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv('SUPERSET_SECRET_KEY', 'zeno-superset-secret-key-2026-finance-analytics-secure-32bytes!!')

# ─────────────────────────────────────────────────────────────
# DATABASE
# ─────────────────────────────────────────────────────────────
SQLALCHEMY_DATABASE_URI = os.getenv(
    'DATABASE_URL',
    'postgresql+psycopg2://superset:superset@superset-db:5432/superset'
)

# ─────────────────────────────────────────────────────────────
# CACHE (Redis/Valkey)
# ─────────────────────────────────────────────────────────────
CACHE_CONFIG = {
    'CACHE_TYPE': 'RedisCache',
    'CACHE_DEFAULT_TIMEOUT': 300,
    'CACHE_KEY_PREFIX': 'superset_',
    'CACHE_REDIS_HOST': os.getenv('REDIS_HOST', 'superset-redis'),
    'CACHE_REDIS_PORT': int(os.getenv('REDIS_PORT', 6379)),
    'CACHE_REDIS_DB': 1,
}

DATA_CACHE_CONFIG = {
    'CACHE_TYPE': 'RedisCache',
    'CACHE_DEFAULT_TIMEOUT': 86400,  # 24h for query results
    'CACHE_KEY_PREFIX': 'superset_results_',
    'CACHE_REDIS_HOST': os.getenv('REDIS_HOST', 'superset-redis'),
    'CACHE_REDIS_PORT': int(os.getenv('REDIS_PORT', 6379)),
    'CACHE_REDIS_DB': 2,
}

# ─────────────────────────────────────────────────────────────
# UI / DARK THEME
# ─────────────────────────────────────────────────────────────
# Force dark theme by default
APP_NAME = "ZENO Finance Analytics"
APP_ICON = "/static/assets/images/superset-logo-horiz.png"
FAVICONS = [{"href": "/static/assets/images/favicon.png"}]

# Dark theme as default
THEME_OVERRIDES = {
    "colors": {
        "primary": {
            "base": "#00D9FF",  # ZENO cyan
            "dark1": "#00B8D9",
            "dark2": "#0097B2",
            "light1": "#33E0FF",
            "light2": "#66E7FF",
        },
        "success": {
            "base": "#5AC467",
        },
        "warning": {
            "base": "#FFC107",
        },
        "error": {
            "base": "#FF5252",
        },
        "grayscale": {
            "base": "#1E1E1E",  # Dark background
            "dark1": "#141414",
            "dark2": "#0A0A0A",
            "light1": "#2D2D2D",
            "light2": "#3D3D3D",
            "light3": "#4D4D4D",
            "light4": "#666666",
            "light5": "#999999",
        },
    },
    "borderRadius": 4,
    "gridUnit": 4,
}

# ─────────────────────────────────────────────────────────────
# FEATURES
# ─────────────────────────────────────────────────────────────
FEATURE_FLAGS = {
    # Dashboard improvements
    "DASHBOARD_NATIVE_FILTERS": True,
    "DASHBOARD_CROSS_FILTERS": True,
    "DASHBOARD_RBAC": True,
    "DASHBOARD_FILTERS_EXPERIMENTAL": True,
    
    # Embedded mode (for ZENO UI integration)
    "EMBEDDED_SUPERSET": True,
    "ENABLE_TEMPLATE_PROCESSING": True,
    
    "ENABLE_EXPLORE_JSON_CSRF_PROTECTION": False,
    
    # Modern features
    "ENABLE_TEMPLATE_REMOVE_FILTERS": True,
    "ALERT_REPORTS": True,
}

# ─────────────────────────────────────────────────────────────
# WEBSERVER
# ─────────────────────────────────────────────────────────────
WEBSERVER_TIMEOUT = 300
SUPERSET_WEBSERVER_PORT = 8088

# ─────────────────────────────────────────────────────────────
# CSRF — disabled for API access (JIMBO_kit, local-only)
# ─────────────────────────────────────────────────────────────
WTF_CSRF_ENABLED = False
WTF_CSRF_CHECK_DEFAULT = False

# ─────────────────────────────────────────────────────────────
# SQLITE — allow local DB connections (MEBLEPUMO local analytics)
# ─────────────────────────────────────────────────────────────
PREVENT_UNSAFE_DB_CONNECTIONS = False

# ─────────────────────────────────────────────────────────────
# CORS (allow ZENO Browser UI to embed dashboards)
# ─────────────────────────────────────────────────────────────
ENABLE_CORS = True
CORS_OPTIONS = {
    'supports_credentials': True,
    'allow_headers': ['*'],
    'resources': ['*'],
    'origins': [
        'http://localhost:3000',  # ZENO Browser prod
        'http://localhost:5173',  # ZENO Browser dev
        'http://localhost:4111',  # JIMBO tool server
    ]
}

# ─────────────────────────────────────────────────────────────
# LANGUAGE
# ─────────────────────────────────────────────────────────────
LANGUAGES = {
    'en': {'flag': 'us', 'name': 'English'},
    'pl': {'flag': 'pl', 'name': 'Polski'},
}

# ─────────────────────────────────────────────────────────────
# ROW LIMITS
# ─────────────────────────────────────────────────────────────
ROW_LIMIT = 50000
SAMPLES_ROW_LIMIT = 1000
VIZ_ROW_LIMIT = 10000

# ─────────────────────────────────────────────────────────────
# CUSTOM SQL LAB SETTINGS
# ─────────────────────────────────────────────────────────────
SQLLAB_TIMEOUT = 300
SUPERSET_WEBSERVER_TIMEOUT = 300

# ─────────────────────────────────────────────────────────────
# GUEST TOKEN (for embedding in ZENO UI)
# ─────────────────────────────────────────────────────────────
GUEST_ROLE_NAME = "Public"
GUEST_TOKEN_JWT_SECRET = os.getenv('SUPERSET_SECRET_KEY', SECRET_KEY)
GUEST_TOKEN_JWT_ALGO = "HS256"
GUEST_TOKEN_HEADER_NAME = "X-GuestToken"
GUEST_TOKEN_JWT_EXP_SECONDS = 300  # 5 min

# ─────────────────────────────────────────────────────────────
# CUSTOM CSS (additional dark mode tweaks)
# ─────────────────────────────────────────────────────────────
CUSTOM_CSS = """
/* ZENO Dark Theme Overrides */
body {
    background-color: #0A0A0A;
    color: #E0E0E0;
}

.ant-layout {
    background: #0A0A0A;
}

.chart-container {
    background-color: #1E1E1E;
    border: 1px solid #2D2D2D;
    border-radius: 4px;
}

.Select-control {
    background-color: #1E1E1E !important;
    border-color: #3D3D3D !important;
}

.ant-card {
    background: #1E1E1E;
    border: 1px solid #2D2D2D;
}

/* Highlight ZENO cyan accent */
.ant-btn-primary {
    background-color: #00D9FF;
    border-color: #00D9FF;
    color: #0A0A0A;
}

.ant-btn-primary:hover {
    background-color: #33E0FF;
    border-color: #33E0FF;
}
"""

# ─────────────────────────────────────────────────────────────
# MAPBOX (optional - for geographic visualizations)
# ─────────────────────────────────────────────────────────────
MAPBOX_API_KEY = os.getenv('MAPBOX_API_KEY', '')

# ─────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────
LOG_LEVEL = "INFO"
LOG_FORMAT = "[%(asctime)s] [%(levelname)s] %(message)s"
LOG_FOLDER = "/app/superset_home/logs"
