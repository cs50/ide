FROM cs50/cli
ARG DEBIAN_FRONTEND=noninteractive

USER root

# Install apt packages
RUN apt-get update --quiet && \
    apt-get install --yes \
        libncurses-dev \
        libphp-phpmailer \
        libxslt1-dev \
        netcat-openbsd \
        net-tools \
        pgloader \
        postgresql \
        php-cgi \
        php-curl \
        php-sqlite3 `# phpliteadmin dependency` \
        pwgen `# phpliteadmin dependency` \
        php-xdebug \
        rsync \
        rsyslog \
        x11vnc \
        xvfb

# Disable kernel log, container doesn't have read permission
RUN sed --in-place 's/\(module(load="imklog" permitnonkernelfacility="on")\)/# \1/' /etc/rsyslog.conf

# Install noVNC
RUN git clone --depth=1 https://github.com/noVNC/noVNC.git /opt/noVNC && \
    chown -R ubuntu:ubuntu /opt/noVNC

# Install npm packages
RUN npm install --global c9 gdb-mi-parser

# Install Python packages
RUN pip3 install \
        git+git://github.com/cs50/ikp3db.git \
        nltk \
        plotly \
        pylint \
        pylint_django \
        pylint_flask \
        twython && \
    python3 -m nltk.downloader -d /usr/share/nltk_data/ punkt

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

RUN chown ubuntu:ubuntu /opt/c9/
USER ubuntu

WORKDIR /opt/c9/

# Install Cloud9
RUN git clone --depth=1 https://github.com/c9/core.git .
COPY --chown=ubuntu:ubuntu ./workspace-cs50.js configs/ide/
COPY --chown=ubuntu:ubuntu ./plugins plugins/
Run scripts/install-sdk.sh

# Change default workdir
WORKDIR /home/ubuntu/

CMD [ "/docker-entrypoint.sh" ]
