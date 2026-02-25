# CareLine 后端启动脚本
$env:DATABASE_URL = "postgresql://careline:careline_secret@localhost:5432/careline"
$env:JWT_SECRET = "dev-secret-key-for-local-testing"

.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000