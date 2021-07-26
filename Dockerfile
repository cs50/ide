# syntax=docker/dockerfile:experimental
FROM cs50/cli
ARG DEBIAN_FRONTEND=noninteractive

EXPOSE 1337 8080-8082

USER root

# Install apt packages
RUN apt-get update --quiet && \
    apt-get install --yes \
        coreutils `# for fold` \
        libncurses-dev \
        libphp-phpmailer \
        libxslt1-dev \
        netcat-openbsd \
        net-tools \
        openbox \
        obconf \
        pgloader \
        postgresql \
        php-cgi \
        php-curl \
        php-sqlite3 `# phpliteadmin dependency` \
        pwgen `# phpliteadmin dependency` \
        php-xdebug \
        python \
        rsync \
        rsyslog \
        x11vnc \
        xvfb

# Teacher requirements
RUN apt-get install --yes \
        doxygen \
        cmocka-doc \
        libcurl4-gnutls-dev \
        libcmocka0 \
        libcmocka-dev \
        odbcinst \
        odbc-mariadb \
        unixodbc \
        unixodbc-dev


# Disable kernel log, container doesn't have read permission
RUN sed --in-place 's/\(module(load="imklog" permitnonkernelfacility="on")\)/# \1/' /etc/rsyslog.conf

# Install noVNC
RUN wget https://github.com/novnc/noVNC/archive/refs/tags/v1.2.0.zip -P/tmp && \
    unzip /tmp/v1.2.0.zip -d /tmp && \
    mv /tmp/noVNC-1.2.0 /opt/noVNC && \
    chown -R ubuntu:ubuntu /opt/noVNC

# Install node 12.x
RUN n 12

# Install npm packages
RUN npm install --global c9 gdb-mi-parser

# Install Python packages
RUN pip3 install \
        git+git://github.com/cs50/ikp3db.git \
        plotly \
        pylint \
        pylint_django \
        pylint_flask \
        twython

# Add courses group
RUN groupadd --system courses

# Add cs50 user
RUN adduser --gecos "CS50,,,," --ingroup courses --disabled-login --system cs50

RUN echo | tee /etc/motd

COPY files/ /
RUN chmod 755 /opt/cs50/bin/*

# Staff solutions
RUN chown --recursive cs50.courses /home/cs50 && \
    chmod --recursive 755 /home/cs50 && \
    find /home/cs50 -type f -name "*.*" -exec chmod 644 {} +;


# Clone Cloud9
RUN mkdir -m600 /root/.ssh && ssh-keyscan github.com >> ~/.ssh/known_hosts
RUN --mount=type=ssh git clone --depth=1 git@github.com:cs50/cloud9.git /opt/c9

RUN chown --recursive ubuntu:ubuntu /opt/c9

USER ubuntu

# Install, build, and obfuscate Cloud9
WORKDIR /opt/c9
RUN ./install-script.sh
RUN npm install && npm run build:packages && rm -rf .git

ARG GITHUB_SHA
ARG SKIP_PACKAGE_COMPRESSION
RUN cd packages/cs50 && \
    mv ../ide/cdn/* cdn && \
    cp bootstrap.cs50.js cdn/bootstrap.js && \
    cp cdn/ide.html cdn/ide-cdn.html && \
    sed -i "s#\./#https://mirror.cs50.net/ide/$GITHUB_SHA/#g" cdn/ide-cdn.html && \
    if [ -z "$SKIP_PACKAGE_COMPRESSION" ]; then echo "compressing packages..."; node -e "require('@c9/architect-build/compress_folder')('/opt/c9', {exclude: /^(cdn|node_modules|mock)$/})"; else echo "skipping package compression..."; fi

# Change default workdir
WORKDIR /home/ubuntu

ENTRYPOINT [ "/docker-entrypoint.sh" ]
