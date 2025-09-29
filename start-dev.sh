# Start cloud compose
LOCAL_USER_ID=$(id -u) LOCAL_GROUP_ID=$(id -g) docker compose -f docker-compose-dev.yml up -d