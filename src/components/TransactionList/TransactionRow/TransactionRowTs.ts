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
// external dependencies
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import { mapGetters } from 'vuex';
import {
    AccountAddressRestrictionTransaction,
    AccountMetadataTransaction,
    AggregateTransaction,
    MosaicId,
    MultisigAccountInfo,
    MultisigAccountModificationTransaction,
    NamespaceId,
    NetworkType,
    Transaction,
    TransactionType,
    TransferTransaction,
    TransactionStatus,
    MessageType,
} from 'symbol-sdk';
// internal dependencies
import { Formatters } from '@/core/utils/Formatters';
import { TimeHelpers } from '@/core/utils/TimeHelpers';
import { MosaicModel } from '@/core/database/entities/MosaicModel';
// child components
// @ts-ignore
import MosaicAmountDisplay from '@/components/MosaicAmountDisplay/MosaicAmountDisplay.vue';
// @ts-ignore
import ActionDisplay from '@/components/ActionDisplay/ActionDisplay.vue';
// resources
import { dashboardImages, officialIcons, transactionTypeToIcon } from '@/views/resources/Images';
import { TransactionViewFactory } from '@/core/transactions/TransactionViewFactory';
import { TransactionView } from '@/core/transactions/TransactionView';
import { NetworkConfigurationModel } from '../../../core/database/entities/NetworkConfigurationModel';
import { ProfileModel } from '@/core/database/entities/ProfileModel';
import { AccountModel } from '@/core/database/entities/AccountModel';
import { TransactionStatus as TransactionStatusEnum } from '@/core/transactions/TransactionStatus';
import { MultisigService } from '@/services/MultisigService';
import moment from 'moment';

export interface TooltipMosaics {
    name: string;
    relativeAmount: string;
}

@Component({
    components: {
        ActionDisplay,
        MosaicAmountDisplay,
    },
    computed: mapGetters({
        networkMosaic: 'mosaic/networkMosaic',
        explorerBaseUrl: 'app/explorerUrl',
        networkConfiguration: 'network/networkConfiguration',
        currentProfile: 'profile/currentProfile',
        currentAccount: 'account/currentAccount',
        currentAccountMultisigInfo: 'account/currentAccountMultisigInfo',
        balanceMosaics: 'mosaic/balanceMosaics',
        multisigAccountGraphInfo: 'account/multisigAccountGraphInfo',
    }),
})
export class TransactionRowTs extends Vue {
    @Prop({ default: [] })
    public transaction: Transaction;

    protected networkConfiguration: NetworkConfigurationModel;

    /**
     * Currently active profile
     * @see {Store.Profile}
     * @var {string}
     */
    public currentProfile: ProfileModel;

    /**
     * Explorer base path
     */
    protected explorerBaseUrl: string;

    /**
     * Network mosaic id
     * @private
     */
    protected networkMosaic: MosaicId;

    /**
     * Transaction type from SDK
     */
    private transactionType = TransactionType;

    /**
     * Formatters
     */
    public formatters: Formatters = Formatters;

    /**
     * Time helpers
     */
    protected timeHelpers: TimeHelpers = TimeHelpers;

    /**
     * Currently active account
     * @see {Store.Account}
     * @var {AccountModel}
     */
    private currentAccount: AccountModel;
    /**
     * Current account multisig info
     * @type {MultisigAccountInfo}
     */
    private currentAccountMultisigInfo: MultisigAccountInfo;
    /**
     * Current transaction Details
     * @type {AggregateTransaction}
     */
    private aggregateTransactionDetails: AggregateTransaction;
    /**
     * Get balance mosaics info.
     * @type {AggregateTransaction}
     */
    private balanceMosaics: MosaicModel[];
    /**
     * Checks wether transaction is signed
     * @type {boolean}
     */
    private transactionSigningFlag: boolean = false;

    private multisigAccountGraphInfo: MultisigAccountInfo[][];

    /// region computed properties getter/setter
    public get view(): TransactionView<Transaction> {
        return TransactionViewFactory.getView(this.$store, this.transaction);
    }

