FROM nginx:alpine

COPY build/viewer/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]