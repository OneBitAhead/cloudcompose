#!/bin/sh
set -e

# Allowed commands
COMMAND=$1

## Start the cloudcompose web app  
start_admin_ui(){  
  echo "Start cloud compose web app"
  
  USER_ID=${LOCAL_USER_ID:-1000}
  GROUP_ID=${LOCAL_GROUP_ID:-1000}

  
  #EXISTING_GROUP_NAME=$(getent group "$GROUP_ID" | cut -d: -f1)
  # EXISTING_USER_NAME=$(getent passwd "$USER_ID" | cut -d: -f1)
  # if [ "$(id -u)" = "0" ]; then
  # Handle group
  #if [ -z "$EXISTING_GROUP_NAME" ]; then
  #  addgroup -g $GROUP_ID nodejs
  #  GROUP_NAME="nodejs"
  #else
  #  GROUP_NAME="$EXISTING_GROUP_NAME"
  #fi

  # Handle user
  #if [ -z "$EXISTING_USER_NAME" ]; then
  #  adduser -u $USER_ID -G "$GROUP_NAME" -D nodejs
  #  USER_NAME="nodejs"
  #else
  #  USER_NAME="$EXISTING_USER_NAME"
  #fi
  #fi
  #echo "Using user: $USER_NAME, group: $GROUP_NAME"


  # Only create group/user if running as root (UID 0)
  if [ "$(id -u)" = "0" ]; then
    if ! getent group nodejs >/dev/null 2>&1; then
      addgroup -g $GROUP_ID nodejs
    fi
    if ! id -u nodejs >/dev/null 2>&1; then
     adduser -u $USER_ID -G nodejs -D nodejs
    fi
  fi

  # Switch to the created user and exec the command
  cd /cc/admin-ui/src
  if [ "$1" = "dev" ]; then
    exec su-exec nodejs npm run dev --silent
  else
    exec su-exec nodejs npm run start --silent
  fi
}

## Start the cloudcompose manager (docker, etc.)
start_manager(){
  # Run your initialization steps (migrations, installs, env setup)
  # (if needed)
  cd /cc/manager/src
  # check for init?
  npm run init --silent

  if [ "$1" = "dev" ]; then
    npm run dev --silent
  else
    npm run start --silent
  fi 
}

## Start the cli (of manager)
start_cli(){  
  cd /cc/manager/src
  echo "Running CLI with args: $@"
  npm run cli --silent -- "$@"
  exit $?
}

###########################
### What to start #########
###########################
if [ "$COMMAND" = "admin-ui" ]; then
  shift  # remove command argument
  start_admin_ui "$@"
elif [ "$COMMAND" = "manager" ]; then
  shift  # remove command argument
  start_manager "$@"
elif [ "$COMMAND" = "cli" ]; then
  shift  # remove command argument
  start_cli "$@"
else 
  # Otherwise, run the default CMD (e.g., node app.js)
  echo "Starting anything else - command $@"
  exec "$@"
fi

