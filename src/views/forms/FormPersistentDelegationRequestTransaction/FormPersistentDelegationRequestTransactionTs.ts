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
import {
    UInt64,
    AccountKeyLinkTransaction,
    LinkAction,
    Transaction,
    VrfKeyLinkTransaction,
    Account,
    NodeKeyLinkTransaction,
    PersistentDelegationRequestTransaction,
    AccountInfo,
    AggregateTransaction,
    PublicAccount,
    Deadline,
    LockFundsTransaction,
    Mosaic,
    SignedTransaction,
    Password,
    Crypto,
    TransactionType,
} from 'symbol-sdk';
import { Component, Prop, Watch } from 'vue-property-decorator';
import { mapGetters } from 'vuex';
import Vue from 'vue';

// internal dependencies
import { Formatters } from '@/core/utils/Formatters';
import { FormTransactionBase } from '@/views/forms/FormTransactionBase/FormTransactionBase';

// child components
import { ValidationObserver } from 'vee-validate';
// @ts-ignore
import FormWrapper from '@/components/FormWrapper/FormWrapper.vue';
// @ts-ignore
import ModalTransactionConfirmation from '@/views/modals/ModalTransactionConfirmation/ModalTransactionConfirmation.vue';
// @ts-ignore
import SignerSelector from '@/components/SignerSelector/SignerSelector.vue';
// @ts-ignore
import MaxFeeAndSubmit from '@/components/MaxFeeAndSubmit/MaxFeeAndSubmit.vue';
// @ts-ignore
import NetworkNodeSelector from '@/components/NetworkNodeSelector/NetworkNodeSelector.vue';
// @ts-ignore
import FormRow from '@/components/FormRow/FormRow.vue';
// @ts-ignore
import ErrorTooltip from '@/components/ErrorTooltip/ErrorTooltip.vue';
// @ts-ignore
import Alert from '@/components/Alert/Alert.vue';
import { ValidationProvider } from 'vee-validate';

import { HarvestingStatus } from '@/store/Harvesting';
import { AccountTransactionSigner, TransactionAnnouncerService, TransactionSigner } from '@/services/TransactionAnnouncerService';
import { Observable, of } from 'rxjs';
import { flatMap, map, tap } from 'rxjs/operators';
import { BroadcastResult } from '@/core/transactions/BroadcastResult';
import { NodeModel } from '@/core/database/entities/NodeModel';
import { MosaicModel } from '@/core/database/entities/MosaicModel';
import { HarvestingModel } from '@/core/database/entities/HarvestingModel';
import { AccountModel, AccountType } from '@/core/database/entities/AccountModel';
//@ts-ignore
import ButtonCopyToClipboard from '@/components/ButtonCopyToClipboard/ButtonCopyToClipboard.vue';
// @ts-ignore
import AccountPublicKeyDisplay from '@/components/AccountPublicKeyDisplay/AccountPublicKeyDisplay.vue';
// @ts-ignore
import ProtectedPrivateKeyDisplay from '@/components/ProtectedPrivateKeyDisplay/ProtectedPrivateKeyDisplay.vue';
// @ts-ignore
import ModalFormProfileUnlock from '@/views/modals/ModalFormProfileUnlock/ModalFormProfileUnlock.vue';
import { officialIcons } from '@/views/resources/Images';
// @ts-ignore
import ModalImportPrivateKey from '@/views/modals/ModalImportPrivateKey/ModalImportPrivateKey.vue';
// @ts-ignore
import NavigationLinks from '@/components/NavigationLinks/NavigationLinks.vue';
// @ts-ignore
import ModalConfirm from '@/views/modals/ModalConfirm/ModalConfirm.vue';
// @ts-ignore
import MaxFeeSelector from '@/components/MaxFeeSelector/MaxFeeSelector.vue';

export enum HarvestingAction {
    START = 1,
    STOP = 2,
    SWAP = 3,
    ACTIVATE = 4,
    SINGLE_KEY = 5,
}
export enum PublicKeyTitle {
    REMOTE = 'create_remote_public_key',
    VRF = 'create_vrf_public_key',
}

