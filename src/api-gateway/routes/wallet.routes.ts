import { Router } from "express";
import { WalletController } from "../../mini_paytm/controllers/wallet.controller.js";
import { idempotencyMiddleware } from "../../shared/middleware/idempotency.middleware.js";

const walletRouter = Router();
const walletController = new WalletController();


walletRouter.post("/", walletController.createWallet.bind(walletController));
walletRouter.get("/:userId", walletController.getWallet.bind(walletController));
walletRouter.post("/:userId/add-money", idempotencyMiddleware,walletController.addMoney.bind(walletController));



export default walletRouter;

