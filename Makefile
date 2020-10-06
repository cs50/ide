.PHONY: build
IMAGE ?= cs50/ide
build:
	DOCKER_BUILDKIT=1 docker build $(OPTS) --ssh default --tag $(IMAGE) .
