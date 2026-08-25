import dotenv from "dotenv";
dotenv.config();


import {defineConfig} from "prisma/config";

export default defineConfig({
    schema : "primsa/schema.prisma",
    migrations : {
        path : "prisma/migations"
    },
    datasource : {
        url : process.env.DATABASE_URL || "mysql://root:localhost:3306/paytm_wallet"
    }
})