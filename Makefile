IMAGE ?= cs50/ide

.PHONY: build
build:
	DOCKER_BUILDKIT=1 docker build $(OPTS) --ssh default --tag $(IMAGE) .

.PHONY: build
dev:
	make build OPTS="$(OPTS) --build-arg SKIP_PACKAGE_COMPRESSION=1"