    /// end-region computed properties getter/setter

    /**
     * Returns whether aggregate bonded transaction is announced by NGL Finance
     */
    public get isOptinPayoutTransaction(): boolean {
        if (!this.transaction) {
            return false;
        }

        const networktype = this.currentProfile.networkType === NetworkType.MAIN_NET ? 'mainnet' : 'testnet';
        const keysFinance = process.env.KEYS_FINANCE[networktype];
        const announcerPublicKey = this.transaction.signer?.publicKey;
        const isAnnouncerNGLFinance = keysFinance.find(
            (financePublicKey) => financePublicKey.toUpperCase() === announcerPublicKey.toUpperCase(),
        );

        return isAnnouncerNGLFinance && this.view.transaction.type === this.transactionType.AGGREGATE_BONDED;
    }

    /**
     * Get icon per-transaction
     * @return an icon.
     */
    public getIcon() {
        if (this.transaction.isConfirmed()) {
            // - read per-transaction-type details@
            const view = this.view;

            // - transfers have specific incoming/outgoing icons
            if (view.transaction.type === this.transactionType.TRANSFER) {
                return view.isIncoming ? officialIcons.incoming : officialIcons.outgoing;
            }

            if (this.isOptinPayoutTransaction) {
                return transactionTypeToIcon[view.transaction.type + '_optin'];
            }

            // - otherwise use per-type icon
            return transactionTypeToIcon[view.transaction.type];
        } else {
            return this.getTransactionStatusIcon();
        }
    }
    public getTransactionStatusIcon(): string {
        return dashboardImages.dashboardUnconfirmed;
    }
    /**
     * Returns true if \a transaction is an incoming transaction
     */
    public isIncomingTransaction(): boolean {
        return this.view.isIncoming;
    }

    public getMosaicsIcon(): string {
        return officialIcons.mosaics;
    }

    public getEnvelopeIcon(): string {
        return officialIcons.envelope;
    }

    /**
     * Returns the XYM amount to be shown.
     */
    public getAmount(): number {
        if (this.transaction.type === TransactionType.TRANSFER) {
            const transferTransaction = this.transaction as TransferTransaction;
            const amount = transferTransaction.mosaics.find((mosaic) => mosaic.id.equals(this.networkMosaic)).amount.compact() || 0;

            if (!this.isIncomingTransaction()) {
                return -amount;
            }
            return amount;
        }

        return 0;
    }

    /**
     * Returns the color of the balance
     */
    public getAmountColor(): string {
        // https://github.com/nemfoundation/nem2-desktop-account/issues/879
        if (this.transaction.type === TransactionType.TRANSFER) {
            return this.isIncomingTransaction() ? 'green' : 'red';
        }
        return undefined;
    }

    /**
     * Returns the mosaic id of the balance or undefined for the network.
     */
    public getAmountMosaicId(): MosaicId | NamespaceId | undefined {
        if (this.transaction.type === TransactionType.TRANSFER) {
            const transferTransaction = this.transaction as TransferTransaction;
            return transferTransaction.mosaics.find((mosaic) => mosaic.id.equals(this.networkMosaic)).id || undefined;
        }
        return undefined;
    }

