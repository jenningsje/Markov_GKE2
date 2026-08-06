#!/bin/bash

set -e

echo "Finding gateway pod..."

GATEWAY_POD=$(kubectl get pods -l io.kompose.service=gateway -o name | head -1 | cut -d/ -f2)

if [ -z "$GATEWAY_POD" ]; then
    echo "ERROR: gateway pod not found"
    exit 1
fi

echo "Using gateway pod: $GATEWAY_POD"


echo "Finding Kubernetes DNS service..."

DNS_IP=$(kubectl get svc kube-dns -n kube-system -o jsonpath='{.spec.clusterIP}')

if [ -z "$DNS_IP" ]; then
    echo "ERROR: kube-dns service not found"
    exit 1
fi

echo "Kubernetes DNS: $DNS_IP"


echo "Backing up nginx config..."

kubectl exec "$GATEWAY_POD" -- \
    cp /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.backup


echo "Fixing nginx upstream ports..."

kubectl exec "$GATEWAY_POD" -- sh -c "
sed -i \
-e 's/flaskapp:80/flaskapp:8000/g' \
-e 's/resolver 127.0.0.11 valid=10s;/resolver $DNS_IP valid=10s;/g' \
/etc/nginx/conf.d/default.conf
"


echo "Testing nginx configuration..."

kubectl exec "$GATEWAY_POD" -- nginx -t


echo "Reloading nginx..."

kubectl exec "$GATEWAY_POD" -- nginx -s reload


echo
echo "Done."
echo
echo "Current nginx upstream references:"
kubectl exec "$GATEWAY_POD" -- grep -E "resolver|proxy_pass" /etc/nginx/conf.d/default.conf
