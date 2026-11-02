export const OP_SIG                            = 0x10000000;
export const OP_SIG_Verify                     = 0x10000001;
export const OP_SIG_VerifyEcdsa                = 0x10000002;

export const OP_COMMON                         = 0x20000000;
// export const OP_COMMON_AddAdmin                = 0x20000001;
// export const OP_COMMON_RemoveAdmin             = 0x20000002;
export const OP_COMMON_TransferOwner           = 0x20000003;
export const OP_COMMON_SetHalt                 = 0x20000004;
// export const OP_COMMON_Initialize              = 0x20000005;
export const OP_COMMON_Finished                = 0x2000000F;

export const OP_FEE                            = 0x30000000;
export const OP_FEE_SetChainFee                = 0x30000001;
export const OP_FEE_SetChainFees               = 0x30000002;
export const OP_FEE_SetSmgFeeProxy             = 0x30000003;
export const OP_FEE_SetFeeOperator             = 0x30000004;
export const OP_FEE_SetTokenPairFee            = 0x30000005;
export const OP_FEE_SetTokenPairFees           = 0x30000006;
export const OP_FEE_AddCrossAdmin              = 0x30000007;
export const OP_FEE_DelCrossAdmin              = 0x30000008;

export const OP_CROSS                          = 0x40000000;
export const OP_CROSS_UserLock                 = 0x40000001;
export const OP_CROSS_SmgMint                  = 0x40000002;
export const OP_CROSS_UserBurn                 = 0x40000003;
export const OP_CROSS_UserRelease              = 0x40000004;
export const OP_CROSS_SmgRelease               = 0x40000005;
export const OP_CROSS_TransOwner               = 0x40000006;
export const OP_CROSS_ERROR                    = 0x40000007;

export const OP_TOKENPAIR                      = 0x50000000;
// export const OP_TOKENPAIR_Add                  = 0x50000001;
export const OP_TOKENPAIR_Remove               = 0x50000002;
export const OP_TOKENPAIR_Upsert               = 0x50000003;

export const OP_ORACLE                         = 0x60000000;
export const OP_ORACLE_TransferOracleAdmin     = 0x60000001;
export const OP_ORACLE_SetSMG                  = 0x60000002;
export const OP_ORACLE_CommitSMG               = 0x60000003;
export const OP_ORACLE_DeleteSMG               = 0x60000004;
// export const OP_ORACLE_AcquireReadySmgInfo     = 0x60000005;

export const OP_EXTEND                         = 0x80000000;
export const OP_EXTEND_UpdateAddInt            = 0x80000007;

export const OP_UPGRADE                         = 0x90000000;
export const OP_UPGRADE_Code                    = 0x90000001;

export const OP_GROUPAPPROVE_Proposol           = 0xa0000001;
export const OP_GROUPAPPROVE_Execute            = 0xa0000002;
export const OP_GROUPAPPROVE_Executed_CB            = 0xa0000003;
export const OP_GROUPAPPROVE_TranferFoundation  = 0xa0000004;
export const OP_GROUPAPPROVE_Execute_WithGPK    = 0xa0000005;
export const OP_GROUPAPPROVE_Proposol_SetSmgFeeProxy        = 0xa0000010;
export const OP_GROUPAPPROVE_Proposol_AddCrossAdmin         = 0xa0000011;
export const OP_GROUPAPPROVE_Proposol_DelCrossAdmin         = 0xa0000012;
export const OP_GROUPAPPROVE_Proposol_TransferOwner         = 0xa0000013;
export const OP_GROUPAPPROVE_Proposol_SetHalt               = 0xa0000014;
export const OP_GROUPAPPROVE_Proposol_TOKENPAIR_Upsert      = 0xa0000015;
export const OP_GROUPAPPROVE_Proposol_TOKENPAIR_Remove      = 0xa0000016;
export const OP_GROUPAPPROVE_Proposol_TranferFoundation     = 0xa0000017;
export const OP_GROUPAPPROVE_Proposol_TransferOracleAdmin   = 0xa0000018;
export const OP_GROUPAPPROVE_Proposol_TransferOperator      = 0xa000001;
export const OP_GROUPAPPROVE_Proposol_UpgradeSc             = 0xa000001a;

