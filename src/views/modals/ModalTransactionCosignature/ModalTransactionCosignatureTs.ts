/*
 * Copyright 2020 NEM (https://nem.io)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and limitations under the License.
 *
 */
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import {
    Account,
    Address,
    AccountAddressRestrictionTransaction,
    AggregateTransaction,
    AggregateTransactionCosignature,
    CosignatureTransaction,
    MultisigAccountInfo,
    MultisigAccountModificationTransaction,
    NetworkType,
    TransactionStatus,
    TransactionType,
    TransferTransaction,
} from 'symbol-sdk';
import { mapGetters } from 'vuex';

import { ProfileModel } from '@/core/database/entities/ProfileModel';
import { AccountModel, AccountType } from '@/core/database/entities/AccountModel';
import { AccountTransactionSigner, TransactionAnnouncerService, TransactionSigner } from '@/services/TransactionAnnouncerService';
// child components
// @ts-ignore
import TransactionDetails from '@/components/TransactionDetails/TransactionDetails.vue';
// @ts-ignore
import TransactionOptinPayoutDetails from '@/components/TransactionDetails/TransactionOptinPayoutDetails.vue';
// @ts-ignore
import FormProfileUnlock from '@/views/forms/FormProfileUnlock/FormProfileUnlock.vue';
// @ts-ignore
import HardwareConfirmationButton from '@/components/HardwareConfirmationButton/HardwareConfirmationButton.vue';
import { CosignatureQR } from 'symbol-qr-library';
// @ts-ignore
import QRCodeDisplay from '@/components/QRCode/QRCodeDisplay/QRCodeDisplay.vue';
import { AccountService } from '@/services/AccountService';
import { LedgerService } from '@/services/LedgerService';
import { AccountMetadataTransaction } from 'symbol-sdk';
import { MultisigService } from '@/services/MultisigService';
@Component({
    components: {
        TransactionDetails,
        TransactionOptinPayoutDetails,
        FormProfileUnlock,
        HardwareConfirmationButton,
        QRCodeDisplay,
    },
    computed: {
        ...mapGetters({
            currentAccount: 'account/currentAccount',
            currentProfile: 'profile/currentProfile',
            networkType: 'network/networkType',
            generationHash: 'network/generationHash',
            currentAccountMultisigInfo: 'account/currentAccountMultisigInfo',
            multisigAccountGraphInfo: 'account/multisigAccountGraphInfo',
        }),
    },
})
export class ModalTransactionCosignatureTs extends Vue {
    @Prop({
        default: false,
    })
    visible: boolean;

    @Prop({
        default: null,
    })
    transactionHash: string;

    /**
     * Aggregate transaction fetched by transactionHash
     */
    transaction: AggregateTransaction = null;

    public multisigAccountGraphInfo: MultisigAccountInfo[][];
    /**
     * Data is loading
     */
    protected isLoading: boolean = false;

    /**
     * Currently active account
     * @see {Store.Account}
     * @var {AccountModel}
     */
    public currentAccount: AccountModel;

    /**
     * Network type
     * @see {Store.Network}
     * @var {NetworkType}
     */
    public networkType: NetworkType;

    /**
     * Currently active profile
     * @see {Store.Profile}
     * @var {string}
     */
    public currentProfile: ProfileModel;

    /**
     * Current generationHash
     * @see {Store.Network}
     * @var {string}
     */
    public generationHash: string;

    /**
     * Current account multisig info
     * @type {MultisigAccountInfo}
     */
    public currentAccountMultisigInfo: MultisigAccountInfo;

    /**
     * Whether transaction has expired
     */
    public expired: boolean = false;

    /// region computed properties
    /**
     * Visibility state
     * @type {boolean}
     */
    public get show(): boolean {
        return this.visible;
    }

    /**
     * Emits close event
     */
    public set show(val) {
        if (!val) {
            this.$emit('close');
        }
    }

    /**
     * Returns whether aggregate bonded transaction has inner Transfer with the current account address as a recipient.
     */
    public get isOptinTransactionContainsPayout(): boolean {
        // Check wether the 'transaction' prop is provided.
        if (!this.transaction) {
            return false;
        }

        // Check wether the Aggregate Bonded has inner Transfer with the current account address as a recipient.
        const currentAddress = this.currentAccount.address;
        const innerTransferTransaction = this.transaction.innerTransactions.find(
            (innerTransaction) =>
                innerTransaction.type === TransactionType.TRANSFER &&
                (innerTransaction as TransferTransaction).recipientAddress?.equals(Address.createFromRawAddress(currentAddress)),
        );

        return !!innerTransferTransaction;
    }