    /**
     * Should he ticker be shown in the amount column
     */
    public isAmountShowTicker(): boolean {
        // if (this.transaction.type === TransactionType.TRANSFER) {
        //   const transferTransaction = this.transaction as TransferTransaction
        //   return !!transferTransaction.mosaics.length
        // }
        // return true
        return false;
    }
    public async needsCosignature() {
        // Multisig account can not sign

        const currentPubAccount = AccountModel.getObjects(this.currentAccount).publicAccount;
        if (this.transaction instanceof AggregateTransaction && this.transaction.type === TransactionType.AGGREGATE_BONDED) {
            if (this.currentAccountMultisigInfo && this.currentAccountMultisigInfo.isMultisig()) {
                this.transactionSigningFlag = false;
                return;
            }
            if (
                this.aggregateTransactionDetails !== undefined &&
                this.aggregateTransactionDetails.transactionInfo?.hash == this.transaction.transactionInfo?.hash
            ) {
                if (this.aggregateTransactionDetails.signedByAccount(currentPubAccount)) {
                    this.transactionSigningFlag = false;
                    return;
                }
                const cosignList = [];
                const cosignerAddresses = this.aggregateTransactionDetails.innerTransactions.map((t) => t.signer?.address);
                const multisignService = new MultisigService();
                const mutlisigChildrenTree = multisignService.getMultisigChildren(this.multisigAccountGraphInfo);
                const mutlisigChildren = multisignService.getMultisigChildrenAddresses(this.multisigAccountGraphInfo);

                this.aggregateTransactionDetails.innerTransactions.forEach((t) => {
                    if (t.type === TransactionType.MULTISIG_ACCOUNT_MODIFICATION.valueOf()) {
                        cosignList.push(...(t as MultisigAccountModificationTransaction).addressAdditions);
                    } else if (t.type === TransactionType.ACCOUNT_ADDRESS_RESTRICTION.valueOf()) {
                        cosignList.push(...(t as AccountAddressRestrictionTransaction).restrictionAdditions);
                    } else if (t.type === TransactionType.ACCOUNT_METADATA) {
                        cosignList.push((t as AccountMetadataTransaction).targetAddress);
                    }
                });
                if (cosignList.find((m) => this.currentAccount.address === m.plain()) !== undefined) {
                    this.transactionSigningFlag = true;
                    return;
                }
                const cosignRequired = cosignerAddresses.find((c) => {
                    if (c) {
                        return (this.transactionSigningFlag =
                            c.plain() === this.currentAccount.address ||
                            (this.currentAccountMultisigInfo &&
                                this.currentAccountMultisigInfo.multisigAddresses.find((m) => c.equals(m)) !== undefined) ||
                            (mutlisigChildrenTree && mutlisigChildren.some((address) => address.equals(c))));
                    }
                    this.transactionSigningFlag = false;
                    return;
                });
                this.transactionSigningFlag = cosignRequired !== undefined;
                return;
            }
            this.transactionSigningFlag = false;
            return;
        }
        return;
    }

    /**
     * Check the transaction included message.
     * @returns boolean
     */
    public hasMessage(): boolean {
        if (this.transaction.type === TransactionType.TRANSFER) {
            const transferTransaction = this.transaction as TransferTransaction;
            const payload = transferTransaction.message.payload;
            return typeof payload === 'string' && payload.length > 0;
        }
        return false;
    }

    /**
     * Check the transaction included network mosaic (XYM).
     * @returns boolean
     */
    public hasNetworkMosaic(): boolean {
        if (this.transaction.type === TransactionType.TRANSFER) {
            const transferTransaction = this.transaction as TransferTransaction;

            return transferTransaction.mosaics.filter((mosaic) => mosaic.id.equals(this.networkMosaic)).length > 0;
        }
        return false;
    }

    /**
     * Check the transaction included Non network mosaic (XYM).
     * @returns boolean
     */
    public hasNonNativeMosaic(): boolean {
        if (this.transaction.type === TransactionType.TRANSFER) {
            const transferTransaction = this.transaction as TransferTransaction;

            return transferTransaction.mosaics.filter((mosaic) => !mosaic.id.equals(this.networkMosaic)).length > 0;
        }
        return false;
    }

    /**
     * Gets mosaics list excluded network mosaics.
     * @returns
     */
    public nonNativeMosaicList(): TooltipMosaics[] {
        if (this.transaction.type === TransactionType.TRANSFER) {
            const transferTransaction = this.transaction as TransferTransaction;

            return transferTransaction.mosaics
                .filter((mosaic) => !mosaic.id.equals(this.networkMosaic))
                .map((mosaic) => {
                    const mosaicInfo = this.balanceMosaics.find((mosaicInfo) => mosaicInfo.mosaicIdHex === mosaic.id.toHex());

                    if (mosaicInfo) {
                        return {
                            name: mosaicInfo.name || mosaicInfo.mosaicIdHex,
                            relativeAmount: Formatters.formatNumber(mosaic.amount.compact() / Math.pow(10, mosaicInfo.divisibility)),
                        };
                    } else {
                        return {
                            name: mosaic.id.toHex(),
                            relativeAmount: Formatters.formatNumber(mosaic.amount.compact()),
                        };
                    }
                });
        }
        return [];
    }

