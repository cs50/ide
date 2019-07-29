# If not root
if [ "$(id -u)" != "0" ]; then

    # Shift out and in of block character palettes
    alias break50="printf '\x0e'"
    alias fix50="printf '\x0f'"
fi

# Set maximum file size to 512MB
ulimit -Sf 524288

# c9 open
alias open="c9 open"

if [ -z "$CS50_IDE_TYPE" ]; then
    export CS50_IDE_TYPE="online"
fi

# Editor
export EDITOR="nano"

# Localization
export LANG="C.UTF-8"
export LC_ALL="C.UTF-8"
export LC_CTYPE="C.UTF-8"

# Java
export CLASSPATH=".:/usr/share/java/cs50.jar"
export JAVA_HOME="/opt/jdk-12.0.1"

# Node
export NODE_ENV="dev"

# Flask
export FLASK_APP="application.py"
export FLASK_DEBUG="0"
export FLASK_ENV="development"

export APPLICATION_ENV="dev"

# Python
export PATH="$HOME"/.local/bin:"$PATH"
export PYTHONDONTWRITEBYTECODE="1"

# Ruby
export GEM_HOME="$HOME"/.gem
export PATH="$GEM_HOME"/bin:"$PATH"
