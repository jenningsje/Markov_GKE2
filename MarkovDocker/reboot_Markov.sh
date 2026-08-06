# install seccomp
cd
curl -L https://raw.githubusercontent.com/moby/moby/master/profiles/seccomp/default.json -o seccomp.json
mkdir -p ~/seccomp
mv seccomp.json ~/seccomp/seccomp.json

# build docker image
docker system prune --all --volumes
docker builder prune

docker-compose build --no-cache
docker-compose up

