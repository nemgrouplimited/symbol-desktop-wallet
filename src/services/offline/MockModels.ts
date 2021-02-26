import {NetworkConfigurationModel} from "@/core/database/entities/NetworkConfigurationModel";
import {
    AccountInfo, AccountNames,
    ChainInfo,
    ChainProperties, FinalizedBlock, MultisigAccountGraphInfo, MultisigAccountInfo, NamespaceId, NamespaceName,
    NetworkConfiguration,
    NetworkProperties,
    NetworkType,
    NodeInfo,
    PluginProperties, RentalFees, StorageInfo,
    TransactionFees, UInt64
} from "symbol-sdk";
import {NodeIdentityEqualityStrategy} from "symbol-openapi-typescript-fetch-client";
import {Address} from "symbol-sdk";
import {AccountType} from "symbol-sdk";
import {SupplementalPublicKeys} from "symbol-sdk";

export const OfflineUrl = 'http://mock:3000';

export const OfflineGenerationHash = '45FBCF2F0EA36EFA7923C9BC923D6503169651F7FA4EFC46A8EAF5AE09057EBD';

export const OfflineTransactionFees = new TransactionFees(
    84587,
    100,
    1136363,
    0,
    0,
);

export const OfflineNodeInfo = new NodeInfo(
    'pubkey',
    OfflineGenerationHash,
    3000,
    NetworkType.TEST_NET,
    0,
    [],
    'host',
    'name',
);

export const OfflineNetworkProperties = new NetworkConfiguration(
    new NetworkProperties(
        "public-test",
        NodeIdentityEqualityStrategy.Host,
        "071964D3C040D62DE905EAE978E2119BFC8E70489BFDF45A85B3D7ED5A517AA8",
        "45FBCF2F0EA36EFA7923C9BC923D6503169651F7FA4EFC46A8EAF5AE09057EBD",
        "1573430400s",
    ),
    new ChainProperties(
        true,
        true,
        "0x2CF4'03E8'5507'F39E",
        "0x2CF4'03E8'5507'F39E",
        "30s",
        "3000",
        "180",
        "5",
        "0",
        "60",
        "1'000",
        "6h",
        "500ms",
        "7'831'975'436'000'000",
        "9'000'000'000'000'000",
        "7'831'975'436'000'000",
        "10'000'000'000",
        "50'000'000'000'000",
        "3'000'000'000'000",
        "720",
        "3",
        "28",
        "26280",
        "25",
        "5",
        "TDGY4DD2U4YQQGERFMDQYHPYS6M7LHIF6XUCJ4Q",
        "6'000"
    ),
    new PluginProperties()
);


export const OfflineChainInfo = new ChainInfo(
    UInt64.fromUint(1),
    UInt64.fromUint(1),
    UInt64.fromUint(1),
    new FinalizedBlock(
        UInt64.fromUint(1),
        "6E477727F5AAF578F1AAE9752788B21DF75DB91194937D76E9E7ADD89B835BA0",
        1,
        1,
    ),
);

export const OfflineAccountInfo = (address: Address) => new AccountInfo(
    0,
    "recordId",
    address,
    UInt64.fromUint(0),
    "0000000000000000000000000000000000000000000000000000000000000000",
    UInt64.fromUint(0),
    AccountType.Unlinked,
    new SupplementalPublicKeys(),
    [],
    [],
    UInt64.fromUint(0),
    UInt64.fromUint(0),
);

export const OfflineStorageInfo = new StorageInfo(
    0,
    0,
    0,
);

export const OfflineRentalFees = new RentalFees(
    UInt64.fromUint(1000),
    UInt64.fromUint(100000),
    UInt64.fromUint(500000),
);

export const OfflineAccountNames = (address: Address) => new AccountNames(address, []);

export const OfflineNamespaceNames = (namespaceId: NamespaceId) => new NamespaceName(namespaceId, "mocknamespace");

export const OfflineMultisigAccountGraphInfo = new MultisigAccountGraphInfo(new Map());