    /**
     * Returns whether aggregate bonded transaction is announced by NGL Finance bot
     */
    public get isOptinTransaction(): boolean {
        // Check wether the 'transaction' prop is provided.
        if (!this.transaction) {
            return false;
        }

        // Check wether the 'transaction' is type of Aggregate Bonded.
        if (this.transaction.type !== TransactionType.AGGREGATE_BONDED) {
            return false;
        }

        // Check wether the Aggregate Bonded doesn't need a current account cosignature.
        if (this.hasMissSignatures && this.needsCosignature) {
            return false;
        }

        // Check wether the signer of the Aggregate Bonded is the NGL Finance bot.
        const networktype = this.currentProfile.networkType === NetworkType.MAIN_NET ? 'mainnet' : 'testnet';
        const keysFinance = process.env.KEYS_FINANCE[networktype];
        const announcerPublicKey = this.transaction.signer.publicKey;
        const isAnnouncerNGLFinance = keysFinance.find(
            (financePublicKey) => financePublicKey.toUpperCase() === announcerPublicKey.toUpperCase(),
        );

        return isAnnouncerNGLFinance;
    }

    /**
     * Returns whether current account is a hardware wallet
     * @return {boolean}
     */
    public get isUsingHardwareWallet(): boolean {
        // XXX should use "stagedTransaction.signer" to identify account
        return (
            this.currentAccount.type === AccountType.TREZOR ||
            this.currentAccount.type === AccountType.LEDGER ||
            this.currentAccount.type === AccountType.LEDGER_OPT_IN
        );
    }

    public get needsCosignature(): boolean {
        if (this.currentAccountMultisigInfo && this.currentAccountMultisigInfo.isMultisig()) {
            return false;
        }
        // Multisig account can not sign
        const currentPubAccount = AccountModel.getObjects(this.currentAccount).publicAccount;
        if (!this.transaction.signedByAccount(currentPubAccount)) {
            const cosignerAddresses = this.transaction.innerTransactions.map((t) => t.signer?.address);
            const cosignList = [];

            const multisignService = new MultisigService();
            const mutlisigChildrenTree = multisignService.getMultisigChildren(this.multisigAccountGraphInfo);
            const mutlisigChildren = multisignService.getMultisigChildrenAddresses(this.multisigAccountGraphInfo);

            this.transaction.innerTransactions.forEach((t) => {
                if (t.type === TransactionType.MULTISIG_ACCOUNT_MODIFICATION.valueOf()) {
                    cosignList.push(...(t as MultisigAccountModificationTransaction).addressAdditions);
                } else if (t.type === TransactionType.ACCOUNT_ADDRESS_RESTRICTION.valueOf()) {
                    cosignList.push(...(t as AccountAddressRestrictionTransaction).restrictionAdditions);
                } else if (t.type === TransactionType.ACCOUNT_METADATA) {
                    if (
                        this.currentAccountMultisigInfo &&
                        this.currentAccountMultisigInfo.multisigAddresses.find(
                            (m) => m.plain() === (t as AccountMetadataTransaction).targetAddress.plain(),
                        ) !== undefined
                    ) {
                        cosignList.push(Address.createFromRawAddress(this.currentAccount.address));
                    } else {
                        cosignList.push((t as AccountMetadataTransaction).targetAddress);
                    }
                }
            });

            if (cosignList.find((m) => this.currentAccount.address === m.plain()) !== undefined) {
                return true;
            }
            const cosignRequired = cosignerAddresses.find((c) => {
                if (c) {
                    return (
                        c.plain() === this.currentAccount.address ||
                        (this.currentAccountMultisigInfo &&
                            this.currentAccountMultisigInfo.multisigAddresses.find((m) => c.equals(m)) !== undefined) ||
                        (mutlisigChildrenTree && mutlisigChildren.some((address) => address.equals(c)))
                    );
                }
                return false;
            });
            return cosignRequired !== undefined;
        }
        return false;
    }

    public get cosignatures(): AggregateTransactionCosignature[] {
        return this.transaction?.cosignatures;
    }

    public get hasMissSignatures(): boolean {
        //merkleComponentHash ==='000000000000...' present that the transaction is still lack of signature
        return (
            this.transaction?.transactionInfo != null &&
            this.transaction?.transactionInfo.merkleComponentHash !== undefined &&
            this.transaction?.transactionInfo.merkleComponentHash.startsWith('000000000000')
        );
    }

    public get cosignatureQrCode(): CosignatureQR {
        // @ts-ignore
        return new CosignatureQR(this.transaction, this.networkType, this.generationHash);
    }

