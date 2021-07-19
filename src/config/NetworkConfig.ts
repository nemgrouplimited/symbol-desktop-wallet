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

export interface NodeConfig {
    roles: number;
    friendlyName: string;
    url: string;
}

export interface NetworkConfigurationDefaults {
    maxTransactionsPerAggregate: number;
    maxMosaicDuration: number;
    lockedFundsPerAggregate: string;
    maxNamespaceDuration: number;
    maxCosignatoriesPerAccount: number;
    maxMosaicAtomicUnits: number;
    blockGenerationTargetTime: number;
    currencyMosaicId: string;
    namespaceGracePeriodDuration: number;
    harvestingMosaicId: string;
    minNamespaceDuration: number;
    maxCosignedAccountsPerAccount: number;
    maxNamespaceDepth: number;
    defaultDynamicFeeMultiplier: number;
    maxMosaicDivisibility: number;
    maxMessageSize: number;
    epochAdjustment: number;
    totalChainImportance: number;
    generationHash: string;
}

export interface NetworkConfig {
    faucetUrl: string;
    nodes: NodeConfig[];
    defaultNetworkType: number;
    explorerUrl: string;
    networkConfigurationDefaults: NetworkConfigurationDefaults;
}

export const defaultTestnetNetworkConfig: NetworkConfig = {
    explorerUrl: 'http://explorer.testnet.symboldev.network/',
    faucetUrl: 'http://faucet.testnet.symboldev.network/',
    defaultNetworkType: 152,
    networkConfigurationDefaults: {
        maxMosaicDivisibility: 6,
        namespaceGracePeriodDuration: 86400,
        lockedFundsPerAggregate: '10000000',
        maxCosignatoriesPerAccount: 25,
        blockGenerationTargetTime: 30,
        maxNamespaceDepth: 3,
        maxMosaicDuration: 315360000,
        minNamespaceDuration: 2592000,
        maxNamespaceDuration: 157680000,
        maxTransactionsPerAggregate: 100,
        maxCosignedAccountsPerAccount: 25,
        maxMessageSize: 1024,
        maxMosaicAtomicUnits: 8999999999000000,
        currencyMosaicId: '091F837E059AE13C',
        harvestingMosaicId: '091F837E059AE13C',
        defaultDynamicFeeMultiplier: 100,
        epochAdjustment: 1616694977,
        totalChainImportance: 7842928625000000,
        generationHash: '3B5E1FA6445653C971A50687E75E6D09FB30481055E3990C84B25E9222DC1155',
    },
    nodes: [
        { friendlyName: 'ngl-dual-001', roles: 2, url: 'http://ngl-dual-001.testnet.symboldev.network:3000' },
        { friendlyName: 'ngl-dual-101', roles: 2, url: 'http://ngl-dual-101.testnet.symboldev.network:3000' },
        { friendlyName: 'ngl-dual-201', roles: 2, url: 'http://ngl-dual-201.testnet.symboldev.network:3000' },
        { friendlyName: 'ngl-dual-301', roles: 2, url: 'http://ngl-dual-301.testnet.symboldev.network:3000' },
        { friendlyName: 'ngl-dual-401', roles: 2, url: 'http://ngl-dual-401.testnet.symboldev.network:3000' },
        { friendlyName: 'ngl-dual-501', roles: 2, url: 'http://ngl-dual-501.testnet.symboldev.network:3000' },
        { friendlyName: 'ngl-dual-601', roles: 2, url: 'http://ngl-dual-601.testnet.symboldev.network:3000' },
    ],
};

export const defaultMainnetNetworkConfig: NetworkConfig = {
    explorerUrl: 'http://explorer.symbolblockchain.io/',
    faucetUrl: 'http://faucet.mainnet.symboldev.network/',
    defaultNetworkType: 104,
    networkConfigurationDefaults: {
        maxMosaicDivisibility: 6,
        namespaceGracePeriodDuration: 2592000,
        lockedFundsPerAggregate: '10000000',
        maxCosignatoriesPerAccount: 25,
        blockGenerationTargetTime: 30,
        maxNamespaceDepth: 3,
        maxMosaicDuration: 315360000,
        minNamespaceDuration: 2592000,
        maxNamespaceDuration: 157680000,
        maxTransactionsPerAggregate: 100,
        maxCosignedAccountsPerAccount: 25,
        maxMessageSize: 1024,
        maxMosaicAtomicUnits: 8999999999000000,
        currencyMosaicId: '6BED913FA20223F8',
        harvestingMosaicId: '6BED913FA20223F8',
        defaultDynamicFeeMultiplier: 100,
        epochAdjustment: 1615853185,
        totalChainImportance: 7842928625000000,
        generationHash: '57F7DA205008026C776CB6AED843393F04CD458E0AA2D9F1D5F31A402072B2D6',
    },
    nodes: [
        { friendlyName: 'ngl-dual-001', roles: 2, url: 'http://ngl-dual-001.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-002', roles: 2, url: 'http://ngl-dual-002.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-003', roles: 2, url: 'http://ngl-dual-003.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-004', roles: 2, url: 'http://ngl-dual-004.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-005', roles: 2, url: 'http://ngl-dual-005.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-101', roles: 2, url: 'http://ngl-dual-101.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-102', roles: 2, url: 'http://ngl-dual-102.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-103', roles: 2, url: 'http://ngl-dual-103.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-104', roles: 2, url: 'http://ngl-dual-104.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-105', roles: 2, url: 'http://ngl-dual-105.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-201', roles: 2, url: 'http://ngl-dual-201.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-202', roles: 2, url: 'http://ngl-dual-202.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-203', roles: 2, url: 'http://ngl-dual-203.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-204', roles: 2, url: 'http://ngl-dual-204.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-205', roles: 2, url: 'http://ngl-dual-205.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-301', roles: 2, url: 'http://ngl-dual-301.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-302', roles: 2, url: 'http://ngl-dual-302.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-303', roles: 2, url: 'http://ngl-dual-303.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-304', roles: 2, url: 'http://ngl-dual-304.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-305', roles: 2, url: 'http://ngl-dual-305.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-401', roles: 2, url: 'http://ngl-dual-401.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-402', roles: 2, url: 'http://ngl-dual-402.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-403', roles: 2, url: 'http://ngl-dual-403.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-404', roles: 2, url: 'http://ngl-dual-404.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-405', roles: 2, url: 'http://ngl-dual-405.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-501', roles: 2, url: 'http://ngl-dual-501.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-502', roles: 2, url: 'http://ngl-dual-502.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-503', roles: 2, url: 'http://ngl-dual-503.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-504', roles: 2, url: 'http://ngl-dual-504.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-505', roles: 2, url: 'http://ngl-dual-505.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-601', roles: 2, url: 'http://ngl-dual-601.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-602', roles: 2, url: 'http://ngl-dual-602.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-603', roles: 2, url: 'http://ngl-dual-603.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-604', roles: 2, url: 'http://ngl-dual-604.symbolblockchain.io:3000' },
        { friendlyName: 'ngl-dual-605', roles: 2, url: 'http://ngl-dual-605.symbolblockchain.io:3000' },
    ],
};

const defaultNetworkConfig: Record<number, NetworkConfig> = {
    152: defaultTestnetNetworkConfig,
    104: defaultMainnetNetworkConfig,
};

const resolvedNetworkConfig: NetworkConfig = window['networkConfig']
    ? { ...defaultNetworkConfig, ...window['networkConfig'] }
    : defaultNetworkConfig;
console.log('networkConfig resolved!', resolvedNetworkConfig);
export const networkConfig = resolvedNetworkConfig;