export const OP_FETCH_GPK                                   = 0xb0000001;

export const OP_COMMON_ERROR_CODE                           = 0xc0000001;


export const OP_TRANSFER_NOTIFICATION           = 0x7362d09c;
export const OP_TRANSFER                        = 0xf8a7ea5;
export const OP_EXCESSES                        = 0xd53276db;

// https://github.com/ton-blockchain/liquid-staking-contract/blob/1f4e9badbed52a4cf80cc58e4bb36ed375c6c8e7/contracts/op-codes.func#L24
// https://docs.ton.org/v3/documentation/smart-contracts/message-management/internal-messages#known-op-codes
export const OP_GLOBAL_TEXT_COMMENT = 0x00000000;
export const OP_GLOBAL_BOUNCE = 0xffffffff;
export const OP_GLOBAL_ENCRYPTED_COMMENT = 0x2167da4b;
export const OP_GLOBAL_EXCESSES = 0xd53276db;

export const OP_ELECTOR_NEW_STAKE = 0x4e73744b;
export const OP_ELECTOR_NEW_STAKE_CONFIRMATION = 0xf374484c;
export const OP_ELECTOR_RECOVER_STAKE_REQUEST = 0x47657424;
export const OP_ELECTOR_RECOVER_STAKE_RESPONSE = 0x47657424;

export const OP_WALLET_JETTON_TRANSFER = 0x0f8a7ea5;
export const OP_WALLET_JETTON_CALL_TO = 0x235caf52;

export const OP_JETTON_TRANSFER = 0xf8a7ea5;
export const OP_JETTON_INTERAL_TRANSFER = 0x178d4519;
export const OP_JETTON_NOTIFY = 0x7362d09c;
export const OP_JETTON_BURN = 0x595f07bc;
export const OP_JETTON_BURN_NOTIFICATION = 0x7bdd97de;
export const OP_JETTON_SET_STATUS = 0xeed236d3;

export const OP_JETTON_MINTER_MINT = 0x642b7d07;
export const OP_JETTON_MINTER_CHANGE_ADMIN = 0x6501f354;
export const OP_JETTON_MINTER_CLAIM_ADMIN = 0xfb88e119;
export const OP_JETTON_MINTER_DROP_ADMIN = 0x7431f221;
export const OP_JETTON_MINTER_CHANGE_METADATA = 0xcb862902;
export const OP_JETTON_MINTER_UPGRADE = 0x2508d66a;

export const OP_VESTING_TOP_UP = 0xd372158c;
export const OP_VESTING_ADD_WHITELIST = 0x7258a69b;
export const OP_VESTING_ADD_WHITELIST_RESPONSE = 0xf258a69b;
export const OP_VESTING_SEND = 0xa7733acd;
export const OP_VESTING_SEND_RESPONSE = 0xf7733acd;

export const OP_DEDUST_SWAP_EXTOUT = 0x9c610de3;
export const OP_DEDUST_SWAP_JETTON = 0xe3a0d482;
export const OP_DEDUST_SWAP_INTERNAL = 0xea06185d;
export const OP_DEDUST_SWAP_EXTERNAL = 0x61ee542d;
export const OP_DEDUST_SWAP_PEER = 0x72aca8aa;
export const OP_DEDUST_DEPOSIT_LIQUIDITY_INTERNAL = 0xd55e4686;
export const OP_DEDUST_DEPOSIT_LIQUIDITY_JETTON = 0x40e108d6;
export const OP_DEDUST_DEPOSIT_LIQUIDITY_ALL = 0xb56b9598;
export const OP_DEDUST_PAY_OUT_FROM_POOL = 0xad4eb6f5;
export const OP_DEDUST_PAYOUT = 0x474a86ca;
export const OP_DEDUST_DEPOSIT = 0xb544f4a4;
export const OP_DEDUST_WITHDRAWAL = 0x3aa870a6;
export const OP_DEDUST_CREATE_VAULT = 0x21cfe02b;
export const OP_DEDUST_CREATE_VOLATILE_POOL = 0x97d51f2f;
export const OP_DEDUST_CANCEL_DEPOSIT = 0x166cedee;

