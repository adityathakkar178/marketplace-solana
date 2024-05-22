import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Marketplace } from "../target/types/marketplace";
import { Keypair, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, getAccount, getAssociatedTokenAddressSync } from "@solana/spl-token";

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

  it('Mint Collection', async () => {
    collectionMintKeyPair = Keypair.generate();    

    const collectionAssociatedTokenAccountAddress = getAssociatedTokenAddressSync(
      collectionMintKeyPair.publicKey,
      payer.publicKey
    );

    const collectionTransactionSignature = await program.methods
      .mintCollection(
        collectionMetadata.name,
        collectionMetadata.symbol,
        collectionMetadata.uri,
      )
      .accounts({
        payer: payer.publicKey,
        collectionMintAccount: collectionMintKeyPair.publicKey,
        collectionAssociatedTokenAccount: collectionAssociatedTokenAccountAddress,
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
              collectionMetadata: collectionMintKeyPair.publicKey
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
      [Buffer.from("sale"), mintKeyPair.publicKey.toBuffer()],
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
});