@Component({
    components: {
        Alert,
        FormWrapper,
        ModalTransactionConfirmation,
        SignerSelector,
        ValidationObserver,
        MaxFeeAndSubmit,
        FormRow,
        NetworkNodeSelector,
        ErrorTooltip,
        ValidationProvider,
        ButtonCopyToClipboard,
        AccountPublicKeyDisplay,
        ProtectedPrivateKeyDisplay,
        ModalFormProfileUnlock,
        ModalImportPrivateKey,
        NavigationLinks,
        ModalConfirm,
        MaxFeeSelector,
    },
    computed: {
        ...mapGetters({
            currentHeight: 'network/currentHeight',
            currentSignerAccountInfo: 'account/currentSignerAccountInfo',
            harvestingStatus: 'harvesting/status',
            currentSignerHarvestingModel: 'harvesting/currentSignerHarvestingModel',
            networkBalanceMosaics: 'mosaic/networkBalanceMosaics',
            currentAccount: 'account/currentAccount',
            feesConfig: 'network/feesConfig',
            accountsInfo: 'account/accountsInfo',
        }),
    },
})
export class FormPersistentDelegationRequestTransactionTs extends FormTransactionBase {
    @Prop({ default: null }) signerAddress: string;
    //@Prop({ default: true }) withLink: boolean;

    /**
     * Formatters helpers
     */
    public formatters = Formatters;

    /**
     * Form items
     */
    public formItems = {
        nodeModel: { nodePublicKey: '' } as NodeModel,
        signerAddress: '',
        maxFee: 1,
    };
    private accountsInfo: AccountInfo[];

    private newVrfKeyAccount: Account;
    private newRemoteAccount: Account;

    public currentAccount: AccountModel;
    /**
     * Current signer account info
     */
    private currentSignerAccountInfo: AccountInfo;

    private currentSignerHarvestingModel: HarvestingModel;

    private action = HarvestingAction.START;

    private harvestingStatus: HarvestingStatus;

    private tempTransactionSigner: TransactionSigner;
    private tempAccount: Account;
    public vrfPrivateKeyTemp: string;
    public remotePrivateKeyTemp: string;

    /**
     * Panel tab management getters/setters
     */
    public showConfirmModal = false;
    public isDelegatedHarvestingWarningModalShown = false;
    public activeIndex = 0;

    public get allNodeListUrl() {
        return this.$store.getters['app/explorerUrl'] + 'nodes';
    }

    public get activePanel() {
        return this.activeIndex;
    }

    public set activePanel(panel) {
        if (panel === 1) {
            this.showConfirmModal = true;
        } else if (panel === -1) {
            this.activeIndex = 1;
        } else {
            this.activeIndex = panel;
        }
    }

    public get isActivatedFromAnotherDevice(): boolean {
        if (!this.currentSignerAccountInfo || !this.currentSignerAccountInfo.supplementalPublicKeys) {
            return false;
        }
        return (
            !this.formItems.nodeModel.url &&
            ((!this.currentSignerHarvestingModel.encRemotePrivateKey && !!this.currentSignerAccountInfo.supplementalPublicKeys.linked) ||
                (!this.currentSignerHarvestingModel.encVrfPrivateKey && !!this.currentSignerAccountInfo.supplementalPublicKeys.vrf))
        );
    }

    private activating = false;
    private feesConfig: {
        fast: number;
        median: number;
        slow: number;
        slowest: number;
        free: number;
    };
    /**
     * Current account owned mosaics
     * @protected
     * @type {MosaicModel[]}
     */
    private networkBalanceMosaics: MosaicModel;

    /**
     * Whether account is currently being unlocked
     * @var {boolean}
     */
    public isUnlockingAccount: boolean = false;
    public isUnlockingLedgerAccount: boolean = false;
    public remoteAccountPrivateKey: string;
    public vrfPrivateKey: string;

    /**
     * signle key link transaction type
     * @var {string}
     */
    private type: string;
    private password: string;
    private linkIcon: string = officialIcons.publicChain;
    private linking = false;
    private showModalImportKey: boolean = false;
    private modalImportKeyTitle: string = '';

    /**
     * Reset the form with properties
     * @return {void}
     */
    protected resetForm() {
        // - set default form values
        this.action = HarvestingAction.START;
        // - maxFee must be absolute
        this.newVrfKeyAccount = Account.generateNewAccount(this.networkType);
        this.newRemoteAccount = Account.generateNewAccount(this.networkType);
        this.tempAccount = Account.generateNewAccount(this.networkType);
        this.tempTransactionSigner = new AccountTransactionSigner(this.tempAccount);
    }

    @Watch('currentSignerAccountInfo', { immediate: true })
    private currentSignerWatch() {
        this.formItems.signerAddress = this.signerAddress || this.currentSignerAccountInfo?.address.plain();
        if (this.isNodeKeyLinked) {
            this.formItems.nodeModel.nodePublicKey = this.currentSignerAccountInfo?.supplementalPublicKeys.node.publicKey;
            if (this.currentSignerHarvestingModel?.selectedHarvestingNode) {
                this.formItems.nodeModel = this.currentSignerHarvestingModel.selectedHarvestingNode;
            } else {
                this.formItems.nodeModel = { nodePublicKey: '' } as NodeModel;
            }
        } else {
            // Check account is belong to node operator.
            this.formItems.nodeModel = this.currentSignerHarvestingModel?.selectedHarvestingNode
                ? this.currentSignerHarvestingModel.selectedHarvestingNode
                : ({ nodePublicKey: '' } as NodeModel);
        }
    }

