# If not root
if [ "$(whoami)" != "root" ]; then

    # Shift out and in of block character palettes
    alias break50="printf '\x0e'"
    alias fix50="printf '\x0f'"
fi

# Aliases
alias ddb="c9 exec ddb"
alias open="c9 open"

# Assume online by default
if [ -z "$CS50_IDE_TYPE" ]; then
    export CS50_IDE_TYPE="online"
fi

# check50
export CHECK50_WORKERS=1

# For development
export APPLICATION_ENV="dev"

# Prevent Ctrl-S from freezing terminal in interactive mode
case $- in
    *i*) stty -ixon ;;
esac

# Set maximum file size to 512MB
ulimit -Sf 524288

# Wrappers
URL="(http://)[0-9]+\.[0-9]+\.[0-9]+\.[0-9]:(\x1b\[[0-9;]*m)?[0-9]+(\x1b\[[0-9;]*m)?(\S+)"
flask() {
    unbuffer /opt/cs50/bin/flask "$@" | sed -E "s#${URL}#\1TODO\4#"
}

http_server() {
    unbuffer /opt/cs50/bin/http-server "$@" | unbuffer -p sed -E "s#${URL}#\1TODO\4#" | uniq
}

alias http-server=http_server # https://unix.stackexchange.com/a/168222

# X Window System
export DISPLAY=":0"
