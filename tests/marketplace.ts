import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Marketplace } from '../target/types/marketplace';
import {
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    Transaction,
} from '@solana/web3.js';
import {
    TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
    getAccount,
    getAssociatedTokenAddressSync,
} from '@solana/spl-token';

describe('Marketplace', () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const payer = provider.wallet;
    const program = anchor.workspace.Marketplace;

    const collectionMetadata = {
        name: 'Collection1',
        symbol: 'CXYZ',
        uri: 'collectionxyz',
    };

    const metadata = {
        name: 'XYZ',
        symbol: 'ABC',
        uri: 'abcxyz',
    };

    let collectionMintKeyPair: Keypair;
    let mintKeyPair: Keypair;

    const buyerSecretKey = Uint8Array.from([
        42, 165, 245, 159, 222, 186, 30, 59, 255, 159, 113, 47, 54, 124, 76,
        163, 43, 196, 84, 5, 49, 170, 50, 11, 138, 41, 232, 148, 12, 220, 123,
        134, 132, 67, 120, 119, 74, 89, 31, 50, 157, 152, 126, 40, 40, 244, 236,
        21, 66, 18, 70, 7, 224, 123, 171, 16, 156, 248, 229, 104, 156, 119, 255,
        160,
    ]);
    const buyerKeypair = Keypair.fromSecretKey(buyerSecretKey);

    it('Mint Collection', async () => {
        collectionMintKeyPair = Keypair.generate();

        const collectionAssociatedTokenAccountAddress =
            getAssociatedTokenAddressSync(
                collectionMintKeyPair.publicKey,
                payer.publicKey
            );

        const collectionTransactionSignature = await program.methods
            .mintCollection(
                collectionMetadata.name,
                collectionMetadata.symbol,
                collectionMetadata.uri
            )
            .accounts({
                payer: payer.publicKey,
                collectionMintAccount: collectionMintKeyPair.publicKey,
                collectionAssociatedTokenAccount:
                    collectionAssociatedTokenAccountAddress,
            })
            .signers([collectionMintKeyPair])
            .rpc({ skipPreflight: true });

        console.log('Collection created');
        console.log('Transaction signature', collectionTransactionSignature);
    });

    it('Mint Nft with collections', async () => {
        mintKeyPair = Keypair.generate();

        const associatedTokenAccountAddress = getAssociatedTokenAddressSync(
            mintKeyPair.publicKey,
            payer.publicKey
        );

        const transactionSignature = await program.methods
            .mintNft(
                metadata.name,
                metadata.symbol,
                metadata.uri,
                collectionMintKeyPair.publicKey
            )
            .accounts({
                payer: payer.publicKey,
                mintAccount: mintKeyPair.publicKey,
                associatedTokenAccount: associatedTokenAccountAddress,
                collectionMetadata: collectionMintKeyPair.publicKey,
            })
            .signers([mintKeyPair])
            .rpc({ skipPreflight: true });

        console.log('NFT minted');
        console.log('Transaction signature', transactionSignature);
    });

    it('List token for sale', async () => {
        const sellerTokenAccount = getAssociatedTokenAddressSync(
            mintKeyPair.publicKey,
            payer.publicKey
        );

        const [pdaAccount, bump] = PublicKey.findProgramAddressSync(
            [Buffer.from('sale'), mintKeyPair.publicKey.toBuffer()],
            program.programId
        );

        const pdaTokenAccountAddress = getAssociatedTokenAddressSync(
            mintKeyPair.publicKey,
            pdaAccount,
            true
        );

        const createPdaTokenAccountIx = createAssociatedTokenAccountInstruction(
            payer.publicKey,
            pdaTokenAccountAddress,
            pdaAccount,
            mintKeyPair.publicKey
        );

        const listTransactionSignature = await program.methods
            .listNftForSale(new anchor.BN(1000000000))
            .accounts({
                seller: payer.publicKey,
                sellerTokenAccount: sellerTokenAccount,
                pdaAccount,
                pdaTokenAccount: pdaTokenAccountAddress,
                mint: mintKeyPair.publicKey,
                pdaSigner: pdaAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .preInstructions([createPdaTokenAccountIx])
            .signers([])
            .rpc({ skipPreflight: true });

        console.log('NFT listed for sale');
        console.log('Transaction signature', listTransactionSignature);

        // const pdaTokenAccount = await getAccount(provider.connection, pdaTokenAccountAddress);
        // console.log('PDA token account balance:', pdaTokenAccount.amount.toString());
        // console.log(pdaTokenAccountAddress);
    });

    it('Buy NFT', async () => {
        const buyerTokenAccountAddress = getAssociatedTokenAddressSync(
            mintKeyPair.publicKey,
            buyerKeypair.publicKey
        );

        const [pdaAccount, bump] = PublicKey.findProgramAddressSync(
            [Buffer.from('sale'), mintKeyPair.publicKey.toBuffer()],
            program.programId
        );

        const pdaTokenAccountAddress = getAssociatedTokenAddressSync(
            mintKeyPair.publicKey,
            pdaAccount,
            true
        );

        const createBuyerTokenAccountIx =
            createAssociatedTokenAccountInstruction(
                payer.publicKey,
                buyerTokenAccountAddress,
                buyerKeypair.publicKey,
                mintKeyPair.publicKey
            );

        const buyTransactionSignature = await program.methods
            .buyNft()
            .accounts({
                buyer: buyerKeypair.publicKey,
                buyerTokenAccount: buyerTokenAccountAddress,
                seller: payer.publicKey,
                pdaAccount,
                pdaTokenAccount: pdaTokenAccountAddress,
                mint: mintKeyPair.publicKey,
                pdaSigner: pdaAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .preInstructions([createBuyerTokenAccountIx])
            .signers([buyerKeypair])
            .rpc({ skipPreflight: true });

        console.log('NFT purchased');
        console.log('Transaction signature', buyTransactionSignature);
    });

    it('Withdraw NFT', async () => {
        const sellerTokenAccount = getAssociatedTokenAddressSync(
            mintKeyPair.publicKey,
            payer.publicKey
        );

        const [pdaAccount, bump] = PublicKey.findProgramAddressSync(
            [Buffer.from('sale'), mintKeyPair.publicKey.toBuffer()],
            program.programId
        );

        const pdaTokenAccountAddress = getAssociatedTokenAddressSync(
            mintKeyPair.publicKey,
            pdaAccount,
            true
        );

        const createPdaTokenAccountIx = createAssociatedTokenAccountInstruction(
            payer.publicKey,
            pdaTokenAccountAddress,
            pdaAccount,
            mintKeyPair.publicKey
        );
        const createTransaction = new Transaction().add(
            createPdaTokenAccountIx
        );
        await provider.sendAndConfirm(createTransaction, []);

        const withdrawTransactionSignature = await program.methods
            .withdrawNft()
            .accounts({
                seller: payer.publicKey,
                sellerTokenAccount: sellerTokenAccount,
                pdaAccount,
                pdaTokenAccount: pdaTokenAccountAddress,
                mint: mintKeyPair.publicKey,
                pdaSigner: pdaAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .signers([])
            .rpc({ skipPreflight: true });

        console.log('NFT withdrawn');
        console.log('Transaction signature', withdrawTransactionSignature);
    });
});
