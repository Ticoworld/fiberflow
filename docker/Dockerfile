ARG FIBER_VERSION=0.9.0-rc3
FROM nervos/fiber:${FIBER_VERSION}

COPY config /usr/local/share/fiber/config
COPY docker/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8227 8228
VOLUME ["/fiber"]

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD []
