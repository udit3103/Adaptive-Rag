# Quick Reference

## Windows PowerShell

Create a virtual environment, install the dependencies, and copy the environment template:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Set `OPENAI_API_KEY` in `.env`. `TAVILY_API_KEY` is only needed for web search.

Start each process from the project root:

```powershell
.\.venv\Scripts\python.exe -m uvicorn src.main:app --reload
.\.venv\Scripts\python.exe -m streamlit run streamlit_app/home.py
```

- Streamlit: <http://localhost:8501>
- API docs: <http://127.0.0.1:8000/docs>

The full guide, including macOS/Linux instructions, is in [README.md](README.md).
