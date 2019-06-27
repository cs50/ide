# If not root
if [ "$(id -u)" != "0" ]; then

    # Set umask
    umask 0077

    # Configure clang
    export CC="clang"
    export CFLAGS="-fsanitize=signed-integer-overflow -fsanitize=undefined -ggdb3 -O0 -std=c11 -Wall -Werror -Wextra -Wno-sign-compare -Wno-unused-parameter -Wno-unused-variable -Wshadow"
    export LDLIBS="-lcrypt -lcs50 -lm"

    # Protect user
    alias cp="cp -i"
    alias ls="ls --color=auto"
    alias mv="mv -i"
    alias rm="rm -i"

    # Suppress gdb's startup output
    alias gdb="gdb -q"

    # Shift out and in of block character palettes
    alias break50="printf '\x0e'"
    alias fix50="printf '\x0f'"
fi

# Set maximum file size to 512MB (soft) and 1GB (hard) for migration
ulimit -f 1048576
ulimit -Sf 524288

# Disable auto-logout
export TMOUT="0"

# Java
export CLASSPATH=".:/usr/share/java/cs50.jar"

# c9 open
alias open="c9 open"

# python3
alias pip="pip3"
alias pylint="pylint3"
alias python="python3"
export PYTHONDONTWRITEBYTECODE="1"

# update50
alias update50="echo 'You are up-to-date!'"

# sqlite3
alias sqlite3="sqlite3 -column -header"

# sudo
# Trailing space enables elevated command to be an alias
alias sudo="sudo "

# flask
export FLASK_APP="application.py"
export FLASK_DEBUG="0"
export FLASK_ENV="development"

# valgrind defaults
export VALGRIND_OPTS="--memcheck:leak-check=full --memcheck:track-origins=yes"

# Set editor
export EDITOR="nano"

# Set locale
export LANG="C"

# Node.js
export NODE_ENV="dev"

# Web application environment
export APPLICATION_ENV="dev"

# Short-circuit RVM's cd script
# https://news.ycombinator.com/item?id=1637354
export rvm_project_rvmrc="0"

# History
# https://www.shellhacks.com/tune-command-line-history-bash/
export PROMPT_COMMAND='history -a'  # Store Bash History Immediately

# Ensure no make targets end with .c
make () {
    local args=""
    local invalid_args=0

    for arg; do
        case "$arg" in
            (*.c) arg=${arg%.c}; invalid_args=1;;
        esac
        args="$args $arg"
    done

    if [ $invalid_args -eq 1 ]; then
        echo "Did you mean 'make$args'?"
        return 1
    else
        command make -B $*
    fi
}
