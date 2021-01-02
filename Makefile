TAG ?= cs50/ide

.PHONY: build
build:
	DOCKER_BUILDKIT=1 docker build $(OPTS) --ssh default --tag $(TAG) .

.PHONY: build
dev:
	TAG=cs50/ide:dev make build OPTS="$(OPTS) --build-arg SKIP_PACKAGE_COMPRESSION=1"
