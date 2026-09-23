import {Request, Response} from 'express';
import {WalletService} from '../services/wallet.service.js';
import {CreateWalletDTO, AddMoneyDTO, WalletResponseDTO} from '../../shared/dtos/wallet-dto.js';

//Reponsibilities:
//1. Extract data from request
//2. Validate data
//3. Convert to bigint
//4. Call Service
//5. Convert domain object int JSON response
//5. Return correct status code

//safe parser for a URL path parameter that's supposed to be a number (/:userId)
//but stored as a BigInt in your code
function tryParseBigIntPathSegment(raw: string | undefined): {ok: true, value: bigint} | {ok: false} {

    if(raw === undefined || raw === '') {
        return {ok: false};
    }
    try{
        return {ok: true, value: BigInt(raw)};
    }catch{
        return {ok: false};
    }
}

export class WalletController {

    private walletService: WalletService;

    constructor() {
        this.walletService = new WalletService();
    }

    async createWallet(req: Request, res: Response): Promise<void>{

        try{
            const dto: CreateWalletDTO = req.body;
            const rawUserId = (dto as {user_id?: unknown}).user_id;

            if(rawUserId === undefined || rawUserId === null || rawUserId === '') {
                res.status(400).json({error: 'user_id is required'});
                return;
            }

            let userId: bigint;
            try{
                userId = BigInt(rawUserId as string | number | bigint);
            }catch{
                res.status(400).json({error: 'Invalid userId format'});
                return;
            }

            const wallet = await this.walletService.createWalletForUser(userId);
            const response: WalletResponseDTO = {
                id: wallet.id.toString(),
                user_id: wallet.user_id.toString(),
                balance: wallet.balance.toString(),
                version: wallet.version,
                createdAt: wallet.created_at.toISOString(),
                updatedAt: wallet.updated_at.toISOString(),
            }
            res.status(201).json(response);
        }catch(error: any){

            const msg = error?.message || 'Internal Server Error';
            if(msg.includes('already exists')) {
                res.status(409).json({error: msg});
                return;
            }
            res.status(500).json({error: msg});
        }
    }


    //GET api/wallets/:userId
    async getWallet(req: Request, res:Response): Promise<void> {
        const parsed = tryParseBigIntPathSegment(req.params.userId);
        if(!parsed.ok) {
            res.status(400).json({error: 'Invalid user_id format'});
            return;
        }

        try {
            const wallet = await this.walletService.getWalletForUser(parsed.value);

            if(!wallet){
                res.status(404).json({error: 'Wallet not found'});
                return;
            }

            const response: WalletResponseDTO = {
                id: wallet.id.toString(),
                user_id: wallet.user_id.toString(),
                balance: wallet.balance.toString(),
                version: wallet.version,
                createdAt: wallet.created_at.toISOString(),
                updatedAt: wallet.updated_at.toISOString(),
            }

            res.status(200).json(response);
        }catch(error: any){
            res.status(500).json({error: 'Internal Server Error'});
        }
       
    }

    //Add money endpoint
    //POST /api/wallets/:userId/add-money

    async addMoney(req: Request, res: Response): Promise<void> {
        const parsed = tryParseBigIntPathSegment(req.params.userId);

        if(!parsed.ok) {
            res.status(400).json({error: 'Invalid user_id format'});
            return;
        }

        try {
            
            const dto: AddMoneyDTO = req.body;
            const rawAmount = (dto as {amount?: unknown}).amount;

            if(rawAmount === undefined || rawAmount === null || rawAmount === '') {
                res.status(400).json({error: 'amount is required'});
                return;
            }

           let amount: bigint;
           try{
            amount = BigInt(rawAmount as string | number | bigint);
           }catch{
            res.status(400).json({error: 'Invalid amount format'});
            return;
           }

           if(amount <= 0n) {
            res.status(400).json({error: 'Amount must be positive'});
            return;
           }

           const wallet = await this.walletService.addMoneyToWallet(parsed.value, amount, BigInt(Date.now())); //using timestamp as transactionId for simplicity

           const response: WalletResponseDTO = {
            id: wallet.id.toString(),
            user_id: wallet.user_id.toString(),
            balance: wallet.balance.toString(),
            version: wallet.version,
            createdAt: wallet.created_at.toISOString(),
            updatedAt: wallet.updated_at.toISOString(),
           }
           res.status(200).json(response);

        }catch(error: any){
            const msg = error?.message || 'Internal Server Error';
            if(msg.includes('Wallet not found')) {
                res.status(404).json({error: msg});
                return;
            }
            res.status(500).json({error: msg});
        }
    }
}