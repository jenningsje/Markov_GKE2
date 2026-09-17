POD=markov-cb8567cb4-dmjkj
NODE=$(kubectl get pod "$POD" -o jsonpath='{.spec.nodeName}')

echo "============================================================"
echo "POD"
echo "============================================================"
kubectl get pod "$POD" -o wide

echo
echo "============================================================"
echo "POD ARCHITECTURE / NODE"
echo "============================================================"
echo "Node:        $NODE"
kubectl get node "$NODE" -o jsonpath='Architecture: {.status.nodeInfo.architecture}{"\n"}'
kubectl get node "$NODE" -o jsonpath='OS:           {.status.nodeInfo.operatingSystem}{"\n"}'
kubectl get node "$NODE" -o jsonpath='OS Image:     {.status.nodeInfo.osImage}{"\n"}'
kubectl get node "$NODE" -o jsonpath='Kernel:       {.status.nodeInfo.kernelVersion}{"\n"}'
kubectl get node "$NODE" -o jsonpath='Container:    {.status.nodeInfo.containerRuntimeVersion}{"\n"}'
kubectl get node "$NODE" -o jsonpath='Kubelet:      {.status.nodeInfo.kubeletVersion}{"\n"}'

echo
echo "============================================================"
echo "NODE MACHINE / GKE LABELS"
echo "============================================================"
kubectl get node "$NODE" \
  -o jsonpath='{range $k,$v := .metadata.labels}{$k}={$v}{"\n"}{end}' \
  | grep -E 'instance|machine|nodepool|cloud.google|kubernetes.io/arch|kubernetes.io/os|topology'

echo
echo "============================================================"
echo "NODE CAPACITY"
echo "============================================================"
kubectl get node "$NODE" \
  -o jsonpath='Capacity: {.status.capacity}{"\n"}Allocatable: {.status.allocatable}{"\n"}'

echo
echo "============================================================"
echo "NODE CURRENT USAGE"
echo "============================================================"
kubectl top node "$NODE"

echo
echo "============================================================"
echo "POD CONTAINER"
echo "============================================================"
kubectl get pod "$POD" \
  -o jsonpath='{range .spec.containers[*]}Name: {.name}{"\n"}Image: {.image}{"\n"}Command: {.command}{"\n"}Args: {.args}{"\n"}WorkingDir: {.workingDir}{"\n"}Resources: {.resources}{"\n"}{"\n"}{end}'

echo
echo "============================================================"
echo "POD ACTUAL USAGE"
echo "============================================================"
kubectl top pod "$POD" --containers

echo
echo "============================================================"
echo "RUNTIME CPU"
echo "============================================================"
kubectl exec "$POD" -- sh -c '
echo "uname:"
uname -a
echo
echo "architecture:"
uname -m
echo
echo "CPU count:"
nproc
echo
echo "CPU info:"
cat /proc/cpuinfo | grep -E "^(processor|model name|cpu family|model|flags)" | head -30
'

echo
echo "============================================================"
echo "MEMORY"
echo "============================================================"
kubectl exec "$POD" -- sh -c '
cat /proc/meminfo | head -15
'

echo
echo "============================================================"
echo "CONTAINER ENVIRONMENT"
echo "============================================================"
kubectl exec "$POD" -- env | sort

echo
echo "============================================================"
echo "MOUNTS"
echo "============================================================"
kubectl exec "$POD" -- mount

echo
echo "============================================================"
echo "PROCESSES"
echo "============================================================"
kubectl exec "$POD" -- ps auxww

echo
echo "============================================================"
echo "POD VOLUMES"
echo "============================================================"
kubectl get pod "$POD" \
  -o jsonpath='{.spec.volumes}' ; echo

echo
echo "============================================================"
echo "POD SCHEDULING"
echo "============================================================"
kubectl get pod "$POD" \
  -o jsonpath='nodeName={.spec.nodeName}{"\n"}hostNetwork={.spec.hostNetwork}{"\n"}hostPID={.spec.hostPID}{"\n"}hostIPC={.spec.hostIPC}{"\n"}serviceAccount={.spec.serviceAccountName}{"\n"}'

echo
echo "============================================================"
echo "IMAGE ID"
echo "============================================================"
kubectl get pod "$POD" \
  -o jsonpath='{range .status.containerStatuses[*]}{.name}{" => "}{.imageID}{"\n"}{end}'