    @Watch('formItems.nodeModel', { immediate: true })
    private nodeModelChanged() {
        if (
            this.isActivatedFromAnotherDevice &&
            this.formItems.nodeModel &&
            this.formItems.nodeModel.url &&
            this.formItems.nodeModel.nodePublicKey === this.currentSignerAccountInfo?.supplementalPublicKeys.node.publicKey
        ) {
            const accountAddress = this.currentSignerHarvestingModel.accountAddress;
            this.$store.dispatch('harvesting/UPDATE_ACCOUNT_SELECTED_HARVESTING_NODE', {
                accountAddress,
                selectedHarvestingNode: this.formItems.nodeModel,
            });
        }
    }

    /**
     * To get singleKeyTransaction
     */
    protected getSingleKeyLinkTransaction(type?: string, transactionSigner = this.tempTransactionSigner): Observable<Transaction[]> {
        const maxFee = UInt64.fromUint(this.formItems.maxFee) || UInt64.fromUint(this.feesConfig.fast);

        let transaction: Transaction;
        switch (type) {
            case 'account':
                this.remotePrivateKeyTemp = this.newRemoteAccount?.privateKey;
                transaction = this.createAccountKeyLinkTx(
                    this.isAccountKeyLinked
                        ? this.currentSignerAccountInfo.supplementalPublicKeys.linked?.publicKey
                        : this.newRemoteAccount.publicKey,
                    this.isAccountKeyLinked ? LinkAction.Unlink : LinkAction.Link,
                    maxFee,
                );
                break;
            case 'vrf':
                this.vrfPrivateKeyTemp = this.newVrfKeyAccount?.privateKey;
                transaction = this.createVrfKeyLinkTx(
                    this.isVrfKeyLinked
                        ? this.currentSignerAccountInfo.supplementalPublicKeys.vrf?.publicKey
                        : this.newVrfKeyAccount.publicKey,
                    this.isVrfKeyLinked ? LinkAction.Unlink : LinkAction.Link,
                    maxFee,
                );
                break;
            case 'node':
                transaction = this.createNodeKeyLinkTx(
                    this.isNodeKeyLinked
                        ? this.currentSignerAccountInfo.supplementalPublicKeys.node?.publicKey
                        : this.formItems.nodeModel.nodePublicKey,
                    this.isNodeKeyLinked ? LinkAction.Unlink : LinkAction.Link,
                    maxFee,
                );
                break;
        }
        return this.isMultisigMode()
            ? this.toMultiSigAggregate([transaction], maxFee, transactionSigner)
            : of([this.calculateSuggestedMaxFee(transaction)]);
    }
    /**
     * To get all the key link transactions
     */
    protected getKeyLinkTransactions(transactionSigner = this.tempTransactionSigner): Observable<Transaction[]> {
        const maxFee = UInt64.fromUint(this.formItems.maxFee) || UInt64.fromUint(this.feesConfig.fast);
        const txs: Transaction[] = [];

        /*
         LINK
         START => link all (new keys)
         STOP =>  unlink all (linked keys)
         SWAP =>  unlink(linked) + link all (new keys)
         */
        if (this.isAccountKeyLinked && !this.currentSignerHarvestingModel?.encRemotePrivateKey) {
            const accountUnlinkTx = this.createAccountKeyLinkTx(
                this.currentSignerAccountInfo.supplementalPublicKeys?.linked.publicKey,
                LinkAction.Unlink,
                maxFee,
            );
            txs.push(accountUnlinkTx);
        }
        if (this.isVrfKeyLinked && !this.currentSignerHarvestingModel?.encVrfPrivateKey) {
            const vrfUnlinkTx = this.createVrfKeyLinkTx(
                this.currentSignerAccountInfo.supplementalPublicKeys?.vrf.publicKey,
                LinkAction.Unlink,
                maxFee,
            );
            txs.push(vrfUnlinkTx);
        }
        if (this.isNodeKeyLinked) {
            const nodeUnLinkTx = this.createNodeKeyLinkTx(
                this.currentSignerAccountInfo.supplementalPublicKeys?.node.publicKey,
                LinkAction.Unlink,
                maxFee,
            );
            txs.push(nodeUnLinkTx);
        }

        if (this.action !== HarvestingAction.STOP) {
            if (!this.isAccountKeyLinked || !this.currentSignerHarvestingModel?.encRemotePrivateKey) {
                const accountKeyLinkTx = this.createAccountKeyLinkTx(this.newRemoteAccount.publicKey, LinkAction.Link, maxFee);
                txs.push(accountKeyLinkTx);
            }
            if (!this.isVrfKeyLinked || !this.currentSignerHarvestingModel?.encVrfPrivateKey) {
                const vrfKeyLinkTx = this.createVrfKeyLinkTx(this.newVrfKeyAccount.publicKey, LinkAction.Link, maxFee);
                txs.push(vrfKeyLinkTx);
            }

            if (!this.isNodeKeyLinked) {
                const nodeLinkTx = this.createNodeKeyLinkTx(this.formItems.nodeModel.nodePublicKey, LinkAction.Link, maxFee);
                txs.push(nodeLinkTx);
            }
        }

        if (txs.length > 0) {
            if (this.action === HarvestingAction.START) {
                this.remotePrivateKeyTemp = this.newRemoteAccount?.privateKey;
                this.vrfPrivateKeyTemp = this.newVrfKeyAccount?.privateKey;
            }
            if (this.isMultisigMode()) {
                return this.toMultiSigAggregate(txs, maxFee, transactionSigner);
            } else {
                const aggregate = this.calculateSuggestedMaxFee(
                    AggregateTransaction.createComplete(
                        Deadline.create(this.epochAdjustment),
                        txs.map((t) => t.toAggregate(this.currentSignerAccount)),
                        this.networkType,
                        [],
                        maxFee,
                    ),
                );
                return of([aggregate]);
            }
        }
        return of([]);
    }

