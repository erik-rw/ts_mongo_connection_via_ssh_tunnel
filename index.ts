import {FindCursor, WithId, Document} from "mongodb";

const {MongoClient} = require("mongodb");
import {SSHConnection} from 'node-ssh-forward'
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

const mongoDbPort = process.env.MONGODB_PORT ? Number.parseInt(process.env.MONGODB_PORT) : 0;
if (!mongoDbPort) throw new Error("MONGODB_PORT not set");

const user = process.env.MONGODB_USER;
if (!user) throw new Error("MONGODB_USER not set");

const password = process.env.MONGODB_PASSWORD;
if (!password) throw new Error("MONGODB_PASSWORD not set");

const databaseName = process.env.MONGODB_DATABASE_NAME;
if (!databaseName) throw new Error("MONGODB_DATABASE_NAME not set");

const collectionName = process.env.MONGODB_COLLECTION_NAME;
if (!collectionName) throw new Error("MONGODB_COLLECTION_NAME not set");

const collectionLimit = process.env.MONGODB_COLLECTION_LIMIT ? Number.parseInt(process.env.MONGODB_COLLECTION_LIMIT) : 0
if (!collectionLimit) throw new Error("MONGODB_COLLECTION_LIMIT not set");

const tlsCAFile = process.env.MONGODB_TLS_CA_FILE;
if (!tlsCAFile) throw new Error("MONGODB_TLS_CA_FILE not set");

type Config = {
    jumpHostIp: string;
    jumpHostPort: string;
    jumpHostUser: string;
    jumpHostPrivateKeyPath: string;
    mongoDbHost: string;
    mongoDbPort: number;
    user: string;
    password: string;
    databaseName: string;
    collectionName: string;
    tlsCAFile: string;
    localPort: number;
    outputFormat: 'json' | 'jl';
}
const config: Config = {
    jumpHostIp,
    jumpHostPort,
    jumpHostUser,
    jumpHostPrivateKeyPath,
    mongoDbHost,
    mongoDbPort,
    user,
    password,
    databaseName,
    collectionName,
    tlsCAFile,
    outputFormat: 'json',
    localPort: 27017 + Math.floor(Math.random() * 10000),
};

console.error('config', config);

async function createSshTunnel(cfg: Config) {
    try {
        const privateKey = fs.readFileSync(cfg.jumpHostPrivateKeyPath);
        const sshConnection = new SSHConnection({
            endHost: cfg.jumpHostIp,
            endPort: Number.parseInt(cfg.jumpHostPort),
            username: cfg.jumpHostUser,
            privateKey
        });
        await sshConnection.forward({
            fromPort: cfg.localPort,
            toPort: cfg.mongoDbPort,
            toHost: cfg.mongoDbHost
        });
        return sshConnection;

    } catch (error) {
        console.error(`Failed to create SSH tunnel: ${error}`);
        process.exit(1);
    }
}

async function connectMongoDb(cfg: Config) {
    try {
        const uri = `mongodb://${cfg.user}:${cfg.password}@localhost:${cfg.localPort}/?authMechanism=DEFAULT&tls=true&tlsCAFile=${encodeURIComponent(cfg.tlsCAFile)}&retryWrites=false&authSource=${cfg.databaseName}`;
        const client = new MongoClient(uri, {
            tlsAllowInvalidHostnames: true,
            directConnection: true,
        });
        await client.connect();
        return client;
    } catch (error) {
        console.error(`Failed to connect to MongoDB: ${error}`);
        process.exit(1);
    }
}

type Writer = (cursor: FindCursor<WithId<Document>>) => Promise<void>;

async function writeJL(cursor: FindCursor<WithId<Document>>) {
    while (cursor && await cursor.hasNext()) {
        console.log(JSON.stringify(await cursor.next()));
    }
}

async function writeJson(cursor: FindCursor<WithId<Document>>) {
    let line = 0;
    console.log('[');
    while (cursor && await cursor.hasNext()) {
        if (line++ > 0) {
            console.log(',')
        }
        console.log(JSON.stringify(await cursor.next()));
    }
    console.log(']');
}

async function run(cfg: Config) {
    const writer = cfg.outputFormat === 'jl' ? writeJL : writeJson;
    const sshConnection = await createSshTunnel(cfg);
    const client = await connectMongoDb(cfg);

    try {
        const databaseNames = (await client.db().admin().listDatabases()).databases.map((db: { name: string }) => db.name);
        console.error('databaseNames', databaseNames);
        if (databaseNames.indexOf(cfg.databaseName) === -1) {
            console.error(`Database ${databaseName} not found`);
            process.exit(1);
        }
        const options = collectionLimit >= 0 ?
            {limit: collectionLimit}
            : undefined;
        const cursor = await client.db(cfg.databaseName).collection(cfg.collectionName).find(undefined, options);
        await writer(cursor);

    } finally {
        if (client) await client.close();
        if (sshConnection) await sshConnection.shutdown();
    }
}

run(config).catch(console.dir);