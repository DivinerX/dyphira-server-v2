import env from '@/config/env';
const { getOrCreateAssociatedTokenAccount, transfer } = require("@solana/spl-token");
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { decodeBase58 } from './decodebs58';

const privateKeyString = env.SERVER_WALLET_KEY;
const secretKey = decodeBase58(privateKeyString);
const serverWallet = Keypair.fromSecretKey(secretKey);
const TOKEN_ADDRESS = env.TOKEN_ADDRESS;
const TRANSFER_AMOUNT = Number(env.TRANSFER_AMOUNT);

export const claimUSDC = async (recipientAddress) => {
  console.log(recipientAddress, new PublicKey(recipientAddress))
  try {
    const connection = new Connection(env.SOLANA_API, 'confirmed');

    const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      serverWallet,
      new PublicKey(TOKEN_ADDRESS),
      serverWallet.publicKey,
    );
    console.log(senderTokenAccount)
    const receiverTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      serverWallet,
      new PublicKey(TOKEN_ADDRESS),
      new PublicKey(recipientAddress),
    );

    console.log("receiverTokenAccount", receiverTokenAccount)
    const signature = await transfer(
      connection,
      serverWallet,
      senderTokenAccount.address,
      receiverTokenAccount.address,
      serverWallet.publicKey,
      TRANSFER_AMOUNT,
    );
    return { success: true, message: 'Reward claimed successfully', signature };
  } catch (error: any) {
    console.error('Error claiming USDC:', error);
    throw Error(error)
  }
};