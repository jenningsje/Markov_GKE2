apk update && apk add --no-cache build-base ncurses-dev wget musl-dev gettext-dev

wget https://ftp.gnu.org/gnu/bash/bash-5.3.tar.gz
tar xf bash-5.3.tar.gz
cd bash-5.3

./configure --prefix=/usr/local \
            --disable-nls \
            --without-bash-malloc \
            LDFLAGS="-static" \
            CFLAGS="-static"

make -j4
make install