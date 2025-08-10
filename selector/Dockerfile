FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
# Use faster mirror and robust network options to avoid SSL/timeout issues in CI/limited networks
RUN pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple \
    --timeout 120 --retries 5 -r requirements.txt
COPY app ./app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
