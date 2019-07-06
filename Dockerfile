FROM cs50/cli

# Image metadata
LABEL description="CS50 IDE (Online) image."

ARG DEBIAN_FRONTEND=noninteractive

# Expose port 22 for Cloud9 SSH environment connection
EXPOSE 22

# Install apt packages
RUN sudo apt-get update --quiet && \
    sudo apt-get install --yes \
        libphp-phpmailer \
        libxslt1-dev \
        netcat-openbsd \
        openssh-server \
        pgloader \
        postgresql \
        php-cgi \
        php-curl \
        php-sqlite3 `# phpliteadmin dependency` \
        pwgen `# phpliteadmin dependency` \
        php-xdebug \
        rsync && \
    sudo mkdir /var/run/sshd `# required by openssh-server`

# Install ngrok client
RUN wget --directory-prefix /tmp https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip && \
    sudo unzip -d /usr/local/bin /tmp/ngrok-stable-linux-amd64.zip && \
    sudo chmod a+x /usr/local/bin/ngrok

# Download and install Cloud9 SSH installer
RUN sudo mkdir /opt/c9 && \
    sudo chown --recursive ubuntu:ubuntu /opt/c9 && \
    curl --silent --location https://raw.githubusercontent.com/c9/install/master/install.sh | \
        sed 's#^\(C9_DIR=\).*#\1/opt/c9#' | bash

# Install c9 CLI
RUN sudo npm install --global c9

# Install Python packages
RUN sudo --set-home pip3 install \
        git+git://github.com/cs50/ikp3db.git \
        nltk \
        plotly \
        pylint \
        pylint_django \
        pylint_flask \
        s3cmd \
        twython && \
    sudo python3 -m nltk.downloader -d /usr/share/nltk_data/ punkt

# Add courses group
RUN sudo groupadd --system courses

# Add cs50 user
RUN sudo adduser --gecos "CS50,,,," --ingroup courses --disabled-login --system cs50

RUN echo | sudo tee /etc/motd

COPY files/ /
RUN sudo chmod 755 /opt/cs50/bin/*

# Staff solutions
RUN sudo chown --recursive cs50.courses /home/cs50 && \
    sudo chmod --recursive 755 /home/cs50 && \
    sudo find /home/cs50 -type f -name "*.*" -exec chmod 644 {} +;

# Configure ssh
RUN echo "AuthorizedKeysFile .ssh/authorized_keys /etc/cs50/ssh/authorized_keys" | sudo tee -a /etc/ssh/sshd_config && \
    sudo sed --in-place "s/#\(PasswordAuthentication\) yes/\1 no/" /etc/ssh/sshd_config

# Change default workdir
WORKDIR /home/ubuntu

CMD [ "/opt/cs50/bin/docker-cmd" ]
