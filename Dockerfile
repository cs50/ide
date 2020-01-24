FROM cs50/cli
ARG DEBIAN_FRONTEND=noninteractive

# Image metadata
LABEL description="CS50 IDE (Online) image."

# Expose port 22 for Cloud9 SSH environment connection
EXPOSE 22

USER root

# Install apt packages
RUN apt-get update --quiet && \
    apt-get install --yes \
        libncurses-dev \
        libphp-phpmailer \
        libxslt1-dev \
        netcat-openbsd \
        net-tools \
        openssh-server \
        pgloader \
        postgresql \
        php-cgi \
        php-curl \
        php-sqlite3 `# phpliteadmin dependency` \
        pwgen `# phpliteadmin dependency` \
        php-xdebug \
        rsync \
        x11vnc \
        xvfb && \
    mkdir /var/run/sshd `# required by openssh-server`

# Install noVNC
RUN git clone --depth=1 https://github.com/noVNC/noVNC.git /opt/noVNC && \
    chown -R ubuntu:ubuntu /opt/noVNC

# Download and install Cloud9 SSH installer
RUN mkdir /opt/c9 && \
    curl --silent --location https://raw.githubusercontent.com/c9/install/master/install.sh | \
        sed 's#^\(C9_DIR=\).*#\1/opt/c9#' | bash && \
    chown --recursive ubuntu:ubuntu /opt/c9

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

# Configure ssh
RUN echo "AuthorizedKeysFile .ssh/authorized_keys /cs50/ssh/authorized_keys" | tee -a /etc/ssh/sshd_config && \
    sed --in-place "s/#\(PasswordAuthentication\) yes/\1 no/" /etc/ssh/sshd_config

USER ubuntu

# Change default workdir
WORKDIR /home/ubuntu

LABEL version="3"

CMD [ "/docker-entrypoint.sh" ]
