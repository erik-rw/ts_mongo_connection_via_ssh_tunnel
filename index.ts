const { MongoClient } = require("mongodb");
import { SSHConnection } from 'node-ssh-forward'
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const jumpHostIp = process.env.JUMP_HOST_IP;
if (!jumpHostIp) throw new Error("JUMP_HOST_IP not set");

const jumpHostPort = process.env.JUMP_HOST_PORT;
if (!jumpHostPort) throw new Error("JUMP_HOST_PORT not set");

const jumpHostUser = process.env.JUMP_HOST_USER;
if (!jumpHostUser) throw new Error("JUMP_HOST_USER not set");

const jumpHostPrivateKeyPath = process.env.JUMP_HOST_PRIVATE_KEY_PATH;
if (!jumpHostPrivateKeyPath) throw new Error("JUMP_HOST_PRIVATE_KEY_PATH not set");

const mongoDbHost = process.env.MONGODB_HOST;
if (!mongoDbHost) throw new Error("MONGODB_HOST not set");

const user = process.env.MONGODB_USER;
if (!user) throw new Error("MONGODB_USER not set");

const password = process.env.MONGODB_PASSWORD;
if (!password) throw new Error("MONGODB_PASSWORD not set");

const tlsCAFile = process.env.MONGODB_TLS_CA_FILE;
if (!tlsCAFile) throw new Error("MONGODB_TLS_CA_FILE not set");

console.table({
    jumpHostIp,
    jumpHostPort,
    jumpHostUser,
    jumpHostPrivateKeyPath,
    mongoDbHost,
    user,
    password,
    tlsCAFile
});

export default async function run() {
    const privateKey = fs.readFileSync(jumpHostPrivateKeyPath!);
    const sshConnection = new SSHConnection({
        endHost: jumpHostIp!,
        endPort: Number.parseInt(jumpHostPort!),
        username: jumpHostUser!,
        privateKey
    });
    await sshConnection.forward({
        fromPort: 27017,
        toPort: 27017,
        toHost: mongoDbHost!
    });

    const uri = `mongodb://${user}:${password}@localhost:27017/?authMechanism=DEFAULT&tls=true&tlsCAFile=${encodeURIComponent(tlsCAFile!)}&retryWrites=false&authSource=doctari`;
    const client = new MongoClient(uri, {
        tlsAllowInvalidHostnames: true,
        directConnection: true,
    });

    try {
        await client.connect();
        console.log(await client.db().admin().listDatabases());
        const result = await client.db("DB").collection("COLLECTION").find(undefined, { limit: 3 }).toArray();
        console.log(result);

    } finally {
        await client.close();
        await sshConnection.shutdown();
    }
}
run().catch(console.dir);