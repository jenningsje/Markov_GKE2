curl -H "Authorization: token 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" \
-H "Accept: application/vnd.github.v3.raw" \
-O -L "https://github.com/jenningsje/MarkovDocker.git/info/lfs/objects/batch" \
-d '{"operation":"download","transfers":["basic"],"ref":{"name":"refs/heads/main"},"objects":[{"oid":"f345fb6b4875d96de4614d8807fe66b685d615b0998f485d0dee32cd75c56123","size":432502}]}'