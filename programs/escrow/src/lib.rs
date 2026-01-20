use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("3pMM6KnPpxc1mhprcPGb7oLLi5skDmcVAvDb4sq4nS1L");

/// SolTok Bridge Escrow Program
/// 
/// This program handles USDC deposits for TikTok Shop purchases via the SolTok Bridge.
/// 
/// Flow:
/// 1. User deposits USDC into escrow PDA
/// 2. 5% fee goes to treasury, 95% goes to fulfillment vault
/// 3. Admin releases funds once fulfillment is confirmed
/// 4. User can request refund if order fails (admin approves)

#[program]
pub mod soltok_escrow {
    use super::*;

    /// Initialize the escrow configuration
    /// Only called once by the program deployer
    pub fn initialize(
        ctx: Context<Initialize>,
        treasury_fee_bps: u16, // Basis points (500 = 5%)
    ) -> Result<()> {
        require!(treasury_fee_bps <= 1000, EscrowError::FeeTooHigh); // Max 10%

        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.treasury = ctx.accounts.treasury.key();
        config.fulfillment_vault = ctx.accounts.fulfillment_vault.key();
        config.treasury_fee_bps = treasury_fee_bps;
        config.total_deposits = 0;
        config.total_released = 0;
        config.bump = ctx.bumps.config;

        msg!("Escrow initialized with {}bps fee", treasury_fee_bps);
        Ok(())
    }

    /// Create a new escrow deposit for an order
    pub fn create_escrow(
        ctx: Context<CreateEscrow>,
        order_id: String,
        amount: u64,
    ) -> Result<()> {
        require!(order_id.len() <= 32, EscrowError::OrderIdTooLong);
        require!(amount > 0, EscrowError::InvalidAmount);

        // Calculate fee split
        let fee_bps = ctx.accounts.config.treasury_fee_bps;
        let fee_amount = (amount as u128)
            .checked_mul(fee_bps as u128)
            .unwrap()
            .checked_div(10000)
            .unwrap() as u64;
        let fulfillment_amount = amount.checked_sub(fee_amount).unwrap();

        // Set escrow data
        let escrow = &mut ctx.accounts.escrow;
        escrow.buyer = ctx.accounts.buyer.key();
        escrow.order_id = order_id.clone();
        escrow.amount = amount;
        escrow.status = EscrowStatus::Locked;
        escrow.created_at = Clock::get()?.unix_timestamp;
        escrow.bump = ctx.bumps.escrow;
        escrow.fee_amount = fee_amount;
        escrow.fulfillment_amount = fulfillment_amount;

        // Transfer USDC from buyer to escrow vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_token_account.to_account_info(),
                    to: ctx.accounts.escrow_vault.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            amount,
        )?;

        // Update config stats
        ctx.accounts.config.total_deposits = ctx.accounts.config.total_deposits.checked_add(amount).unwrap();

        msg!("Escrow created for order {} with {} USDC", order_id, amount);
        Ok(())
    }

    /// Release funds after successful fulfillment
    /// Only callable by admin
    pub fn release_escrow(ctx: Context<ReleaseEscrow>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        require!(escrow.status == EscrowStatus::Locked, EscrowError::InvalidStatus);

        // Capture values before mutable borrow
        let order_id = escrow.order_id.clone();
        let buyer = escrow.buyer;
        let bump = escrow.bump;
        let fee_amount = escrow.fee_amount;
        let fulfillment_amount = escrow.fulfillment_amount;
        let amount = escrow.amount;

        // Build seeds for signing
        let seeds = &[
            b"escrow".as_ref(),
            order_id.as_bytes(),
            buyer.as_ref(),
            &[bump],
        ];
        let signer = &[&seeds[..]];

        // Transfer fee to treasury
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_vault.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                    authority: ctx.accounts.escrow.to_account_info(),
                },
                signer,
            ),
            fee_amount,
        )?;

        // Transfer to fulfillment vault
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_vault.to_account_info(),
                    to: ctx.accounts.fulfillment_vault.to_account_info(),
                    authority: ctx.accounts.escrow.to_account_info(),
                },
                signer,
            ),
            fulfillment_amount,
        )?;

        // Update escrow status (mutable borrow now)
        let escrow = &mut ctx.accounts.escrow;
        escrow.status = EscrowStatus::Released;
        escrow.released_at = Some(Clock::get()?.unix_timestamp);

        // Update config stats
        ctx.accounts.config.total_released = ctx.accounts.config.total_released.checked_add(amount).unwrap();

        msg!("Escrow released for order {}", order_id);
        Ok(())
    }

    /// Refund buyer if order fails
    /// Only callable by admin
    pub fn refund_escrow(ctx: Context<RefundEscrow>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        require!(escrow.status == EscrowStatus::Locked, EscrowError::InvalidStatus);

        // Capture values before mutable borrow
        let order_id = escrow.order_id.clone();
        let buyer = escrow.buyer;
        let bump = escrow.bump;
        let amount = escrow.amount;

        // Build seeds for signing
        let seeds = &[
            b"escrow".as_ref(),
            order_id.as_bytes(),
            buyer.as_ref(),
            &[bump],
        ];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_vault.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: ctx.accounts.escrow.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        // Update escrow status (mutable borrow now)
        let escrow = &mut ctx.accounts.escrow;
        escrow.status = EscrowStatus::Refunded;
        escrow.released_at = Some(Clock::get()?.unix_timestamp);

        msg!("Escrow refunded for order {}", order_id);
        Ok(())
    }
}

