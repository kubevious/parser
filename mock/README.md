# Extracting Config

```sh
kubectl get all --all-namespaces -o yaml > data-all.yaml
kubectl get configmaps --all-namespaces -o yaml > data-config-maps.yaml
kubectl get ingresses --all-namespaces -o yaml > data-ingresses.yaml
kubectl get serviceaccounts --all-namespaces -o yaml > data-service-accounts.yaml
kubectl get clusterroles -o yaml > data-cluster-roles.yaml
kubectl get clusterrolebindings -o yaml > data-cluster-role-bindings.yaml
kubectl get roles --all-namespaces -o yaml > data-roles.yaml
kubectl get rolebindings --all-namespaces -o yaml > data-role-bindings.yaml
kubectl get pvc --all-namespaces -o yaml > data-role-pvc.yaml
kubectl get pv --all-namespaces -o yaml > data-role-pv.yaml
kubectl get nodes -o yaml > data-node.yaml
kubectl get PodSecurityPolicy -o yaml > data-pod-security-policy.yaml
```