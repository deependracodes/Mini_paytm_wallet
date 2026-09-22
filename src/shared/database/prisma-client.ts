import { PrismaClient } from "../../generated/prisma/client.js";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { ShardId } from "../types/shared-types.js";


//Create separate Prisma client for each shard using driver adaptors
//Each client manages its own connection pool via Maria DB
let shard1Client: PrismaClient | null = null;
let shard2Client: PrismaClient | null = null;

function getShard1AdaptionOptions() {
    const url = process.env.DATABASE_SHARD1_URL;
    if(url) {
        try {
            const u = new URL(url);
            return {
                host: u.hostname,
                port: parseInt(u.port || '3306', 10),
                user: u.username,
                password: u.password,
                database: u.pathname.replace(/^\//, '') || 'wallet_shard1',
                connectionLimit: 5,
            };
        } catch {
            throw new Error(`Invalid DATABASE_URL_SHARD_1: ${url}`);
        }
    }

    return {
        host: process.env.DB_SHARD1_HOST || 'localhost',
        port: parseInt(process.env.DB_SHARD1_PORT || '3306', 10),
        user: process.env.DB_SHARD1_USER || 'root',
        password: process.env.DB_SHARD1_PASSWORD || '',
        database: process.env.DB_SHARD1_DATABASE || 'wallet_shard1',
        connectionLimit: 5,
    }
}

function getShard2AdaptionOptions() {
    const url = process.env.DATABASE_SHARD2_URL;
    if(url) {
        try {
            const u = new URL(url);
            return {
                host: u.hostname,
                port: parseInt(u.port || '3306', 10),
                user: u.username,
                password: u.password,
                database: u.pathname.replace(/^\//, '') || 'wallet_shard2',
                connectionLimit: 5,
            };
        } catch {
            throw new Error(`Invalid DATABASE_URL_SHARD_2: ${url}`);
        }
    }

    return {
        host: process.env.DB_SHARD2_HOST || 'localhost',
        port: parseInt(process.env.DB_SHARD2_PORT || '3306', 10),
        user: process.env.DB_SHARD2_USER || 'root',
        password: process.env.DB_SHARD2_PASSWORD || '',
        database: process.env.DB_SHARD2_DATABASE || 'wallet_shard2',
        connectionLimit: 5,
    }
}

export function getShard1Client(): PrismaClient {
    //Lazy singleton: avoids creating new pools per request/import
    if(!shard1Client) {
        const adapter = new PrismaMariaDb(getShard1AdaptionOptions());
        shard1Client = new PrismaClient({ 
            adapter,
            log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
        });
    }
    return shard1Client;
}

export function getShard2Client(): PrismaClient {
    if(!shard2Client) {
        const adapter = new PrismaMariaDb(getShard2AdaptionOptions());
        shard2Client = new PrismaClient({ 
            adapter,
            log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
        });
    }
    return shard2Client;
}

//Centralised shard routing: callers should not directly reference shard1/shard2 clients
export function getPrismaClient(shardId: ShardId): PrismaClient {
    return shardId == ShardId.SHARD_1 ? getShard1Client() : getShard2Client();
}

export async function closePrismaClients(): Promise<void> {

   if(shard1Client) {
        await shard1Client.$disconnect();
        shard1Client = null;
        console.log('Shard 1 client disconnected');
   }
   if(shard2Client) {
        await shard2Client.$disconnect();
        shard2Client = null;
        console.log('Shard 2 client disconnected');
   }
}