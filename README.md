## Development

(Requires Docker 18.09 or higher)

```
git clone https://github.com/cs50/ide-docker.git
cd ide-docker
make dev
docker run -e C9_HOSTNAME=0.0.0.0 -e CS50_IDE_TYPE=offline -e STANDALONE_MODE=dev -i --name ide -p1337:1337 -p8080-8082:8080-8082 --rm --security-opt seccomp=unconfined -t --workdir /opt/c9 cs50/ide:dev
# Then visit http://localhost:1337/static/ide.html
```