// ============================================================================
// Account Structures
// ============================================================================

#[account]
#[derive(Default)]
pub struct EscrowConfig {
    pub admin: Pubkey,
    pub treasury: Pubkey,
    pub fulfillment_vault: Pubkey,
    pub treasury_fee_bps: u16,
    pub total_deposits: u64,
    pub total_released: u64,
    pub bump: u8,
}

impl EscrowConfig {
    pub const SIZE: usize = 8 + // discriminator
        32 + // admin
        32 + // treasury  
        32 + // fulfillment_vault
        2 +  // treasury_fee_bps
        8 +  // total_deposits
        8 +  // total_released
        1;   // bump
}

#[account]
pub struct Escrow {
    pub buyer: Pubkey,
    pub order_id: String,
    pub amount: u64,
    pub fee_amount: u64,
    pub fulfillment_amount: u64,
    pub status: EscrowStatus,
    pub created_at: i64,
    pub released_at: Option<i64>,
    pub bump: u8,
}

impl Escrow {
    pub const SIZE: usize = 8 + // discriminator
        32 + // buyer
        36 + // order_id (4 bytes len + 32 max chars)
        8 +  // amount
        8 +  // fee_amount
        8 +  // fulfillment_amount
        1 +  // status
        8 +  // created_at
        9 +  // released_at (Option<i64>)
        1;   // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum EscrowStatus {
    Locked,
    Released,
    Refunded,
}

impl Default for EscrowStatus {
    fn default() -> Self {
        EscrowStatus::Locked
    }
}

// ============================================================================
// Instruction Contexts
// ============================================================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = EscrowConfig::SIZE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, EscrowConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    /// CHECK: Treasury token account for receiving fees
    pub treasury: UncheckedAccount<'info>,

    /// CHECK: Fulfillment vault for receiving purchase funds
    pub fulfillment_vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(order_id: String, amount: u64)]
pub struct CreateEscrow<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, EscrowConfig>,

    #[account(
        init,
        payer = buyer,
        space = Escrow::SIZE,
        seeds = [b"escrow", order_id.as_bytes(), buyer.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, Escrow>,

    /// The vault to hold escrowed USDC - must be created beforehand or via separate instruction
    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = escrow,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        constraint = buyer_token_account.owner == buyer.key(),
        constraint = buyer_token_account.mint == usdc_mint.key()
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, token::Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReleaseEscrow<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin,
        has_one = treasury,
        has_one = fulfillment_vault
    )]
    pub config: Account<'info, EscrowConfig>,

    #[account(
        mut,
        seeds = [b"escrow", escrow.order_id.as_bytes(), escrow.buyer.as_ref()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(
        mut,
        token::authority = escrow,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,

    #[account(mut)]
    pub fulfillment_vault: Account<'info, TokenAccount>,

    pub admin: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RefundEscrow<'info> {
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin
    )]
    pub config: Account<'info, EscrowConfig>,

    #[account(
        mut,
        seeds = [b"escrow", escrow.order_id.as_bytes(), escrow.buyer.as_ref()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(
        mut,
        token::authority = escrow,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = buyer_token_account.owner == escrow.buyer
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    pub admin: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

// ============================================================================
// Errors
// ============================================================================

#[error_code]
pub enum EscrowError {
    #[msg("Fee percentage too high (max 10%)")]
    FeeTooHigh,
    #[msg("Order ID too long (max 32 characters)")]
    OrderIdTooLong,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid escrow status for this operation")]
    InvalidStatus,
}
