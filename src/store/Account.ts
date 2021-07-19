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
import { AccountModel } from '@/core/database/entities/AccountModel';
import { ProfileModel } from '@/core/database/entities/ProfileModel';
import { AccountService } from '@/services/AccountService';
import { MultisigService } from '@/services/MultisigService';
import { ProfileService } from '@/services/ProfileService';
import { RESTService } from '@/services/RESTService';
import * as _ from 'lodash';
import { of, Subscription } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
    AccountInfo,
    AccountNames,
    Address,
    IListener,
    MultisigAccountInfo,
    NetworkType,
    PublicAccount,
    RepositoryFactory,
} from 'symbol-sdk';
import Vue from 'vue';
// internal dependencies
import { $eventBus } from '../events';
import { AwaitLock } from './AwaitLock';
/// region globals
const Lock = AwaitLock.create();
/// end-region globals

/**
 * Type SubscriptionType for account Store
 * @type {SubscriptionType}
 */
type SubscriptionType = {
    listener: IListener;
    subscriptions: Subscription[];
};

export type Signer = {
    label: string;
    address: Address;
    multisig: boolean;
    requiredCosignatures: number;
};

// Account state typing
interface AccountState {
    initialized: boolean;
    currentAccount: AccountModel;
    currentAccountAddress: Address;
    currentAccountMultisigInfo: MultisigAccountInfo;
    multisigAccountGraph: MultisigAccountInfo[][];
    multisigAccountGraphInfo: MultisigAccountInfo[];
    isCosignatoryMode: boolean;
    signers: Signer[];
    currentSigner: Signer;
    currentSignerAddress: Address;
    currentSignerPublicKey: string;
    currentSignerMultisigInfo: MultisigAccountInfo;
    // Known accounts database identifiers
    knownAccounts: AccountModel[];
    knownAddresses: Address[];
    accountsInfo: AccountInfo[];
    multisigAccountsInfo: MultisigAccountInfo[];
    subscriptions: Record<string, SubscriptionType[]>;
    currentRecipient: PublicAccount;
    currentAccountAliases: AccountNames[];
    addressesList: Address[];
    optInAddressesList: { address: Address; index: number }[];
    selectedAddressesToInteract: number[];
    selectedAddressesOptInToInteract: number[];
    currentSignerAccountModel: AccountModel;
    listener: IListener;
}

// account state initial definition
const accountState: AccountState = {
    initialized: false,
    currentAccount: null,
    currentAccountAddress: null,
    currentAccountMultisigInfo: null,
    currentAccountAliases: [],
    isCosignatoryMode: false,
    signers: [],
    currentSigner: null,
    currentSignerAddress: null,
    currentSignerPublicKey: null,
    currentSignerMultisigInfo: null,
    knownAccounts: [],
    knownAddresses: [],
    accountsInfo: [],
    multisigAccountsInfo: [],
    subscriptions: {},
    currentRecipient: null,
    multisigAccountGraph: null,
    multisigAccountGraphInfo: null,
    addressesList: [],
    optInAddressesList: [],
    selectedAddressesToInteract: [],
    selectedAddressesOptInToInteract: [],
    currentSignerAccountModel: null,
    listener: undefined,
};

/**
 * Account Store
 */
