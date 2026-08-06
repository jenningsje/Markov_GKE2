curl -L -o ~/seccomp/seccomp.json https://github.com/moby/profiles/raw/main/seccomp/default.json

ls -lh ~/seccomp/seccomp.json

python3 -m json.tool ~/seccomp/seccomp.json
