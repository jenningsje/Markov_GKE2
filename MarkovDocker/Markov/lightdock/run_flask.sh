cd /opt/app/MarkovProprietary/pipelinestages/app/mount

gunicorn -w 4 -b 0.0.0.0:80 receive_signal:app --timeout 7000