    public get isAllKeysLinked(): boolean {
        return this.isNodeKeyLinked && this.isVrfKeyLinked && this.isAccountKeyLinked;
    }

    public toMultiSigAggregate(txs: Transaction[], maxFee, transactionSigner: TransactionSigner) {
        const aggregate = this.calculateSuggestedMaxFee(
            AggregateTransaction.createBonded(
                Deadline.create(this.epochAdjustment, 48),
                txs.map((t) => t.toAggregate(this.currentSignerAccount)),
                this.networkType,
                [],
                maxFee,
            ),
        );
        return transactionSigner.signTransaction(aggregate, this.generationHash).pipe(
            map((signedAggregateTransaction) => {
                const hashLock = this.calculateSuggestedMaxFee(
                    LockFundsTransaction.create(
                        Deadline.create(this.epochAdjustment, 6),
                        new Mosaic(this.networkMosaic, UInt64.fromNumericString(this.networkConfiguration.lockedFundsPerAggregate)),
                        UInt64.fromUint(5760),
                        signedAggregateTransaction,
                        this.networkType,
                        maxFee,
                    ),
                );
                return [hashLock, aggregate];
            }),
        );
    }

    public decryptKeys(password?: Password) {
        if (
            this.currentSignerHarvestingModel?.encRemotePrivateKey &&
            this.currentSignerHarvestingModel?.encVrfPrivateKey &&
            this.action == HarvestingAction.ACTIVATE
        ) {
            this.remoteAccountPrivateKey = Crypto.decrypt(this.currentSignerHarvestingModel?.encRemotePrivateKey, password.value);
            this.vrfPrivateKey = Crypto.decrypt(this.currentSignerHarvestingModel?.encVrfPrivateKey, password.value);
        }
        return (this.password = password.value);
    }

    public getPersistentDelegationRequestTransaction(
        transactionSigner: TransactionSigner = this.tempTransactionSigner,
    ): Observable<Transaction[]> {
        const maxFee = UInt64.fromUint(this.formItems.maxFee) || UInt64.fromUint(this.feesConfig.fast);
        if (this.action !== HarvestingAction.STOP) {
            const persistentDelegationReqTx = PersistentDelegationRequestTransaction.createPersistentDelegationRequestTransaction(
                Deadline.create(this.epochAdjustment, this.isMultisigMode() ? 24 : 2),
                this.remoteAccountPrivateKey || this.newRemoteAccount.privateKey,
                this.vrfPrivateKey || this.newVrfKeyAccount.privateKey,
                this.formItems.nodeModel.nodePublicKey,
                this.networkType,
                maxFee,
            );

            return this.isMultisigMode()
                ? this.toMultiSigAggregate([persistentDelegationReqTx], maxFee, transactionSigner)
                : of([this.calculateSuggestedMaxFee(persistentDelegationReqTx)]);
        }
        return of([]);
    }

