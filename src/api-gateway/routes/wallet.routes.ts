import { Router } from "express";
import { WalletController } from "../../mini_paytm/controllers/wallet.controller.js";

const walletRouter = Router();
const walletController = new WalletController();


walletRouter.post("/", walletController.createWallet.bind(walletController));
walletRouter.get("/:userId", walletController.getWallet.bind(walletController));
walletRouter.post("/:userId/add-money", walletController.addMoney.bind(walletController));



export default walletRouter;

