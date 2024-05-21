import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Marketplace } from "../target/types/marketplace";
import { Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

describe('Mint Nfts', () => {
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

    console.log('Success');
    console.log('Transaction signature', collectionTransactionSignature);
  });

  it('Mint Nft with collections', async () => {
      const mintKeyPair = Keypair.generate();

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

      console.log('Success');
      console.log('Transaction signature', transactionSignature);
  });
});
