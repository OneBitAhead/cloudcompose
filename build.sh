# Build image: version number is fetched from package.json of admin-ui!
VERSION=$(grep '"version":' ./src/cc-manager/package.json | head -1 | awk -F: '{print $2}' | sed 's/[", ]//g')
echo "Build: '$VERSION' and 'latest'"

docker build -t cloudcompose/base:$VERSION -t cloudcompose/base:latest .

# docker push cloudcompose/base:$VERSION
# docker push cloudcompose/base:latest