    /**
     * Gets transaction message payload.
     * @returns string
     */
    public get messagePayload(): string {
        if (this.transaction.type === TransactionType.TRANSFER) {
            const transferTransaction = this.transaction as TransferTransaction;

            if (transferTransaction.message.type === MessageType.EncryptedMessage) {
                return `${this.$t('encrypted_message')}`;
            } else {
                if (transferTransaction.message.payload.length > 40) {
                    return `${transferTransaction.message.payload.slice(0, 40)}...`;
                }

                return transferTransaction.message.payload;
            }
        }

        return '';
    }

    private get hasMissSignatures(): boolean {
        //merkleComponentHash ==='000000000000...' present that the transaction is still lack of signature
        return (
            this.transaction?.transactionInfo != null &&
            this.transaction?.transactionInfo.merkleComponentHash !== undefined &&
            this.transaction?.transactionInfo.merkleComponentHash.startsWith('000000000000')
        );
    }

    /**
     * Default set top 5 mosaics.
     */
    private get numberOfShowMosicsTooltips(): number {
        return 5;
    }

    @Watch('transaction', { immediate: true })
    private async fetchTransaction() {
        if (
            this.transaction instanceof AggregateTransaction &&
            this.transaction.type === TransactionType.AGGREGATE_BONDED &&
            this.hasMissSignatures
        ) {
            this.transactionSigningFlag = true;
            try {
                // first get the last status
                const transactionStatus: TransactionStatus = (await this.$store.dispatch('transaction/FETCH_TRANSACTION_STATUS', {
                    transactionHash: this.transaction.transactionInfo?.hash,
                })) as TransactionStatus;

                if (transactionStatus.group != 'failed') {
                    // fetch the transaction by using the status
                    this.aggregateTransactionDetails = (await this.$store.dispatch('transaction/LOAD_TRANSACTION_DETAILS', {
                        group: transactionStatus.group,
                        transactionHash: this.transaction.transactionInfo?.hash,
                    })) as AggregateTransaction;
                    await this.needsCosignature();
                }
            } catch (error) {
                console.log(error);
            }
        }
    }

    /**
     * Returns the transaction height or number of confirmations
     */
    public getHeight(): string {
        const transactionStatus = TransactionView.getTransactionStatus(this.transaction);
        if (transactionStatus === TransactionStatusEnum.confirmed) {
            return this.view.info?.height.compact().toString();
        } else {
            return this.$t(`transaction_status_${transactionStatus}`).toString();
        }
    }

    /**
     * Returns the explorer url
     */
    public get explorerUrl() {
        return this.explorerBaseUrl.replace(/\/+$/, '') + '/transactions/' + this.transaction.transactionInfo.hash;
    }

    public get date() {
        if (this.transaction instanceof AggregateTransaction) {
            return moment(
                String(this.transaction.deadline.toLocalDateTime(this.networkConfiguration.epochAdjustment).minusHours(48)),
            ).format('YYYY-MM-DD HH:mm:ss');
        } else if (this.transaction.type === TransactionType.HASH_LOCK) {
            return moment(
                String(this.transaction.deadline.toLocalDateTime(this.networkConfiguration.epochAdjustment).minusHours(6)),
            ).format('YYYY-MM-DD HH:mm:ss');
        } else {
            return moment(
                String(this.transaction.deadline.toLocalDateTime(this.networkConfiguration.epochAdjustment).minusHours(2)),
            ).format('YYYY-MM-DD HH:mm:ss');
        }
    }
}
