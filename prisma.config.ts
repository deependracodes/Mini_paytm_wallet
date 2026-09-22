import dotenv from "dotenv";
dotenv.config();


import {defineConfig} from "prisma/config";

export default defineConfig({
    schema : "prisma/schema.prisma",
    migrations : {
        path : "prisma/migrations"
    },
    datasource : {
        url : process.env.DATABASE_URL || "mysql://root:root@localhost:3306/paytm_wallet"
    }
})
