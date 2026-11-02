export const iINVALID_WKID                       = 0x01;
export const iINVALID_HASH                       = 0x02;

export const iunauthorized_set_common_config     = 0xEE01;
export const iunauthorized_set_fee_config        = 0xEE02;
export const iunauthorized_set_fee_admin         = 0xEE03;
export const iunauthorized_set_fee               = 0xEE04;
export const iunauthorized_transfer_oracle_admin = 0xEE05;
export const iunauthorized_set_oracle_smg        = 0xEE06;
export const iunauthorized_set_tokenpair         = 0xEE07;
export const iunauthorized_upgrade               = 0xEE08;

export const iprivilege_unknown_opcode           = 0xEE10;
export const irecv_unknown_opcode                = 0xEE11;

export const igpk_invalid_timestamp              = 0xEE20;
export const igroup_error_chainid                = 0xEE21;
export const igroup_not_foundation               = 0xEE22;
export const igroup_gpk_not_bridge               = 0xEE23;
export const igroup_proposolid_not_found         = 0xEE24;
export const igroup_finish_not_bridge            = 0xEE25;
export const igroup_proposolid_not_found_inFinished        = 0xEE26;
export const igroup_recv_unknown_opcode          = 0xEE27;

export const ioracle_invalid_timestamp           = 0xEE30;
export const ioracle_not_matched_gpk             = 0xEE31;
export const ioracle_not_found_smg               = 0xEE32;
export const ioracle_out_time_range              = 0xEE33;

export const isignature_unknown_opcode           = 0xEE40;
export const isignature_verify_error             = 0xEE41;

export const icross_query_id_not_equal           = 0xEE50;
export const icross_invalid_jetton_amount        = 0xEE51;
// export const icross_invalid_chainid              = 0xEE52;
export const icross_invalid_jetton_admin         = 0xEE53;
export const icross_invalid_tokenpair_id         = 0xEE54;
export const icross_invalid_lock_fee             = 0xEE55;
export const icross_ton_not_enough               = 0xEE56;

export const itm_tokenpair_not_exist             = 0xEE57;
export const icross_tokenaccount_not_exist       = 0xEE58;
export const icross_lock_token_invalid_sender    = 0xEE59;
export const icross_lock_token_account_error     = 0xEE60;
export const icross_smg_release_duplicated_error = 0xEE61;