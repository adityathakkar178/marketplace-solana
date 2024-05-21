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

  const metadata = {
      name: 'XYZ',
      symbol: 'ABC',
      uri: 'abcxyz',
      collection: Keypair.generate().publicKey,
  };

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
              metadata.collection
          )
          .accounts({
              payer: payer.publicKey,
              mintAccount: mintKeyPair.publicKey,
              associatedTokenAccount: associatedTokenAccountAddress,
          })
          .signers([mintKeyPair])
          .rpc({ skipPreflight: true });

      console.log('Success');
      console.log('Transaction signature', transactionSignature);
  });
});
