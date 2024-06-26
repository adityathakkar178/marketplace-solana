#![allow(clippy::result_large_err)]

use {
    anchor_lang::prelude::*,
    anchor_spl::{
        associated_token::AssociatedToken,
        metadata::{
            create_master_edition_v3, create_metadata_accounts_v3,
            mpl_token_metadata::types::{Collection, DataV2},
            CreateMasterEditionV3, CreateMetadataAccountsV3, Metadata,
        },
        token::{mint_to, Mint, MintTo, Token, TokenAccount, Transfer},
    },
};

declare_id!("2CA7hmQQFyQoPcFoCMd1pCzZDxth6pnx7ehNLavKKaim");

#[program]
pub mod marketplace {
    use anchor_lang::system_program;
    use anchor_spl::token;

    use super::*;

    pub fn mint_collection(
        ctx: Context<CreateCollection>,
        collection_name: String,
        collection_symbol: String,
        collection_uri: String,
    ) -> Result<()> {
        msg!("Creating collection");

        mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.collection_mint_account.to_account_info(),
                    to: ctx
                        .accounts
                        .collection_associated_token_account
                        .to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            1,
        )?;

        msg!("Creating metadata account");

        create_metadata_accounts_v3(
            CpiContext::new(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    metadata: ctx.accounts.collection_metadata_account.to_account_info(),
                    mint: ctx.accounts.collection_mint_account.to_account_info(),
                    mint_authority: ctx.accounts.payer.to_account_info(),
                    update_authority: ctx.accounts.payer.to_account_info(),
                    payer: ctx.accounts.payer.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
            ),
            DataV2 {
                name: collection_name,
                symbol: collection_symbol,
                uri: collection_uri,
                seller_fee_basis_points: 0,
                creators: None,
                collection: None,
                uses: None,
            },
            false,
            true,
            None,
        )?;

        msg!("Creating master edition account");

        create_master_edition_v3(
            CpiContext::new(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMasterEditionV3 {
                    edition: ctx.accounts.collection_edition_account.to_account_info(),
                    mint: ctx.accounts.collection_mint_account.to_account_info(),
                    update_authority: ctx.accounts.payer.to_account_info(),
                    mint_authority: ctx.accounts.payer.to_account_info(),
                    payer: ctx.accounts.payer.to_account_info(),
                    metadata: ctx.accounts.collection_metadata_account.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
            ),
            None,
        )?;

        msg!("Collection has minted successfully ");

        Ok(())
    }

    pub fn mint_nft(
        ctx: Context<CreateToken>,
        nft_name: String,
        nft_symbol: String,
        nft_uri: String,
        collection_address: Pubkey,
    ) -> Result<()> {
        msg!("Minting Tokens");

        mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint_account.to_account_info(),
                    to: ctx.accounts.associated_token_account.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            1,
        )?;

        msg!("Creating metadata account");

        let collection = Collection {
            verified: false,
            key: collection_address,
        };

        create_metadata_accounts_v3(
            CpiContext::new(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    metadata: ctx.accounts.metadata_account.to_account_info(),
                    mint: ctx.accounts.mint_account.to_account_info(),
                    mint_authority: ctx.accounts.payer.to_account_info(),
                    update_authority: ctx.accounts.payer.to_account_info(),
                    payer: ctx.accounts.payer.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
            ),
            DataV2 {
                name: nft_name,
                symbol: nft_symbol,
                uri: nft_uri,
                seller_fee_basis_points: 0,
                creators: None,
                collection: Some(collection),
                uses: None,
            },
            false,
            true,
            None,
        )?;

        msg!("Creating master edition account");

        create_master_edition_v3(
            CpiContext::new(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMasterEditionV3 {
                    edition: ctx.accounts.edition_account.to_account_info(),
                    mint: ctx.accounts.mint_account.to_account_info(),
                    update_authority: ctx.accounts.payer.to_account_info(),
                    mint_authority: ctx.accounts.payer.to_account_info(),
                    payer: ctx.accounts.payer.to_account_info(),
                    metadata: ctx.accounts.metadata_account.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
            ),
            None,
        )?;

        msg!("NFT minted successfully");

        Ok(())
    }

