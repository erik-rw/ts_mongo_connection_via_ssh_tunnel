# TypeScript: MongoDB connection via SSH tunnel

## How to

Export a bunch of environment variables

```bash
JUMP_HOST_IP=ip
JUMP_HOST_PORT=22
JUMP_HOST_USER=user
JUMP_HOST_PRIVATE_KEY_PATH=/path/to/key

MONGODB_HOST=host
MONGODB_USER=user                      
MONGODB_PASSWORD=password
MONGODB_TLS_CA_FILE=/path/to/rds-combined-ca-bundle.pem
```

Install dependencies

```bash
npm install
```

Execute script

```bash
npm start
```