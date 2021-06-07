TAG ?= cs50/ide

.PHONY: build
build:
	DOCKER_BUILDKIT=1 docker build $(OPTS) --ssh default --tag $(TAG) .

.PHONY: dev
dev:
	TAG=cs50/ide:dev make build OPTS="$(OPTS) --build-arg SKIP_PACKAGE_COMPRESSION=1"

.PHONY: start
start:
	docker run -e C9_HOSTNAME=0.0.0.0 -e CS50_IDE_TYPE=offline -i --name ide -p1337:1337 -p8080-8082:8080-8082 --rm --security-opt seccomp=unconfined -t --workdir /opt/c9 cs50/ide:dev

.PHONY: startdev
startdev:
	docker run -e C9_HOSTNAME=0.0.0.0 -e CS50_IDE_TYPE=offline -i --name ide -p1337:1337 -p8080-8082:8080-8082 --rm --security-opt seccomp=unconfined -t --workdir /opt/c9 cs50/ide:dev --dev