    /**
     * Error notification handler
     */
    private errorNotificationHandler(error: any) {
        if (error.message && error.message.includes('cannot open device with path')) {
            error.errorCode = 'ledger_connected_other_app';
        }
        if (error.errorCode) {
            switch (error.errorCode) {
                case 'NoDevice':
                    this.$store.dispatch('notification/ADD_ERROR', 'ledger_no_device');
                    return;
                case 'ledger_not_supported_app':
                    this.$store.dispatch('notification/ADD_ERROR', 'ledger_not_supported_app');
                    return;
                case 'ledger_connected_other_app':
                    this.$store.dispatch('notification/ADD_ERROR', 'ledger_connected_other_app');
                    return;
                case 'ledger_not_correct_account':
                    this.$store.dispatch('notification/ADD_ERROR', 'ledger_not_correct_account');
                    return;
                case 26628:
                    this.$store.dispatch('notification/ADD_ERROR', 'ledger_device_locked');
                    return;
                case 27904:
                    this.$store.dispatch('notification/ADD_ERROR', 'ledger_not_opened_app');
                    return;
                case 27264:
                    this.$store.dispatch('notification/ADD_ERROR', 'ledger_not_using_xym_app');
                    return;
                case 27013:
                    this.$store.dispatch('notification/ADD_ERROR', 'ledger_user_reject_request');
                    return;
                case 26368:
                    this.$store.dispatch('notification/ADD_ERROR', 'transaction_too_long');
                    return;
            }
        } else if (error.name) {
            switch (error.name) {
                case 'TransportOpenUserCancelled':
                    this.$store.dispatch('notification/ADD_ERROR', 'ledger_no_device_selected');
                    return;
            }
        }
        this.$store.dispatch('notification/ADD_ERROR', this.$t('sign_transaction_failed', { reason: error.message || error }));
    }

    @Watch('transactionHash', { immediate: true })
    public async fetchTransaction() {
        this.isLoading = true;

        try {
            // first get the last status
            const transactionStatus: TransactionStatus = (await this.$store.dispatch('transaction/FETCH_TRANSACTION_STATUS', {
                transactionHash: this.transactionHash,
            })) as TransactionStatus;

            if (transactionStatus.group != 'failed') {
                // fetch the transaction by using the status
                this.transaction = (await this.$store.dispatch('transaction/LOAD_TRANSACTION_DETAILS', {
                    group: transactionStatus.group,
                    transactionHash: this.transactionHash,
                })) as AggregateTransaction;
            } else {
                this.expired = true;
            }
        } catch (error) {
            console.log(error);
        }

        this.isLoading = false;
    }

    /**
     * Hook called when child component FormProfileUnlock emits
     * the 'success' event.
     *
     * This hook shall *sign transactions* with the \a account
     * that has been unlocked. Subsequently it will also announce
     * the signed transaction.
     *
     * @param {Password} password
     * @return {void}
     */
    public onAccountUnlocked({ account }: { account: Account }) {
        // - log about unlock success
        this.$store.dispatch('diagnostic/ADD_INFO', 'Account ' + account.address.plain() + ' unlocked successfully.');
        return this.onSigner(new AccountTransactionSigner(account));
    }

    public async onSigner(transactionSigner: TransactionSigner) {
        // - sign cosignature transaction
        if (this.currentAccount.type === AccountType.LEDGER || this.currentAccount.type === AccountType.LEDGER_OPT_IN) {
            try {
                const ledgerService = new LedgerService(this.currentProfile.networkType);
                const isAppSupported = await ledgerService.isAppSupported();
                if (!isAppSupported) {
                    throw { errorCode: 'ledger_not_supported_app' };
                }
                const currentPath = this.currentAccount.path;
                const isOptinLedgerWallet = this.currentAccount.type === AccountType.LEDGER_OPT_IN;
                const addr = this.currentAccount.address;
                const networkType = this.currentProfile.networkType;
                const accountService = new AccountService();
                this.$store.dispatch('notification/ADD_SUCCESS', 'verify_device_information');
                const signerPublicKey = await accountService.getLedgerPublicKeyByPath(networkType, currentPath, true, isOptinLedgerWallet);
                if (signerPublicKey === this.currentAccount.publicKey.toLowerCase()) {
                    const signature = await ledgerService.signCosignatureTransaction(
                        currentPath,
                        this.transaction,
                        signerPublicKey,
                        isOptinLedgerWallet,
                    );
                    this.$store.dispatch(
                        'diagnostic/ADD_DEBUG',
                        `Co-signed transaction with account ${addr} and result: ${JSON.stringify({
                            parentHash: signature.parentHash,
                            signature: signature.signature,
                        })}`,
                    );
                    const res = await new TransactionAnnouncerService(this.$store)
                        .announceAggregateBondedCosignature(signature)
                        .toPromise();
                    if (res.success) {
                        this.$emit('success');
                        this.$emit('close');
                    } else {
                        this.errorNotificationHandler(res.error);
                    }
                } else {
                    throw { errorCode: 'ledger_not_correct_account' };
                }
            } catch (error) {
                this.show = false;
                this.errorNotificationHandler(error);
            }
        } else {
            const cosignature = CosignatureTransaction.create(this.transaction);
            const signCosignatureTransaction = await transactionSigner.signCosignatureTransaction(cosignature).toPromise();
            const res = await new TransactionAnnouncerService(this.$store)
                .announceAggregateBondedCosignature(signCosignatureTransaction)
                .toPromise();
            if (res.success) {
                this.$emit('success');
                this.show = false;
            } else {
                this.$store.dispatch('notification/ADD_ERROR', res.error, { root: true });
            }
        }
    }

    /**
     * Hook called when child component FormProfileUnlock or
     * HardwareConfirmationButton emit the 'error' event.
     * @param {string} message
     * @return {void}
     */
    public onError(error: string) {
        this.$emit('error', error);
    }
}
