APP_NAME := utips
BACKEND_DIR := backend
FRONTEND_DIR := frontend
DOCKER_REPOSITORY ?= uzqw/utips
DOCKER_LOCAL_IMAGE ?= $(APP_NAME):local
DOCKER_REMOTE_LOCAL_IMAGE := $(DOCKER_REPOSITORY):local
DOCKER_TAG ?= latest
DOCKER_IMAGE := $(DOCKER_REPOSITORY):$(DOCKER_TAG)
DOCKER_LATEST_IMAGE := $(DOCKER_REPOSITORY):latest
DOCKER_PORT := 17172
UNOTES_DATA_DIR := unotes_data
DOCKER_BUILD_FLAGS ?= --no-cache
HOST_UID := $(shell id -u)
HOST_GID := $(shell id -g)
HOST_TZ := $(shell if [ -n "$$TZ" ]; then echo "$$TZ"; elif [ -r /etc/timezone ]; then sed -n "1p" /etc/timezone; elif command -v timedatectl >/dev/null 2>&1; then timedatectl show -p Timezone --value 2>/dev/null; else date +%Z; fi)
COMPOSE_ENV := HOST_UID=$(HOST_UID) HOST_GID=$(HOST_GID) HOST_TZ=$(HOST_TZ) DOCKER_IMAGE=$(DOCKER_LATEST_IMAGE) DOCKER_HOST_PORT=$(DOCKER_PORT)
DOCKER_COMPOSE ?= $(shell if docker compose version >/dev/null 2>&1; then echo "docker compose"; elif command -v docker-compose >/dev/null 2>&1; then echo "docker-compose"; else echo "docker compose"; fi)

.PHONY: help backend-build backend-dev frontend-dev frontend-build docker-build docker-run docker-push docker-deploy docker-down

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  backend-build   Build the PocketBase backend"
	@echo "  backend-dev     Run the backend on 0.0.0.0:17171"
	@echo "  frontend-dev    Run the Vue frontend dev server"
	@echo "  frontend-build  Build the Vue frontend"
	@echo "  docker-build    Build the local Docker image ($(DOCKER_LOCAL_IMAGE)); default no cache"
	@echo "  docker-run      Run the local Docker image on 0.0.0.0:$(DOCKER_PORT)"
	@echo "  docker-push     Tag $(DOCKER_LOCAL_IMAGE) as remote local, TAG, latest, then push them, example: make docker-push TAG=v0.1.9"
	@echo "  docker-deploy   Pull and run $(DOCKER_LATEST_IMAGE) on 0.0.0.0:$(DOCKER_PORT) with restart policy"
	@echo "  docker-down     Stop Docker Compose services"
	@echo ""
	@echo "Docker Compose command: $(DOCKER_COMPOSE)"
	@echo "Host timezone fallback: $(HOST_TZ)"

backend-build:
	cd $(BACKEND_DIR) && go build -buildvcs=false -ldflags="-s -w" -o ../$(APP_NAME) .

backend-dev:
	cd $(BACKEND_DIR) && set -a && [ ! -f ../.env ] || . ../.env && set +a && go run . serve --http=0.0.0.0:17171 --dir=../unotes_data

frontend-dev:
	cd $(FRONTEND_DIR) && npm install && npm run dev

frontend-build:
	cd $(FRONTEND_DIR) && npm install && npm run build

docker-build:
	docker build $(DOCKER_BUILD_FLAGS) -t $(DOCKER_LOCAL_IMAGE) .

docker-run:
	mkdir -p $(UNOTES_DATA_DIR)/tmp && docker run --rm --user "$$(id -u):$$(id -g)" -e TZ=$(HOST_TZ) -e TMPDIR=/app/unotes_data/tmp -p $(DOCKER_PORT):17172 -v ./$(UNOTES_DATA_DIR):/app/unotes_data $(DOCKER_LOCAL_IMAGE) serve --http=0.0.0.0:17172 --dir=/app/unotes_data

docker-push:
	@[ -n "$(TAG)" ] || (echo "Usage: make docker-push TAG=v1.0.0" && exit 1)
	docker tag $(DOCKER_LOCAL_IMAGE) $(DOCKER_REMOTE_LOCAL_IMAGE)
	docker tag $(DOCKER_LOCAL_IMAGE) $(DOCKER_REPOSITORY):$(TAG)
	docker tag $(DOCKER_LOCAL_IMAGE) $(DOCKER_LATEST_IMAGE)
	docker push $(DOCKER_REPOSITORY):$(TAG)
	docker push $(DOCKER_LATEST_IMAGE)

docker-deploy:
	mkdir -p $(UNOTES_DATA_DIR)/tmp
	chmod u+rwX $(UNOTES_DATA_DIR) $(UNOTES_DATA_DIR)/tmp
	$(COMPOSE_ENV) $(DOCKER_COMPOSE) pull
	$(COMPOSE_ENV) $(DOCKER_COMPOSE) up -d --force-recreate

docker-down:
	HOST_UID=$(HOST_UID) HOST_GID=$(HOST_GID) HOST_TZ=$(HOST_TZ) $(DOCKER_COMPOSE) down
