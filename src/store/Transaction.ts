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
//external dependencies
import {
    Address,
    AggregateTransaction,
    CosignatureSignedTransaction,
    RepositoryFactory,
    Transaction,
    TransactionType,
    PublicAccount,
    AggregateTransactionCosignature,
    TransactionGroup,
    Page,
    TransactionStatus,
    Order,
    MultisigAccountInfo,
} from 'symbol-sdk';
import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import * as _ from 'lodash';

// internal dependencies
import { AwaitLock } from './AwaitLock';
import { TransactionFilterService } from '@/services/TransactionFilterService';
import { MultisigService } from '@/services/MultisigService';
const Lock = AwaitLock.create();

export enum TransactionGroupState {
    confirmed = 'confirmed',
    unconfirmed = 'unconfirmed',
    partial = 'partial',
    all = 'all',
}

export enum TransactionFilterOptions {
    confirmed = 'isConfirmedSelected',
    unconfirmed = 'isUnconfirmedSelected',
    partial = 'isPartialSelected',
    sent = 'isSentSelected',
    received = 'isReceivedSelected',
}

export class FilterOption {
    constructor(public option: TransactionFilterOptions = TransactionFilterOptions.confirmed, public value: boolean = false) {}
}

export class TransactionFilterOptionsState {
    public isConfirmedSelected: boolean = false;
    public isUnconfirmedSelected: boolean = false;
    public isPartialSelected: boolean = false;
    public isSentSelected: boolean = false;
    public isReceivedSelected: boolean = false;

    /**
     * Returns false when all from any group or nothing selected.
     */
    public get isFilterShouldBeApplied(): boolean {
        if (this.checkAllUnselected()) {
            return false;
        }

        const isAllByConfirmedStatusSelected = this.isConfirmedSelected && this.isUnconfirmedSelected && this.isPartialSelected;

        return !isAllByConfirmedStatusSelected;
    }

    /**
     * Sets selected key-value pair.
     * @param filterOption one of existing filter options and value
     */
    public setFilterOption(filterOption: FilterOption): void {
        this[filterOption.option] = filterOption.value;
    }

    /**
     * Checks if all property falsy.
     */
    private checkAllUnselected(): boolean {
        return Object.keys(this).every((key) => !this[key]);
    }
}

/**
 * Helper to format transaction group in name of state variable.
 *
 * @internal
 * @param {string} group
 * @return {string} One of 'confirmedTransactions', 'unconfirmedTransactions' or
 *   'partialTransactions'
 */
const transactionGroupToStateVariable = (group: TransactionGroupState): string => {
    return group + 'Transactions';
};

const transactionComparator = (t1, t2) => {
    // - unconfirmed/partial sorted by index
    return t1.transactionInfo.index - t2.transactionInfo.index;
};
const confirmedTransactionComparator = (t1, t2) => {
    const info1 = t1.transactionInfo;
    const info2 = t2.transactionInfo;
    // - confirmed sorted by height then index
    const diffHeight = info2.height.compact() - info1.height.compact();
    const diffIndex = info1.index - info2.index;
    return diffHeight !== 0 ? diffHeight : diffIndex;
};

function conditionalSort<T>(array: T[] | undefined, comparator: (a: T, b: T) => number): T[] | undefined {
    if (!array) {
        return array;
    }
    return array.sort(comparator);
}

export interface PageInfo {
    pageNumber: number;
    isLastPage: boolean;
}
export interface TransactionState {
    initialized: boolean;
    isFetchingTransactions: boolean;
    transactions: Transaction[];
    filteredTransactions: Transaction[];
    confirmedTransactions: Transaction[];
    unconfirmedTransactions: Transaction[];
    partialTransactions: Transaction[];
    filterOptions: TransactionFilterOptionsState;
    currentConfirmedPage: PageInfo;
}