export default {
    namespaced: true,
    state: accountState,
    getters: {
        getInitialized: (state: AccountState) => state.initialized,
        currentAccount: (state: AccountState): AccountModel => {
            return state.currentAccount;
        },
        signers: (state: AccountState): Signer[] => state.signers,
        currentSigner: (state: AccountState): Signer => state.currentSigner,
        currentAccountAddress: (state: AccountState) => state.currentAccountAddress,
        knownAddresses: (state: AccountState) => state.knownAddresses,
        currentAccountMultisigInfo: (state: AccountState) => state.currentAccountMultisigInfo,
        currentSignerMultisigInfo: (state: AccountState) => state.currentSignerMultisigInfo,
        isCosignatoryMode: (state: AccountState) => state.isCosignatoryMode,
        currentSignerAddress: (state: AccountState) => state.currentSignerAddress,
        currentSignerPublicKey: (state: AccountState) => state.currentSignerPublicKey,
        knownAccounts: (state: AccountState) => state.knownAccounts,
        accountsInfo: (state: AccountState) => state.accountsInfo,
        currentAccountAccountInfo: (state: AccountState): AccountInfo => {
            return state.accountsInfo.find(({ publicKey }) => publicKey === state.currentAccount.publicKey);
        },
        currentSignerAccountInfo: (state: AccountState): AccountInfo => {
            return state.accountsInfo.find(({ address }) => address.plain() === state.currentSigner.address.plain());
        },
        multisigAccountsInfo: (state: AccountState) => state.multisigAccountsInfo,
        getSubscriptions: (state: AccountState) => state.subscriptions,
        currentRecipient: (state: AccountState) => state.currentRecipient,
        currentAccountAliases: (state: AccountState) => state.currentAccountAliases,
        multisigAccountGraph: (state: AccountState) => state.multisigAccountGraph,
        multisigAccountGraphInfo: (state: AccountState) => state.multisigAccountGraphInfo,
        addressesList: (state: AccountState) => state.addressesList,
        optInAddressesList: (state: AccountState) => state.optInAddressesList,
        selectedAddressesToInteract: (state: AccountState) => state.selectedAddressesToInteract,
        selectedAddressesOptInToInteract: (state: AccountState) => state.selectedAddressesOptInToInteract,
        currentSignerAccountModel: (state: AccountState) =>
            state.knownAccounts.find((a) => a.address === state.currentSignerAddress.plain()),
        listener: (state: AccountState) => state.listener,
    },
    mutations: {
        setInitialized: (state: AccountState, initialized: boolean) => {
            state.initialized = initialized;
        },
        currentAccount: (state: AccountState, accountModel: AccountModel) => {
            state.currentAccount = accountModel;
        },
        currentAccountAddress: (state: AccountState, accountAddress: Address) => {
            state.currentAccountAddress = accountAddress;
        },
        currentAccountAliases: (state: AccountState, currentAccountAliases: AccountNames[]) => {
            state.currentAccountAliases = currentAccountAliases;
        },
        currentSigner: (state: AccountState, currentSigner: Signer) => {
            state.currentSigner = currentSigner;
        },
        signers: (state: AccountState, signers: Signer[]) => {
            state.signers = signers;
        },
        currentSignerAddress: (state: AccountState, signerAddress) => {
            state.currentSignerAddress = signerAddress;
        },
        currentSignerPublicKey: (state: AccountState, signerPubKey) => {
            state.currentSignerPublicKey = signerPubKey;
        },
        knownAccounts: (state: AccountState, knownAccounts: AccountModel[]) => {
            state.knownAccounts = knownAccounts;
        },
        knownAddresses: (state: AccountState, knownAddresses: Address[]) => {
            state.knownAddresses = knownAddresses;
        },
        isCosignatoryMode: (state: AccountState, isCosignatoryMode: boolean) => {
            state.isCosignatoryMode = isCosignatoryMode;
        },
        accountsInfo: (state: AccountState, accountsInfo) => {
            state.accountsInfo = accountsInfo;
        },
        multisigAccountsInfo: (state: AccountState, multisigAccountsInfo) => {
            state.multisigAccountsInfo = multisigAccountsInfo;
        },
        currentAccountMultisigInfo: (state: AccountState, currentAccountMultisigInfo) => {
            state.currentAccountMultisigInfo = currentAccountMultisigInfo;
        },
        currentSignerMultisigInfo: (state: AccountState, currentSignerMultisigInfo) => {
            state.currentSignerMultisigInfo = currentSignerMultisigInfo;
        },
        currentRecipient: (state: AccountState, currentRecipient) => {
            state.currentRecipient = currentRecipient;
        },

        setSubscriptions: (state: AccountState, subscriptions: Record<string, SubscriptionType[]>) => {
            state.subscriptions = subscriptions;
        },

        multisigAccountGraph: (state: AccountState, multisigAccountGraph) => {
            state.multisigAccountGraph = multisigAccountGraph;
        },
        multisigAccountGraphInfo: (state: AccountState, multisigAccountGraphInfo) => {
            state.multisigAccountGraphInfo = multisigAccountGraphInfo;
        },
        updateSubscriptions: (state: AccountState, payload: { address: string; subscriptions: SubscriptionType }) => {
            const { address, subscriptions } = payload;

            // if subscriptions are empty, unset the address subscriptions
            if (!subscriptions) {
                Vue.delete(state.subscriptions, address);
                return;
            }

            // get current subscriptions from state
            const oldSubscriptions = state.subscriptions[address] || [];
            // update subscriptions
            const newSubscriptions: SubscriptionType[] = [...oldSubscriptions, subscriptions];
            // update state
            Vue.set(state.subscriptions, address, newSubscriptions);
        },
        addressesList: (state: AccountState, addressesList: Address[]) => {
            state.addressesList = addressesList;
        },
        optInAddressesList: (state: AccountState, optInAddressesList: { address: Address; index: number }[]) => {
            state.optInAddressesList = optInAddressesList;
        },
        addToSelectedAddressesToInteract: (state: AccountState, pathNumber: number) => {
            const selectedAccounts = [...state.selectedAddressesToInteract];
            selectedAccounts.push(pathNumber);
            state.selectedAddressesToInteract = selectedAccounts;
        },
        addToSelectedAddressesOptInToInteract: (state: AccountState, pathNumber: number) => {
            const selectedAccounts = [...state.selectedAddressesOptInToInteract];
            selectedAccounts.push(pathNumber);
            state.selectedAddressesOptInToInteract = selectedAccounts;
        },
        removeFromSelectedAddressesToInteract: (state: AccountState, pathNumber: number) => {
            const selectedAccounts = [...state.selectedAddressesToInteract];
            const indexToDelete = selectedAccounts.indexOf(pathNumber);
            selectedAccounts.splice(indexToDelete, 1);
            state.selectedAddressesToInteract = selectedAccounts;
        },
        removeFromSelectedAddressesOptInToInteract: (state: AccountState, pathNumber: number) => {
            const selectedAccounts = [...state.selectedAddressesOptInToInteract];
            const indexToDelete = selectedAccounts.indexOf(pathNumber);
            selectedAccounts.splice(indexToDelete, 1);
            state.selectedAddressesOptInToInteract = selectedAccounts;
        },
        resetAddressesList: (state: AccountState) => {
            state.addressesList = [];
        },
        resetOptInAddressesList: (state: AccountState) => {
            state.optInAddressesList = [];
        },
        resetSelectedAddressesToInteract: (state: AccountState) => {
            state.selectedAddressesToInteract = [];
        },
        resetSelectedAddressesOptInToInteract: (state: AccountState) => {
            state.selectedAddressesOptInToInteract = [];
        },
        listener: (state: AccountState, listener: IListener) => Vue.set(state, 'listener', listener),
    },
    actions: {
        /**
         * Possible `options` values include:
         * @type {
         *    skipTransactions: boolean,
         * }
         */
        async initialize({ commit, getters }, { address }) {
            const callback = async () => {
                if (!address || !address.length) {
                    return;
                }
                commit('setInitialized', true);
            };
            await Lock.initialize(callback, { getters });
        },
        async uninitialize({ commit, dispatch, getters }, { address }) {
            const callback = async () => {
                // close websocket connections
                await dispatch('UNSUBSCRIBE', address);
                await dispatch('transaction/RESET_TRANSACTIONS', {}, { root: true });
                commit('setInitialized', false);
            };
            await Lock.uninitialize(callback, { getters });
        },

        /**
         * Possible `options` values include:
         * @type {
         *    isCosignatoryMode: boolean,
         * }
         */
        async SET_CURRENT_ACCOUNT({ commit, dispatch, getters }, currentAccount: AccountModel) {
            const previous: AccountModel = getters.currentAccount;
            if (previous && previous.address === currentAccount.address) {
                return;
            }

            const currentAccountAddress: Address = Address.createFromRawAddress(currentAccount.address);
            dispatch('diagnostic/ADD_DEBUG', 'Store action account/SET_CURRENT_ACCOUNT dispatched with ' + currentAccountAddress.plain(), {
                root: true,
            });

            // set current account
            commit('currentAccount', currentAccount);

            // reset current signer
            await dispatch('SET_CURRENT_SIGNER', {
                address: currentAccountAddress,
                reset: true,
                unsubscribeWS: true,
            });
            //reset current account alias
            await dispatch('LOAD_CURRENT_ACCOUNT_ALIASES', currentAccountAddress);

            $eventBus.$emit('onAccountChange', currentAccountAddress.plain());
        },

        async RESET_CURRENT_ACCOUNT({ commit, dispatch }) {
            dispatch('diagnostic/ADD_DEBUG', 'Store action account/RESET_CURRENT_ACCOUNT dispatched', { root: true });
            commit('currentAccount', null);
            commit('currentAccountAddress', null);
            commit('currentSignerAddress', null);
            commit('currentSignerPublicKey', null);
            commit('currentAccountAliases', []);
        },

        async SET_CURRENT_SIGNER(
            { commit, dispatch, getters, rootGetters },
            { address, reset = true, unsubscribeWS = true }: { address: Address; reset: boolean; unsubscribeWS: boolean },
        ) {
            if (!address) {
                throw new Error('Address must be provided when calling account/SET_CURRENT_SIGNER!');
            }
            const currentProfile: ProfileModel = rootGetters['profile/currentProfile'];
            const currentAccount: AccountModel = getters.currentAccount;
            const previousSignerAddress: Address = getters.currentSignerAddress;

            const currentSignerAddress: Address = address;

            if (previousSignerAddress && previousSignerAddress.equals(currentSignerAddress)) {
                return;
            }

            dispatch('diagnostic/ADD_DEBUG', 'Store action account/SET_CURRENT_SIGNER dispatched with ' + currentSignerAddress.plain(), {
                root: true,
            });

            if (reset) {
                dispatch('transaction/RESET_TRANSACTIONS', {}, { root: true });
                dispatch('restriction/RESET_ACCOUNT_RESTRICTIONS', {}, { root: true });
            }

            const currentAccountAddress = Address.createFromRawAddress(currentAccount.address);
            const knownAccounts = new AccountService().getKnownAccounts(currentProfile.accounts);

            commit('currentSignerAddress', currentSignerAddress);
            commit('currentAccountAddress', currentAccountAddress);
            commit('isCosignatoryMode', !currentSignerAddress.equals(currentAccountAddress));
            commit('knownAccounts', knownAccounts);

            // Upgrade
            dispatch('namespace/SIGNER_CHANGED', {}, { root: true });
            dispatch('mosaic/SIGNER_CHANGED', {}, { root: true });
            dispatch('transaction/SIGNER_CHANGED', {}, { root: true });
            dispatch('metadata/SIGNER_CHANGED', {}, { root: true });
            dispatch('harvesting/SET_CURRENT_SIGNER_HARVESTING_MODEL', currentSignerAddress.plain(), { root: true });
            dispatch('harvesting/LOAD_HARVESTED_BLOCKS_STATS', {}, { root: true });
            // open / close websocket connections

            if (reset) {
                await dispatch('LOAD_ACCOUNT_INFO');
                dispatch('namespace/LOAD_NAMESPACES', {}, { root: true });
                dispatch('mosaic/LOAD_MOSAICS', {}, { root: true });
            } else {
                const currentSigner = getters.signers.find((s) => s.address.equals(currentSignerAddress));
                if (currentSigner) {
                    commit('currentSigner', currentSigner);
                }
                const signerModel = knownAccounts.find((w) => w.address === currentSignerAddress.plain());
                if (signerModel !== undefined) {
                    commit('currentSignerPublicKey', signerModel.publicKey);
                } else {
                    if (getters.currentSignerAccountInfo) {
                        commit('currentSignerPublicKey', getters.currentSignerAccountInfo.publicKey);
                    }
                }
                // we need to set the currentSignerMultisigInfo to be able to calculate the fee(based on requiredCosignatures)
                const repositoryFactory = rootGetters['network/repositoryFactory'] as RepositoryFactory;
                if (!repositoryFactory) {
                    return;
                }
                const multisigAccountsInfo: MultisigAccountInfo[] = await repositoryFactory
                    .createMultisigRepository()
                    .getMultisigAccountGraphInfo(currentAccountAddress)
                    .pipe(
                        map((g) => {
                            commit('multisigAccountGraph', g.multisigEntries);
                            commit('multisigAccountGraphInfo', MultisigService.getMultisigInfoFromMultisigGraphInfo(g));
                            return MultisigService.getMultisigInfoFromMultisigGraphInfo(g);
                        }),
                        catchError(() => {
                            return of([]);
                        }),
                    )
                    .toPromise();
                const currentSignerMultisigInfo = multisigAccountsInfo.find((m) => m.accountAddress.equals(currentSignerAddress));
                commit('currentSignerMultisigInfo', currentSignerMultisigInfo);
            }

            if (unsubscribeWS) {
                if (previousSignerAddress) {
                    await dispatch('UNSUBSCRIBE', previousSignerAddress);
                }
                await dispatch('SUBSCRIBE', currentSignerAddress);
            }
        },

        async NETWORK_CHANGED({ dispatch }) {
            dispatch('transaction/RESET_TRANSACTIONS', {}, { root: true });
            dispatch('namespace/RESET_NAMESPACES', {}, { root: true });
            dispatch('mosaic/RESET_MOSAICS', {}, { root: true });
            dispatch('transaction/LOAD_TRANSACTIONS', undefined, { root: true });
            await dispatch('mosaic/LOAD_NETWORK_CURRENCIES', undefined, {
                root: true,
            });
            await dispatch('LOAD_ACCOUNT_INFO');
            dispatch('namespace/LOAD_NAMESPACES', {}, { root: true });
            dispatch('mosaic/LOAD_MOSAICS', {}, { root: true });
        },

        async GET_RECIPIENT({ commit, rootGetters }, recipientAddress?: Address) {
            if (recipientAddress) {
                //First check known accounts
                const currentProfile: ProfileModel = rootGetters['profile/currentProfile'];
                const knownAccounts = new AccountService().getKnownAccounts(currentProfile.accounts);
                const knownRecipient = knownAccounts.find((ka) => ka.address === recipientAddress.plain());
                if (knownRecipient) {
                    commit('currentRecipient', AccountModel.getObjects(knownRecipient).publicAccount);
                } else {
                    const repositoryFactory = rootGetters['network/repositoryFactory'] as RepositoryFactory;
                    if (!repositoryFactory) {
                        return;
                    }
                    const getAccountsInfoPromise = repositoryFactory
                        .createAccountRepository()
                        .getAccountInfo(recipientAddress)
                        .toPromise()
                        .catch(() => commit('currentRecipient', null));
                    const accountsInfo = await getAccountsInfoPromise;

                    commit('currentRecipient', (accountsInfo as AccountInfo).publicAccount);
                }
            } else {
                commit('currentRecipient', null);
            }
        },

        async LOAD_CURRENT_ACCOUNT_ALIASES({ commit, rootGetters }, currentAccountAddress: Address) {
            const repositoryFactory = rootGetters['network/repositoryFactory'] as RepositoryFactory;
            if (!repositoryFactory) {
                return;
            }
            const aliasPromise = repositoryFactory
                .createNamespaceRepository()
                .getAccountsNames([currentAccountAddress])
                .toPromise()
                .catch(() => commit('currentAccountAliases', []));
            const aliases = await aliasPromise;
            commit('currentAccountAliases', aliases);
        },

        async LOAD_ACCOUNT_INFO({ commit, getters, rootGetters, dispatch }) {
            const networkType: NetworkType = rootGetters['network/networkType'];
            const currentAccount: AccountModel = getters.currentAccount;
            const repositoryFactory = rootGetters['network/repositoryFactory'] as RepositoryFactory;
            const currentSignerAddress: Address = getters.currentSignerAddress;
            const currentAccountAddress: Address = getters.currentAccountAddress;
            const knownAccounts: AccountModel[] = getters.knownAccounts;

            // avoid calls if no account set
            if (!currentAccount || !currentAccountAddress) {
                return;
            }

            // remote calls:

            if (!currentAccountAddress) {
                return;
            }

            // REMOTE CALL
            if (!repositoryFactory) {
                return;
            }
            const aliasPromise = repositoryFactory
                .createNamespaceRepository()
                .getAccountsNames([currentAccountAddress])
                .toPromise()
                .catch(() => commit('currentAccountAliases', []));
            const aliases = await aliasPromise;
            commit('currentAccountAliases', aliases);

            const multisigAccountsInfo: MultisigAccountInfo[] = await repositoryFactory
                .createMultisigRepository()
                .getMultisigAccountGraphInfo(currentAccountAddress)
                .pipe(
                    map((g) => {
                        // sorted array to be represented in multisig tree
                        commit('multisigAccountGraph', g.multisigEntries);
                        commit('multisigAccountGraphInfo', MultisigService.getMultisigGraphArraySorted(g.multisigEntries));
                        return MultisigService.getMultisigInfoFromMultisigGraphInfo(g);
                    }),
                    catchError(() => {
                        return of([]);
                    }),
                )
                .toPromise();
            const currentAccountMultisigInfo = multisigAccountsInfo.find((m) => m.accountAddress.equals(currentAccountAddress));
            const currentSignerMultisigInfo = multisigAccountsInfo.find((m) => m.accountAddress.equals(currentSignerAddress));
            // update multisig flag in currentAccount
            const accountService = new AccountService();
            if (currentAccountMultisigInfo && currentAccountMultisigInfo.cosignatoryAddresses.length > 0) {
                if (!currentAccount.isMultisig) {
                    accountService.updateIsMultisig(currentAccount, true);
                }
            } else {
                accountService.updateIsMultisig(currentAccount, false);
            }

            const signers = new MultisigService().getSigners(
                networkType,
                knownAccounts,
                currentAccount,
                currentAccountMultisigInfo,
                multisigAccountsInfo,
            );

            const knownAddresses = _.uniqBy(
                [...signers.map((s) => s.address), ...knownAccounts.map((w) => Address.createFromRawAddress(w.address))].filter((a) => a),
                'address',
            );

            commit('knownAddresses', knownAddresses);
            commit(
                'currentSigner',
                signers.find((s) => s.address.equals(currentSignerAddress)),
            );
            commit('signers', signers);
            commit('multisigAccountsInfo', multisigAccountsInfo);
            commit('currentAccountMultisigInfo', currentAccountMultisigInfo);
            commit('currentSignerMultisigInfo', currentSignerMultisigInfo);

            // REMOTE CALL
            const getAccountsInfoPromise = repositoryFactory.createAccountRepository().getAccountsInfo(knownAddresses).toPromise();
            const accountsInfo = await getAccountsInfoPromise;

            commit('accountsInfo', accountsInfo);

            // read signer info to get public key
            const signerModel = knownAccounts.find((w) => w.address === currentSignerAddress.plain());
            if (signerModel !== undefined) {
                commit('currentSignerPublicKey', signerModel.publicKey);
            } else {
                if (getters.currentSignerAccountInfo) {
                    commit('currentSignerPublicKey', getters.currentSignerAccountInfo.publicKey);
                }
            }
            dispatch('aggregateTransaction/CLEAR_AGGREGATE_TRANSACTIONS_LIST', {}, { root: true });
        },

        UPDATE_CURRENT_ACCOUNT_NAME({ commit, getters, rootGetters }, name: string) {
            const currentAccount: AccountModel = getters.currentAccount;
            if (!currentAccount) {
                return;
            }
            const currentProfile: ProfileModel = rootGetters['profile/currentProfile'];
            if (!currentProfile) {
                return;
            }
            const accountService = new AccountService();
            accountService.updateName(currentAccount, name);
            const knownAccounts = accountService.getKnownAccounts(currentProfile.accounts);
            commit('knownAccounts', knownAccounts);
            // update current signer name
            const signers: Signer[] = getters.signers;
            signers.map((s) => {
                if (s.address.plain() === currentAccount.address) {
                    s.label = name;
                    commit('currentSigner', s);
                }
            });
        },

        UPDATE_CURRENT_ACCOUNT_REMOTE_ACCOUNT({ commit, getters, rootGetters, dispatch }, encRemoteAccountPrivateKey: string) {
            const currentAccount: AccountModel = getters.currentAccount;
            if (!currentAccount) {
                return;
            }
            const currentProfile: ProfileModel = rootGetters['profile/currentProfile'];
            if (!currentProfile) {
                return;
            }
            const accountService = new AccountService();
            accountService.updateRemoteAccount(currentAccount, encRemoteAccountPrivateKey);
            const knownAccounts = accountService.getKnownAccounts(currentProfile.accounts);
            commit('knownAccounts', knownAccounts);
            dispatch('LOAD_ACCOUNT_INFO');
        },

        DELETE_CURRENT_ACCOUNT({ commit, rootGetters }, account: AccountModel) {
            if (!account) {
                return;
            }
            const currentProfile: ProfileModel = rootGetters['profile/currentProfile'];
            if (!currentProfile) {
                return;
            }
            const accountService = new AccountService();
            accountService.deleteAccount(account);
            const accountsIds = accountService
                .getAccounts()
                .filter((acc) => acc.profileName === currentProfile.profileName)
                .map((acc) => acc.id);
            // update accounts in profile
            new ProfileService().updateAccounts(currentProfile, [...accountsIds]);
            // set first account to be selected
            const knownAccounts = accountService.getKnownAccounts(currentProfile.accounts);
            commit('currentAccount', knownAccounts[0]);
            // update known Accounts
            commit('knownAccounts', knownAccounts);
        },

        SET_KNOWN_ACCOUNTS({ commit }, accounts: string[]) {
            commit('knownAccounts', new AccountService().getKnownAccounts(accounts));
        },

        /**
         * Websocket API
         */
        // Subscribe to latest account transactions.
        async SUBSCRIBE({ commit, dispatch, getters, rootGetters }, address: Address) {
            if (!address) {
                return;
            }

            const plainAddress = address.plain();

            // use RESTService to open websocket channel subscriptions
            let listener = getters['listener'];
            if (listener && listener.isOpen()) {
                await listener.close();
            }
            const repositoryFactory = rootGetters['network/repositoryFactory'] as RepositoryFactory;
            if (!repositoryFactory) {
                return;
            }
            listener = repositoryFactory.createListener();
            commit('listener', listener);

            const subscriptions: SubscriptionType = await RESTService.subscribeTransactionChannels(
                { commit, dispatch },
                listener,
                plainAddress,
                getters.currentAccountMultisigInfo && !!getters.currentAccountMultisigInfo.multisigAddresses.length ? true : false,
            );
            const payload: { address: string; subscriptions: SubscriptionType } = { address: plainAddress, subscriptions };
            // update state of listeners & subscriptions
            commit('updateSubscriptions', payload);
        },

        // Unsubscribe an address open websocket connections
        async UNSUBSCRIBE({ commit, getters }, plainAddress: Address) {
            // get all subscriptions
            const subscriptions: Record<string, SubscriptionType[]> = getters.getSubscriptions;
            // subscriptions to close
            const subscriptionTypes = (subscriptions && subscriptions[plainAddress.plain()]) || [];

            if (!subscriptionTypes.length) {
                return;
            }

            // close subscriptions
            for (const subscriptionType of subscriptionTypes) {
                const { subscriptions, listener } = subscriptionType;
                for (const subscription of subscriptions) {
                    subscription.unsubscribe();
                }
                if (listener && listener.isOpen()) {
                    await listener.close();
                }
            }

            // update state of listeners & subscriptions
            const payload: { address: string; subscriptions: SubscriptionType } = {
                address: plainAddress.plain(),
                subscriptions: null,
            };
            commit('updateSubscriptions', payload);
        },

        async GET_ACCOUNT_INFO({ rootGetters }, address: Address | null): Promise<AccountInfo | null> {
            try {
                const repositoryFactory = rootGetters['network/repositoryFactory'] as RepositoryFactory;
                if (!repositoryFactory) {
                    return;
                }
                const acountInfo = await repositoryFactory.createAccountRepository().getAccountInfo(address).toPromise();

                return acountInfo;
            } catch (e) {
                return null;
            }
        },
    },
};