    public resolveTransactions(): Observable<Transaction[]> {
        if (this.action === HarvestingAction.ACTIVATE) {
            return this.getPersistentDelegationRequestTransaction();
        } else if (this.action === HarvestingAction.SINGLE_KEY) {
            return this.getSingleKeyLinkTransaction(this.type);
        } else {
            return this.getKeyLinkTransactions();
        }
    }
    public announce(service: TransactionAnnouncerService, transactionSigner: TransactionSigner): Observable<Observable<BroadcastResult>[]> {
        const accountAddress = this.currentSignerHarvestingModel.accountAddress;

        // store new vrf Key info in local
        if (this.vrfPrivateKeyTemp) {
            this.saveVrfKeyInfo(
                accountAddress,
                Crypto.encrypt(this.newVrfKeyAccount.privateKey, this.password),
                this.newVrfKeyAccount.publicKey,
            );
        }

        // store new remote Key info in local
        if (this.remotePrivateKeyTemp) {
            this.saveRemoteKeyInfo(
                accountAddress,
                Crypto.encrypt(this.newRemoteAccount.privateKey, this.password),
                this.newRemoteAccount.publicKey,
            );
        }

        if (this.action === HarvestingAction.ACTIVATE) {
            // announce the persistent Delegation Request
            return this.getPersistentDelegationRequestTransaction(transactionSigner).pipe(
                flatMap((transactions) => {
                    Vue.set(this, 'activating', true);
                    const signedTransactions = transactions.map((t) => transactionSigner.signTransaction(t, this.generationHash));
                    if (!signedTransactions.length) {
                        return of([]) as Observable<Observable<BroadcastResult>[]>;
                    }
                    if (this.isMultisigMode()) {
                        return of([this.announceHashAndAggregateBonded(service, signedTransactions)]);
                    } else {
                        return of(this.announceSimple(service, signedTransactions));
                    }
                }),
                tap((resArr) =>
                    resArr[0].subscribe((res) => {
                        if (res.success) {
                            this.$store.dispatch('harvesting/UPDATE_ACCOUNT_IS_PERSISTENT_DEL_REQ_SENT', {
                                accountAddress,
                                isPersistentDelReqSent: true,
                            });
                        }
                        Vue.set(this, 'activating', false);
                    }),
                ),
            );
        } else if (this.action === HarvestingAction.SINGLE_KEY) {
            return this.getSingleKeyLinkTransaction(this.type, transactionSigner).pipe(
                flatMap((transactions) => {
                    const signedTransactions = transactions.map((t) => transactionSigner.signTransaction(t, this.generationHash));
                    if (!signedTransactions.length) {
                        return of([]) as Observable<Observable<BroadcastResult>[]>;
                    }
                    if (this.isMultisigMode()) {
                        return of([this.announceHashAndAggregateBonded(service, signedTransactions)]);
                    } else {
                        return of(this.announceSimple(service, signedTransactions));
                    }
                }),
                tap((resArr) => {
                    resArr[0].subscribe((res) => {
                        if (res.success) {
                            // @ts-ignore
                            if (res.transaction?.type === TransactionType.VRF_KEY_LINK) {
                                // @ts-ignore
                                res.transaction?.linkAction === LinkAction.Link
                                    ? this.saveVrfKey(accountAddress, Crypto.encrypt(this.vrfPrivateKeyTemp, this.password))
                                    : this.saveVrfKey(accountAddress, null);
                            }
                            if (res.transaction?.type === TransactionType.ACCOUNT_KEY_LINK) {
                                // @ts-ignore
                                res.transaction?.linkAction === LinkAction.Link
                                    ? this.saveRemoteKey(accountAddress, Crypto.encrypt(this.remotePrivateKeyTemp, this.password))
                                    : this.saveRemoteKey(accountAddress, null);
                            }
                            if (res.transaction?.type === TransactionType.NODE_KEY_LINK) {
                                this.$store.dispatch('harvesting/SET_POLLING_TRIALS', 1);
                                this.updateHarvestingRequestStatus(accountAddress, false);
                            }
                            this.$store.dispatch('harvesting/UPDATE_ACCOUNT_IS_PERSISTENT_DEL_REQ_SENT', {
                                accountAddress,
                                isPersistentDelReqSent: false,
                            });
                            this.$store.dispatch('harvesting/UPDATE_ACCOUNT_SELECTED_HARVESTING_NODE', {
                                accountAddress,
                                selectedHarvestingNode: this.formItems.nodeModel,
                            });
                        }
                    });
                }),
            );
        }
        // announce the keyLink txs and save the vrf and remote private keys encrypted to the storage
        return this.getKeyLinkTransactions(transactionSigner).pipe(
            flatMap((transactions) => {
                Vue.set(this, 'linking', true);
                const signedTransactions = transactions.map((t) => transactionSigner.signTransaction(t, this.generationHash));
                if (!signedTransactions.length) {
                    return of([]) as Observable<Observable<BroadcastResult>[]>;
                }
                if (this.isMultisigMode()) {
                    return of([this.announceHashAndAggregateBonded(service, signedTransactions)]);
                } else {
                    return of(this.announceSimple(service, signedTransactions));
                }
            }),
            tap((resArr) =>
                resArr[0].subscribe((res) => {
                    if (res.success) {
                        // @ts-ignore
                        res.transaction?.innerTransactions.forEach((val) => {
                            if (val.type === TransactionType.ACCOUNT_KEY_LINK) {
                                val.linkAction === LinkAction.Link && this.remotePrivateKeyTemp
                                    ? this.saveRemoteKey(accountAddress, Crypto.encrypt(this.remotePrivateKeyTemp, this.password))
                                    : this.saveRemoteKey(accountAddress, null);
                            }
                            if (val.type === TransactionType.VRF_KEY_LINK) {
                                val.linkAction == LinkAction.Link && this.vrfPrivateKeyTemp
                                    ? this.saveVrfKey(accountAddress, Crypto.encrypt(this.vrfPrivateKeyTemp, this.password))
                                    : this.saveVrfKey(accountAddress, null);
                            }
                            if (val.type === TransactionType.NODE_KEY_LINK) {
                                this.$store.dispatch('harvesting/SET_POLLING_TRIALS', 1);
                                this.updateHarvestingRequestStatus(accountAddress, false);
                            }
                        });

                        this.$store.dispatch('harvesting/UPDATE_ACCOUNT_IS_PERSISTENT_DEL_REQ_SENT', {
                            accountAddress,
                            isPersistentDelReqSent: false,
                        });

                        this.$store.dispatch('harvesting/UPDATE_ACCOUNT_SELECTED_HARVESTING_NODE', {
                            accountAddress,
                            selectedHarvestingNode: this.formItems.nodeModel,
                        });
                        Vue.set(this, 'linking', false);
                    }
                }),
            ),
        );
    }

