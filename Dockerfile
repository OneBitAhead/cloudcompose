# LTS VERSION
FROM node:23.6.1-alpine
# Install stuff
RUN apk update & apk add --no-cache net-tools jq bash docker docker-compose openssl su-exec
###
RUN cat <<EOF > /root/.bashrc
alias ll='ls -alF'
alias ls='ls --color=auto'
EOF

RUN cat <<'EOF' > /usr/local/bin/cli
#!/bin/sh
cd /cc/manager/src
npm run cli --silent "$@"
EOF
RUN chmod +x /usr/local/bin/cli

##########################################
### admin-ui ###############################
# Copy the admin-ui sources in the container
COPY ./src/admin-ui /cc/admin-ui/src
# set workdir (for node modules of admin-ui)
WORKDIR /cc/admin-ui
# Copy package.json and package-lock.json (if present)
COPY ./src/admin-ui/package.json ./src/admin-ui/package-lock.json* ./
# Install app dependencies
RUN npm install


##########################################
### manager ##############################
# COPY integrations into container
COPY ./integrations /cc/integrations
# Copy the manager sources in the container
COPY ./src/cc-manager /cc/manager/src

# set workdir (for node modules -> one level below, so integrations can use the libraries too!
WORKDIR /cc
# Copy package.json and package-lock.json (if present)
COPY ./src/cc-manager/package.json ./src/cc-manager/package-lock.json* ./
# Install app dependencies
RUN npm install
# Use root by default; we will switch user in entrypoint
USER root

COPY ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["top"]
