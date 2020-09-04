.PHONY: build
build:
	DOCKER_BUILDKIT=1 docker build --no-cache --ssh default --tag cs50/ide .