    private announceHashAndAggregateBonded(
        service: TransactionAnnouncerService,
        signedTransactions: Observable<SignedTransaction>[],
    ): Observable<BroadcastResult> {
        return signedTransactions[0].pipe(
            flatMap((signedHashLockTransaction) => {
                return signedTransactions[1].pipe(
                    flatMap((signedAggregateTransaction) => {
                        return service.announceHashAndAggregateBonded(signedHashLockTransaction, signedAggregateTransaction);
                    }),
                );
            }),
        );
    }

    private announceSimple(
        service: TransactionAnnouncerService,
        signedTransactions: Observable<SignedTransaction>[],
    ): Observable<BroadcastResult>[] {
        return signedTransactions.map((o) => o.pipe(flatMap((s) => service.announce(s))));
    }

    private calculateSuggestedMaxFee(transaction: Transaction): Transaction {
        const feeMultiplier = this.resolveFeeMultipler(transaction);
        if (!feeMultiplier) {
            return transaction;
        }
        if (transaction instanceof AggregateTransaction) {
            // @ts-ignore
            return transaction.setMaxFeeForAggregate(feeMultiplier, this.requiredCosignatures);
        } else {
            return transaction.setMaxFee(feeMultiplier);
        }
    }

    private resolveFeeMultipler(transaction: Transaction): number | undefined {
        if (transaction.maxFee.compact() === 10) {
            const fees = this.transactionFees.minFeeMultiplier + this.transactionFees.averageFeeMultiplier * 0.65;
            return fees || this.networkConfiguration.defaultDynamicFeeMultiplier;
        }
        // fast
        if (transaction.maxFee.compact() === 20) {
            const fees =
                this.transactionFees.averageFeeMultiplier < this.transactionFees.minFeeMultiplier
                    ? this.transactionFees.minFeeMultiplier
                    : this.transactionFees.averageFeeMultiplier;
            return fees || this.networkConfiguration.defaultDynamicFeeMultiplier;
        }
        // slowest
        if (transaction.maxFee.compact() === 1) {
            const fees = this.transactionFees.minFeeMultiplier;
            return fees || this.networkConfiguration.defaultDynamicFeeMultiplier;
        }
        // slow
        if (transaction.maxFee.compact() === 5) {
            const fees = this.transactionFees.minFeeMultiplier + this.transactionFees.averageFeeMultiplier * 0.35;
            return fees || this.networkConfiguration.defaultDynamicFeeMultiplier;
        }
        return undefined;
    }

