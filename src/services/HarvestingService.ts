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
import { HarvestingModel } from '@/core/database/entities/HarvestingModel';
import { NodeModel } from '@/core/database/entities/NodeModel';
import { HarvestingModelStorage } from '@/core/database/storage/HarvestingModelStorage';

export interface RemoteKeyInfo {
    newEncRemotePrivateKey: string;
    newRemotePublicKey: string;
}

export interface VrfKeyInfo {
    newEncVrfPrivateKey: string;
    newVrfPublicKey: string;
}

export class HarvestingService {
    private readonly harvestingStorage = HarvestingModelStorage.INSTANCE;

    public getAllHarvestingModels(): HarvestingModel[] {
        return this.harvestingStorage.get() || [];
    }

    public getHarvestingModel(accountAddress: string): HarvestingModel {
        return this.getAllHarvestingModels().find((h) => h.accountAddress === accountAddress);
    }

    /**
     * Adds or Updates a HarvestingModel
     * @param harvestingModel
     */
    public saveHarvestingModel(harvestingModel: HarvestingModel) {
        const allHarvestingModels = this.getAllHarvestingModels();
        const itemInx = allHarvestingModels.findIndex((h) => h.accountAddress === harvestingModel.accountAddress);
        if (itemInx >= 0) {
            allHarvestingModels[itemInx] = harvestingModel;
        } else {
            allHarvestingModels.push(harvestingModel);
        }
        this.harvestingStorage.set(allHarvestingModels);
        return;
    }

    public updateSignedPersistentDelReqTxs(harvestingModel: HarvestingModel, signedPersistentDelReqTxs) {
        this.saveHarvestingModel(Object.assign(harvestingModel, { signedPersistentDelReqTxs }));
    }
    public updateRemoteKey(harvestingModel: HarvestingModel, encRemotePrivateKey: string) {
        this.saveHarvestingModel(Object.assign(harvestingModel, { encRemotePrivateKey }));
    }
    public updateVrfKey(harvestingModel: HarvestingModel, encVrfPrivateKey: string) {
        this.saveHarvestingModel(Object.assign(harvestingModel, { encVrfPrivateKey }));
    }

    public updateNewAccountLinkKeyInfo(harvestingModel: HarvestingModel, options: RemoteKeyInfo | VrfKeyInfo) {
        this.saveHarvestingModel(Object.assign(harvestingModel, { ...options }));
    }

    public updateIsPersistentDelReqSent(harvestingModel: HarvestingModel, isPersistentDelReqSent: boolean) {
        this.saveHarvestingModel(Object.assign(harvestingModel, { isPersistentDelReqSent }));
    }

    public updateSelectedHarvestingNode(harvestingModel: HarvestingModel, selectedHarvestingNode: NodeModel) {
        this.saveHarvestingModel(Object.assign(harvestingModel, { selectedHarvestingNode }));
    }
    public updateDelegatedHarvestingRequestFailed(harvestingModel: HarvestingModel, delegatedHarvestingRequestFailed: boolean) {
        this.saveHarvestingModel(Object.assign(harvestingModel, { delegatedHarvestingRequestFailed }));
    }
}