export const OP_STONFI_SWAP_INTERNAL = 0x25938561;
export const OP_STONFI_PAYMENT_REQUEST = 0xf93bb43f;
export const OP_STONFI_PROVIDE_LIQUIDITY = 0xfcf9e58f;
export const OP_STONFI_SWAP_SUCCESS = 0xc64370e5;
export const OP_STONFI_SWAP_SUCCESS_REF = 0x45078540;

export const OP_NFT_TRANSFER = 0x5fcc3d14;
export const OP_NFT_OWNERSHIP_ASSIGNED = 0x05138d91;


// export abstract class Op {
//     static readonly controller = {
//         top_up : 0xd372158c,
//         update_validator_hash : 0xf0fd2250,
//         approve : 0x7b4b42e6,
//         disapprove : 0xe8a0abfe,
//         recover_stake : 0xeb373a05,
//         credit : 0x1690c604,
//         withdraw_validator : 0x8efed779,
//         return_unused_loan : 0xed7378a6,
//         send_request_loan: 0x6335b11a,
//         newStake: 0x4e73744b
//     }
//     static readonly elector = {
//         new_stake: 0x4e73744b,
//         new_stake_ok: 0xf374484c,
//         new_stake_error: 0xee6f454c,
//         recover_stake: 0x47657424,
//         recover_stake_ok: 0xf96f7324,
//         recover_stake_error:0xfffffffe
//     }
//     static readonly pool = {
//         request_loan   : 0xe642c965,
//         loan_repayment : 0xdfdca27b,
//         deposit        : 0x47d54391,
//         withdraw       : 0x319B0CDC,
//         withdrawal     : 0x0a77535c,
//         deploy_controller : 0xb27edcad,
//         touch: 0x4bc7c2df,
//         donate: 0x73affe21
//     }
//     static readonly governor = {
//         set_sudoer : 0x79e7c016,
//         prepare_governance_migration: 0x9971881c,
//         set_roles  : 0x5e517f36,
//         unhalt  : 0x7247e7a5,
//         return_available_funds: 0x55c26cd5,
//         set_deposit_settings : 0x9bf5561c,
//         set_governance_fee: 0x2aaa96a0
//     }
//     static readonly sudo = {
//         send_message : 0x270695fb,
//         upgrade : 0x96e7f528
//     }
//     static readonly halter = {
//         halt : 0x139a1b4e
//     }
//     static readonly interestManager = {
//         set_interest : 0xc9f04485,
//         operation_fee : 0x54d37487,
//         request_notification : 0xb1ebae06,
//         stats : 0xc1344900,
//     }
//     static readonly jetton = {
//         excesses: 0xd53276db,
//         internal_transfer: 0x178d4519,
//         transfer_notification: 0x7362d09c,
//         burn : 0x595f07bc,
//         burn_notification : 0x7bdd97de,
//         withdraw_tons : 0x6d8e5e3c,
//         withdraw_jettons : 0x768a50b2,

//         provide_wallet_address : 0x2c76b973,
//         take_wallet_address : 0xd1735400,
//         change_content : 0x5773d1f5,
//     }
//     static readonly payout = {
//         init: 0xf5aa8943,
//         mint: 0x1674b0a0,
//         start_distribution: 0x1140a64f,
//         distributed_asset: 0xdb3b8abd
//     }
//     static readonly nft = {
//         ownership_assigned: 0x05138d91
//     }
// }