const transactionState: TransactionState = {
    initialized: false,
    isFetchingTransactions: false,
    transactions: [],
    filteredTransactions: [],
    confirmedTransactions: [],
    unconfirmedTransactions: [],
    partialTransactions: [],
    filterOptions: new TransactionFilterOptionsState(),
    currentConfirmedPage: { pageNumber: 1, isLastPage: false },
};
export default {
    namespaced: true,
    state: transactionState,
    getters: {
        getInitialized: (state: TransactionState) => state.initialized,
        isFetchingTransactions: (state: TransactionState) => state.isFetchingTransactions,
        transactions: (state: TransactionState) => state.transactions,
        filteredTransactions: (state: TransactionState) => {
            return state.filteredTransactions;
        },
        filterOptions: (state: TransactionState) => state.filterOptions,
        currentConfirmedPage: (state: TransactionState) => state.currentConfirmedPage,
        confirmedTransactions: (state: TransactionState) => state.confirmedTransactions,
        unconfirmedTransactions: (state: TransactionState) => state.unconfirmedTransactions,
        partialTransactions: (state: TransactionState) => state.partialTransactions,
    },
    mutations: {
        setInitialized: (state: TransactionState, initialized: boolean) => {
            state.initialized = initialized;
        },
        isFetchingTransactions: (state: TransactionState, isFetchingTransactions: boolean) => {
            state.isFetchingTransactions = isFetchingTransactions;
        },
        confirmedTransactions: (
            state: TransactionState,
            { transactions, refresh, pageInfo }: { transactions: Transaction[]; refresh: boolean; pageInfo: PageInfo },
        ) => {
            // if it's a refresh request then refresh the list, else concat the new items to the list
            if (refresh) {
                state.confirmedTransactions = conditionalSort(transactions, confirmedTransactionComparator);
            } else {
                state.confirmedTransactions = conditionalSort(
                    state.confirmedTransactions.concat(transactions),
                    confirmedTransactionComparator,
                );
            }
            state.currentConfirmedPage = pageInfo;
        },
        unconfirmedTransactions: (
            state: TransactionState,
            { transactions }: { transactions: Transaction[]; refresh: boolean; pageInfo: PageInfo },
        ) => {
            state.unconfirmedTransactions = conditionalSort(transactions, transactionComparator);
        },
        partialTransactions: (
            state: TransactionState,
            { transactions }: { transactions: Transaction[]; refresh: boolean; pageInfo: PageInfo },
        ) => {
            state.partialTransactions = conditionalSort(transactions, transactionComparator);
        },
        setAllTransactions: (state: TransactionState) => {
            state.transactions = [
                ...(state.partialTransactions === undefined ? [] : state.partialTransactions),
                ...(state.unconfirmedTransactions === undefined ? [] : state.unconfirmedTransactions),
                ...(state.confirmedTransactions === undefined ? [] : state.confirmedTransactions),
            ];
        },
        filterTransactions: (
            state: TransactionState,
            {
                filterOption,
                currentSignerAddress,
                multisigAddresses = [],
                shouldFilterOptionChange = true,
            }: { filterOption?: FilterOption; currentSignerAddress: string; multisigAddresses: []; shouldFilterOptionChange: boolean },
        ) => {
            if (shouldFilterOptionChange) {
                if (filterOption) {
                    state.filterOptions.setFilterOption(filterOption);
                } else {
                    state.filterOptions = new TransactionFilterOptionsState();
                }
            }

            state.filteredTransactions = TransactionFilterService.filter(state, currentSignerAddress);
            if (!!multisigAddresses.length) {
                multisigAddresses.forEach((address) => {
                    state.filteredTransactions = [...state.filteredTransactions, ...TransactionFilterService.filter(state, address)];
                });
                state.filteredTransactions = TransactionFilterService.filter(state, currentSignerAddress);
            }
        },
    },
    actions: {
        async initialize({ commit, getters }) {
            const callback = async () => {
                // Placeholder for initialization if necessary.
                commit('setInitialized', true);
            };
            // aquire async lock until initialized
            await Lock.initialize(callback, { getters });
        },

        async uninitialize({ commit, getters, dispatch }) {
            const callback = async () => {
                await dispatch('RESET_TRANSACTIONS');
                commit('setInitialized', false);
            };
            await Lock.uninitialize(callback, { getters });
        },

        LOAD_TRANSACTIONS(
            { commit, rootGetters },
            { pageSize, pageNumber }: { pageSize: number; pageNumber: number } = {
                pageSize: 20,
                pageNumber: 1,
            },
        ) {
            const currentSignerAddress: Address = rootGetters['account/currentSignerAddress'];
            if (!currentSignerAddress) {
                return;
            }
            const repositoryFactory: RepositoryFactory = rootGetters['network/repositoryFactory'];
            if (!repositoryFactory) {
                return;
            }
            const transactionRepository = repositoryFactory.createTransactionRepository();
            const subscribeTransactions = (
                group: TransactionGroupState,
                transactionCall: Observable<Page<Transaction>>,
            ): Observable<Transaction[]> => {
                const attributeName = transactionGroupToStateVariable(group);
                return transactionCall.pipe(
                    map((transactionsPage) => {
                        commit(attributeName, {
                            transactions: transactionsPage.data || [],
                            refresh: transactionsPage.pageNumber === 1,
                            pageInfo: {
                                pageNumber: transactionsPage.pageNumber,
                                isLastPage: transactionsPage.isLastPage,
                            },
                        });
                        return transactionsPage.data;
                    }),
                );
            };

            const subscriptions: Observable<Transaction[]>[] = [];
            commit('isFetchingTransactions', true);

            const multisigAccountGraphInfo: MultisigAccountInfo[][] = rootGetters['account/multisigAccountGraphInfo'];
            const multisignService = new MultisigService();
            let multisigChildrenAddresses = [];
            if (multisigAccountGraphInfo) {
                multisigChildrenAddresses = multisignService.getMultisigChildrenAddresses(multisigAccountGraphInfo);
            }
            subscriptions.push(
                subscribeTransactions(
                    TransactionGroupState.confirmed,
                    transactionRepository.search({
                        group: TransactionGroup.Confirmed,
                        address: currentSignerAddress,
                        pageSize,
                        pageNumber,
                        order: Order.Desc,
                    }),
                ),
            );

            if (pageNumber === 1) {
                subscriptions.push(
                    subscribeTransactions(
                        TransactionGroupState.unconfirmed,
                        transactionRepository.search({
                            group: TransactionGroup.Unconfirmed,
                            address: currentSignerAddress,
                            pageSize: 100,
                            pageNumber: 1, // not paginating
                            order: Order.Desc,
                        }),
                    ),
                );
                if (!!multisigChildrenAddresses.length) {
                    multisigChildrenAddresses.forEach((address) => {
                        subscriptions.push(
                            subscribeTransactions(
                                TransactionGroupState.partial,
                                transactionRepository.search({
                                    group: TransactionGroup.Partial,
                                    address: address,
                                    pageSize: 100,
                                    pageNumber: 1, // not paginating
                                    order: Order.Desc,
                                }),
                            ),
                        );
                    });
                }
            }
            combineLatest(subscriptions).subscribe({
                complete: () => {
                    commit('setAllTransactions');
                    commit('filterTransactions', {
                        filterOption: null,
                        currentSignerAddress: currentSignerAddress.plain(),
                        multisigAddresses: multisigChildrenAddresses,
                        shouldFilterOptionChange: false,
                    });
                    commit('isFetchingTransactions', false);
                },
            });
        },

        LOAD_TRANSACTION_DETAILS(
            { rootGetters },
            { group, transactionHash }: { group: TransactionGroupState; transactionHash: string },
        ): Promise<Transaction | AggregateTransaction> {
            if (!group) {
                throw Error("Missing mandatory field 'group' for action transaction/LOAD_TRANSACTION_DETAILS.");
            }

            if (!transactionHash) {
                throw Error("Missing mandatory field 'transactionHash' for action transaction/LOAD_TRANSACTION_DETAILS.");
            }

            // prepare
            const repositoryFactory: RepositoryFactory = rootGetters['network/repositoryFactory'];
            const transactionRepository = repositoryFactory.createTransactionRepository();

            let sdkGroup = TransactionGroup.Confirmed;
            if (![TransactionGroupState.all, TransactionGroupState.confirmed].includes(group)) {
                sdkGroup = group === TransactionGroupState.partial ? TransactionGroup.Partial : TransactionGroup.Unconfirmed;
            }

            // fetch transaction details
            return transactionRepository.getTransaction(transactionHash, sdkGroup).toPromise();
        },

        FETCH_TRANSACTION_STATUS(
            { rootGetters },
            { transactionHash }: { transactionHash: string },
        ): Promise<Transaction | TransactionStatus> {
            if (!transactionHash) {
                throw Error("Missing mandatory field 'transactionHash' for action transaction/FETCH_TRANSACTION_STATUS.");
            }

            // prepare
            const repositoryFactory: RepositoryFactory = rootGetters['network/repositoryFactory'];
            const transactionStatusRepository = repositoryFactory.createTransactionStatusRepository();

            // fetch transaction status
            return transactionStatusRepository.getTransactionStatus(transactionHash).toPromise();
        },

        SIGNER_CHANGED({ dispatch }) {
            dispatch('LOAD_TRANSACTIONS');
        },

        RESET_TRANSACTIONS({ commit }) {
            Object.keys(TransactionGroupState).forEach((group: TransactionGroupState) => {
                if (group !== TransactionGroupState.all) {
                    commit(transactionGroupToStateVariable(group), {
                        transactions: [],
                        pageInfo: { pageNumber: 1, isLastPage: false },
                    });
                }
            });
        },

        ADD_TRANSACTION(
            { commit, getters, rootGetters },
            { group, transaction }: { group: TransactionGroupState; transaction: Transaction },
        ) {
            if (!group) {
                throw Error("Missing mandatory field 'group' for action transaction/ADD_TRANSACTION.");
            }

            if (!transaction) {
                throw Error("Missing mandatory field 'transaction' for action transaction/ADD_TRANSACTION.");
            }
            // format transactionAttribute to store variable name
            const transactionAttribute = transactionGroupToStateVariable(group);

            const currentSignerAddress: Address = rootGetters['account/currentSignerAddress'];

            // register transaction
            const transactions = getters[transactionAttribute] || [];
            if (!transactions.find((t) => t.transactionInfo.hash === transaction.transactionInfo.hash)) {
                // update state
                commit(transactionAttribute, {
                    transactions: [transaction, ...transactions],
                    refresh: true,
                    pageInfo: getters['currentConfirmedPage'],
                });

                commit('setAllTransactions');
                commit('filterTransactions', {
                    filterOption: null,
                    currentSignerAddress: currentSignerAddress.plain(),
                    multisigAddresses: [],
                    shouldFilterOptionChange: false,
                });
            }
        },

        REMOVE_TRANSACTION(
            { commit, getters, rootGetters },
            { group, transactionHash }: { group: TransactionGroupState; transactionHash: string },
        ) {
            if (!group) {
                throw Error("Missing mandatory field 'group' for action transaction/REMOVE_TRANSACTION.");
            }

            if (!transactionHash) {
                throw Error("Missing mandatory field 'transactionHash' for action transaction/REMOVE_TRANSACTION.");
            }
            // format transactionAttribute to store variable name
            const transactionAttribute = transactionGroupToStateVariable(group);

            const currentSignerAddress: Address = rootGetters['account/currentSignerAddress'];

            // register transaction
            const transactions = getters[transactionAttribute] || [];
            commit(transactionAttribute, {
                transactions: transactions.filter((t) => t.transactionInfo.hash !== transactionHash),
                refresh: true,
                pageInfo: getters['currentConfirmedPage'],
            });

            commit('setAllTransactions');
            commit('filterTransactions', {
                filterOption: null,
                currentSignerAddress: currentSignerAddress.plain(),
                multisigAddresses: [],
                shouldFilterOptionChange: false,
            });
        },

        async ON_NEW_TRANSACTION({ dispatch }, transaction: Transaction) {
            if (!transaction) {
                return;
            }

            // extract transaction types from the transaction
            const transactionTypes: TransactionType[] = _.uniq(
                transaction instanceof AggregateTransaction ? transaction.innerTransactions.map(({ type }) => type) : [transaction.type],
            );

            await dispatch('LOAD_TRANSACTIONS');

            // reload metadata list first so that mosaics and namespaces can be updated
            await dispatch('metadata/LOAD_METADATA_LIST', {}, { root: true });

            // add actions to the dispatcher according to the transaction types
            if (
                [TransactionType.NAMESPACE_REGISTRATION, TransactionType.MOSAIC_ALIAS, TransactionType.ADDRESS_ALIAS].some((a) =>
                    transactionTypes.some((b) => b === a),
                )
            ) {
                dispatch('namespace/LOAD_NAMESPACES', {}, { root: true });
            }

            // Reloading Balances
            await dispatch('account/LOAD_ACCOUNT_INFO', {}, { root: true });
            dispatch('mosaic/LOAD_MOSAICS', {}, { root: true });

            await dispatch('restriction/LOAD_ACCOUNT_RESTRICTIONS', {}, { root: true });
        },
        /// end-region scoped actions

        ADD_COSIGNATURE({ commit, getters, rootGetters }, transaction: CosignatureSignedTransaction) {
            if (!transaction || !transaction.parentHash) {
                throw Error("Missing mandatory field 'parentHash' for action transaction/ADD_COSIGNATURE.");
            }
            const transactionAttribute = transactionGroupToStateVariable(TransactionGroupState.partial);
            const transactions: AggregateTransaction[] = getters[transactionAttribute] || [];

            // return if no transactions
            if (!transactions.length) {
                return;
            }

            const index = transactions.findIndex((t) => t.transactionInfo.hash === transaction.parentHash);

            // partial tx unknown, @TODO: handle this case (fetch partials)
            if (index === -1) {
                return;
            }

            // convert CosignatureSignedTransaction to AggregateTransactionCosignature
            const generationHash = rootGetters['network/generationHash'];
            const cosigner = PublicAccount.createFromPublicKey(transaction.signerPublicKey, generationHash);
            const cosignature = new AggregateTransactionCosignature(transaction.signature, cosigner);
            const currentSignerAddress: Address = rootGetters['account/currentSignerAddress'];

            // update the partial transaction cosignatures
            transactions[index] = transactions[index].addCosignatures([cosignature]);

            commit('partialTransactions', {
                transactions: transactions,
                refresh: true,
                pageInfo: getters['currentConfirmedPage'],
            });
            commit('setAllTransactions');
            commit('filterTransactions', {
                filterOption: null,
                currentSignerAddress: currentSignerAddress.plain(),
                multisigAddresses: [],
                shouldFilterOptionChange: false,
            });
        },
    },
};