    public saveVrfKey(accountAddress: string, encVrfPrivateKey: string) {
        this.$store.dispatch('harvesting/UPDATE_VRF_ACCOUNT_PRIVATE_KEY', { accountAddress, encVrfPrivateKey });
    }
    public saveVrfKeyInfo(accountAddress: string, newEncVrfPrivateKey: string, newVrfPublicKey) {
        this.$store.dispatch('harvesting/UPDATE_NEW_VRF_KEY_INFO', { accountAddress, newEncVrfPrivateKey, newVrfPublicKey });
    }
    public saveRemoteKey(accountAddress: string, encRemotePrivateKey: string) {
        this.$store.dispatch('harvesting/UPDATE_REMOTE_ACCOUNT_PRIVATE_KEY', { accountAddress, encRemotePrivateKey });
    }
    public saveRemoteKeyInfo(accountAddress: string, newEncRemotePrivateKey: string, newRemotePublicKey) {
        this.$store.dispatch('harvesting/UPDATE_NEW_REMOTE_KEY_INFO', {
            accountAddress,
            newEncRemotePrivateKey,
            newRemotePublicKey,
        });
    }
    public updateHarvestingRequestStatus(accountAddress: string, delegatedHarvestingRequestFailed: boolean) {
        this.$store.dispatch('harvesting/UPDATE_HARVESTING_REQUEST_STATUS', { accountAddress, delegatedHarvestingRequestFailed });
    }

    private createAccountKeyLinkTx(publicKey: string, linkAction: LinkAction, maxFee: UInt64): AccountKeyLinkTransaction {
        return AccountKeyLinkTransaction.create(this.createDeadline(), publicKey, linkAction, this.networkType, maxFee);
    }
    private createVrfKeyLinkTx(publicKey: string, linkAction: LinkAction, maxFee: UInt64): VrfKeyLinkTransaction {
        return VrfKeyLinkTransaction.create(this.createDeadline(), publicKey, linkAction, this.networkType, maxFee);
    }
    private createNodeKeyLinkTx(publicKey: string, linkAction: LinkAction, maxFee: UInt64): NodeKeyLinkTransaction {
        return NodeKeyLinkTransaction.create(this.createDeadline(), publicKey, linkAction, this.networkType, maxFee);
    }

    /**
     * Whether all keys are linked
     */
    private get allKeysLinked(): boolean {
        return this.isAccountKeyLinked && this.isVrfKeyLinked && this.isNodeKeyLinked;
    }

    /**
     * Whether account key is linked
     */
    private get isAccountKeyLinked(): boolean {
        return !!this.currentSignerAccountInfo?.supplementalPublicKeys.linked;
    }

    /**
     * Whether vrf key is linked
     */
    private get isVrfKeyLinked(): boolean {
        return !!this.currentSignerAccountInfo?.supplementalPublicKeys.vrf;
    }

    /**
     * Whether node key is linked
     */
    private get isNodeKeyLinked(): boolean {
        return !!this.currentSignerAccountInfo?.supplementalPublicKeys.node;
    }

    /**
     * Setter for TRANSFER transactions that will be staged
     * @see {FormTransactionBase}
     * @throws {Error} If not overloaded in derivate component
     */
    protected setTransactions() {
        throw new Error('This transaction can not be staged');
    }

    public onStart() {
        this.action = HarvestingAction.START;
        if (this.networkBalanceMosaics.balance / Math.pow(10, this.networkBalanceMosaics.divisibility) < 10000) {
            this.$store.dispatch('notification/ADD_ERROR', this.$t('harvesting_account_insufficient_balance'));
            return;
        }
        if (this.networkBalanceMosaics.balance / Math.pow(10, this.networkBalanceMosaics.divisibility) >= 50000000) {
            this.$store.dispatch('notification/ADD_ERROR', this.$t('harvesting_account_has_extra_balance'));
            return;
        }
        if (
            this.accountsInfo.find((k) => k.address.plain() === this.currentSignerHarvestingModel.accountAddress).importance.compact() === 0
        ) {
            this.$store.dispatch('notification/ADD_ERROR', this.$t('harvesting_account_has_zero_importance'));
            return;
        }
        if (!this.isLedger) {
            this.onSubmit();
        } else {
            this.hasLedgerAccountUnlockModal = true;
        }
    }

    public onStop() {
        this.action = HarvestingAction.STOP;
        this.onSubmit();
    }

    // public onSwap() {
    //     this.action = HarvestingAction.SWAP;
    //     this.onSubmit();
    // }

