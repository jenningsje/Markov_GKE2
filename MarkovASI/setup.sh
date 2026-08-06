cp ./api/fetch_apis ./MarkovASIopen/backend/config/fetch_apis
cd MarkovASIopen
docker build --no-cache -t codel .
rm ./backend/config/fetch_apis
