#!/bin/bash

for POD in $(kubectl get pods -o name | grep '^pod/lightdock-' | sed 's#pod/##'); do

echo "============================================================"
echo "LIGHTDOCK POD: $POD"
echo "============================================================"

NODE=$(kubectl get pod "$POD" -o jsonpath='{.spec.nodeName}')

echo
echo "NODE:"
echo "$NODE"

echo
echo "NODE ARCHITECTURE:"
kubectl get node "$NODE" -o jsonpath='{.status.nodeInfo.architecture}{"\n"}'

echo
echo "NODE OS / KERNEL / RUNTIME:"
kubectl get node "$NODE" -o jsonpath='OS: {.status.nodeInfo.operatingSystem}{"\n"}OS Image: {.status.nodeInfo.osImage}{"\n"}Kernel: {.status.nodeInfo.kernelVersion}{"\n"}Container: {.status.nodeInfo.containerRuntimeVersion}{"\n"}Kubelet: {.status.nodeInfo.kubeletVersion}{"\n"}'

echo
echo "MACHINE TYPE:"
kubectl get node "$NODE" --show-labels | head -2

echo
echo "NODE CPU/MEMORY:"
kubectl get node "$NODE" -o jsonpath='Capacity: {.status.capacity}{"\n"}Allocatable: {.status.allocatable}{"\n"}'

echo
echo "POD:"
kubectl get pod "$POD" -o wide

echo
echo "CONTAINER:"
kubectl get pod "$POD" -o jsonpath='{range .spec.containers[*]}Name: {.name}{"\n"}Image: {.image}{"\n"}Command: {.command}{"\n"}Args: {.args}{"\n"}WorkingDir: {.workingDir}{"\n"}Resources: {.resources}{"\n\n"}{end}'

echo
echo "ACTUAL USAGE:"
kubectl top pod "$POD" --containers 2>/dev/null || true

echo
echo "CPU:"
kubectl exec "$POD" -- sh -c 'uname -a; echo; echo "Architecture:"; uname -m; echo; echo "CPU count:"; nproc; echo; echo "CPU model:"; grep "model name" /proc/cpuinfo | head -1; echo; echo "CPU flags:"; grep "^flags" /proc/cpuinfo | head -1' 2>/dev/null || true

echo
echo "MEMORY:"
kubectl exec "$POD" -- sh -c 'grep -E "MemTotal|MemAvailable|SwapTotal" /proc/meminfo' 2>/dev/null || true

echo
echo "PROCESSES:"
kubectl exec "$POD" -- ps auxww 2>/dev/null || true

echo
echo "PYTHON:"
kubectl exec "$POD" -- sh -c 'which python; python --version; python -c "import sys; print(sys.executable); import numpy; print(\"numpy\", numpy.__version__)"' 2>/dev/null || true

echo
echo "LIGHTDOCK EXECUTABLES:"
kubectl exec "$POD" -- sh -c '
echo "lgd_setup:"
which lgd_setup.py 2>/dev/null || true
if which lgd_setup.py >/dev/null 2>&1; then
    head -1 "$(which lgd_setup.py)"
fi

echo
echo "lgd_run:"
which lgd_run.py 2>/dev/null || true
if which lgd_run.py >/dev/null 2>&1; then
    head -1 "$(which lgd_run.py)"
fi

echo
echo "PATH:"
echo "$PATH"
' 2>/dev/null || true

echo
echo "GPU DEVICES:"
kubectl exec "$POD" -- sh -c 'ls -l /dev/nvidia* 2>/dev/null || echo "No NVIDIA devices"' 2>/dev/null || true

echo
echo "IMAGE ID:"
kubectl get pod "$POD" -o jsonpath='{range .status.containerStatuses[*]}{.name}{" => "}{.imageID}{"\n"}{end}'

echo
done