    public onStartClick() {
        if (this.activePanel === 1) {
            this.onConfirmStart();
        } else {
            this.isDelegatedHarvestingWarningModalShown = true;
        }
    }

    public onConfirmStart() {
        this.isDelegatedHarvestingWarningModalShown = false;
        this.onStart();
    }

    public onActivate() {
        this.hasAccountUnlockModal = true;
    }

    public get hasAccountUnlockModal(): boolean {
        return this.isUnlockingAccount;
    }

    public set hasAccountUnlockModal(f: boolean) {
        this.isUnlockingAccount = f;
    }

    public get hasLedgerAccountUnlockModal(): boolean {
        return this.isUnlockingLedgerAccount;
    }

    public set hasLedgerAccountUnlockModal(f: boolean) {
        this.isUnlockingLedgerAccount = f;
    }

    public onSingleKeyOperation(type: string) {
        this.action = HarvestingAction.SINGLE_KEY;
        this.type = type;
        if (this.type == 'node') {
            this.onSubmit();
        } else if (this.type == 'account') {
            if (!this.isAccountKeyLinked) {
                this.modalImportKeyTitle = PublicKeyTitle.REMOTE;
                this.showModalImportKey = true;
            } else {
                this.onSubmit();
            }
        } else {
            if (!this.isVrfKeyLinked) {
                this.modalImportKeyTitle = PublicKeyTitle.VRF;
                this.showModalImportKey = true;
            } else {
                this.onSubmit();
            }
        }
    }
    onSubmitPrivateKey(accountObject: { account: Account; type: string }) {
        if (!accountObject.account) {
            if (this.isLedger) {
                this.hasLedgerAccountUnlockModal = true;
            } else {
                this.onSubmit();
            }
        } else {
            if (accountObject.type === 'vrf') {
                this.newVrfKeyAccount = accountObject.account;
            } else {
                this.newRemoteAccount = accountObject.account;
            }
            if (this.isLedger) {
                this.hasLedgerAccountUnlockModal = true;
            } else {
                this.onSubmit();
            }
        }
    }

    public onSubmit() {
        if (
            !this.allKeysLinked &&
            !this.formItems.nodeModel.nodePublicKey.length &&
            ((this.action == HarvestingAction.SINGLE_KEY && this.type == 'node') || this.action == HarvestingAction.START)
        ) {
            this.$store.dispatch('notification/ADD_ERROR', this.$t('invalid_node'));
            return;
        }

        // - open signature modal
        this.onShowConfirmationModal();
    }

    public get currentSignerAccount() {
        return PublicAccount.createFromPublicKey(this.currentSignerPublicKey, this.networkType);
    }

    private get isPersistentDelReqSent() {
        return this.currentSignerHarvestingModel?.isPersistentDelReqSent;
    }

    /**
     * When account is unlocked, the sub account can be created
     */
    public async onAccountUnlocked(account: Account, password: Password) {
        try {
            this.password = password.value;
            this.action = HarvestingAction.ACTIVATE;
            this.remoteAccountPrivateKey = Crypto.decrypt(this.currentSignerHarvestingModel?.encRemotePrivateKey, password.value);
            this.vrfPrivateKey = Crypto.decrypt(this.currentSignerHarvestingModel?.encVrfPrivateKey, password.value);
            this.onSubmit();
        } catch (e) {
            if (!this.currentSignerHarvestingModel?.encRemotePrivateKey || !this.currentSignerHarvestingModel?.encVrfPrivateKey) {
                this.$store.dispatch('notification/ADD_ERROR', 'An error happened, please relink your vrf and remote keys.');
            } else {
                this.$store.dispatch('notification/ADD_ERROR', 'An error happened, please try again.');
            }

            console.error(e);
        }
    }

    public async onLedgerAccountUnlocked(account: Account, password: Password) {
        this.password = password.value;
        this.onSubmit();
    }

    public get isLedger(): boolean {
        return this.currentAccount.type === AccountType.LEDGER || this.currentAccount.type === AccountType.LEDGER_OPT_IN;
    }

    public get isPublicAndPrivateKeysLinked(): boolean {
        if (
            (this.isAccountKeyLinked && !this.currentSignerHarvestingModel?.encRemotePrivateKey) ||
            (this.isVrfKeyLinked && !this.currentSignerHarvestingModel?.encVrfPrivateKey)
        ) {
            return false;
        }
        return true;
    }
    private get LowFeeValue() {
        return this.formItems.maxFee === 0 || this.formItems.maxFee === 1 || this.formItems.maxFee === 5;
    }
}