    pub fn list_nft_for_sale(ctx: Context<ListNftForSale>, price: u64) -> Result<()> {
        msg!("List nft for sale");

        let pda_account = &mut ctx.accounts.pda_account;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.seller_token_account.to_account_info(),
                    to: ctx.accounts.pda_token_account.to_account_info(),
                    authority: ctx.accounts.seller.to_account_info(),
                },
            ),
            1,
        )?;

        pda_account.price = price;
        pda_account.seller = ctx.accounts.seller.key();

        msg!("Nft lsited for sale");

        Ok(())
    }

    pub fn buy_nft(ctx: Context<BuyNft>) -> Result<()> {
        msg!("Buying nft");

        let pda_account = &ctx.accounts.pda_account;
        let seller = &ctx.accounts.seller;
        let buyer = &ctx.accounts.buyer;

        let bump = &[ctx.bumps.pda_signer];
        let binding = ctx.accounts.mint.key();
        let signer_seeds = &[&[b"sale", binding.as_ref(), bump][..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.pda_token_account.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: ctx.accounts.pda_signer.to_account_info(),
                },
                signer_seeds,
            ),
            1,
        )?;

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: buyer.to_account_info(),
                    to: seller.to_account_info(),
                },
            ),
            pda_account.price,
        )?;

        ctx.accounts
            .pda_account
            .close(ctx.accounts.seller.to_account_info())?;

        msg!("NFT purchased");

        Ok(())
    }

    pub fn withdraw_nft(ctx: Context<WithdrawNFT>) -> Result<()> {
        msg!("Withdrawing Nft");

        let pda_account = &mut ctx.accounts.pda_account;

        require!(pda_account.price > 0, ErrorCode::NftAlreadySold);

        let bump = &[ctx.bumps.pda_signer];
        let binding = ctx.accounts.mint.key();
        let signer_seeds = &[&[b"sale", binding.as_ref(), bump][..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.pda_token_account.to_account_info(),
                    to: ctx.accounts.seller_token_account.to_account_info(),
                    authority: ctx.accounts.pda_signer.to_account_info(),
                },
                signer_seeds,
            ),
            1,
        )?;

        ctx.accounts
            .pda_account
            .close(ctx.accounts.seller.to_account_info())?;

        msg!("NFT withdrawn successfully");

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateToken<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Validate address by deriving pda
    #[account(
        mut,
        seeds = [b"metadata", token_metadata_program.key().as_ref(), mint_account.key().as_ref()],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    pub metadata_account: UncheckedAccount<'info>,

    /// CHECK: Validate address by deriving pda
    #[account(
        mut,
        seeds = [b"metadata", token_metadata_program.key().as_ref(), mint_account.key().as_ref(), b"edition"],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    pub edition_account: UncheckedAccount<'info>,

    #[account(
        init,
        payer = payer,
        mint::decimals = 0,
        mint::authority = payer.key(),
        mint::freeze_authority = payer.key(),
    )]
    pub mint_account: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint_account,
        associated_token::authority = payer,
    )]
    pub associated_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CreateCollection<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Validate address by deriving pda
    #[account(
        mut,
        seeds = [b"metadata", token_metadata_program.key().as_ref(), collection_mint_account.key().as_ref()],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    pub collection_metadata_account: UncheckedAccount<'info>,

    /// CHECK: Validate address by deriving pda
    #[account(
        mut,
        seeds = [b"metadata", token_metadata_program.key().as_ref(), collection_mint_account.key().as_ref(), b"edition"],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    pub collection_edition_account: UncheckedAccount<'info>,

    #[account(
        init,
        payer = payer,
        mint::decimals = 0,
        mint::authority = payer.key(),
        mint::freeze_authority = payer.key(),
    )]
    pub collection_mint_account: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = collection_mint_account,
        associated_token::authority = payer,
    )]
    pub collection_associated_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
pub struct Sale {
    pub seller: Pubkey,
    pub price: u64,
}

#[derive(Accounts)]
pub struct ListNftForSale<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(mut)]
    pub seller_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = seller,
        space = 8 + 32 + 8,
        seeds = [b"sale", mint.key().as_ref()],
        bump,
    )]
    pub pda_account: Account<'info, Sale>,

    #[account(
        init_if_needed,
        payer = seller,
        associated_token::mint = mint,
        associated_token::authority = pda_signer,
    )]
    pub pda_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    /// CHECK: Validate address by deriving pda
    #[account(
        seeds = [b"sale", mint.key().as_ref()],
        bump,
    )]
    pub pda_signer: AccountInfo<'info>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BuyNft<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,

    /// CHECK: Validate address by deriving pda
    #[account(mut)]
    pub seller: UncheckedAccount<'info>,

    #[account(mut)]
    pub pda_account: Account<'info, Sale>,

    #[account(mut)]
    pub pda_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    /// CHECK: Validate address by deriving pda
    #[account(
        seeds = [b"sale", mint.key().as_ref()],
        bump,
    )]
    pub pda_signer: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawNFT<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(mut)]
    pub seller_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        close = seller,
        seeds = [b"sale", mint.key().as_ref()],
        bump
    )]
    pub pda_account: Account<'info, Sale>,

    #[account(mut)]
    pub pda_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    /// CHECK: Validate address by deriving pda
    #[account(
        seeds = [b"sale", mint.key().as_ref()],
        bump,
    )]
    pub pda_signer: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("NFT has already been sold")]
    NftAlreadySold,
}
