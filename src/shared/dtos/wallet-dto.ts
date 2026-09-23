export interface CreateWalletDTO {
    user_id: number;
}

 export interface AddMoneyDTO {
    user_id: number;
    amount: number;
    transactionId: number;
}

export interface WalletResponseDTO {
    id: string;
    user_id: string;
    balance: string;
    version: number;
    createdAt: string;
    updatedAt: string;
}

// IN Javascript, JSON.stringify() cannot serialise bigint directly
// So, responses convert big int fields to strings

//id: wallet.id.toString()
//"balance": "100000"