# If not root
if [ "$(id -u)" != "0" ]; then

    # Shift out and in of block character palettes
    alias break50="printf '\x0e'"
    alias fix50="printf '\x0f'"
fi

# Set maximum file size to 512MB
ulimit -f 524288

# Disable auto-logout
export TMOUT="0"

# c9 open
alias open="c9 open"

# Set locale
export LANG="C"

# Short-circuit RVM's cd script
# https://news.ycombinator.com/item?id=1637354
export rvm_project_rvmrc="0"
