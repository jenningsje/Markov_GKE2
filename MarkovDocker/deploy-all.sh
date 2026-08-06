#!/bin/bash

set -e

echo "=============================="
echo "Deploying Kubernetes Resources"
echo "=============================="

echo "Creating StorageClasses..."
kubectl apply -f storageclass-filestore-rwx.yaml || true
kubectl apply -f filestore-storageclass.yaml || true

echo "Creating PersistentVolumeClaims..."
kubectl apply -f pgdata-persistentvolumeclaim.yaml
kubectl apply -f markov-app-persistentvolumeclaim.yaml
kubectl apply -f ssh-data-persistentvolumeclaim.yaml
kubectl apply -f tor-keys-persistentvolumeclaim.yaml

echo "Creating ConfigMaps..."
kubectl apply -f simulator-cm0-configmap.yaml
kubectl apply -f healthapp-cm0-configmap.yaml
kubectl apply -f healthapp-cm1-configmap.yaml
kubectl apply -f MarkovASI-MarkovASIopen--env-configmap.yaml
kubectl apply -f markovasi-env-configmap.yaml

echo "Deploying Database..."
kubectl apply -f db-deployment.yaml
kubectl apply -f db-service.yaml

echo "Deploying Authentication..."
kubectl apply -f login-deployment.yaml
kubectl apply -f login-service.yaml

kubectl apply -f backend-deployment.yaml
kubectl apply -f backend-service.yaml

kubectl apply -f gateway-deployment.yaml
kubectl apply -f gateway-service.yaml

kubectl apply -f apps-deployment.yaml
kubectl apply -f apps-service.yaml

kubectl apply -f viewer-deployment.yaml
kubectl apply -f viewer-service.yaml

kubectl apply -f simulator-deployment.yaml
kubectl apply -f simulator-service.yaml

kubectl apply -f nodeapp-deployment.yaml
kubectl apply -f nodeapp-service.yaml

kubectl apply -f flaskapp-deployment.yaml
kubectl apply -f flaskapp-service.yaml

kubectl apply -f downloadapp-deployment.yaml
kubectl apply -f downloadapp-service.yaml

kubectl apply -f healthapp-deployment.yaml
kubectl apply -f healthapp-service.yaml

kubectl apply -f codel-deployment.yaml
kubectl apply -f codel-service.yaml

kubectl apply -f ssh-server-deployment.yaml
kubectl apply -f ssh-server-service.yaml

echo
echo "=============================="
echo "Deployment Complete"
echo "=============================="

echo
echo "Pods:"
kubectl get pods

echo
echo "Services:"
kubectl get services

echo
echo "PVCs:"
kubectl get pvc

echo
echo "Deployments:"
kubectl get deployments
