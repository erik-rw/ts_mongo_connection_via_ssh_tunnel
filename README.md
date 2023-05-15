# TypeScript: MongoDB connection via SSH tunnel

## How to

Export a bunch of environment variables

```bash
JUMP_HOST_IP=ip
JUMP_HOST_PORT=22
JUMP_HOST_PRIVATE_KEY_PATH=/path/to/key
JUMP_HOST_USER=user
# -1 all
MONGODB_COLLECTION_LIMIT=100
MONGODB_COLLECTION_NAME=name
MONGODB_DATABASE_NAME=name
MONGODB_HOST=host
MONGODB_PASSWORD=password
MONGODB_PORT=27017
MONGODB_TLS_CA_FILE=/path/to/key
MONGODB_USER=user                          
```

Install dependencies

```bash
npm install
```

Execute script

```bash
npm start
```