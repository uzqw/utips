# syntax=docker/dockerfile:1

FROM node:22-alpine3.21 AS frontend-builder
RUN apk add --no-cache yarn
WORKDIR /src/frontend
COPY frontend/package.json frontend/yarn.lock ./
RUN yarn config set registry https://registry.npmjs.org \
    && yarn install --frozen-lockfile --non-interactive --network-timeout 600000
COPY frontend/ ./
RUN yarn build

FROM golang:1.25-alpine AS backend-builder
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /src/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
ARG TARGETOS TARGETARCH
RUN if [ -n "$TARGETOS" ] && [ -n "$TARGETARCH" ]; then \
        CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -buildvcs=false -trimpath -ldflags="-s -w" -o /out/utips .; \
    else \
        CGO_ENABLED=0 go build -buildvcs=false -trimpath -ldflags="-s -w" -o /out/utips .; \
    fi
RUN mkdir -p /empty-tmp /empty-unotes-data && chmod 1777 /empty-tmp

FROM scratch
WORKDIR /app

ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
ENV TMPDIR=/app/unotes_data/tmp

COPY --from=backend-builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=backend-builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=backend-builder --chown=65532:65532 /empty-tmp/ /tmp/
COPY --from=backend-builder --chown=65532:65532 /empty-unotes-data/ /app/unotes_data/
COPY --from=frontend-builder /src/frontend/dist/ /app/pb_public/
COPY --from=backend-builder /out/utips /app/utips

USER 65532:65532
EXPOSE 17172
VOLUME ["/app/unotes_data"]

ENTRYPOINT ["/app/utips"]
CMD ["serve", "--http=0.0.0.0:17172", "--dir=/app/unotes_data"]
